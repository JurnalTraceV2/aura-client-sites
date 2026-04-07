import { badRequest, getBody, methodNotAllowed, serverError, tooManyRequests } from '../_lib/http.js';
import { verifySessionToken, writeAuditLog, normalizeHwidHash } from '../_lib/license.js';
import { checkRateLimit, getClientIp } from '../_lib/rate-limit.js';

const VERIFY_LIMIT = Number(process.env.LAUNCHER_VERIFY_RATE_LIMIT || 120);
const VERIFY_WINDOW_MS = Number(process.env.LAUNCHER_VERIFY_WINDOW_MS || 10 * 60 * 1000);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  const ip = getClientIp(req);
  const limit = checkRateLimit(`launcher-verify:${ip}`, VERIFY_LIMIT, VERIFY_WINDOW_MS);
  if (!limit.allowed) {
    return tooManyRequests(res, limit.retryAfterMs);
  }

  const body = getBody(req);
  const sessionToken = String(body.sessionToken || body.token || '').trim();
  const hwidHash = normalizeHwidHash(body.hwidHash || body.hwid || '');

  if (!sessionToken || !hwidHash) {
    return badRequest(res, 'sessionToken and hwidHash are required.');
  }

  try {
    const verification = await verifySessionToken(sessionToken, hwidHash, { touchSession: true });

    if (!verification.valid) {
      await writeAuditLog('launcher_verify_failed', {
        ip,
        hwidHash,
        reason: verification.message || 'invalid_session'
      });

      return res.status(200).json({
        ok: true,
        valid: false,
        message: verification.message || 'Session invalid.'
      });
    }

    await writeAuditLog('launcher_verify_success', {
      ip,
      uid: verification.uid,
      hwidHash,
      uidShort: verification.uidShort
    });

    return res.status(200).json({
      ok: true,
      valid: true,
      serverAuthoritative: true,
      uidShort: verification.uidShort,
      email: verification.email,
      subscription: verification.subscription,
      sessionExpiresAt: verification.sessionExpiresAt
    });
  } catch (error) {
    console.error('launcher/verify-session error:', error);
    return serverError(res, 'Internal server error.', error?.message);
  }
}
