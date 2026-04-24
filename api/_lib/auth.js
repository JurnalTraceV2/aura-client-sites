import { webApiKey } from './firebase.js';
import { extractBearerToken } from './http.js';
import { adminAuth } from './firebase-admin.js';
import { emailToUsername, getUserByUid } from './license.js';

const AUTH_TIMEOUT_MS = Number(process.env.ADMIN_AUTH_TIMEOUT_MS || 8000);

async function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function verifyFirebaseIdToken(idToken) {
  const token = String(idToken || '').trim();
  if (!token) {
    return { ok: false, message: 'Missing Firebase ID token.' };
  }

  try {
    const decoded = await withTimeout(
      adminAuth.verifyIdToken(token),
      AUTH_TIMEOUT_MS,
      'Firebase auth verification timed out.'
    );
    const profile = await getUserByUid(decoded.uid).catch(() => null);

    return {
      ok: true,
      uid: decoded.uid,
      email: decoded.email || null,
      emailVerified: decoded.email_verified === true,
      username: profile?.username || emailToUsername(decoded.email || ''),
      role: decoded.admin === true || decoded.role === 'admin' ? 'admin' : null,
      idToken: token
    };
  } catch (adminError) {
    console.warn('verifyFirebaseIdToken: admin verification failed, falling back:', adminError?.message || adminError);
  }

  if (!webApiKey) {
    return { ok: false, message: 'Firebase API key is not configured.' };
  }

  const response = await withTimeout(
    fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${webApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ idToken: token })
    }),
    AUTH_TIMEOUT_MS,
    'Firebase auth verification timed out.'
  );

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
    username: profile?.username || emailToUsername(user.email || ''),
    role: null,
    idToken: token
  };
}

export async function verifyRequestAuth(req, fallbackToken = '') {
  const tokenFromHeader = extractBearerToken(req);
  const idToken = tokenFromHeader || String(fallbackToken || '').trim();
  return verifyFirebaseIdToken(idToken);
}
