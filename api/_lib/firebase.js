import { getApps, initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyAaz1Sat0zPHZdeUESxkV8lNEtUJE7EEPA',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'gen-lang-client-0640974949.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0640974949',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'gen-lang-client-0640974949.firebasestorage.app',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '90325346449',
  appId: process.env.FIREBASE_APP_ID || '1:90325346449:web:86b3b2f10f9bc94155f730',
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://gen-lang-client-0640974949-default-rtdb.firebaseio.com'
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const webApiKey = process.env.FIREBASE_WEB_API_KEY || firebaseConfig.apiKey;
