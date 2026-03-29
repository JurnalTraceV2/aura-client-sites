import { get, ref } from 'firebase/database';
import { db } from '../../_lib/firebase.js';
import { verifyRequestAuth } from '../../_lib/auth.js';
import { buildArtifactDownloadUrl, createDownloadToken } from '../../_lib/download-links.js';
import { readArtifactMeta } from '../../_lib/artifacts.js';
import { forbidden, methodNotAllowed, serverError, unauthorized } from '../../_lib/http.js';
import { getSubscriptionState, writeAuditLog } from '../../_lib/license.js';

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

    const launcherArtifact = readArtifactMeta('launcher');
    const token = createDownloadToken({
      type: 'launcher',
      uid: auth.uid
    });

    const url = buildArtifactDownloadUrl(req, token.token);

    await writeAuditLog('launcher_download_link_issued', {
      uid: auth.uid,
      email: user.email || auth.email || null,
      expiresAt: token.expiresAt
    });

    return res.status(200).json({
      ok: true,
      url,
      expiresAt: token.expiresAt,
      sha256: launcherArtifact.hash,
      version: launcherArtifact.version
    });
  } catch (error) {
    console.error('account/download/launcher-url error:', error);
    return serverError(res, 'Internal server error.', error?.message);
  }
}
