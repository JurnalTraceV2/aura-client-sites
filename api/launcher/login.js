import { ref, update } from 'firebase/database';
import { db } from '../_lib/firebase.js';
import {
  authenticateEmailPassword,
  createSession,
  ensureUserRecord,
  evaluateHwidPolicy,
  getSubscriptionState,
  normalizeHwidHash,
  writeAuditLog
} from '../_lib/license.js';
import {
  badRequest,
  methodNotAllowed,
  serverError,
  tooManyRequests,
  unauthorized,
  getBody
} from '../_lib/http.js';
import { checkRateLimit, getClientIp } from '../_lib/rate-limit.js';

const LOGIN_LIMIT = Number(process.env.LAUNCHER_LOGIN_RATE_LIMIT || 12);
const LOGIN_WINDOW_MS = Number(process.env.LAUNCHER_LOGIN_WINDOW_MS || 10 * 60 * 1000);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  const ip = getClientIp(req);
  const limit = checkRateLimit(`launcher-login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!limit.allowed) {
    return tooManyRequests(res, limit.retryAfterMs);
  }

  const body = getBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const launcherVersion = String(body.launcherVersion || 'unknown').trim();
  const hwidHash = normalizeHwidHash(body.hwidHash || body.hwid || '');

  if (!email || !password || !hwidHash) {
    return badRequest(res, 'email, password and hwidHash are required.');
  }

  try {
    const auth = await authenticateEmailPassword(email, password);
    if (!auth.ok) {
      await writeAuditLog('launcher_login_failed', {
        ip,
        email,
        reason: auth.message || 'auth_failed'
      });
      return unauthorized(res, auth.message || 'Invalid credentials.');
    }

    const user = await ensureUserRecord(auth.uid, auth.email || email);
    if (user.banned === true) {
      await writeAuditLog('launcher_login_blocked_banned', {
        ip,
        uid: auth.uid,
        email
      });
      return res.status(403).json({ ok: false, error: 'User is banned.' });
    }

    const subscriptionState = getSubscriptionState(user);
    if (!subscriptionState.active) {
      await writeAuditLog('launcher_login_blocked_subscription', {
        ip,
        uid: auth.uid,
        email,
        subscription: user.subscription || 'none'
      });
      return res.status(403).json({ ok: false, error: 'Subscription inactive.' });
    }

    const hwidDecision = evaluateHwidPolicy(user, hwidHash);
    if (Object.keys(hwidDecision.patch).length > 0) {
      await update(ref(db, `users/${auth.uid}`), hwidDecision.patch);
    }

    if (!hwidDecision.allowed) {
      await writeAuditLog('launcher_login_blocked_hwid', {
        ip,
        uid: auth.uid,
        email,
        hwidHash,
        reason: hwidDecision.message
      });
      return res.status(403).json({ ok: false, error: hwidDecision.message });
    }

    const session = await createSession(auth.uid, hwidHash, launcherVersion);
    const uidShort = (hwidDecision.patch.uidShort || user.uidShort || 'AURA-000000').toUpperCase();

    await writeAuditLog('launcher_login_success', {
      ip,
      uid: auth.uid,
      email,
      hwidHash,
      launcherVersion,
      uidShort,
      sessionExpiresAt: session.sessionExpiresAt
    });

    return res.status(200).json({
      ok: true,
      sessionToken: session.sessionToken,
      uidShort,
      subscription: subscriptionState.subscription,
      sessionExpiresAt: session.sessionExpiresAt,
      user: {
        uid: auth.uid,
        email: auth.email || email
      }
    });
  } catch (error) {
    console.error('launcher/login error:', error);
    return serverError(res, 'Internal server error.', error?.message);
  }
}
