import { verifyRequestAuth } from '../_lib/auth.js';
import { consumeManualHwidReset, writeAuditLog } from '../_lib/license.js';
import { badRequest, methodNotAllowed, serverError, unauthorized } from '../_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  try {
    const auth = await verifyRequestAuth(req);
    if (!auth.ok) {
      return unauthorized(res, auth.message || 'Unauthorized.');
    }

    const result = await consumeManualHwidReset(auth.uid);
    if (!result.ok) {
      return badRequest(res, result.message || 'Failed to reset HWID.');
    }

    await writeAuditLog('manual_hwid_reset_success', {
      uid: auth.uid,
      username: auth.username || null,
      remainingResetCredits: result.remainingResetCredits
    });

    return res.status(200).json({
      ok: true,
      message: 'HWID reset completed.',
      remainingResetCredits: result.remainingResetCredits,
      resetWindowStart: result.resetWindowStart
    });
  } catch (error) {
    console.error('account/hwid-reset error:', error);
    return serverError(res, 'Internal server error.', error?.message);
  }
}
