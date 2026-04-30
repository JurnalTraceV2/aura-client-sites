import crypto from 'crypto';
import { get, ref, set, update } from 'firebase/database';
import { db } from './firebase.js';

const KEY_FORMAT = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

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
 * Activate a key for a user.
 *
 * Writes ONLY to `keys/{keyId}` path — this is the same path that generateKey
 * uses, so it is guaranteed to work with current RTDB rules.
 *
 * Subscription is resolved at read-time in me.js by checking
 * key activation data stored on the key record itself.
 */
export async function activateKey(keyId, { uid, hwidHash, ip }) {
  const errors = [];

  // Step 1: validate
  console.log('[activateKey] Validating key...');
  let validation;
  try {
    validation = await validateKey(keyId);
  } catch (err) {
    console.error('[activateKey] validateKey threw:', err);
    return { success: false, error: 'DB read error: ' + (err?.message || 'unknown'), step: 'validate' };
  }

  if (!validation.valid) {
    return { success: false, error: validation.reason, step: 'validate' };
  }

  const key = validation.key;
  const now = Date.now();
  const expiresAt = key.expiresAt || (key.tier === 'lifetime' ? null : now + (30 * 24 * 60 * 60 * 1000));

  // Step 2: update the key record — mark as activated, store who activated it
  // This writes to keys/{keyId} which we KNOW works (generateKey uses the same path)
  console.log('[activateKey] Updating key record:', key.keyId, 'for uid:', uid);
  try {
    await update(ref(db, `keys/${key.keyId}`), {
      currentActivations: (key.currentActivations || 0) + 1,
      lastActivatedAt: now,
      activatedByUid: uid,
      activatedByHwid: hwidHash || null,
      activatedByIp: ip || null,
      activatedAt: now,
      activationExpiresAt: expiresAt
    });
  } catch (err) {
    console.error('[activateKey] Failed to update key record:', err);
    return { success: false, error: 'Failed to update key: ' + (err?.message || 'unknown'), step: 'update_key' };
  }

  console.log('[activateKey] Key activated successfully! tier:', key.tier, 'uid:', uid);
  return {
    success: true,
    tier: key.tier,
    expiresAt,
    keyId: key.keyId
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

/**
 * Find key activated by a specific user.
 * Scans all keys for activatedByUid match. Returns the best active key.
 */
export async function findUserActiveKey(uid) {
  const snapshot = await get(ref(db, 'keys'));
  if (!snapshot.exists()) return null;

  const allKeys = snapshot.val() || {};
  let bestKey = null;

  for (const keyData of Object.values(allKeys)) {
    if (keyData.activatedByUid !== uid) continue;
    if (keyData.status !== 'active') continue;

    // Check if activation is still valid (not expired)
    const expiresAt = keyData.activationExpiresAt;
    if (expiresAt && Date.now() > expiresAt) continue;

    // Prefer the most recently activated key
    if (!bestKey || (keyData.activatedAt || 0) > (bestKey.activatedAt || 0)) {
      bestKey = keyData;
    }
  }

  return bestKey;
}
