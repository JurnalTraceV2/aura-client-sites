import { normalizeKey, activateKey } from '../_lib/keys.js';
import { verifyRequestAuth } from '../_lib/auth.js';
import { methodNotAllowed, badRequest, unauthorized, getBody } from '../_lib/http.js';
import { getClientIp } from '../_lib/rate-limit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  try {
    // Verify user authentication
    const authResult = await verifyRequestAuth(req);
    if (!authResult.ok) {
      return unauthorized(res, authResult.message || 'Unauthorized');
    }

    const body = getBody(req);
    const keyId = normalizeKey(body.key);

    if (!keyId || keyId.length !== 16) {
      return badRequest(res, 'Invalid key format');
    }

    const ip = getClientIp(req);

    console.log('[keys/activate] uid:', authResult.uid, 'key:', keyId);
    const result = await activateKey(keyId, {
      uid: authResult.uid,
      hwidHash: null,
      ip
    });

    if (!result.success) {
      console.warn('[keys/activate] activation failed:', result.error, 'step:', result.step);
      return res.status(400).json({
        ok: false,
        error: result.error,
        step: result.step || null
      });
    }

    console.log('[keys/activate] success! tier:', result.tier);
    return res.status(200).json({
      ok: true,
      tier: result.tier,
      expiresAt: result.expiresAt,
      message: 'Key activated successfully'
    });
  } catch (error) {
    console.error('[keys/activate] unhandled error:', error);
    return res.status(500).json({
      ok: false,
      error: 'Server error: ' + (error?.message || 'unknown'),
      stack: process.env.NODE_ENV !== 'production' ? error?.stack : undefined
    });
  }
}
