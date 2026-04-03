import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function toAbsolutePath(artifactPath) {
  const raw = String(artifactPath || '').trim();
  if (!raw) {
    return '';
  }
  if (path.isAbsolute(raw)) {
    return raw;
  }
  return path.resolve(process.cwd(), raw);
}

function parsePositiveNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function computeSha256Hex(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function inferContentType(fileName, fallback) {
  const lower = String(fileName || '').toLowerCase();
  if (lower.endsWith('.zip')) {
    return 'application/zip';
  }
  if (lower.endsWith('.jar')) {
    return 'application/java-archive';
  }
  if (lower.endsWith('.exe')) {
    return 'application/vnd.microsoft.portable-executable';
  }
  return fallback;
}

function clientConfig() {
  const fileName = String(process.env.CLIENT_ARTIFACT_NAME || 'AuraClient.jar').trim();
  return {
    type: 'client',
    absolutePath: toAbsolutePath(process.env.CLIENT_ARTIFACT_PATH || process.env.CLIENT_JAR_PATH || 'public/downloads/AuraClient.jar'),
    fileName,
    version: String(process.env.CLIENT_VERSION || '1.0.0').trim(),
    hash: String(process.env.CLIENT_SHA256 || '').trim().toLowerCase(),
    size: parsePositiveNumber(process.env.CLIENT_SIZE, 0),
    contentType: String(process.env.CLIENT_ARTIFACT_CONTENT_TYPE || inferContentType(fileName, 'application/java-archive')).trim()
  };
}

function launcherConfig() {
  const fileName = String(process.env.LAUNCHER_ARTIFACT_NAME || 'AuraLauncher.exe').trim();
  return {
    type: 'launcher',
    absolutePath: toAbsolutePath(process.env.LAUNCHER_ARTIFACT_PATH || 'artifacts/AuraLauncher.exe'),
    fileName,
    version: String(process.env.LAUNCHER_VERSION || '1.0.0').trim(),
    hash: String(process.env.LAUNCHER_SHA256 || '').trim().toLowerCase(),
    size: parsePositiveNumber(process.env.LAUNCHER_SIZE, 0),
    contentType: String(process.env.LAUNCHER_ARTIFACT_CONTENT_TYPE || inferContentType(fileName, 'application/octet-stream')).trim()
  };
}

function jreConfig() {
  const fileName = String(process.env.JRE_ARTIFACT_NAME || 'jre.zip').trim();
  return {
    type: 'jre',
    absolutePath: toAbsolutePath(process.env.JRE_ARTIFACT_PATH || 'artifacts/jre.zip'),
    fileName,
    version: String(process.env.JRE_VERSION || '21').trim(),
    hash: String(process.env.JRE_SHA256 || '').trim().toLowerCase(),
    size: parsePositiveNumber(process.env.JRE_SIZE, 0),
    contentType: String(process.env.JRE_ARTIFACT_CONTENT_TYPE || inferContentType(fileName, 'application/zip')).trim()
  };
}

function assetsConfig() {
  const fileName = String(process.env.ASSETS_ARTIFACT_NAME || 'MinecraftAssets.zip').trim();
  return {
    type: 'assets',
    absolutePath: toAbsolutePath(process.env.ASSETS_ARTIFACT_PATH || 'artifacts/MinecraftAssets.zip'),
    fileName,
    version: String(process.env.ASSETS_VERSION || '1.0.0').trim(),
    hash: String(process.env.ASSETS_SHA256 || '').trim().toLowerCase(),
    size: parsePositiveNumber(process.env.ASSETS_SIZE, 0),
    contentType: String(process.env.ASSETS_ARTIFACT_CONTENT_TYPE || inferContentType(fileName, 'application/zip')).trim()
  };
}

export function getArtifactConfig(type) {
  const kind = String(type || '').trim().toLowerCase();
  if (kind === 'client') {
    return clientConfig();
  }
  if (kind === 'launcher') {
    return launcherConfig();
  }
  if (kind === 'jre') {
    return jreConfig();
  }
  if (kind === 'assets') {
    return assetsConfig();
  }

  throw new Error(`Unsupported artifact type: ${type}`);
}

export function readArtifactMeta(type) {
  const cfg = getArtifactConfig(type);
  if (!cfg.absolutePath) {
    throw new Error(`Artifact path is not configured for type: ${type}`);
  }
  if (!fs.existsSync(cfg.absolutePath)) {
    throw new Error(`Artifact file not found: ${cfg.absolutePath}`);
  }

  const actualHash = computeSha256Hex(cfg.absolutePath);
  const actualSize = fs.statSync(cfg.absolutePath).size;

  let hash = cfg.hash || actualHash;
  let size = cfg.size || actualSize;

  // Keep launcher/client delivery resilient: if env metadata is stale,
  // return real file values so manifest verification stays in sync.
  if (hash !== actualHash) {
    hash = actualHash;
  }
  if (size !== actualSize) {
    size = actualSize;
  }

  return {
    ...cfg,
    hash,
    size
  };
}
