import fs from 'fs';
import { get, ref } from 'firebase/database';
import { db } from '../_lib/firebase.js';
import { readArtifactMeta } from '../_lib/artifacts.js';
import { verifyDownloadToken } from '../_lib/download-links.js';

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
  if (!type || !uid) {
    return res.status(403).json({ ok: false, error: 'Download token payload is invalid.' });
  }

  try {
    const userSnapshot = await get(ref(db, `users/${uid}`));
    const user = userSnapshot.exists() ? (userSnapshot.val() || {}) : {};
    if (user.banned === true) {
      return res.status(403).json({ ok: false, error: 'Account is banned.' });
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
