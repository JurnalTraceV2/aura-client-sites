import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, User } from 'firebase/auth';
import { getDatabase, get, ref, serverTimestamp, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY || ''),
  authDomain: String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || ''),
  projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID || ''),
  storageBucket: String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || ''),
  messagingSenderId: String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
  appId: String(import.meta.env.VITE_FIREBASE_APP_ID || ''),
  databaseURL: String(import.meta.env.VITE_FIREBASE_DATABASE_URL || '')
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

function mapTierToBackend(tier: string) {
  const normalized = String(tier || '').trim().toLowerCase();
  if (normalized.includes('1') && normalized.includes('месяц')) {
    return '1_month';
  }
  if (normalized.includes('навсегда') || normalized.includes('lifetime')) {
    return 'lifetime';
  }
  if (normalized.includes('beta') || normalized.includes('бета')) {
    return 'beta';
  }
  if (normalized.includes('hwid') || normalized.includes('сброс')) {
    return 'hwid_reset';
  }
  return normalized;
}

async function authorizedFetch(url: string, init: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User is not authenticated.');
  }

  const idToken = await user.getIdToken();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${idToken}`);
  headers.set('Content-Type', 'application/json');

  return fetch(url, {
    ...init,
    headers
  });
}

export async function ensureUserDocument(user: User | null) {
  if (!user) {
    return;
  }

  const userRef = ref(db, `users/${user.uid}`);
  try {
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      await set(userRef, {
        email: user.email,
        role: 'user',
        subscription: 'none',
        hwidHash: null,
        createdAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('ensureUserDocument error:', error);
  }
}

export async function createCheckoutPayment(tierUi: string, returnUrl: string) {
  const tier = mapTierToBackend(tierUi);
  const response = await authorizedFetch('/api/payments/create', {
    method: 'POST',
    body: JSON.stringify({
      tier,
      returnUrl
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || payload?.message || `HTTP ${response.status}`);
  }

  return {
    paymentId: String(payload.paymentId || ''),
    confirmationUrl: String(payload.confirmationUrl || ''),
    expiresAt: Number(payload.expiresAt || 0)
  };
}

export async function fetchAccountProfile() {
  const response = await authorizedFetch('/api/account/me', {
    method: 'GET'
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || payload?.message || `HTTP ${response.status}`);
  }
  return payload;
}

export async function requestLauncherDownloadLink() {
  const response = await authorizedFetch('/api/account/download/launcher-url', {
    method: 'GET'
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok || !payload?.url) {
    throw new Error(payload?.error || payload?.message || `HTTP ${response.status}`);
  }

  return {
    url: String(payload.url),
    expiresAt: Number(payload.expiresAt || 0),
    sha256: String(payload.sha256 || ''),
    version: String(payload.version || '')
  };
}
