import { badRequest, getBody, methodNotAllowed, serverError, tooManyRequests } from '../_lib/http.js';
import { verifySessionToken, writeAuditLog, normalizeHwidHash } from '../_lib/license.js';
import { checkRateLimit, getClientIp } from '../_lib/rate-limit.js';

const HEARTBEAT_LIMIT = Number(process.env.LAUNCHER_HEARTBEAT_RATE_LIMIT || 240);
const HEARTBEAT_WINDOW_MS = Number(process.env.LAUNCHER_HEARTBEAT_WINDOW_MS || 10 * 60 * 1000);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  const ip = getClientIp(req);
  const limit = checkRateLimit(`launcher-heartbeat:${ip}`, HEARTBEAT_LIMIT, HEARTBEAT_WINDOW_MS);
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
      await writeAuditLog('launcher_heartbeat_failed', {
        ip,
        hwidHash,
        reason: verification.message || 'invalid_session'
      });
      return res.status(403).json({
        ok: false,
        error: verification.message || 'Session invalid.'
      });
    }

    return res.status(200).json({
      ok: true,
      uidShort: verification.uidShort,
      subscription: verification.subscription,
      sessionExpiresAt: verification.sessionExpiresAt,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('launcher/heartbeat error:', error);
    return serverError(res, 'Internal server error.', error?.message);
  }
}
