import crypto from 'crypto';
import { get, push, ref, remove, set, update } from 'firebase/database';
import { db, webApiKey } from './firebase.js';

const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 24 * 60 * 60 * 1000);
const HWID_RESET_WINDOW_MS = Number(process.env.HWID_RESET_WINDOW_MS || 30 * 24 * 60 * 60 * 1000);
const FREE_HWID_RESETS_PER_WINDOW = Number(process.env.FREE_HWID_RESETS_PER_WINDOW || 1);

const SUBS_WITHOUT_EXPIRY = new Set(['lifetime', 'beta']);

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nowMs() {
  return Date.now();
}

export function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

export function hashToken(token) {
  return sha256Hex(token);
}

export function normalizeHwidHash(hwidRaw) {
  const trimmed = String(hwidRaw || '').trim();
  if (!trimmed) {
    return '';
  }

  const asLower = trimmed.toLowerCase();
  if (/^[a-f0-9]{64}$/.test(asLower)) {
    return asLower;
  }

  return sha256Hex(trimmed);
}

export function generateUidShort(seed) {
  const digest = sha256Hex(seed || crypto.randomBytes(8).toString('hex'));
  return `AURA-${digest.slice(0, 6).toUpperCase()}`;
}

function resolveSubscriptionRaw(user) {
  return String(user?.subscription || 'none').toLowerCase();
}

function resolveExpiresAt(user) {
  return toNumber(user?.subscriptionExpiresAt, 0);
}

export function isSubscriptionActive(user, now = nowMs()) {
  const subscription = resolveSubscriptionRaw(user);
  if (subscription === 'none') {
    return false;
  }

  if (SUBS_WITHOUT_EXPIRY.has(subscription)) {
    return true;
  }

  return resolveExpiresAt(user) > now;
}

export function getSubscriptionState(user, now = nowMs()) {
  const subscription = resolveSubscriptionRaw(user);
  const expiresAt = resolveExpiresAt(user);
  const active = isSubscriptionActive(user, now);

  return {
    active,
    subscription: active ? subscription : 'none',
    subscriptionExpiresAt: expiresAt > 0 ? expiresAt : null
  };
}

export async function authenticateEmailPassword(email, password) {
  if (!webApiKey) {
    return { ok: false, message: 'Firebase API key is not configured.' };
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${webApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      message: payload?.error?.message || 'Invalid credentials.'
    };
  }

  return {
    ok: true,
    uid: payload.localId,
    email: payload.email,
    idToken: payload.idToken
  };
}

export async function getUserByUid(uid) {
  const userSnapshot = await get(ref(db, `users/${uid}`));
  if (!userSnapshot.exists()) {
    return null;
  }

  return userSnapshot.val();
}

export async function ensureUserRecord(uid, email) {
  const userRef = ref(db, `users/${uid}`);
  const snapshot = await get(userRef);

  if (!snapshot.exists()) {
    const freshUser = {
      email,
      role: 'user',
      subscription: 'none',
      subscriptionExpiresAt: null,
      hwidHash: null,
      uidShort: generateUidShort(uid),
      resetCredits: FREE_HWID_RESETS_PER_WINDOW,
      resetWindowStart: nowMs(),
      banned: false,
      createdAt: nowMs()
    };

    await set(userRef, freshUser);
    return freshUser;
  }

  const existing = snapshot.val() || {};
  const patch = {};

  if (!existing.email && email) {
    patch.email = email;
  }

  if (!existing.uidShort) {
    patch.uidShort = generateUidShort(uid);
  }

  if (existing.resetCredits === undefined || existing.resetCredits === null) {
    patch.resetCredits = FREE_HWID_RESETS_PER_WINDOW;
  }

  if (!existing.resetWindowStart) {
    patch.resetWindowStart = nowMs();
  }

  if (existing.banned === undefined) {
    patch.banned = false;
  }

  if (Object.keys(patch).length > 0) {
    await update(userRef, patch);
  }

  return { ...existing, ...patch };
}

export function evaluateHwidPolicy(user, hwidHash, now = nowMs()) {
  if (!hwidHash) {
    return { allowed: false, patch: {}, message: 'HWID is required.' };
  }

  if (!user?.hwidHash) {
    return {
      allowed: true,
      patch: {
        hwidHash
      },
      reason: 'bound_first_time'
    };
  }

  if (String(user.hwidHash) === hwidHash) {
    return { allowed: true, patch: {}, reason: 'same_hwid' };
  }

  let resetWindowStart = toNumber(user.resetWindowStart, 0);
  let resetCredits = toNumber(user.resetCredits, FREE_HWID_RESETS_PER_WINDOW);

  if (!resetWindowStart || now - resetWindowStart > HWID_RESET_WINDOW_MS) {
    resetWindowStart = now;
    resetCredits = FREE_HWID_RESETS_PER_WINDOW;
  }

  if (resetCredits > 0) {
    resetCredits -= 1;
    return {
      allowed: true,
      patch: {
        hwidHash,
        resetCredits,
        resetWindowStart,
        lastHwidResetAt: now
      },
      reason: 'free_reset_applied'
    };
  }

  return {
    allowed: false,
    patch: {
      resetCredits,
      resetWindowStart
    },
    message: 'HWID mismatch. Free reset exhausted. Buy paid HWID reset.'
  };
}

export async function createSession(uid, hwidHash, launcherVersion = 'unknown') {
  const issuedAt = nowMs();
  const expiresAt = issuedAt + SESSION_TTL_MS;

  const sessionToken = crypto.randomBytes(32).toString('base64url');
  const sessionTokenHash = hashToken(sessionToken);

  await set(ref(db, `sessions/${sessionTokenHash}`), {
    uid,
    hwidHash,
    issuedAt,
    expiresAt,
    lastSeenAt: issuedAt,
    launcherVersion
  });

  return {
    sessionToken,
    sessionTokenHash,
    sessionExpiresAt: expiresAt
  };
}

export async function revokeAllSessionsForUid(uid) {
  const targetUid = String(uid || '').trim();
  if (!targetUid) {
    return 0;
  }

  const sessionsSnapshot = await get(ref(db, 'sessions'));
  if (!sessionsSnapshot.exists()) {
    return 0;
  }

  const removals = [];
  sessionsSnapshot.forEach((child) => {
    const session = child.val() || {};
    if (String(session.uid || '') === targetUid) {
      removals.push(remove(ref(db, `sessions/${child.key}`)));
    }
  });

  if (removals.length > 0) {
    await Promise.all(removals);
  }

  return removals.length;
}

export async function verifySessionToken(sessionToken, hwidHash, options = {}) {
  const token = String(sessionToken || '').trim();
  const hwid = normalizeHwidHash(hwidHash);

  if (!token || !hwid) {
    return { valid: false, message: 'sessionToken and hwidHash are required.' };
  }

  const tokenHash = hashToken(token);
  const now = nowMs();
  const touchSession = options.touchSession !== false;

  const sessionSnapshot = await get(ref(db, `sessions/${tokenHash}`));
  if (!sessionSnapshot.exists()) {
    return { valid: false, message: 'Session not found.' };
  }

  const session = sessionSnapshot.val() || {};
  if (toNumber(session.expiresAt, 0) <= now) {
    return { valid: false, message: 'Session expired.' };
  }

  if (String(session.hwidHash || '') !== hwid) {
    return { valid: false, message: 'HWID mismatch.' };
  }

  const user = await getUserByUid(session.uid);
  if (!user) {
    return { valid: false, message: 'User not found.' };
  }

  if (user.banned === true) {
    await revokeAllSessionsForUid(session.uid);
    return { valid: false, message: 'User is banned.' };
  }

  const subscriptionState = getSubscriptionState(user, now);
  if (!subscriptionState.active) {
    return { valid: false, message: 'Subscription inactive.' };
  }

  const patch = {};
  if (!user.uidShort) {
    patch.uidShort = generateUidShort(session.uid);
  }

  if (Object.keys(patch).length > 0) {
    await update(ref(db, `users/${session.uid}`), patch);
  }

  if (touchSession) {
    await update(ref(db, `sessions/${tokenHash}`), { lastSeenAt: now });
  }

  const uidShort = patch.uidShort || user.uidShort || generateUidShort(session.uid);

  return {
    valid: true,
    uid: session.uid,
    uidShort,
    email: user.email || null,
    subscription: subscriptionState.subscription,
    sessionExpiresAt: toNumber(session.expiresAt, now)
  };
}

export async function writeAuditLog(eventType, payload = {}) {
  try {
    const dayKey = new Date().toISOString().slice(0, 10);
    const auditRoot = ref(db, `audit/${dayKey}`);
    const eventRef = push(auditRoot);
    await set(eventRef, {
      eventType,
      at: nowMs(),
      ...payload
    });
  } catch (error) {
    console.error('Audit log write failed:', error?.message || error);
  }
}

export function normalizeTier(rawTier) {
  const tier = String(rawTier || '').trim().toLowerCase();

  if (tier === '1_month' || tier === 'month' || tier === '1 месяц' || tier === '1 mesyac') {
    return '1_month';
  }
  if (tier === 'lifetime' || tier === 'навсегда') {
    return 'lifetime';
  }
  if (tier === 'beta') {
    return 'beta';
  }
  if (tier === 'hwid_reset' || tier === 'сброс hwid' || tier === 'reset_hwid') {
    return 'hwid_reset';
  }

  return tier;
}

export async function activateSubscriptionFromPayment(userId, tierRaw) {
  const tier = normalizeTier(tierRaw);
  const userRef = ref(db, `users/${userId}`);
  const userSnapshot = await get(userRef);

  if (!userSnapshot.exists()) {
    throw new Error('User for payment not found.');
  }

  const user = userSnapshot.val() || {};
  const now = nowMs();

  if (tier === 'hwid_reset') {
    const currentCredits = toNumber(user.resetCredits, 0);
    await update(userRef, {
      resetCredits: currentCredits + 1,
      paidResetCredits: toNumber(user.paidResetCredits, 0) + 1,
      lastPaidResetAt: now
    });
    return { appliedTier: tier, subscription: resolveSubscriptionRaw(user), subscriptionExpiresAt: resolveExpiresAt(user) || null };
  }

  if (tier === '1_month') {
    const currentExpires = resolveExpiresAt(user);
    const startFrom = Math.max(now, currentExpires);
    const newExpiresAt = startFrom + 30 * 24 * 60 * 60 * 1000;

    await update(userRef, {
      subscription: '1_month',
      subscriptionExpiresAt: newExpiresAt,
      lastPaymentAt: now
    });

    return { appliedTier: tier, subscription: '1_month', subscriptionExpiresAt: newExpiresAt };
  }

  if (tier === 'lifetime' || tier === 'beta') {
    await update(userRef, {
      subscription: tier,
      subscriptionExpiresAt: null,
      lastPaymentAt: now
    });

    return { appliedTier: tier, subscription: tier, subscriptionExpiresAt: null };
  }

  throw new Error(`Unsupported tier: ${tierRaw}`);
}

export async function findUserByHwidHash(hwidHash) {
  const normalized = normalizeHwidHash(hwidHash);
  if (!normalized) {
    return null;
  }

  const usersSnapshot = await get(ref(db, 'users'));
  if (!usersSnapshot.exists()) {
    return null;
  }

  let foundUser = null;
  usersSnapshot.forEach((child) => {
    if (foundUser) {
      return;
    }

    const data = child.val() || {};
    const hwidCandidate = normalizeHwidHash(data.hwidHash || data.hwid || '');
    if (hwidCandidate && hwidCandidate === normalized) {
      foundUser = {
        uid: child.key,
        ...data
      };
    }
  });

  return foundUser;
}
