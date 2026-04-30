import { normalizeKey, activateKey } from '../_lib/keys.js';
import { verifyRequestAuth } from '../_lib/auth.js';
import { methodNotAllowed, badRequest, unauthorized, serverError, tooManyRequests, getBody, extractBearerToken } from '../_lib/http.js';
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
    const authResult = await verifyRequestAuth(req);
    if (!authResult.ok) {
      return unauthorized(res, authResult.message || 'Unauthorized');
    }

    const idToken = extractBearerToken(req);

    const body = getBody(req);
    const keyId = normalizeKey(body.key);
    
    if (!keyId || keyId.length !== 16) {
      return badRequest(res, 'Invalid key format');
    }

    const hwidHash = normalizeHwidHash(body.hwid);
    const ip = getClientIp(req);

    console.log('[keys/activate] Activating key:', keyId, 'for uid:', authResult.uid);
    const result = await activateKey(keyId, {
      uid: authResult.uid,
      hwidHash,
      ip,
      idToken
    });

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: result.error
      });
    }

    // Audit log is non-fatal
    try {
      await writeAuditLog('key_activated', {
        uid: authResult.uid,
        keyId,
        tier: result.tier,
        ip
      });
    } catch (auditErr) {
      console.warn('[keys/activate] writeAuditLog failed (non-fatal):', auditErr?.message);
    }

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
