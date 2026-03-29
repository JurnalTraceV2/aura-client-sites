import { get, ref } from 'firebase/database';
import { db } from '../../_lib/firebase.js';
import { verifyRequestAuth } from '../../_lib/auth.js';
import { getArtifactConfig } from '../../_lib/artifacts.js';
import { forbidden, getRequestBaseUrl, methodNotAllowed, serverError, unauthorized } from '../../_lib/http.js';
import { getSubscriptionState, writeAuditLog } from '../../_lib/license.js';

const LAUNCHER_LINK_TTL_MS = Number(process.env.LAUNCHER_LINK_TTL_MS || 5 * 60 * 1000);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res);
  }

  try {
    const auth = await verifyRequestAuth(req);
    if (!auth.ok) {
      return unauthorized(res, auth.message || 'Unauthorized.');
    }

    const userSnapshot = await get(ref(db, `users/${auth.uid}`));
    const user = userSnapshot.exists() ? (userSnapshot.val() || {}) : {};
    if (user.banned === true) {
      return forbidden(res, 'Account is banned.');
    }
    const subState = getSubscriptionState(user);
    if (!subState.active) {
      return forbidden(res, 'Subscription inactive.');
    }

    const launcherArtifact = getArtifactConfig('launcher');
    const baseUrl = getRequestBaseUrl(req);
    if (!baseUrl) {
      throw new Error('Cannot determine public base URL for launcher download.');
    }
    const url = `${baseUrl}/downloads/AuraLauncher.exe`;
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
      version: launcherArtifact.version
    });
  } catch (error) {
    console.error('account/download/launcher-url error:', error);
    return serverError(res, 'Internal server error.', error?.message);
  }
}
