import crypto from 'crypto';
import { get, ref, set, push, update } from 'firebase/database';
import { db } from './firebase.js';

const DATABASE_URL = String(
  process.env.FIREBASE_DATABASE_URL ||
  'https://gen-lang-client-0640974949-default-rtdb.firebaseio.com'
).replace(/\/$/, '');

// Database secret gives full server-side access (bypasses all rules)
const DB_SECRET = process.env.FIREBASE_DATABASE_SECRET || '';

const KEY_FORMAT = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const KEY_PREFIX = 'AURA';

export function generateKeyParts() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  const randomBytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

export function formatKey(raw) {
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

export function normalizeKey(key) {
  return String(key || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidKeyFormat(key) {
  return KEY_FORMAT.test(String(key || '').toUpperCase().trim());
}

export async function generateKey({ tier, durationDays, maxActivations = 1, metadata = {} }) {
  const raw = generateKeyParts();
  const keyId = formatKey(raw);

  const now = Date.now();
  const expiresAt = durationDays ? now + (durationDays * 24 * 60 * 60 * 1000) : null;

  const keyData = {
    keyId,
    raw,
    tier,
    status: 'active',
    maxActivations: Number(maxActivations) || 1,
    currentActivations: 0,
    createdAt: now,
    expiresAt,
    metadata: {
      ...metadata,
      generatedBy: metadata.generatedBy || 'system'
    }
  };

  await set(ref(db, `keys/${keyId}`), keyData);
  return keyData;
}

export async function generateKeysBatch({ count, tier, durationDays, maxActivations = 1, metadata = {} }) {
  const keys = [];
  for (let i = 0; i < count; i++) {
    const key = await generateKey({ tier, durationDays, maxActivations, metadata });
    keys.push(key);
  }
  return keys;
}

export async function getKey(keyId) {
  const normalized = normalizeKey(keyId);
  const formatted = formatKey(normalized);
  const snapshot = await get(ref(db, `keys/${formatted}`));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val();
}

export async function validateKey(keyId) {
  const key = await getKey(keyId);

  if (!key) {
    return { valid: false, reason: 'Key not found' };
  }

  if (key.status !== 'active') {
    return { valid: false, reason: `Key is ${key.status}` };
  }

  if (key.expiresAt && Date.now() > key.expiresAt) {
    return { valid: false, reason: 'Key has expired' };
  }

  if (key.currentActivations >= key.maxActivations) {
    return { valid: false, reason: 'Key activation limit reached' };
  }

  return {
    valid: true,
    key,
    tier: key.tier,
    remainingActivations: key.maxActivations - key.currentActivations
  };
}

/**
 * Server-side RTDB write using database secret (bypasses all security rules).
 */
async function serverPatch(path, data) {
  if (!DB_SECRET) {
    throw new Error('FIREBASE_DATABASE_SECRET env var is not set. Cannot write to RTDB.');
  }
  const url = `${DATABASE_URL}/${path}.json?auth=${encodeURIComponent(DB_SECRET)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`RTDB PATCH ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function serverPost(path, data) {
  if (!DB_SECRET) {
    throw new Error('FIREBASE_DATABASE_SECRET env var is not set. Cannot write to RTDB.');
  }
  const url = `${DATABASE_URL}/${path}.json?auth=${encodeURIComponent(DB_SECRET)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`RTDB POST ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

export async function activateKey(keyId, { uid, hwidHash, ip }) {
  const validation = await validateKey(keyId);

  if (!validation.valid) {
    return { success: false, error: validation.reason };
  }

  const key = validation.key;
  const now = Date.now();

  const expiresAt = key.expiresAt || (key.tier === 'lifetime' ? null : now + (30 * 24 * 60 * 60 * 1000));

  // 1. Apply subscription to user FIRST (most important step)
  console.log('[activateKey] Step 1: updating user subscription for uid:', uid);
  await serverPatch(`users/${uid}`, {
    subscription: key.tier,
    subscriptionExpiresAt: expiresAt,
    subscriptionSource: 'key',
    subscriptionKeyId: key.keyId,
    updatedAt: now
  });

  // 2. Update entitlement
  console.log('[activateKey] Step 2: updating entitlement for uid:', uid);
  await serverPatch(`entitlements/${uid}`, {
    plan: key.tier,
    state: 'active',
    expiresAt,
    source: 'key_activation',
    keyId: key.keyId,
    updatedAt: now
  });

  // 3. Record activation log (non-fatal)
  let activationId = null;
  try {
    const postResult = await serverPost(`keyActivations/${key.keyId}`, {
      uid,
      hwidHash: hwidHash || null,
      ip: ip || null,
      activatedAt: now
    });
    activationId = postResult?.name || null;
  } catch (err) {
    console.warn('[activateKey] failed to write activation log (non-fatal):', err?.message);
  }

  // 4. Increment key counter LAST (if earlier steps fail, key can be retried)
  console.log('[activateKey] Step 4: incrementing key counter for:', key.keyId);
  await serverPatch(`keys/${key.keyId}`, {
    currentActivations: (key.currentActivations || 0) + 1,
    lastActivatedAt: now
  });

  console.log('[activateKey] Success! tier:', key.tier);
  return {
    success: true,
    tier: key.tier,
    expiresAt,
    activationId
  };
}

export async function revokeKey(keyId, reason = '') {
  const key = await getKey(keyId);
  if (!key) {
    return { success: false, error: 'Key not found' };
  }

  await update(ref(db, `keys/${key.keyId}`), {
    status: 'revoked',
    revokedAt: Date.now(),
    revokeReason: reason
  });

  return { success: true };
}

export async function listKeys({ status, tier, limit = 100 } = {}) {
  const snapshot = await get(ref(db, 'keys'));

  if (!snapshot.exists()) {
    return [];
  }

  let keys = Object.values(snapshot.val() || {});

  if (status) {
    keys = keys.filter(k => k.status === status);
  }

  if (tier) {
    keys = keys.filter(k => k.tier === tier);
  }

  return keys.slice(0, limit).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getUserActivations(uid) {
  const snapshot = await get(ref(db, 'keyActivations'));

  if (!snapshot.exists()) {
    return [];
  }

  const allActivations = snapshot.val() || {};
  const userActivations = [];

  for (const [keyId, activations] of Object.entries(allActivations)) {
    for (const [activationId, data] of Object.entries(activations)) {
      if (data.uid === uid) {
        userActivations.push({
          activationId,
          keyId,
          ...data
        });
      }
    }
  }

  return userActivations.sort((a, b) => b.activatedAt - a.activatedAt);
}
