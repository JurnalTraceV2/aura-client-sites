import { webApiKey } from './firebase.js';
import { extractBearerToken } from './http.js';
import { emailToUsername, getUserByUid } from './license.js';

export async function verifyFirebaseIdToken(idToken) {
  const token = String(idToken || '').trim();
  if (!token) {
    return { ok: false, message: 'Missing Firebase ID token.' };
  }

  if (!webApiKey) {
    return { ok: false, message: 'Firebase API key is not configured.' };
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${webApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ idToken: token })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      message: payload?.error?.message || 'Invalid Firebase ID token.'
    };
  }

  const user = Array.isArray(payload?.users) && payload.users.length > 0 ? payload.users[0] : null;
  if (!user?.localId) {
    return { ok: false, message: 'User not found for token.' };
  }

  const profile = await getUserByUid(user.localId).catch(() => null);

  return {
    ok: true,
    uid: user.localId,
    email: user.email || null,
    emailVerified: user.emailVerified === true,
    username: profile?.username || emailToUsername(user.email || '')
  };
}

export async function verifyRequestAuth(req, fallbackToken = '') {
  const tokenFromHeader = extractBearerToken(req);
  const idToken = tokenFromHeader || String(fallbackToken || '').trim();
  return verifyFirebaseIdToken(idToken);
}
