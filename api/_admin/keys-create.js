import { verifyRequestAuth } from '../_lib/auth.js';
import { forbidden, getBody, methodNotAllowed, serverError, tooManyRequests, unauthorized } from '../_lib/http.js';
import { checkRateLimit, getClientIp } from '../_lib/rate-limit.js';
import { createSubscriptionKey, requireAdminUser } from '../_lib/subscription-keys.js';

const CREATE_LIMIT = Number(process.env.ADMIN_KEY_CREATE_RATE_LIMIT || 60);
const CREATE_WINDOW_MS = Number(process.env.ADMIN_KEY_CREATE_WINDOW_MS || 10 * 60 * 1000);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  const ip = getClientIp(req);
  const limit = checkRateLimit(`admin-key-create:${ip}`, CREATE_LIMIT, CREATE_WINDOW_MS);
  if (!limit.allowed) {
    return tooManyRequests(res, limit.retryAfterMs);
  }

  try {
    const auth = await verifyRequestAuth(req, String(getBody(req).idToken || ''));
    if (!auth.ok) {
      return unauthorized(res, auth.message || 'Unauthorized.');
    }

    const adminCheck = await requireAdminUser(auth);
    if (!adminCheck.ok) {
      return adminCheck.status === 401
        ? unauthorized(res, adminCheck.message)
        : forbidden(res, adminCheck.message);
    }

    const body = getBody(req);
    const result = await createSubscriptionKey({
      createdBy: auth.uid,
      planRaw: body.plan,
      durationDaysRaw: body.durationDays,
      noteRaw: body.note
    });

    if (!result.ok) {
      return res.status(400).json({ ok: false, error: result.message });
    }

    return res.status(200).json({
      ok: true,
      key: result.key,
      record: result.record
    });
  } catch (error) {
    console.error('admin/keys/create error:', error);
    return serverError(res, 'Internal server error.', error?.message);
  }
}
