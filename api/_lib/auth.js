import { webApiKey } from './firebase.js';
import { extractBearerToken } from './http.js';
import { emailToUsername, getUserByUid } from './license.js';

export async function verifyFirebaseIdToken(idToken) {
  const token = String(idToken || '').trim();
  console.log('[auth] Token present:', !!token, 'Length:', token.length);
  if (!token) {
    return { ok: false, message: 'Missing Firebase ID token.' };
  }

  if (!webApiKey) {
    console.error('[auth] Firebase API key is not configured');
    return { ok: false, message: 'Firebase API key is not configured.' };
  }
  console.log('[auth] Using API key:', webApiKey.slice(0, 10) + '...');

  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${webApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ idToken: token })
    });

    console.log('[auth] Google API response status:', response.status);
    const payload = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      console.error('[auth] Google API error:', payload?.error);
      return {
        ok: false,
        message: payload?.error?.message || 'Invalid Firebase ID token.'
      };
    }

    const user = Array.isArray(payload?.users) && payload.users.length > 0 ? payload.users[0] : null;
    if (!user?.localId) {
      console.error('[auth] No user found in response');
      return { ok: false, message: 'User not found for token.' };
    }

    console.log('[auth] User found, fetching profile for uid:', user.localId);
    const profile = await getUserByUid(user.localId).catch((err) => {
      console.error('[auth] getUserByUid error:', err?.message);
      return null;
    });

    return {
      ok: true,
      uid: user.localId,
      email: user.email || null,
      emailVerified: user.emailVerified === true,
      username: profile?.username || emailToUsername(user.email || '')
    };
  } catch (err) {
    console.error('[auth] verifyFirebaseIdToken exception:', err?.message);
    throw err;
  }
}

export async function verifyRequestAuth(req, fallbackToken = '') {
  const tokenFromHeader = extractBearerToken(req);
  const idToken = tokenFromHeader || String(fallbackToken || '').trim();
  return verifyFirebaseIdToken(idToken);
}
