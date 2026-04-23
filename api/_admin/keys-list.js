import { verifyRequestAuth } from '../_lib/auth.js';
import { forbidden, methodNotAllowed, serverError, unauthorized } from '../_lib/http.js';
import { listSubscriptionKeys, requireAdminUser } from '../_lib/subscription-keys.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res);
  }

  try {
    const auth = await verifyRequestAuth(req);
    if (!auth.ok) {
      return unauthorized(res, auth.message || 'Unauthorized.');
    }

    const adminCheck = await requireAdminUser(auth);
    if (!adminCheck.ok) {
      return adminCheck.status === 401
        ? unauthorized(res, adminCheck.message)
        : forbidden(res, adminCheck.message);
    }

    const keys = await listSubscriptionKeys(25);
    return res.status(200).json({ ok: true, keys });
  } catch (error) {
    console.error('admin/keys/list error:', error);
    return serverError(res, 'Internal server error.', error?.message);
  }
}
