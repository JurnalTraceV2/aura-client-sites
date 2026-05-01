import { verifyRequestAuth } from '../_lib/auth.js';
import { methodNotAllowed, unauthorized, forbidden, serverError, extractBearerToken } from '../_lib/http.js';

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res);
  }

  try {
    const auth = await verifyRequestAuth(req);
    if (!auth.ok) {
      return unauthorized(res, auth.message || 'Unauthorized');
    }

    const idToken = extractBearerToken(req);

    // Read user role
    const userData = await rtdbGet(`users/${auth.uid}`, idToken);
    const role = (userData?.role || '').toLowerCase();

    if (!KEY_GENERATOR_ROLES.includes(role)) {
      return forbidden(res, 'Access denied');
    }

    // Read all keys (keys/ is publicly readable)
    const keysData = await rtdbGet('keys', idToken);

    if (!keysData) {
      return res.status(200).json({ ok: true, keys: [] });
    }

    const keys = Object.values(keysData)
      .filter(k => k.metadata?.generatedBy === auth.uid)
      .map(k => ({
        key: k.keyId,
        tier: k.tier,
        status: k.status,
        maxActivations: k.maxActivations,
        currentActivations: k.currentActivations || 0,
        createdAt: k.createdAt,
        expiresAt: k.expiresAt,
        generatedBy: k.metadata?.generatedByEmail || k.metadata?.generatedBy || 'unknown'
      }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return res.status(200).json({
      ok: true,
      total: keys.length,
      keys
    });
  } catch (error) {
    console.error('admin/list-keys error:', error);
    return serverError(res, 'Failed to list keys', error?.message);
  }
}
