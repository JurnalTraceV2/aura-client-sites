/**
 * Firebase Admin SDK initializer for Vercel serverless functions.
 *
 * The Admin SDK bypasses Firebase Security Rules entirely, which is what
 * we want for server-side API handlers.
 *
 * Auth options (in priority order):
 *  1. GOOGLE_APPLICATION_CREDENTIALS_JSON  — full service-account JSON as a string
 *  2. GOOGLE_APPLICATION_CREDENTIALS       — path to a service-account JSON file (local dev)
 *  3. Application Default Credentials       — works on Google Cloud / Firebase Hosting
 *
 * For Vercel: set GOOGLE_APPLICATION_CREDENTIALS_JSON in the project env vars
 * with the contents of your Firebase service account key JSON.
 */

import { cert, getApp, getApps, initializeApp as initAdminApp } from 'firebase-admin/app';
import { getDatabase as getAdminDatabase } from 'firebase-admin/database';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

function initAdmin() {
  if (getApps().length > 0) {
    return getApp();
  }

  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    'https://gen-lang-client-0640974949-default-rtdb.firebaseio.com';

  const credsJson = String(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '').trim();
  if (credsJson) {
    try {
      const serviceAccount = JSON.parse(credsJson);
      return initAdminApp({ credential: cert(serviceAccount), databaseURL });
    } catch (parseErr) {
      console.error('[firebase-admin] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', parseErr?.message);
    }
  }

  // Fallback: Application Default Credentials (works on GCP / emulator)
  return initAdminApp({ databaseURL });
}

const adminApp = initAdmin();
const firestoreDatabaseId =
  process.env.FIRESTORE_DATABASE_ID ||
  'ai-studio-4ed7f4b0-de10-4fc8-bc51-9ad2449fa3bb';
export const adminDb = getAdminDatabase(adminApp);
export const adminFirestore = getAdminFirestore(adminApp, firestoreDatabaseId);
