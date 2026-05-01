import { generateKey, generateKeysBatch } from '../_lib/keys.js';
import { verifyRequestAuth } from '../_lib/auth.js';
import { getUserByUid } from '../_lib/license.js';
import { methodNotAllowed, badRequest, unauthorized, forbidden, serverError } from '../_lib/http.js';
import { getKeyLimits, getUserWeeklyUsage, incrementUsage } from './key-limits.js';

const ALLOWED_TIERS = ['1_month', '3_month', '6_month', '12_month', 'lifetime', 'beta'];

const KEY_GENERATOR_ROLES = ['admin', 'youtuber', 'youtube'];

async function canGenerateKeys(uid) {
  const user = await getUserByUid(uid);
  const role = (user?.role || '').toLowerCase();
  return KEY_GENERATOR_ROLES.includes(role);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  try {
    // Verify authentication
    const auth = await verifyRequestAuth(req);
    if (!auth.ok) {
      return unauthorized(res, auth.message || 'Unauthorized');
    }

    // Check key generator role (admin or youtuber)
    const hasAccess = await canGenerateKeys(auth.uid);
    if (!hasAccess) {
      return forbidden(res, 'Admin, Youtuber or Youtube access required');
    }

    const body = req.body || {};
    const { 
      count = 1, 
      tier, 
      durationDays, 
      maxActivations = 1,
      metadata = {} 
    } = body;

    // Validation
    if (!tier || !ALLOWED_TIERS.includes(tier)) {
      return badRequest(res, `Invalid tier. Allowed: ${ALLOWED_TIERS.join(', ')}`);
    }

    const keyCount = Math.min(Math.max(1, Number(count) || 1), 100);
    const keyDuration = durationDays ? Math.min(Number(durationDays), 365 * 5) : null;
    const activations = Math.min(Math.max(1, Number(maxActivations) || 1), 10);

    // Check weekly limits
    const user = await getUserByUid(auth.uid);
    const userRole = (user?.role || '').toLowerCase();
    const limits = await getKeyLimits();
    const weeklyLimit = limits[userRole] ?? 50;

    if (weeklyLimit !== -1) {
      const usage = await getUserWeeklyUsage(auth.uid);
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

    // Generate keys
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

    // Track usage
    if (weeklyLimit !== -1) {
      await incrementUsage(auth.uid, keys.length);
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
