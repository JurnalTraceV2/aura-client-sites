import { verifyRequestAuth } from '../_lib/auth.js';
import { badRequest, getBody, methodNotAllowed, serverError, tooManyRequests, unauthorized } from '../_lib/http.js';
import { checkRateLimit, getClientIp } from '../_lib/rate-limit.js';
import { redeemSubscriptionKey } from '../_lib/subscription-keys.js';

const REDEEM_LIMIT = Number(process.env.SUBSCRIPTION_KEY_REDEEM_RATE_LIMIT || 10);
const REDEEM_WINDOW_MS = Number(process.env.SUBSCRIPTION_KEY_REDEEM_WINDOW_MS || 10 * 60 * 1000);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  const ip = getClientIp(req);
  const ipLimit = checkRateLimit(`key-redeem:ip:${ip}`, REDEEM_LIMIT, REDEEM_WINDOW_MS);
  if (!ipLimit.allowed) {
    return tooManyRequests(res, ipLimit.retryAfterMs);
  }

  try {
    const auth = await verifyRequestAuth(req, String(getBody(req).idToken || ''));
    if (!auth.ok) {
      return unauthorized(res, auth.message || 'Unauthorized.');
    }

    const userLimit = checkRateLimit(`key-redeem:uid:${auth.uid}`, REDEEM_LIMIT, REDEEM_WINDOW_MS);
    if (!userLimit.allowed) {
      return tooManyRequests(res, userLimit.retryAfterMs);
    }

    const key = String(getBody(req).key || '').trim();
    if (!key) {
      return badRequest(res, 'key is required.');
    }

    const result = await redeemSubscriptionKey({ rawKey: key, uid: auth.uid });
    if (!result.ok) {
      return res.status(result.status || 400).json({ ok: false, error: result.message || 'Key redemption failed.' });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('account/redeem-key error:', error);
    return serverError(res, 'Internal server error.', error?.message);
  }
}
