import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set, get, push, serverTimestamp, update, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAaz1Sat0zPHZdeUESxkV8lNEtUJE7EEPA",
  authDomain: "gen-lang-client-0640974949.firebaseapp.com",
  projectId: "gen-lang-client-0640974949",
  storageBucket: "gen-lang-client-0640974949.firebasestorage.app",
  messagingSenderId: "90325346449",
  appId: "1:90325346449:web:86b3b2f10f9bc94155f730",
  databaseURL: "https://gen-lang-client-0640974949-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`Error at ${path}:`, error);
}

export async function ensureUserDocument(user: any) {
  if (!user) return;
  const userRef = ref(db, `users/${user.uid}`);
  try {
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      await set(userRef, {
        email: user.email,
        role: 'user',
        subscription: 'none',
        hwid: null,
        createdAt: serverTimestamp()
      });
      console.log('✅ Пользователь создан:', user.uid);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

export async function createPendingPayment(userId: string, amount: number, tier: string) {
  try {
    const paymentsRef = ref(db, 'payments');
    const newPaymentRef = push(paymentsRef);
    await set(newPaymentRef, {
      userId,
      amount,
      tier,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    console.log('💳 Создан платеж:', newPaymentRef.key);
    return newPaymentRef.key;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

export async function checkSubscriptionStatus(userId: string) {
  try {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return {
        hasSubscription: data.subscription !== 'none',
        status: data.subscription || 'none',
        expiresAt: data.expiresAt || null,
        hwid: data.hwid || null
      };
    }
    return { hasSubscription: false, status: 'none', expiresAt: null, hwid: null };
  } catch (error) {
    return { hasSubscription: false, status: 'none', expiresAt: null, hwid: null };
  }
}

export async function setUserHwid(userId: string, hwid: string) {
  try {
    const userRef = ref(db, `users/${userId}`);
    await update(userRef, { hwid: hwid });
    console.log('🔒 HWID привязан:', hwid);
    return true;
  } catch (error) {
    return false;
  }
}

export async function getUserData(userId: string) {
  try {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    return null;
  }
}