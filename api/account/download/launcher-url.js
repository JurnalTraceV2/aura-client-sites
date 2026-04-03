import { get, ref } from 'firebase/database';
import { db } from '../../_lib/firebase.js';
import { verifyRequestAuth } from '../../_lib/auth.js';
import { getArtifactConfig } from '../../_lib/artifacts.js';
import { forbidden, methodNotAllowed, unauthorized } from '../../_lib/http.js';
import { getEntitlement, resolveEntitlementState, writeAuditLog } from '../../_lib/license.js';
import { buildArtifactDownloadUrl, createDownloadToken } from '../../_lib/download-links.js';

const LAUNCHER_LINK_TTL_MS = Number(process.env.LAUNCHER_LINK_TTL_MS || 5 * 60 * 1000);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res);
  }

  try {
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
      .split(',')[0]
      .trim();
    const auth = await verifyRequestAuth(req);
    if (!auth.ok) {
      return unauthorized(res, auth.message || 'Unauthorized.');
    }

    const userSnapshot = await get(ref(db, `users/${auth.uid}`));
    const user = userSnapshot.exists() ? (userSnapshot.val() || {}) : {};
    if (user.banned === true) {
      return forbidden(res, 'Account is banned.');
    }
    const entitlement = await getEntitlement(auth.uid);
    const entitlementState = resolveEntitlementState(user, entitlement);
    if (!entitlementState.active) {
      return forbidden(res, 'Subscription inactive.');
    }

    const launcherArtifact = getArtifactConfig('launcher');
    const token = createDownloadToken({
      type: 'launcher',
      uid: auth.uid,
      artifactName: launcherArtifact.fileName,
      ip
    });
    const url = buildArtifactDownloadUrl(req, token.token);
    const expiresAt = Date.now() + LAUNCHER_LINK_TTL_MS;

    await writeAuditLog('launcher_download_link_issued', {
      uid: auth.uid,
      email: user.email || auth.email || null,
      expiresAt,
      mode: 'public_downloads'
    });

    return res.status(200).json({
      ok: true,
      url,
      expiresAt,
      sha256: launcherArtifact.hash || '',
      version: launcherArtifact.version,
      artifactName: launcherArtifact.fileName
    });
  } catch (error) {
    console.error('account/download/launcher-url error:', error);
    return res.status(503).json({
      ok: false,
      error: 'Launcher download temporarily unavailable.',
      details: error?.message || 'Unknown internal error.'
    });
  }
}
