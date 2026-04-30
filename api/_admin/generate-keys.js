import { generateKey, generateKeysBatch } from '../_lib/keys.js';
import { verifyRequestAuth } from '../_lib/auth.js';
import { getUserByUid } from '../_lib/license.js';
import { methodNotAllowed, badRequest, unauthorized, forbidden, serverError } from '../_lib/http.js';

const ALLOWED_TIERS = ['1_month', '3_month', '6_month', '12_month', 'lifetime', 'beta'];

async function isAdmin(uid) {
  const user = await getUserByUid(uid);
  return user?.role === 'admin';
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

    // Check admin role
    const userIsAdmin = await isAdmin(auth.uid);
    if (!userIsAdmin) {
      return forbidden(res, 'Admin access required');
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
