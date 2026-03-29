import { badRequest, getBody, methodNotAllowed, serverError, tooManyRequests } from '../_lib/http.js';
import { checkRateLimit, getClientIp } from '../_lib/rate-limit.js';
import { normalizeHwidHash, verifySessionToken, writeAuditLog } from '../_lib/license.js';

const EVENT_LIMIT = Number(process.env.SECURITY_EVENT_RATE_LIMIT || 120);
const EVENT_WINDOW_MS = Number(process.env.SECURITY_EVENT_WINDOW_MS || 10 * 60 * 1000);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  const ip = getClientIp(req);
  const limit = checkRateLimit(`security-event:${ip}`, EVENT_LIMIT, EVENT_WINDOW_MS);
  if (!limit.allowed) {
    return tooManyRequests(res, limit.retryAfterMs);
  }

  const body = getBody(req);
  const eventType = String(body.eventType || '').trim().toLowerCase();
  const details = String(body.details || '').trim().slice(0, 500);
  const sessionToken = String(body.sessionToken || '').trim();
  const hwidHash = normalizeHwidHash(body.hwidHash || '');

  if (!eventType) {
    return badRequest(res, 'eventType is required.');
  }

  try {
    let uid = null;
    if (sessionToken && hwidHash) {
      const verification = await verifySessionToken(sessionToken, hwidHash, { touchSession: false });
      if (verification.valid) {
        uid = verification.uid;
      }
    }

    await writeAuditLog('tamper_detected', {
      ip,
      uid,
      eventType,
      details: details || null,
      hwidHash: hwidHash || null
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('launcher/security-event error:', error);
    return serverError(res, 'Internal server error.', error?.message);
  }
}
