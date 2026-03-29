import crypto from 'crypto';
import { readArtifactMeta } from '../_lib/artifacts.js';
import { buildArtifactDownloadUrl, createDownloadToken } from '../_lib/download-links.js';
import { badRequest, getBody, methodNotAllowed, normalizePem, serverError, tooManyRequests } from '../_lib/http.js';
import { normalizeHwidHash, verifySessionToken, writeAuditLog } from '../_lib/license.js';
import { checkRateLimit, getClientIp } from '../_lib/rate-limit.js';

const MANIFEST_LIMIT = Number(process.env.LAUNCHER_MANIFEST_RATE_LIMIT || 120);
const MANIFEST_WINDOW_MS = Number(process.env.LAUNCHER_MANIFEST_WINDOW_MS || 10 * 60 * 1000);
const MANIFEST_TTL_MS = Number(process.env.MANIFEST_TTL_MS || 60 * 1000);

function resolveSigningKey() {
  const currentKid = String(process.env.MANIFEST_CURRENT_KID || '').trim();
  const keysJsonRaw = String(process.env.MANIFEST_PRIVATE_KEYS_JSON || '').trim();

  if (keysJsonRaw) {
    let parsed;
    try {
      parsed = JSON.parse(keysJsonRaw);
    } catch (error) {
      throw new Error('MANIFEST_PRIVATE_KEYS_JSON is not valid JSON.');
    }

    if (parsed && typeof parsed === 'object') {
      const keysObject = parsed.keys && typeof parsed.keys === 'object' ? parsed.keys : parsed;
      const preferredKid = String(parsed.current || currentKid || '').trim();

      if (preferredKid && keysObject[preferredKid]) {
        const preferredKey = normalizePem(keysObject[preferredKid]);
        if (preferredKey) {
          return { kid: preferredKid, privateKeyPem: preferredKey };
        }
      }

      const firstKid = Object.keys(keysObject)[0];
      if (firstKid) {
        const firstKey = normalizePem(keysObject[firstKid]);
        if (firstKey) {
          return { kid: firstKid, privateKeyPem: firstKey };
        }
      }
    }
  }

  const legacyKey = normalizePem(process.env.MANIFEST_PRIVATE_KEY_PEM);
  if (legacyKey) {
    return {
      kid: currentKid || 'legacy-v1',
      privateKeyPem: legacyKey
    };
  }

  throw new Error('Manifest key is not configured. Set MANIFEST_PRIVATE_KEYS_JSON or MANIFEST_PRIVATE_KEY_PEM.');
}

function signManifestPayload(payload, privateKeyPem) {
  const payloadJson = JSON.stringify(payload);
  const signature = crypto.sign(null, Buffer.from(payloadJson, 'utf8'), privateKeyPem).toString('base64');
  return { payloadJson, signature };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  const ip = getClientIp(req);
  const limit = checkRateLimit(`launcher-manifest:${ip}`, MANIFEST_LIMIT, MANIFEST_WINDOW_MS);
  if (!limit.allowed) {
    return tooManyRequests(res, limit.retryAfterMs);
  }

  const body = getBody(req);
  const sessionToken = String(body.sessionToken || body.token || '').trim();
  const hwidHash = normalizeHwidHash(body.hwidHash || body.hwid || '');

  if (!sessionToken || !hwidHash) {
    return badRequest(res, 'sessionToken and hwidHash are required.');
  }

  try {
    const verification = await verifySessionToken(sessionToken, hwidHash, { touchSession: true });
    if (!verification.valid) {
      await writeAuditLog('launcher_manifest_denied', {
        ip,
        hwidHash,
        reason: verification.message || 'session_invalid'
      });

      return res.status(403).json({
        ok: false,
        error: verification.message || 'Session invalid.'
      });
    }

    const { kid, privateKeyPem } = resolveSigningKey();
    const artifact = readArtifactMeta('client');
    const token = createDownloadToken({
      type: 'client',
      uid: verification.uid
    });
    const artifactUrl = buildArtifactDownloadUrl(req, token.token);

    const issuedAt = Date.now();
    const expiresAt = issuedAt + MANIFEST_TTL_MS;
    const payload = {
      version: artifact.version,
      url: artifactUrl,
      hash: artifact.hash,
      size: artifact.size,
      timestamp: issuedAt,
      expiresAt,
      nonce: crypto.randomBytes(16).toString('hex'),
      uidShort: verification.uidShort,
      subscription: verification.subscription
    };

    const { payloadJson, signature } = signManifestPayload(payload, privateKeyPem);

    await writeAuditLog('launcher_manifest_issued', {
      ip,
      uid: verification.uid,
      uidShort: verification.uidShort,
      hwidHash,
      expiresAt,
      version: artifact.version,
      kid
    });

    return res.status(200).json({
      ok: true,
      algorithm: 'ed25519',
      kid,
      payload: payloadJson,
      signature
    });
  } catch (error) {
    console.error('launcher/manifest error:', error);
    return serverError(res, 'Internal server error.', error?.message);
  }
}
