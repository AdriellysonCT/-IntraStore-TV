const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const CONFIG_FILE = path.join(__dirname, 'data', 'r2_config.json');

function getR2Config() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Erro lendo r2_config.json:', e);
  }

  return {
    enabled: true,
    accountId: '4f2fa31e86b6c3fafeb07891045ad737',
    accessKeyId: '4bd8e7e2f1dcba43f0d03c4dfada47f9',
    secretAccessKey: '266506e22d98653424f02bf01eed4f1d9a865f4e18462932f125c97d6da95a3e',
    endpoint: 'https://4f2fa31e86b6c3fafeb07891045ad737.r2.cloudflarestorage.com',
    bucketName: 'intrastore-apks',
    publicUrl: 'https://pub-1ed4a80b7670434e93f65e2e7091f1b2.r2.dev'
  };
}

function saveR2Config(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
}

function getS3Client() {
  const config = getR2Config();
  if (!config.enabled || !config.accessKeyId || !config.secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED'
  });
}

/**
 * Envia um arquivo para o Cloudflare R2.
 * Caso o R2 falhe ou não tenha permissão de escrita, retorna null para ativar o fallback local.
 */
async function uploadToR2(localFilePath, r2Key, contentType = 'application/octet-stream') {
  const s3 = getS3Client();
  const config = getR2Config();

  if (!s3 || !fs.existsSync(localFilePath)) {
    return null;
  }

  try {
    const fileStream = fs.readFileSync(localFilePath);
    await s3.send(new PutObjectCommand({
      Bucket: config.bucketName,
      Key: r2Key,
      Body: fileStream,
      ContentType: contentType
    }));

    const cleanBaseUrl = config.publicUrl.replace(/\/$/, '');
    const cleanKey = r2Key.replace(/^\//, '');
    const finalUrl = cleanBaseUrl + '/' + cleanKey;

    console.log('[Cloudflare R2] Arquivo enviado com sucesso:', finalUrl);
    return finalUrl;
  } catch (err) {
    console.warn('[Cloudflare R2] Falha no upload para o R2 (' + err.message + '). Usando armazenamento local como fallback.');
    return null;
  }
}

async function testR2Connection() {
  const s3 = getS3Client();
  const config = getR2Config();
  if (!s3) return { success: false, message: 'R2 desativado ou credenciais ausentes.' };

  try {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: config.bucketName, MaxKeys: 5 }));
    return {
      success: true,
      bucketName: config.bucketName,
      filesCount: (res.Contents || []).length,
      publicUrl: config.publicUrl
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

module.exports = {
  getR2Config,
  saveR2Config,
  uploadToR2,
  testR2Connection
};
