import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, User } from 'firebase/auth';
import { getDatabase, get, ref, serverTimestamp, set } from 'firebase/database';

const defaultFirebaseConfig = {
  apiKey: 'AIzaSyAaz1Sat0zPHZdeUESxkV8lNEtUJE7EEPA',
  authDomain: 'gen-lang-client-0640974949.firebaseapp.com',
  projectId: 'gen-lang-client-0640974949',
  storageBucket: 'gen-lang-client-0640974949.firebasestorage.app',
  messagingSenderId: '90325346449',
  appId: '1:90325346449:web:86b3b2f10f9bc94155f730',
  databaseURL: 'https://gen-lang-client-0640974949-default-rtdb.firebaseio.com'
};

const firebaseConfig = {
  apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey),
  authDomain: String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain),
  projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId),
  storageBucket: String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket),
  messagingSenderId: String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId),
  appId: String(import.meta.env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId),
  databaseURL: String(import.meta.env.VITE_FIREBASE_DATABASE_URL || defaultFirebaseConfig.databaseURL)
};

const missingFirebaseEnv = Object.entries({
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
  VITE_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
  VITE_FIREBASE_DATABASE_URL: firebaseConfig.databaseURL
})
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseEnv.length > 0) {
  console.warn(
    `[Aura] Missing Firebase env vars: ${missingFirebaseEnv.join(', ')}. ` +
      'Using built-in fallback config. Set VITE_FIREBASE_* in deployment environment.'
  );
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

function getApiErrorMessage(payload: any, response: Response) {
  const base = String(payload?.error || payload?.message || `HTTP ${response.status}`).trim();
  const details = String(payload?.details || '').trim();
  if (!details) {
    return base;
  }
  return `${base} (${details})`;
}

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
    throw new Error(getApiErrorMessage(payload, response));
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
    throw new Error(getApiErrorMessage(payload, response));
  }
  return payload;
}

export async function requestLauncherDownloadLink() {
  const response = await authorizedFetch('/api/account/download/launcher-url', {
    method: 'GET'
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok || !payload?.url) {
    throw new Error(getApiErrorMessage(payload, response));
  }

  return {
    url: String(payload.url),
    expiresAt: Number(payload.expiresAt || 0),
    sha256: String(payload.sha256 || ''),
    version: String(payload.version || '')
  };
}
