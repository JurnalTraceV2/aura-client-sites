import { ref, update } from 'firebase/database';
import { db } from '../_lib/firebase.js';
import { badRequest, forbidden, getBody, methodNotAllowed, serverError } from '../_lib/http.js';
import { revokeAllSessionsForUid, writeAuditLog } from '../_lib/license.js';

function hasAdminAccess(req) {
  const expectedSecret = String(process.env.ADMIN_API_SECRET || '').trim();
  if (!expectedSecret) {
    return false;
  }

  const incoming = String(req.headers['x-admin-secret'] || '').trim();
  return !!incoming && incoming === expectedSecret;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  if (!hasAdminAccess(req)) {
    return forbidden(res, 'Invalid admin secret.');
  }

  const body = getBody(req);
  const uid = String(body.uid || '').trim();
  const reason = String(body.reason || 'manual_revoke').trim().slice(0, 250);
  const ban = body.ban === true;

  if (!uid) {
    return badRequest(res, 'uid is required.');
  }

  try {
    const revokedCount = await revokeAllSessionsForUid(uid);
    if (ban) {
      await update(ref(db, `users/${uid}`), {
        banned: true,
        bannedAt: Date.now(),
        bannedReason: reason || null
      });
    }

    await writeAuditLog('admin_sessions_revoked', {
      uid,
      revokedCount,
      ban,
      reason
    });

    return res.status(200).json({
      ok: true,
      uid,
      revokedCount,
      banned: ban
    });
  } catch (error) {
    console.error('admin/revoke-sessions error:', error);
    return serverError(res, 'Internal server error.', error?.message);
  }
}
