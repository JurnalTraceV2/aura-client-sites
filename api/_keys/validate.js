import { normalizeKey, validateKey } from '../_lib/keys.js';
import { methodNotAllowed, badRequest, serverError, getBody } from '../_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  try {
    const body = getBody(req);
    const keyId = normalizeKey(body.key);
    
    if (!keyId || keyId.length !== 16) {
      return badRequest(res, 'Invalid key format');
    }
    
    console.log('[keys/validate] Looking up key:', keyId, 'formatted:', normalizeKey(keyId));
    const result = await validateKey(keyId);
    console.log('[keys/validate] Result:', result.valid, result.reason || 'ok');

    return res.status(200).json({
      ok: true,
      valid: result.valid,
      reason: result.reason || null,
      tier: result.tier || null,
      remainingActivations: result.remainingActivations || 0
    });
  } catch (error) {
    console.error('keys/validate error:', error);
    return serverError(res, 'Failed to validate key', error?.message);
  }
}
