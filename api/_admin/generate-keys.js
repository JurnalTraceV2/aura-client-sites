import { generateKeysBatch } from '../_lib/keys.js';
import { verifyRequestAuth } from '../_lib/auth.js';
import { methodNotAllowed, badRequest, unauthorized, forbidden, serverError, extractBearerToken } from '../_lib/http.js';

const ALLOWED_TIERS = ['1_month', '3_month', '6_month', '12_month', 'lifetime', 'beta'];
const KEY_GENERATOR_ROLES = ['admin', 'youtuber', 'youtube'];

const DATABASE_URL = String(
  process.env.FIREBASE_DATABASE_URL ||
  'https://gen-lang-client-0640974949-default-rtdb.firebaseio.com'
).replace(/\/$/, '');

async function rtdbGet(path, idToken) {
  try {
    const url = `${DATABASE_URL}/${path}.json?auth=${encodeURIComponent(idToken)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}

async function rtdbPatch(path, data, idToken) {
  try {
    const url = `${DATABASE_URL}/${path}.json?auth=${encodeURIComponent(idToken)}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.warn('rtdbPatch failed:', err?.message);
  }
}

async function rtdbPut(path, data, idToken) {
  try {
    const url = `${DATABASE_URL}/${path}.json?auth=${encodeURIComponent(idToken)}`;
    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.warn('rtdbPut failed:', err?.message);
  }
}

const DEFAULT_LIMITS = { admin: -1, youtuber: 2, youtube: 2 };

const ROLE_RESTRICTIONS = {
  youtuber: { maxDurationDays: 3, forceDurationDays: 3 },
  youtube: { maxDurationDays: 3, forceDurationDays: 3 }
};

async function getKeyLimitsViaRest(idToken) {
  const stored = await rtdbGet('config/keyLimits', idToken);
  if (!stored) return { ...DEFAULT_LIMITS };
  const limits = {};
  for (const role of Object.keys(DEFAULT_LIMITS)) {
    limits[role] = stored[role] !== undefined ? Number(stored[role]) : DEFAULT_LIMITS[role];
  }
  return limits;
}

async function getWeeklyUsageViaRest(uid, idToken) {
  const data = await rtdbGet(`keyGenerationLog/${uid}`, idToken);
  if (!data) return { weekStart: 0, count: 0 };
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  if (!data.weekStart || Date.now() - data.weekStart > weekMs) {
    return { weekStart: 0, count: 0 };
  }
  return { weekStart: data.weekStart, count: Number(data.count || 0) };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  try {
    const auth = await verifyRequestAuth(req);
    if (!auth.ok) {
      return unauthorized(res, auth.message || 'Unauthorized');
    }

    const idToken = extractBearerToken(req);

    // Read user role via REST API with user's token
    const userData = await rtdbGet(`users/${auth.uid}`, idToken);
    const userRole = (userData?.role || '').toLowerCase();
    console.log('[generate-keys] uid:', auth.uid, 'role:', userRole);

    if (!KEY_GENERATOR_ROLES.includes(userRole)) {
      return forbidden(res, `Access denied. Your role: "${userData?.role || 'user'}". Required: admin, youtuber, or youtube.`);
    }

    const body = req.body || {};
    const { count = 1, tier, durationDays, maxActivations = 1, metadata = {} } = body;

    if (!tier || !ALLOWED_TIERS.includes(tier)) {
      return badRequest(res, `Invalid tier. Allowed: ${ALLOWED_TIERS.join(', ')}`);
    }

    const keyCount = Math.min(Math.max(1, Number(count) || 1), 100);
    const activations = Math.min(Math.max(1, Number(maxActivations) || 1), 10);

    // Apply role-based restrictions
    const restrictions = ROLE_RESTRICTIONS[userRole];
    let keyDuration;
    if (restrictions?.forceDurationDays) {
      keyDuration = restrictions.forceDurationDays;
    } else if (durationDays) {
      keyDuration = Math.min(Number(durationDays), 365 * 5);
    } else {
      keyDuration = null;
    }

    // Check weekly limits via REST
    const limits = await getKeyLimitsViaRest(idToken);
    const weeklyLimit = limits[userRole] ?? 50;

    if (weeklyLimit !== -1) {
      const usage = await getWeeklyUsageViaRest(auth.uid, idToken);
      const remaining = weeklyLimit - usage.count;
      if (remaining <= 0) {
        return res.status(429).json({
          ok: false,
          error: `Недельный лимит исчерпан (${weeklyLimit} ключей/неделя). Попробуйте позже.`,
          limit: weeklyLimit,
          used: usage.count
        });
      }
      if (keyCount > remaining) {
        return res.status(429).json({
          ok: false,
          error: `Осталось ${remaining} ключей из ${weeklyLimit} на эту неделю.`,
          limit: weeklyLimit,
          used: usage.count,
          remaining
        });
      }
    }

    // Generate keys (keys/ path is publicly writable)
    const keys = await generateKeysBatch({
      count: keyCount,
      tier,
      durationDays: keyDuration,
      maxActivations: activations,
      metadata: {
        ...metadata,
        generatedBy: auth.uid,
        generatedByEmail: auth.email
      }
    });

    // Track usage via REST
    if (weeklyLimit !== -1) {
      const usage = await getWeeklyUsageViaRest(auth.uid, idToken);
      await rtdbPut(`keyGenerationLog/${auth.uid}`, {
        weekStart: usage.weekStart || Date.now(),
        count: usage.count + keys.length,
        lastGeneratedAt: Date.now()
      }, idToken);
    }

    return res.status(200).json({
      ok: true,
      generated: keys.length,
      keys: keys.map(k => ({
        key: k.keyId,
        tier: k.tier,
        expiresAt: k.expiresAt,
        maxActivations: k.maxActivations
      }))
    });
  } catch (error) {
    console.error('admin/generate-keys error:', error);
    return serverError(res, 'Failed to generate keys', error?.message);
  }
}
