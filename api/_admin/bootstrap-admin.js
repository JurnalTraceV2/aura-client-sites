import { verifyRequestAuth } from '../_lib/auth.js';
import { methodNotAllowed, unauthorized, serverError } from '../_lib/http.js';
import { ref, update, get } from 'firebase/database';
import { db } from '../_lib/firebase.js';

/**
 * One-time bootstrap endpoint to set admin role.
 * Protected by a bootstrap secret set in ADMIN_BOOTSTRAP_SECRET env var.
 * 
 * POST /api/admin/bootstrap-admin
 * Headers: Authorization: Bearer <id_token>
 * Body: { "secret": "your-bootstrap-secret" }
 * 
 * After using this endpoint, delete it or remove the env var.
 */

const BOOTSTRAP_SECRET = process.env.ADMIN_BOOTSTRAP_SECRET || 'aura-admin-setup-2026';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res);
  }

  try {
    const auth = await verifyRequestAuth(req);
    if (!auth.ok) {
      return unauthorized(res, auth.message || 'Unauthorized');
    }

    const body = req.body || {};
    const { secret } = body;

    if (!secret || secret !== BOOTSTRAP_SECRET) {
      return res.status(403).json({ ok: false, error: 'Invalid bootstrap secret' });
    }

    // Check if user exists first via REST API (same approach as me.js)
    const DATABASE_URL = String(
      process.env.FIREBASE_DATABASE_URL ||
      'https://gen-lang-client-0640974949-default-rtdb.firebaseio.com'
    ).replace(/\/$/, '');

    const idToken = req.headers.authorization?.replace('Bearer ', '') || '';

    // Read current user
    const getUrl = `${DATABASE_URL}/users/${auth.uid}.json?auth=${encodeURIComponent(idToken)}`;
    const getRes = await fetch(getUrl);
    const userData = await getRes.json();

    if (!userData || userData.error) {
      return res.status(404).json({ ok: false, error: 'User not found in RTDB', details: userData?.error });
    }

    const oldRole = userData.role || 'not set';

    // Update role using user's own token
    const patchUrl = `${DATABASE_URL}/users/${auth.uid}.json?auth=${encodeURIComponent(idToken)}`;
    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' })
    });

    if (!patchRes.ok) {
      const err = await patchRes.text();
      return res.status(500).json({ ok: false, error: 'Failed to update role', details: err });
    }

    return res.status(200).json({
      ok: true,
      uid: auth.uid,
      email: auth.email,
      oldRole,
      newRole: 'admin',
      message: 'Admin role set successfully. You can now use /admin/keys.'
    });
  } catch (error) {
    console.error('bootstrap-admin error:', error);
    return serverError(res, 'Bootstrap failed', error?.message);
  }
}
