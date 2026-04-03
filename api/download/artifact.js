import fs from 'fs';
import { get, ref, set } from 'firebase/database';
import { db } from '../_lib/firebase.js';
import { readArtifactMeta } from '../_lib/artifacts.js';
import { verifyDownloadToken } from '../_lib/download-links.js';
import { createHash } from 'crypto';
import { getEntitlement, resolveEntitlementState, writeAuditLog } from '../_lib/license.js';

function readQueryToken(req) {
  const token = req?.query?.token;
  if (Array.isArray(token)) {
    return token[0] || '';
  }
  return String(token || '').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = readQueryToken(req);
  const verified = verifyDownloadToken(token);
  if (!verified.valid) {
    return res.status(403).json({ ok: false, error: verified.message || 'Download link is invalid.' });
  }

  const payload = verified.payload || {};
  const type = String(payload.type || '').trim();
  const uid = String(payload.uid || '').trim();
  const jti = String(payload.jti || '').trim();
  if (!type || !uid || !jti) {
    return res.status(403).json({ ok: false, error: 'Download token payload is invalid.' });
  }
  if (!['launcher', 'client'].includes(type)) {
    return res.status(403).json({ ok: false, error: 'Unsupported artifact type.' });
  }

  try {
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    if (payload.ip && String(payload.ip).trim() !== ip) {
      return res.status(403).json({ ok: false, error: 'Download token IP mismatch.' });
    }

    const usedTokenKey = createHash('sha256').update(`${uid}:${jti}`, 'utf8').digest('hex');
    const usedSnapshot = await get(ref(db, `used_download_tokens/${usedTokenKey}`));
    if (usedSnapshot.exists()) {
      return res.status(403).json({ ok: false, error: 'Download token already used.' });
    }

    const userSnapshot = await get(ref(db, `users/${uid}`));
    const user = userSnapshot.exists() ? (userSnapshot.val() || {}) : {};
    if (user.banned === true) {
      return res.status(403).json({ ok: false, error: 'Account is banned.' });
    }
    const entitlement = await getEntitlement(uid);
    const entitlementState = resolveEntitlementState(user, entitlement);
    if (!entitlementState.active) {
      return res.status(403).json({ ok: false, error: 'Subscription inactive.' });
    }

    const artifact = readArtifactMeta(type);
    if (!fs.existsSync(artifact.absolutePath)) {
      return res.status(404).json({ ok: false, error: 'Artifact not found.' });
    }

    res.setHeader('Content-Type', artifact.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', String(artifact.size));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', `attachment; filename="${artifact.fileName}"`);
    res.setHeader('X-Artifact-Version', artifact.version);
    res.setHeader('X-Artifact-Sha256', artifact.hash);
    await writeAuditLog('artifact_download_started', {
      uid,
      type,
      artifactName: artifact.fileName,
      ip
    });
    await set(ref(db, `used_download_tokens/${usedTokenKey}`), {
      uid,
      type,
      jti,
      usedAt: Date.now(),
      ip
    });

    const stream = fs.createReadStream(artifact.absolutePath);
    stream.on('error', (error) => {
      console.error('download stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ ok: false, error: 'Failed to stream artifact.' });
      } else {
        res.end();
      }
    });

    stream.pipe(res);
  } catch (error) {
    console.error('download/artifact error:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error.' });
  }
}
