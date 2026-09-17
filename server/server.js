const https = require('https');
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

const { getR2Config, saveR2Config, uploadToR2, testR2Connection } = require('./r2');

const app = express();
const PORT = process.env.PORT || 3000;

// Diretórios principais
const DATA_FILE = path.join(__dirname, 'data', 'store.json');
const APP_VERSION_FILE = path.join(__dirname, 'data', 'app_version.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Garantir que as pastas de upload existam
['apks', 'icons', 'banners', 'screenshots'].forEach(dir => {
  const fullPath = path.join(UPLOADS_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Configuração do Multer para armazenamento temporário de uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'apk') {
      cb(null, path.join(UPLOADS_DIR, 'apks'));
    } else if (file.fieldname === 'icon') {
      cb(null, path.join(UPLOADS_DIR, 'icons'));
    } else if (file.fieldname === 'banner') {
      cb(null, path.join(UPLOADS_DIR, 'banners'));
    } else if (file.fieldname === 'screenshots') {
      cb(null, path.join(UPLOADS_DIR, 'screenshots'));
    } else {
      cb(null, UPLOADS_DIR);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // Limite de 500MB para APKs
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir estáticos
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/tv', express.static(path.join(__dirname, '..', 'tv_app')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// Redirecionamento da raiz para a TV
app.get('/', (req, res) => {
  res.redirect('/tv');
});

// Rotas de download direto do APK oficial da Android TV
app.get(['/apk', '/d', '/download'], (req, res) => {
  try {
    const versionInfo = readAppVersion();
    if (req.query.local === '1') {
      const localApk = path.join(UPLOADS_DIR, 'apks', 'IntraStore_TV_v1.1.0.apk');
      if (fs.existsSync(localApk)) {
        return res.download(localApk, 'IntraStore_TV_v1.1.0.apk');
      }
    }
    // Redireciona 302 direto para o Cloudflare R2 ou URL oficial
    if (versionInfo && versionInfo.apkUrl) {
      return res.redirect(302, versionInfo.apkUrl);
    }
    res.redirect(302, 'https://raw.githubusercontent.com/AdriellysonCT/-IntraStore-TV/main/release/IntraStore_TV_v1.1.0.apk');
  } catch (err) {
    res.redirect(302, 'https://raw.githubusercontent.com/AdriellysonCT/-IntraStore-TV/main/release/IntraStore_TV_v1.1.0.apk');
  }
});

// Funções auxiliares de persistência
function readStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const defaultData = {
        categories: ['Destaques', 'Streaming & Vídeo', 'Jogos', 'Ferramentas & Utilitários', 'Música & Áudio', 'Produtividade'],
        apps: []
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro lendo store.json:', err);
    return { categories: [], apps: [] };
  }
}

function writeStore(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function readAppVersion() {
  try {
    if (fs.existsSync(APP_VERSION_FILE)) {
      return JSON.parse(fs.readFileSync(APP_VERSION_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Erro ao ler app_version.json:', e);
  }
  return {
    latestVersionCode: 2,
    latestVersionName: "1.1.0",
    apkUrl: "https://raw.githubusercontent.com/AdriellysonCT/-IntraStore-TV/main/release/IntraStore_TV_v1.1.0.apk",
    changelog: "Versão otimizada para Android TV.",
    forceUpdate: false
  };
}

// ==========================================
// ROTAS DA API
// ==========================================

// 1. Estatísticas para o Painel Admin
app.get('/api/stats', (req, res) => {
  const store = readStore();
  const totalApps = store.apps.length;
  const totalDownloads = store.apps.reduce((acc, app) => acc + (app.downloads || 0), 0);
  const featuredCount = store.apps.filter(app => app.isFeatured).length;
  
  res.json({
    totalApps,
    totalDownloads,
    featuredCount,
    categoriesCount: store.categories.length
  });
});

// 2. Listar Categorias
app.get('/api/categories', (req, res) => {
  const store = readStore();
  const catList = store.categories.map(cat => {
    const count = store.apps.filter(a => a.category === cat).length;
    return { name: cat, count };
  });
  res.json(catList);
});

// 3. Listar Apps (com filtros opcionais: ?category=...&featured=true&search=...)
app.get('/api/apps', (req, res) => {
  const store = readStore();
  let apps = [...store.apps];
  const { category, featured, search } = req.query;

  if (featured === 'true') {
    apps = apps.filter(a => a.isFeatured);
  }

  if (category && category !== 'Todos' && category !== 'Destaques') {
    apps = apps.filter(a => a.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const s = search.toLowerCase();
    apps = apps.filter(a => 
      a.name.toLowerCase().includes(s) || 
      (a.developer && a.developer.toLowerCase().includes(s)) ||
      (a.description && a.description.toLowerCase().includes(s))
    );
  }

  res.json(apps);
});

// 4. Listar Apenas Destaques (para o Hero da TV)
app.get('/api/apps/featured', (req, res) => {
  const store = readStore();
  const featured = store.apps.filter(a => a.isFeatured);
  res.json(featured);
});

// 5. Obter Detalhes de um App por ID
app.get('/api/apps/:id', (req, res) => {
  const store = readStore();
  const appItem = store.apps.find(a => a.id === req.params.id);
  if (!appItem) {
    return res.status(404).json({ error: 'Aplicativo não encontrado.' });
  }
  res.json(appItem);
});

// 6. Verificar Atualizações para os Apps Instalados no Aparelho TV
app.post('/api/apps/check-updates', (req, res) => {
  const store = readStore();
  const installedList = req.body.installed || []; // Array de { packageName: '...', versionCode: 1 }
  
  const updates = [];
  installedList.forEach(item => {
    const storeApp = store.apps.find(a => a.packageName === item.packageName);
    if (storeApp && Number(storeApp.versionCode) > Number(item.versionCode)) {
      updates.push({
        id: storeApp.id,
        name: storeApp.name,
        packageName: storeApp.packageName,
        currentVersionCode: item.versionCode,
        newVersionCode: storeApp.versionCode,
        newVersionName: storeApp.versionName,
        changelog: storeApp.changelog || 'Melhorias de desempenho e correções.',
        apkUrl: storeApp.apkUrl,
        sizeMb: storeApp.sizeMb,
        iconUrl: storeApp.iconUrl
      });
    }
  });

  res.json({ updatesAvailable: updates });
});

// 7. Download de APK e incremento de contador
app.post('/api/apps/:id/download', (req, res) => {
  const store = readStore();
  const index = store.apps.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Aplicativo não encontrado.' });
  }

  store.apps[index].downloads = (store.apps[index].downloads || 0) + 1;
  writeStore(store);

  res.json({
    success: true,
    downloads: store.apps[index].downloads,
    apkUrl: store.apps[index].apkUrl,
    fileName: store.apps[index].apkFileName
  });
});

// 8. Upload e Criação de Novo Aplicativo (Admin) com suporte a Cloudflare R2
const cpUpload = upload.fields([
  { name: 'apk', maxCount: 1 },
  { name: 'icon', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
  { name: 'screenshots', maxCount: 6 }
]);

app.post('/api/apps', cpUpload, async (req, res) => {
  try {
    const store = readStore();
    const body = req.body;
    const files = req.files || {};

    if (!body.name || !body.packageName) {
      return res.status(400).json({ error: 'Nome do aplicativo e Package Name são obrigatórios.' });
    }

    // Verificar se package name já existe
    const exists = store.apps.find(a => a.packageName === body.packageName);
    if (exists) {
      return res.status(400).json({ error: 'Já existe um aplicativo com este Package Name cadastrado.' });
    }

    const apkFile = files['apk'] ? files['apk'][0] : null;
    const iconFile = files['icon'] ? files['icon'][0] : null;
    const bannerFile = files['banner'] ? files['banner'][0] : null;
    const screenshotFiles = files['screenshots'] || [];

    const sizeMb = apkFile ? (apkFile.size / (1024 * 1024)).toFixed(1) : (body.sizeMb || '0.0');

    // Tentar upload para Cloudflare R2 com fallback para pasta local
    let apkUrl = apkFile ? '/uploads/apks/' + apkFile.filename : (body.apkUrl || '');
    if (apkFile) {
      const r2Url = await uploadToR2(apkFile.path, 'apks/' + apkFile.filename, 'application/vnd.android.package-archive');
      if (r2Url) apkUrl = r2Url;
    }

    let iconUrl = iconFile ? '/uploads/icons/' + iconFile.filename : '/uploads/icons/default-icon.svg';
    if (iconFile) {
      const r2Url = await uploadToR2(iconFile.path, 'icons/' + iconFile.filename, iconFile.mimetype);
      if (r2Url) iconUrl = r2Url;
    } else if (body.iconExternalUrl) {
      try {
        const extFilename = 'icon-' + Date.now() + '.png';
        const localDest = path.join(UPLOADS_DIR, 'icons', extFilename);
        await downloadExternalImage(body.iconExternalUrl, localDest);
        iconUrl = '/uploads/icons/' + extFilename;
        const r2Url = await uploadToR2(localDest, 'icons/' + extFilename, 'image/png');
        if (r2Url) iconUrl = r2Url;
      } catch (err) {
        console.error('Erro baixando iconExternalUrl:', err);
      }
    }

    let bannerUrl = bannerFile ? '/uploads/banners/' + bannerFile.filename : '';
    if (bannerFile) {
      const r2Url = await uploadToR2(bannerFile.path, 'banners/' + bannerFile.filename, bannerFile.mimetype);
      if (r2Url) bannerUrl = r2Url;
    } else if (body.bannerExternalUrl) {
      try {
        const extFilename = 'banner-' + Date.now() + '.png';
        const localDest = path.join(UPLOADS_DIR, 'banners', extFilename);
        await downloadExternalImage(body.bannerExternalUrl, localDest);
        bannerUrl = '/uploads/banners/' + extFilename;
        const r2Url = await uploadToR2(localDest, 'banners/' + extFilename, 'image/png');
        if (r2Url) bannerUrl = r2Url;
      } catch (err) {
        console.error('Erro baixando bannerExternalUrl:', err);
      }
    }

    const screenshots = [];
    for (const sFile of screenshotFiles) {
      let sUrl = '/uploads/screenshots/' + sFile.filename;
      const r2Url = await uploadToR2(sFile.path, 'screenshots/' + sFile.filename, sFile.mimetype);
      if (r2Url) sUrl = r2Url;
      screenshots.push(sUrl);
    }

    const newApp = {
      id: uuidv4(),
      name: body.name.trim(),
      packageName: body.packageName.trim(),
      developer: body.developer ? body.developer.trim() : 'Comunidade IntraStore',
      category: body.category || 'Ferramentas & Utilitários',
      versionName: body.versionName ? body.versionName.trim() : '1.0.0',
      versionCode: parseInt(body.versionCode, 10) || 1,
      sizeMb: parseFloat(sizeMb),
      rating: parseFloat(body.rating) || 4.8,
      ageRating: body.ageRating || 'Livre',
      description: body.description || '',
      changelog: body.changelog || 'Lançamento inicial no IntraStore TV.',
      permissions: body.permissions ? (Array.isArray(body.permissions) ? body.permissions : body.permissions.split(',').map(p => p.trim())) : ['Internet', 'Acesso a Rede'],
      isFeatured: body.isFeatured === 'true' || body.isFeatured === true,
      downloads: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      apkUrl: apkUrl,
      apkFileName: apkFile ? apkFile.originalname : '',
      iconUrl: iconUrl,
      bannerUrl: bannerUrl,
      screenshots: screenshots
    };

    store.apps.push(newApp);
    writeStore(store);

    res.status(201).json({ success: true, app: newApp });
  } catch (err) {
    console.error('Erro ao criar app:', err);
    res.status(500).json({ error: 'Erro interno ao salvar o aplicativo: ' + err.message });
  }
});

// 9. Atualizar Aplicativo / Lançar Nova Versão (Admin)
app.put('/api/apps/:id', cpUpload, async (req, res) => {
  try {
    const store = readStore();
    const index = store.apps.findIndex(a => a.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Aplicativo não encontrado.' });
    }

    const currentApp = store.apps[index];
    const body = req.body;
    const files = req.files || {};

    const apkFile = files['apk'] ? files['apk'][0] : null;
    const iconFile = files['icon'] ? files['icon'][0] : null;
    const bannerFile = files['banner'] ? files['banner'][0] : null;
    const screenshotFiles = files['screenshots'] || [];

    // Atualização de campos
    if (body.name) currentApp.name = body.name.trim();
    if (body.developer) currentApp.developer = body.developer.trim();
    if (body.category) currentApp.category = body.category;
    if (body.versionName) currentApp.versionName = body.versionName.trim();
    if (body.versionCode) currentApp.versionCode = parseInt(body.versionCode, 10);
    if (body.description) currentApp.description = body.description;
    if (body.changelog) currentApp.changelog = body.changelog;
    if (body.ageRating) currentApp.ageRating = body.ageRating;
    if (body.isFeatured !== undefined) {
      currentApp.isFeatured = body.isFeatured === 'true' || body.isFeatured === true;
    }
    if (body.permissions) {
      currentApp.permissions = Array.isArray(body.permissions) 
        ? body.permissions 
        : body.permissions.split(',').map(p => p.trim());
    }

    // Atualização de arquivos enviados com suporte a R2
    if (apkFile) {
      let apkUrl = '/uploads/apks/' + apkFile.filename;
      const r2Url = await uploadToR2(apkFile.path, 'apks/' + apkFile.filename, 'application/vnd.android.package-archive');
      if (r2Url) apkUrl = r2Url;
      currentApp.apkUrl = apkUrl;
      currentApp.apkFileName = apkFile.originalname;
      currentApp.sizeMb = parseFloat((apkFile.size / (1024 * 1024)).toFixed(1));
    }
    if (iconFile) {
      let iconUrl = '/uploads/icons/' + iconFile.filename;
      const r2Url = await uploadToR2(iconFile.path, 'icons/' + iconFile.filename, iconFile.mimetype);
      if (r2Url) iconUrl = r2Url;
      currentApp.iconUrl = iconUrl;
    }
    if (bannerFile) {
      let bannerUrl = '/uploads/banners/' + bannerFile.filename;
      const r2Url = await uploadToR2(bannerFile.path, 'banners/' + bannerFile.filename, bannerFile.mimetype);
      if (r2Url) bannerUrl = r2Url;
      currentApp.bannerUrl = bannerUrl;
    }
    if (screenshotFiles.length > 0) {
      const screenshots = [];
      for (const sFile of screenshotFiles) {
        let sUrl = '/uploads/screenshots/' + sFile.filename;
        const r2Url = await uploadToR2(sFile.path, 'screenshots/' + sFile.filename, sFile.mimetype);
        if (r2Url) sUrl = r2Url;
        screenshots.push(sUrl);
      }
      currentApp.screenshots = screenshots;
    }

    currentApp.updatedAt = new Date().toISOString();

    store.apps[index] = currentApp;
    writeStore(store);

    res.json({ success: true, app: currentApp });
  } catch (err) {
    console.error('Erro ao atualizar app:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar: ' + err.message });
  }
});

// 10. Deletar Aplicativo
app.delete('/api/apps/:id', (req, res) => {
  const store = readStore();
  const index = store.apps.findIndex(a => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Aplicativo não encontrado.' });
  }

  const removedApp = store.apps.splice(index, 1)[0];
  writeStore(store);

  res.json({ success: true, message: 'Aplicativo removido com sucesso.', id: removedApp.id });
});

// 11. Status e Configuração do Cloudflare R2
app.get('/api/r2/status', async (req, res) => {
  const config = getR2Config();
  const test = await testR2Connection();
  res.json({
    config: {
      enabled: config.enabled,
      endpoint: config.endpoint,
      bucketName: config.bucketName,
      publicUrl: config.publicUrl,
      accessKeyId: config.accessKeyId ? config.accessKeyId.slice(0, 6) + '...' : ''
    },
    test
  });
});

app.post('/api/r2/config', (req, res) => {
  const current = getR2Config();
  const body = req.body;

  const newConfig = {
    ...current,
    ...body
  };

  saveR2Config(newConfig);
  res.json({ success: true, message: 'Configurações do Cloudflare R2 salvas!' });
});


// Funções de Busca Inteligente de Imagens na Web e Download Automático para Cloudflare R2
async function searchImagesWeb(query, type = 'icon') {
  return new Promise((resolve) => {
    let q = query.trim();
    if (type === 'icon') {
      q += ' app logo icon png';
    } else if (type === 'banner') {
      q += ' tv wallpaper 16:9 banner';
    } else {
      q += ' android tv app screenshot';
    }

    const url = 'https://www.bing.com/images/search?q=' + encodeURIComponent(q) + '&first=1&tsc=ImageHoverTitle';
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        const results = [];
        const regex = /m="([^"]+)"/g;
        let match;
        while ((match = regex.exec(body)) !== null) {
          try {
            const rawJson = match[1].replace(/&quot;/g, '"');
            const data = JSON.parse(rawJson);
            if (data.murl) {
              results.push({
                title: data.t || query,
                url: data.murl,
                thumbnail: (data.turl || data.murl).replace(/&amp;/g, '&')
              });
            }
          } catch (e) {}
        }
        resolve(results.slice(0, 24));
      });
    }).on('error', () => resolve([]));
  });
}

async function downloadExternalImage(imageUrl, destFilePath) {
  return new Promise((resolve, reject) => {
    function get(u, redirects = 0) {
      if (redirects > 5) return reject(new Error('Muitos redirecionamentos'));
      const proto = u.startsWith('https') ? https : http;
      proto.get(u, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error('HTTP Status: ' + res.statusCode));
        }
        const fileStream = fs.createWriteStream(destFilePath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close(() => resolve(destFilePath));
        });
      }).on('error', reject);
    }
    get(imageUrl);
  });
}

// Endpoint de Busca de Imagens Online para o Admin
app.get('/api/search-images', async (req, res) => {
  try {
    const q = req.query.q || '';
    const type = req.query.type || 'icon';
    if (!q) {
      return res.status(400).json({ error: 'Termo de busca não fornecido.' });
    }
    const results = await searchImagesWeb(q, type);
    res.json({ success: true, query: q, type, count: results.length, results });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar imagens: ' + err.message });
  }
});


// ==============================================================
// SISTEMA DE AUTO UPDATE PARA O APLICATIVO NATIVO DE ANDROID TV
// ==============================================================

// 1. Consultar a versão mais recente do aplicativo da TV
app.get('/api/app-update', (req, res) => {
  const versionInfo = readAppVersion();
  res.json(versionInfo);
});

// 2. Atualizar a versão oficial da TV (Admin)
app.post('/api/app-update', (req, res) => {
  try {
    const current = readAppVersion();
    const updated = {
      ...current,
      ...req.body,
      releaseDate: new Date().toISOString()
    };
    fs.writeFileSync(APP_VERSION_FILE, JSON.stringify(updated, null, 2), 'utf8');
    res.json({ success: true, version: updated });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar versão da loja: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log('=====================================================');
  console.log(' IntraStore TV Backend inicializado com sucesso!');
  console.log(' Servidor rodando em: http://localhost:' + PORT);
  console.log(' Aplicativo da TV:    http://localhost:' + PORT + '/tv');
  console.log(' Painel Admin:        http://localhost:' + PORT + '/admin');
  console.log('=====================================================');
});
