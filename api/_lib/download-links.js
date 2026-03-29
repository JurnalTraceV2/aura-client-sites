import crypto from 'crypto';
import { getRequestBaseUrl } from './http.js';

const DOWNLOAD_LINK_TTL_MS = Number(process.env.DOWNLOAD_LINK_TTL_MS || 5 * 60 * 1000);

function getSigningSecret() {
  const explicit = String(process.env.DOWNLOAD_LINK_SECRET || '').trim();
  if (explicit) {
    return explicit;
  }

  // Fallback to server-only secrets so production does not fail with 500
  // when DOWNLOAD_LINK_SECRET was not configured in Vercel env.
  const fromManifestLegacy = String(process.env.MANIFEST_PRIVATE_KEY_PEM || '').trim();
  if (fromManifestLegacy) {
    return fromManifestLegacy;
  }

  const fromManifestRing = String(process.env.MANIFEST_PRIVATE_KEYS_JSON || '').trim();
  if (fromManifestRing) {
    return fromManifestRing;
  }

  const fromAdminSecret = String(process.env.ADMIN_API_SECRET || '').trim();
  if (fromAdminSecret) {
    return fromAdminSecret;
  }

  return '';
}

function signPayload(encodedPayload) {
  const secret = getSigningSecret();
  if (!secret) {
    throw new Error('Download link signing secret is not configured.');
  }
  return crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

export function createDownloadToken(payload, ttlMs = DOWNLOAD_LINK_TTL_MS) {
  const expiresAt = Date.now() + ttlMs;
  const envelope = {
    ...payload,
    exp: expiresAt
  };
  const encoded = Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64url');
  const signature = signPayload(encoded);
  return {
    token: `${encoded}.${signature}`,
    expiresAt
  };
}

export function verifyDownloadToken(token, expectedType = '') {
  const raw = String(token || '').trim();
  if (!raw.includes('.')) {
    return { valid: false, message: 'Malformed token.' };
  }

  const [encoded, signature] = raw.split('.', 2);
  const expectedSignature = signPayload(encoded);
  if (!safeEqual(signature, expectedSignature)) {
    return { valid: false, message: 'Invalid token signature.' };
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch (error) {
    return { valid: false, message: 'Invalid token payload.' };
  }

  const now = Date.now();
  const expiresAt = Number(payload?.exp || 0);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    return { valid: false, message: 'Token expired.' };
  }

  if (expectedType && String(payload?.type || '') !== expectedType) {
    return { valid: false, message: 'Token type mismatch.' };
  }

  return { valid: true, payload };
}

export function buildArtifactDownloadUrl(req, token) {
  const baseUrl = getRequestBaseUrl(req);
  if (!baseUrl) {
    throw new Error('Cannot determine public base URL for download link.');
  }
  return `${baseUrl}/api/download/artifact?token=${encodeURIComponent(token)}`;
}
