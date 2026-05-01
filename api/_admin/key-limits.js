import { verifyRequestAuth } from '../_lib/auth.js';
import { methodNotAllowed, badRequest, unauthorized, forbidden, serverError, extractBearerToken } from '../_lib/http.js';

const KEY_GENERATOR_ROLES = ['admin', 'youtuber', 'youtube'];
const CONFIGURABLE_ROLES = ['admin', 'youtuber', 'youtube'];

const DEFAULT_LIMITS = {
  admin: -1,
  youtuber: 2,
  youtube: 2
};

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

export default async function handler(req, res) {
  try {
    const auth = await verifyRequestAuth(req);
    if (!auth.ok) {
      return unauthorized(res, auth.message || 'Unauthorized');
    }

    const idToken = extractBearerToken(req);

    // Read user role via REST API
    const userData = await rtdbGet(`users/${auth.uid}`, idToken);
    const role = (userData?.role || '').toLowerCase();

    if (!KEY_GENERATOR_ROLES.includes(role)) {
      return forbidden(res, 'Access denied');
    }

    if (req.method === 'GET') {
      const stored = await rtdbGet('config/keyLimits', idToken);
      const limits = {};
      for (const r of CONFIGURABLE_ROLES) {
        limits[r] = stored?.[r] !== undefined ? Number(stored[r]) : (DEFAULT_LIMITS[r] ?? 50);
      }

      const usageData = await rtdbGet(`keyGenerationLog/${auth.uid}`, idToken);
      let usageCount = 0;
      if (usageData) {
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        if (usageData.weekStart && Date.now() - usageData.weekStart <= weekMs) {
          usageCount = Number(usageData.count || 0);
        }
      }

      const myLimit = limits[role] ?? 50;

      return res.status(200).json({
        ok: true,
        limits,
        myRole: role,
        myLimit,
        myUsage: usageCount,
        myRemaining: myLimit === -1 ? -1 : Math.max(0, myLimit - usageCount),
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

      const stored = await rtdbGet('config/keyLimits', idToken);
      const currentLimits = {};
      for (const r of CONFIGURABLE_ROLES) {
        currentLimits[r] = stored?.[r] !== undefined ? Number(stored[r]) : (DEFAULT_LIMITS[r] ?? 50);
      }
      const merged = { ...currentLimits, ...newLimits };

      await rtdbPut('config/keyLimits', merged, idToken);

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
