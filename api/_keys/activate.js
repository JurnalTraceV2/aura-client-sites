import { normalizeKey, activateKey } from '../_lib/keys.js';
import { verifyRequestAuth } from '../_lib/auth.js';
import { methodNotAllowed, badRequest, unauthorized, serverError, tooManyRequests } from '../_lib/http.js';
import { checkRateLimit, getClientIp } from '../_lib/rate-limit.js';
import { normalizeHwidHash, writeAuditLog } from '../_lib/license.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  try {
    // Rate limit key activations
    const clientIp = getClientIp(req);
    const rateLimit = await checkRateLimit('key_activate', clientIp, 10, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return tooManyRequests(res, rateLimit.retryAfterMs);
    }

    // Verify user authentication
    const auth = await verifyRequestAuth(req);
    if (!auth.ok) {
      return unauthorized(res, auth.message || 'Unauthorized');
    }

    const body = req.body || {};
    const keyId = normalizeKey(body.key);
    
    if (!keyId || keyId.length !== 16) {
      return badRequest(res, 'Invalid key format');
    }

    const hwidHash = normalizeHwidHash(body.hwid);
    const ip = getClientIp(req);

    const result = await activateKey(keyId, {
      uid: auth.uid,
      hwidHash,
      ip
    });

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: result.error
      });
    }

    await writeAuditLog('key_activated', {
      uid: auth.uid,
      keyId,
      tier: result.tier,
      ip
    });

    return res.status(200).json({
      ok: true,
      tier: result.tier,
      expiresAt: result.expiresAt,
      message: 'Key activated successfully'
    });
  } catch (error) {
    console.error('keys/activate error:', error);
    return serverError(res, 'Failed to activate key', error?.message);
  }
}
