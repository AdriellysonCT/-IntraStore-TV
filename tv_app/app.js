// IntraStore TV - Core Application Controller
const API_BASE = (window.location.protocol.startsWith('http') && window.location.origin !== 'null') ? '' : 'https://intrastore-tv.onrender.com';
let storeApps = [];
let installedAppsMap = {}; // packageName -> { versionCode, versionName, installedAt }
let activeApp = null;
let currentView = 'home';
let tvToastTimer = null;
let lastFocusedBeforeModal = null;

// ==============================================================
// SISTEMA DE MODAIS E TOASTS NATIVOS PARA ANDROID TV (10-FOOT)
// ==============================================================
window.showTvToast = function(message, title = 'Notificação', type = 'info', duration = 3800) {
  const container = document.getElementById('tvToastContainer');
  const box = document.getElementById('tvToastBox');
  const titleEl = document.getElementById('tvToastTitle');
  const msgEl = document.getElementById('tvToastMessage');
  const iconEl = document.getElementById('tvToastIcon');
  const iconWrap = document.getElementById('tvToastIconWrap');
  if (!container) return;

  clearTimeout(tvToastTimer);

  titleEl.textContent = title;
  msgEl.textContent = message;

  if (type === 'success') {
    iconEl.textContent = 'check_circle';
    iconWrap.className = 'w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0';
    titleEl.className = 'text-xs font-headline font-bold uppercase tracking-wider text-emerald-400';
    box.className = 'bg-surface-container-low/95 backdrop-blur-xl border border-emerald-500/40 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-2xl shadow-emerald-950/40 min-w-[380px]';
  } else if (type === 'error') {
    iconEl.textContent = 'error';
    iconWrap.className = 'w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0';
    titleEl.className = 'text-xs font-headline font-bold uppercase tracking-wider text-red-400';
    box.className = 'bg-surface-container-low/95 backdrop-blur-xl border border-red-500/40 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-2xl shadow-red-950/40 min-w-[380px]';
  } else {
    iconEl.textContent = 'info';
    iconWrap.className = 'w-10 h-10 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan flex-shrink-0';
    titleEl.className = 'text-xs font-headline font-bold uppercase tracking-wider text-accent-cyan';
    box.className = 'bg-surface-container-low/95 backdrop-blur-xl border border-accent-cyan/40 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-2xl shadow-cyan-950/40 min-w-[380px]';
  }

  container.classList.remove('hidden');
  requestAnimationFrame(() => {
    container.classList.add('tv-toast-active');
  });

  tvToastTimer = setTimeout(() => {
    container.classList.remove('tv-toast-active');
    setTimeout(() => container.classList.add('hidden'), 320);
  }, duration);
};

window.showTvConfirm = function(title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', isDanger = false) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('tvModalOverlay');
    const titleEl = document.getElementById('tvModalTitle');
    const msgEl = document.getElementById('tvModalMessage');
    const btnConfirm = document.getElementById('tvModalBtnConfirm');
    const btnCancel = document.getElementById('tvModalBtnCancel');
    const iconWrapper = document.getElementById('tvModalIconWrapper');
    const icon = document.getElementById('tvModalIcon');

    lastFocusedBeforeModal = window.remoteNav ? window.remoteNav.currentFocusedElement : null;

    titleEl.textContent = title;
    msgEl.textContent = message;
    btnConfirm.textContent = confirmText;
    btnCancel.textContent = cancelText;

    if (isDanger) {
      btnConfirm.className = 'btn-tv flex-1 py-3.5 px-6 rounded-2xl bg-red-600 text-white font-headline font-bold text-sm shadow-lg transition-all';
      iconWrapper.className = 'w-16 h-16 mx-auto rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-lg';
      icon.textContent = 'power_settings_new';
    } else {
      btnConfirm.className = 'btn-tv flex-1 py-3.5 px-6 rounded-2xl bg-accent-cyan text-black font-headline font-bold text-sm shadow-lg transition-all';
      iconWrapper.className = 'w-16 h-16 mx-auto rounded-2xl bg-primary-purple/20 border border-primary-purple/40 flex items-center justify-center text-accent-cyan shadow-lg';
      icon.textContent = 'help';
    }

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    requestAnimationFrame(() => {
      overlay.classList.add('tv-modal-active');
      if (window.remoteNav) {
        window.remoteNav.setFocus(btnCancel);
      }
    });

    function cleanup() {
      overlay.classList.remove('tv-modal-active');
      setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
      }, 280);

      btnConfirm.removeEventListener('click', onConfirm);
      btnCancel.removeEventListener('click', onCancel);

      if (lastFocusedBeforeModal && window.remoteNav) {
        window.remoteNav.setFocus(lastFocusedBeforeModal);
      }
    }

    function onConfirm() {
      cleanup();
      resolve(true);
    }

    function onCancel() {
      cleanup();
      resolve(false);
    }

    btnConfirm.addEventListener('click', onConfirm);
    btnCancel.addEventListener('click', onCancel);
  });
};

document.addEventListener('DOMContentLoaded', () => {
  initClock();
  loadInstalledApps();
  loadCatalog();
  setupBackHandler();
});

// Relógio Digital no Topo
function initClock() {
  const clockEl = document.getElementById('leanback-clock');
  function updateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    if (clockEl) clockEl.textContent = hours + ':' + minutes;
  }
  updateTime();
  setInterval(updateTime, 10000);
}

// Configurar tecla Back do Controle Remoto para voltar de telas
function setupBackHandler() {
  window.remoteNav.onBackHandler = () => {
    const modal = document.getElementById('tvModalOverlay');
    if (modal && !modal.classList.contains('hidden')) {
      const btnCancel = document.getElementById('tvModalBtnCancel');
      if (btnCancel) btnCancel.click();
      return;
    }
    if (currentView === 'details' || currentView === 'settings') {
      navigateTo('home');
    }
  };
}

// Carregar Apps Instalados (via Bridge Android Nativo ou LocalStorage)
function loadInstalledApps() {
  try {
    if (window.AndroidBridge && window.AndroidBridge.getInstalledAppsJson) {
      const raw = window.AndroidBridge.getInstalledAppsJson();
      const list = JSON.parse(raw);
      installedAppsMap = {};
      list.forEach(item => {
        installedAppsMap[item.packageName] = {
          versionCode: item.versionCode,
          versionName: item.versionName
        };
      });
      document.getElementById('sysPlatform').textContent = 'Android TV (Native Bridge Ativo)';
    } else {
      // Fallback para simulação e teste em navegador / TV Browser
      const saved = localStorage.getItem('intrastore_installed_apps');
      installedAppsMap = saved ? JSON.parse(saved) : {};
    }
  } catch (err) {
    console.error('Erro ao ler apps instalados:', err);
    installedAppsMap = {};
  }
}

function saveInstalledApp(packageName, versionCode, versionName) {
  installedAppsMap[packageName] = {
    versionCode: Number(versionCode),
    versionName: versionName,
    installedAt: new Date().toISOString()
  };

  if (!window.AndroidBridge) {
    localStorage.setItem('intrastore_installed_apps', JSON.stringify(installedAppsMap));
  }
}

// Carregar Catálogo de Apps da API com Splash Animation Cinematográfica
async function loadCatalog() {
  const splash = document.getElementById('tvSplashScreen');
  const splashBar = document.getElementById('splashProgressBar');
  const splashText = document.getElementById('splashLoadingText');

  // Passo 1 da Splash Animation
  if (splashBar) splashBar.style.width = '35%';
  if (splashText) splashText.textContent = 'Conectando à IntraStore Cloud...';

  const startTime = Date.now();

  try {
    const res = await fetch(API_BASE + '/api/apps');
    storeApps = await res.json();

    if (splashBar) splashBar.style.width = '75%';
    if (splashText) splashText.textContent = 'Sincronizando aplicativos da comunidade...';

    renderHeroCarousel();
    renderShelves();
    checkForPendingUpdates();

    if (splashBar) splashBar.style.width = '100%';
    if (splashText) splashText.textContent = 'Pronto! Iniciando Android TV...';

    // Garantir tempo mínimo de exibição para a animação do logo ser apreciada (1.6s)
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, 800 - elapsedTime);

    setTimeout(() => {
      if (splash) {
        splash.classList.add('splash-exit');
        setTimeout(() => {
          splash.remove(); // Remove do DOM liberando memória da TV
          
          // Foco inicial automático via controle remoto
          const firstCard = document.querySelector('#heroCarouselContainer button, #heroCarouselContainer a, .shelf-card, #mainNavRail button');
          if (firstCard) {
            window.remoteNav.setFocus(firstCard);
          }
        }, 700);
      }
    }, remainingTime);

  } catch (err) {
    console.error('Erro ao carregar catálogo da loja:', err);
    if (splashText) splashText.textContent = 'Carregando em modo offline...';
    setTimeout(() => {
      if (splash) {
        splash.classList.add('splash-exit');
        setTimeout(() => splash.remove(), 700);
      }
    }, 1500);

    document.getElementById('heroCarouselContainer').innerHTML = `
      <div class="w-full py-8 text-center text-red-400 bg-surface-container rounded-2xl">
        Erro ao conectar com o servidor da loja. Verifique sua rede.
      </div>
    `;
  }
}

// 1. Renderizar Hero Carousel (Destaques 16:9)
function renderHeroCarousel() {
  const container = document.getElementById('heroCarouselContainer');
  const featured = storeApps.filter(a => a.isFeatured);

  const list = featured.length > 0 ? featured : storeApps.slice(0, 3);

  if (list.length === 0) {
    container.innerHTML = `
      <div class="w-full py-10 text-center text-gray-400 bg-surface-container-low rounded-2xl border border-outline-variant/20">
        Nenhum aplicativo publicado ainda. Acesse o <strong>Painel Admin</strong> para enviar os primeiros APKs!
      </div>
    `;
    return;
  }

  container.innerHTML = list.map((app, index) => {
    const bannerBg = app.bannerUrl || app.iconUrl || '/uploads/icons/default-icon.svg';
    const isInstalled = !!installedAppsMap[app.packageName];
    const hasUpdate = isInstalled && (Number(app.versionCode) > Number(installedAppsMap[app.packageName].versionCode));

    return `
      <button onclick="openAppDetails('${app.id}')" class="shelf-card hero-card will-change-transform" tabindex="0">
        <img src="${bannerBg}" alt="${escapeHtml(app.name)}" onerror="this.src='/uploads/icons/default-icon.svg'">
        <div class="hero-card-overlay">
          <div class="flex justify-between items-start">
            <span class="px-2.5 py-1 rounded-full bg-primary-container text-white text-[11px] font-bold tracking-wider uppercase shadow-md">
              DESTAQUE
            </span>
            ${hasUpdate ? '<span class="px-2 py-0.5 rounded-full bg-cyan-500 text-black text-[10px] font-bold animate-pulse">ATUALIZAÇÃO</span>' : ''}
          </div>

          <div>
            <h3 class="hero-card-title">${escapeHtml(app.name)}</h3>
            <p class="hero-card-meta">${escapeHtml(app.developer || 'Comunidade')} • ${app.sizeMb}MB</p>
          </div>
        </div>
      </button>
    `;
  }).join('');
}

// 2. Renderizar Prateleiras por Categoria
function renderShelves() {
  const container = document.getElementById('dynamicShelvesContainer');
  const categories = ['Streaming & Vídeo', 'Jogos', 'Ferramentas & Utilitários', 'Música & Áudio', 'Produtividade'];

  let shelvesHtml = '';

  categories.forEach(cat => {
    const appsInCat = storeApps.filter(a => a.category === cat);
    if (appsInCat.length === 0) return;

    shelvesHtml += `
      <section data-category="${cat}" class="flex flex-col gap-2">
        <h2 class="font-headline text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-secondary-container"></span>
          <span>${cat}</span>
          <span class="text-xs text-gray-500 font-mono">(${appsInCat.length})</span>
        </h2>

        <div class="shelf-row">
          ${appsInCat.map(app => {
            const iconSrc = app.iconUrl || '/uploads/icons/default-icon.svg';
            const isInstalled = !!installedAppsMap[app.packageName];
            const hasUpdate = isInstalled && (Number(app.versionCode) > Number(installedAppsMap[app.packageName].versionCode));

            return `
              <button onclick="openAppDetails('${app.id}')" class="shelf-card shelf-app-card will-change-transform" tabindex="0">
                <div class="shelf-app-thumb">
                  <img src="${iconSrc}" alt="${escapeHtml(app.name)}" onerror="this.src='/uploads/icons/default-icon.svg'">
                  ${hasUpdate ? '<span class="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-cyan-400 text-black text-[9px] font-bold">NOVO</span>' : ''}
                  ${isInstalled && !hasUpdate ? '<span class="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-emerald-500/90 text-white text-[9px] font-bold">INSTALADO</span>' : ''}
                </div>
                <div>
                  <h4 class="shelf-app-name">${escapeHtml(app.name)}</h4>
                  <div class="shelf-app-dev">${escapeHtml(app.developer || 'Comunidade')}</div>
                  <div class="shelf-app-info">
                    <span>${app.sizeMb}MB</span>
                    <span class="flex items-center gap-0.5 text-amber-400 font-bold">★ ${app.rating || 4.8}</span>
                  </div>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      </section>
    `;
  });

  container.innerHTML = shelvesHtml;
}

// 3. Abrir Tela de Detalhes de um App
window.openAppDetails = function(appId) {
  window.lastSelectedCardElement = document.activeElement;
  const app = storeApps.find(a => a.id === appId);
  if (!app) return;

  activeApp = app;

  // Preencher dados na tela de detalhes
  document.getElementById('detailAppName').textContent = app.name;
  document.getElementById('detailAppDeveloper').textContent = app.developer || 'Comunidade IntraStore';
  document.getElementById('detailAppPackage').textContent = app.packageName;
  document.getElementById('detailBreadcrumbCategory').textContent = app.category;
  document.getElementById('detailAppIcon').src = app.iconUrl || '/uploads/icons/default-icon.svg';
  document.getElementById('detailAppRating').textContent = app.rating || '4.8';
  document.getElementById('detailAppSize').textContent = app.sizeMb + ' MB';
  document.getElementById('detailAppVersion').textContent = 'v' + app.versionName + ' (code: ' + app.versionCode + ')';
  document.getElementById('detailAppAgeBadge').textContent = app.ageRating || 'Livre';
  document.getElementById('detailAppDescription').textContent = app.description || 'Nenhuma descrição detalhada fornecida.';
  document.getElementById('detailAppChangelog').textContent = app.changelog || 'Melhorias gerais e correções de bugs.';

  // Permissões
  const permissionsContainer = document.getElementById('detailAppPermissions');
  const perms = Array.isArray(app.permissions) ? app.permissions : (app.permissions ? app.permissions.split(',') : ['Internet']);
  permissionsContainer.innerHTML = perms.map(p => `
    <span class="px-2.5 py-1 rounded-lg bg-surface-container text-[11px] text-gray-300 border border-outline-variant/30">${escapeHtml(p.trim())}</span>
  `).join('');

  // Screenshots
  const screenshotsContainer = document.getElementById('detailScreenshotsContainer');
  if (app.screenshots && app.screenshots.length > 0) {
    screenshotsContainer.innerHTML = app.screenshots.map(s => `
      <img src="${s}" class="h-[180px] rounded-xl object-cover border border-outline-variant/30 flex-shrink-0" onerror="this.style.display='none'">
    `).join('');
  } else {
    screenshotsContainer.innerHTML = `
      <div class="text-xs text-gray-500 py-6 px-4 bg-surface-container rounded-xl">Sem capturas de tela registradas.</div>
    `;
  }

  // Atualizar estado do Botão de Ação (Instalar / Atualizar / Abrir)
  updateActionButtonState();

  navigateTo('details');
};

function updateActionButtonState() {
  if (!activeApp) return;

  const btn = document.getElementById('btnActionApp');
  const icon = document.getElementById('btnActionIcon');
  const text = document.getElementById('btnActionText');

  const installed = installedAppsMap[activeApp.packageName];

  if (!installed) {
    // Não instalado
    btn.className = 'btn-tv w-full py-4 px-6 rounded-xl bg-primary-container hover:bg-purple-600 text-white font-headline text-lg font-bold flex items-center justify-center gap-3 shadow-xl transition-all';
    icon.textContent = 'download';
    text.textContent = 'Instalar no Android TV';
  } else if (Number(activeApp.versionCode) > Number(installed.versionCode)) {
    // Atualização disponível!
    btn.className = 'btn-tv w-full py-4 px-6 rounded-xl bg-accent-cyan hover:bg-cyan-400 text-black font-headline text-lg font-bold flex items-center justify-center gap-3 shadow-xl transition-all animate-pulse';
    icon.textContent = 'upgrade';
    text.textContent = 'Atualizar Aplicativo (Novo)';
  } else {
    // Já instalado e na versão mais recente
    btn.className = 'btn-tv w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-headline text-lg font-bold flex items-center justify-center gap-3 shadow-xl transition-all';
    icon.textContent = 'open_in_new';
    text.textContent = 'Abrir Aplicativo';
  }
}

// ==============================================================
// CALLBACKS NATIVOS ANDROID (DOWNLOAD DIRETO & INSTALADOR AUTOMÁTICO)
// ==============================================================
window.onNativeDownloadStart = function(pkg) {
  const statusText = document.getElementById('downloadStatusText');
  if (statusText) statusText.textContent = 'Baixando pacote do aplicativo...';
};

window.onNativeDownloadProgress = function(percent) {
  const progressFill = document.getElementById('downloadProgressFill');
  const percentage = document.getElementById('downloadPercentage');
  if (progressFill) progressFill.style.width = percent + '%';
  if (percentage) percentage.textContent = percent + '%';
};

window.onNativeDownloadComplete = function(pkg) {
  const statusText = document.getElementById('downloadStatusText');
  const progressFill = document.getElementById('downloadProgressFill');
  const percentage = document.getElementById('downloadPercentage');
  if (progressFill) progressFill.style.width = '100%';
  if (percentage) percentage.textContent = '100%';
  if (statusText) statusText.textContent = 'Abrindo instalador nativo do Android...';

  if (activeApp && activeApp.packageName === pkg) {
    saveInstalledApp(activeApp.packageName, activeApp.versionCode, activeApp.versionName);
    updateActionButtonState();
    checkForPendingUpdates();
    renderShelves();
    showTvToast('Instalador acionado com sucesso!', activeApp.name, 'success');
  }

  setTimeout(() => {
    const progressBar = document.getElementById('downloadProgressBar');
    const btn = document.getElementById('btnActionApp');
    if (progressBar) progressBar.classList.add('hidden');
    if (btn) btn.disabled = false;
  }, 1200);
};

window.onNativeDownloadError = function(errorMsg) {
  const progressBar = document.getElementById('downloadProgressBar');
  const btn = document.getElementById('btnActionApp');
  if (progressBar) progressBar.classList.add('hidden');
  if (btn) btn.disabled = false;
  showTvToast('Erro no download: ' + errorMsg, 'Falha', 'error');
};

// Disparar Ação do Botão (Download e Instalação)
window.handleAppAction = async function() {
  if (!activeApp) return;

  const installed = installedAppsMap[activeApp.packageName];
  const isUpToDate = installed && (Number(activeApp.versionCode) <= Number(installed.versionCode));

  if (isUpToDate) {
    // Abrir o app no Android TV diretamente
    if (window.AndroidBridge && window.AndroidBridge.openApp) {
      window.AndroidBridge.openApp(activeApp.packageName);
    } else {
      showTvToast('Iniciando ' + activeApp.name + ' (' + activeApp.packageName + ')', 'Aplicativo', 'info');
    }
    return;
  }

  // Processo de Download e Instalação / Atualização
  const progressBar = document.getElementById('downloadProgressBar');
  const progressFill = document.getElementById('downloadProgressFill');
  const percentage = document.getElementById('downloadPercentage');
  const statusText = document.getElementById('downloadStatusText');
  const btn = document.getElementById('btnActionApp');

  btn.disabled = true;
  progressBar.classList.remove('hidden');
  progressFill.style.width = '0%';
  percentage.textContent = '0%';
  statusText.textContent = 'Conectando ao servidor...';

  try {
    // 1. Notifica o backend e contabiliza download
    const res = await fetch(API_BASE + '/api/apps/' + activeApp.id + '/download', { method: 'POST' });
    const data = await res.json();

    if (!data.apkUrl) {
      throw new Error('URL do arquivo APK não encontrada no servidor.');
    }

    // 2. Se estiver rodando dentro do APK nativo na Android TV
    if (window.AndroidBridge && window.AndroidBridge.installApk) {
      statusText.textContent = 'Baixando APK em segundo plano...';
      window.AndroidBridge.installApk(data.apkUrl, activeApp.packageName);
      // O progresso e a finalização são controlados por onNativeDownloadProgress e onNativeDownloadComplete
    } else {
      // Fallback para quando o usuário estiver testando no navegador no PC
      for (let p = 0; p <= 100; p += 10) {
        progressFill.style.width = p + '%';
        percentage.textContent = p + '%';
        await new Promise(r => setTimeout(r, 60));
      }

      statusText.textContent = 'Download finalizado no navegador.';
      const link = document.createElement('a');
      link.href = data.apkUrl;
      link.download = data.fileName || (activeApp.name + '.apk');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      saveInstalledApp(activeApp.packageName, activeApp.versionCode, activeApp.versionName);
      showTvToast('Download concluído no navegador!', activeApp.name, 'success');
      updateActionButtonState();
      checkForPendingUpdates();
      renderShelves();

      btn.disabled = false;
      progressBar.classList.add('hidden');
    }

  } catch (err) {
    showTvToast('Erro ao baixar APK: ' + err.message, 'Falha no Download', 'error');
    btn.disabled = false;
    progressBar.classList.add('hidden');
  }
};

// 4. Verificação de Atualizações
async function checkForPendingUpdates() {
  const installedList = Object.keys(installedAppsMap).map(pkg => ({
    packageName: pkg,
    versionCode: installedAppsMap[pkg].versionCode
  }));

  if (installedList.length === 0) return;

  try {
    const res = await fetch(API_BASE + '/api/apps/check-updates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installed: installedList })
    });

    const data = await res.json();
    const updates = data.updatesAvailable || [];

    const badgeTop = document.getElementById('badgeUpdatesTop');
    if (updates.length > 0) {
      badgeTop.textContent = updates.length + ' Atualização(ões)';
      badgeTop.classList.remove('hidden');
    } else {
      badgeTop.classList.add('hidden');
    }

    renderSettingsUpdatesList(updates);

  } catch (err) {
    console.error('Erro checando atualizações:', err);
  }
}

function renderSettingsUpdatesList(updates) {
  const container = document.getElementById('updatesListContainer');
  const badge = document.getElementById('updatesFoundBadge');
  if (!container) return;

  badge.textContent = updates.length;

  if (updates.length === 0) {
    container.innerHTML = `
      <div class="py-10 text-center text-gray-400 bg-surface-container rounded-xl">
        Todos os seus aplicativos instalados estão na versão mais recente!
      </div>
    `;
    return;
  }

  container.innerHTML = updates.map(u => `
    <div class="p-4 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <img src="${u.iconUrl || '/uploads/icons/default-icon.svg'}" class="w-12 h-12 rounded-xl object-cover border border-outline-variant/20">
        <div>
          <div class="font-bold text-white text-sm">${escapeHtml(u.name)}</div>
          <div class="text-xs text-accent-cyan font-mono">Disponível: v${u.newVersionName} (code: ${u.newVersionCode})</div>
          <div class="text-[11px] text-gray-400 mt-0.5">${escapeHtml(u.changelog)}</div>
        </div>
      </div>

      <button onclick="openAppDetails('${u.id}')" class="btn-tv px-4 py-2 rounded-xl bg-accent-cyan text-black font-bold text-xs flex items-center gap-1 transition-all" tabindex="0">
        <span class="material-symbols-outlined text-sm">upgrade</span>
        <span>Atualizar</span>
      </button>
    </div>
  `).join('');
}

window.checkAllUpdates = async function() {
  checkAppStoreUpdate(true);
  const statusEl = document.getElementById('settingsUpdatesStatus');
  statusEl.textContent = 'Consultando servidores da IntraStore TV...';
  loadInstalledApps();
  await checkForPendingUpdates();
  statusEl.textContent = 'Verificação concluída às ' + new Date().toLocaleTimeString();
};

// Navegação entre Vistas SPA (Home, Categorias, Detalhes e Configurações)
window.navigateTo = function(viewName, categoryName = null) {
  // Ajuste visual das abas do menu lateral
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.remove('border-l-4', 'border-secondary-container', 'bg-surface-container/50', 'text-secondary', 'active-tab');
    t.classList.add('text-on-surface-variant');
  });

  if (viewName === 'home') {
    currentView = 'home';
    document.getElementById('viewHome').classList.remove('hidden');
    document.getElementById('viewDetails').classList.add('hidden');
    document.getElementById('viewSettings').classList.add('hidden');

    const navHome = document.getElementById('navHome');
    if (navHome) navHome.classList.add('border-l-4', 'border-secondary-container', 'bg-surface-container/50', 'text-secondary', 'active-tab');

    // Restaurar foco no último card ou no primeiro destaque
    setTimeout(() => {
      if (window.lastSelectedCardElement && document.body.contains(window.lastSelectedCardElement)) {
        window.remoteNav.setFocus(window.lastSelectedCardElement);
      } else {
        const target = document.querySelector('#heroCarouselContainer .shelf-card, .shelf-card');
        if (target) window.remoteNav.setFocus(target);
      }
    }, 80);

  } else if (viewName === 'category') {
    currentView = 'home';
    document.getElementById('viewHome').classList.remove('hidden');
    document.getElementById('viewDetails').classList.add('hidden');
    document.getElementById('viewSettings').classList.add('hidden');

    // Mapear aba da categoria
    let navTabId = 'navHome';
    if (categoryName === 'Streaming & Vídeo') navTabId = 'navApps';
    else if (categoryName === 'Jogos') navTabId = 'navGames';
    else if (categoryName === 'Ferramentas & Utilitários') navTabId = 'navTools';

    const tab = document.getElementById(navTabId);
    if (tab) tab.classList.add('border-l-4', 'border-secondary-container', 'bg-surface-container/50', 'text-secondary', 'active-tab');

    // Localizar a prateleira da categoria e rolar até ela com foco imediato no 1º card
    setTimeout(() => {
      const section = document.querySelector('section[data-category="' + categoryName + '"]');
      if (section) {
        section.scrollIntoView({ behavior: 'auto', block: 'center' });
        const firstCard = section.querySelector('.shelf-card');
        if (firstCard) {
          window.remoteNav.setFocus(firstCard);
        }
      } else {
        showTvToast('Nenhum aplicativo encontrado em ' + categoryName, 'Categoria Vazia', 'info');
      }
    }, 80);

  } else if (viewName === 'details') {
    currentView = 'details';
    document.getElementById('viewHome').classList.add('hidden');
    document.getElementById('viewDetails').classList.remove('hidden');
    document.getElementById('viewSettings').classList.add('hidden');

    setTimeout(() => {
      const btn = document.getElementById('btnActionApp');
      if (btn) window.remoteNav.setFocus(btn);
    }, 80);

  } else if (viewName === 'settings') {
    currentView = 'settings';
    document.getElementById('viewHome').classList.add('hidden');
    document.getElementById('viewDetails').classList.add('hidden');
    document.getElementById('viewSettings').classList.remove('hidden');

    const navSettings = document.getElementById('navSettings');
    if (navSettings) navSettings.classList.add('border-l-4', 'border-secondary-container', 'bg-surface-container/50', 'text-secondary', 'active-tab');

    setTimeout(() => {
      const btn = document.getElementById('btnCheckUpdatesNow');
      if (btn) window.remoteNav.setFocus(btn);
    }, 80);
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.handleExitApp = async function() {
  const confirmed = await showTvConfirm(
    'Sair da IntraStore TV',
    'Deseja realmente fechar a loja e retornar à tela inicial da sua TV?',
    'Sim, Sair',
    'Cancelar',
    true
  );

  if (confirmed) {
    if (window.AndroidBridge && window.AndroidBridge.exitApp) {
      window.AndroidBridge.exitApp();
    } else {
      window.close();
    }
  }
};



// ==============================================================
// SISTEMA DE AUTO UPDATE DA INTRASTORE TV (CLOUDFLARE R2)
// ==============================================================
let appStoreUpdateInfo = null;

function getCurrentStoreVersionCode() {
  if (window.AndroidBridge && typeof window.AndroidBridge.getAppVersionCode === 'function') {
    try {
      return Number(window.AndroidBridge.getAppVersionCode());
    } catch (e) {}
  }
  return 1;
}

function getCurrentStoreVersionName() {
  if (window.AndroidBridge && typeof window.AndroidBridge.getAppVersionName === 'function') {
    try {
      return String(window.AndroidBridge.getAppVersionName());
    } catch (e) {}
  }
  return "1.0.0";
}

async function checkAppStoreUpdate(isManual = false) {
  try {
    const res = await fetch(API_BASE + '/api/app-update');
    if (!res.ok) return;
    const data = await res.json();
    appStoreUpdateInfo = data;

    const currentCode = getCurrentStoreVersionCode();

    if (Number(data.latestVersionCode) > currentCode) {
      openStoreUpdateModal(data);
    } else if (isManual) {
      showTvToast('Sua IntraStore TV já está na versão mais recente (v' + getCurrentStoreVersionName() + ')', 'Loja Atualizada', 'success');
    }
  } catch (err) {
    if (isManual) {
      showTvToast('Falha ao checar atualização: ' + err.message, 'Erro', 'error');
    }
  }
}

function openStoreUpdateModal(data) {
  const modal = document.getElementById('tvUpdateModalOverlay');
  if (!modal) return;

  const versionBadge = document.getElementById('updateModalVersionBadge');
  const titleEl = document.getElementById('updateModalTitle');
  const changelogEl = document.getElementById('updateModalChangelog');
  const progressContainer = document.getElementById('storeUpdateProgressContainer');
  const actions = document.getElementById('storeUpdateModalActions');

  if (versionBadge) versionBadge.textContent = 'v' + data.latestVersionName;
  if (titleEl) titleEl.textContent = data.title || 'Nova Versão da IntraStore TV';
  if (changelogEl) changelogEl.textContent = data.changelog || 'Melhorias de desempenho a 60 FPS, novas rotas e navegação ultra rápida.';
  if (progressContainer) progressContainer.classList.add('hidden');
  if (actions) actions.classList.remove('hidden');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  requestAnimationFrame(() => {
    modal.classList.add('tv-modal-active');
    const confirmBtn = document.getElementById('btnConfirmStoreUpdate');
    if (window.remoteNav && confirmBtn) {
      window.remoteNav.setFocus(confirmBtn, false);
    }
  });
}

window.closeStoreUpdateModal = function() {
  const modal = document.getElementById('tvUpdateModalOverlay');
  if (!modal) return;
  modal.classList.remove('tv-modal-active');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }, 250);
};

window.startAppStoreUpdate = function() {
  if (!appStoreUpdateInfo || !appStoreUpdateInfo.apkUrl) return;

  const actions = document.getElementById('storeUpdateModalActions');
  const progressContainer = document.getElementById('storeUpdateProgressContainer');
  const fill = document.getElementById('storeUpdateProgressFill');
  const percentText = document.getElementById('storeUpdateProgressPercent');
  const statusText = document.getElementById('storeUpdateProgressStatus');

  if (actions) actions.classList.add('hidden');
  if (progressContainer) progressContainer.classList.remove('hidden');

  let apkUrl = appStoreUpdateInfo.apkUrl || appStoreUpdateInfo.apkFallbackUrl;
  if (apkUrl && !apkUrl.startsWith('http')) {
    apkUrl = window.location.origin + (apkUrl.startsWith('/') ? '' : '/') + apkUrl;
  }

  window.onNativeDownloadProgress = function(percent) {
    if (fill) fill.style.width = percent + '%';
    if (percentText) percentText.textContent = percent + '%';
    if (statusText) statusText.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span> Baixando do Cloudflare R2 (' + percent + '%)...';
    if (percent >= 100) {
      if (statusText) statusText.textContent = 'Iniciando instalador da atualização...';
    }
  };

  if (window.AndroidBridge && window.AndroidBridge.installApk) {
    window.AndroidBridge.installApk(apkUrl, "com.intrastore.tv");
  } else {
    let p = 0;
    const interval = setInterval(() => {
      p += 20;
      if (window.onNativeDownloadProgress) window.onNativeDownloadProgress(Math.min(100, p));
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          showTvToast('Download simulado concluído.', 'Sucesso', 'success');
          closeStoreUpdateModal();
        }, 800);
      }
    }, 250);
  }
};

// Disparar checagem automática ao iniciar o app
setTimeout(() => {
  checkAppStoreUpdate(false);
}, 2000);
