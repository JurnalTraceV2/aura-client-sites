import { badRequest, getBody, methodNotAllowed, serverError, unauthorized, forbidden } from '../../_lib/http.js';
import { verifyLaunchToken } from '../../_lib/tokens.js';
import { writeAuditLog, normalizeHwidHash } from '../../_lib/license.js';
import { getClientIp } from '../../_lib/rate-limit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  const ip = getClientIp(req);
  const body = getBody(req);
  const launchToken = String(body.launchToken || body.token || '').trim();
  const hwidHash = normalizeHwidHash(body.hwidHash || body.hwid || '');

  if (!launchToken) {
    return badRequest(res, 'launchToken is required.');
  }

  try {
    const verification = verifyLaunchToken(launchToken);

    if (!verification.ok) {
      await writeAuditLog('client_verify_denied', {
        ip,
        hwidHash,
        reason: verification.message || 'invalid_launch_token'
      });
      return unauthorized(res, verification.message || 'Launch token invalid.');
    }

    const decoded = verification.decoded || {};

    // Проверяем HWID если передан
    if (hwidHash && String(decoded.hwidHash || '') !== hwidHash) {
      await writeAuditLog('client_verify_denied_hwid', {
        ip,
        uid: decoded.uid,
        hwidHash,
        expectedHwid: decoded.hwidHash,
        reason: 'hwid_mismatch'
      });
      return forbidden(res, 'HWID mismatch.');
    }

    await writeAuditLog('client_verify_success', {
      ip,
      uid: decoded.uid,
      uidShort: decoded.uidShort,
      hwidHash: decoded.hwidHash || hwidHash,
      launcherVersion: decoded.launcherVersion || 'unknown'
    });

    return res.status(200).json({
      ok: true,
      valid: true,
      serverAuthoritative: true,
      uid: decoded.uid,
      uidShort: decoded.uidShort,
      tokenVersion: decoded.tokenVersion || decoded.tv || 1,
      expiresAt: decoded.exp * 1000,
      issuedAt: decoded.iat * 1000
    });
  } catch (error) {
    console.error('client/mods/verify error:', error);
    return serverError(res, 'Internal server error.', error?.message);
  }
}
