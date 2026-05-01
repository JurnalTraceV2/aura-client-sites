import { verifyRequestAuth } from '../_lib/auth.js';
import { getUserByUid } from '../_lib/license.js';
import { methodNotAllowed, badRequest, unauthorized, forbidden, serverError } from '../_lib/http.js';
import { get, ref, set } from 'firebase/database';
import { db } from '../_lib/firebase.js';

const KEY_GENERATOR_ROLES = ['admin', 'youtuber', 'youtube'];
const CONFIGURABLE_ROLES = ['admin', 'youtuber', 'youtube'];

const DEFAULT_LIMITS = {
  admin: -1,
  youtuber: 50,
  youtube: 50
};

export async function getKeyLimits() {
  try {
    const snapshot = await get(ref(db, 'config/keyLimits'));
    if (!snapshot.exists()) {
      return { ...DEFAULT_LIMITS };
    }
    const stored = snapshot.val() || {};
    const limits = {};
    for (const role of CONFIGURABLE_ROLES) {
      limits[role] = stored[role] !== undefined ? Number(stored[role]) : (DEFAULT_LIMITS[role] ?? 50);
    }
    return limits;
  } catch (err) {
    console.error('getKeyLimits error:', err?.message);
    return { ...DEFAULT_LIMITS };
  }
}

export async function getUserWeeklyUsage(uid) {
  try {
    const snapshot = await get(ref(db, `keyGenerationLog/${uid}`));
    if (!snapshot.exists()) {
      return { weekStart: 0, count: 0 };
    }
    const data = snapshot.val() || {};
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    if (!data.weekStart || now - data.weekStart > weekMs) {
      return { weekStart: 0, count: 0 };
    }

    return {
      weekStart: data.weekStart,
      count: Number(data.count || 0)
    };
  } catch (err) {
    console.error('getUserWeeklyUsage error:', err?.message);
    return { weekStart: 0, count: 0 };
  }
}

export async function incrementUsage(uid, generatedCount) {
  const usage = await getUserWeeklyUsage(uid);
  const now = Date.now();

  const newData = {
    weekStart: usage.weekStart || now,
    count: usage.count + generatedCount,
    lastGeneratedAt: now
  };

  if (!usage.weekStart) {
    newData.weekStart = now;
  }

  await set(ref(db, `keyGenerationLog/${uid}`), newData);
  return newData;
}

export default async function handler(req, res) {
  try {
    const auth = await verifyRequestAuth(req);
    if (!auth.ok) {
      return unauthorized(res, auth.message || 'Unauthorized');
    }

    const user = await getUserByUid(auth.uid);
    const role = (user?.role || '').toLowerCase();

    if (!KEY_GENERATOR_ROLES.includes(role)) {
      return forbidden(res, 'Access denied');
    }

    if (req.method === 'GET') {
      const limits = await getKeyLimits();
      const usage = await getUserWeeklyUsage(auth.uid);
      const myLimit = limits[role] ?? 50;

      return res.status(200).json({
        ok: true,
        limits,
        myRole: role,
        myLimit,
        myUsage: usage.count,
        myRemaining: myLimit === -1 ? -1 : Math.max(0, myLimit - usage.count),
        canSetLimits: role === 'admin'
      });
    }

    if (req.method === 'POST') {
      if (role !== 'admin') {
        return forbidden(res, 'Only admin can set limits');
      }

      const body = req.body || {};
      const newLimits = {};

      for (const r of CONFIGURABLE_ROLES) {
        if (body[r] !== undefined) {
          const val = Number(body[r]);
          if (!Number.isFinite(val) || (val < -1)) {
            return badRequest(res, `Invalid limit for role ${r}. Use -1 for unlimited or a positive number.`);
          }
          newLimits[r] = val;
        }
      }

      if (Object.keys(newLimits).length === 0) {
        return badRequest(res, 'No limits provided');
      }

      const currentLimits = await getKeyLimits();
      const merged = { ...currentLimits, ...newLimits };

      await set(ref(db, 'config/keyLimits'), merged);

      return res.status(200).json({
        ok: true,
        limits: merged
      });
    }

    return methodNotAllowed(res);
  } catch (error) {
    console.error('admin/key-limits error:', error);
    return serverError(res, 'Failed to process key limits', error?.message);
  }
}
