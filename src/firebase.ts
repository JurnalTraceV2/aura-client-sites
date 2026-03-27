// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// ТВОЙ КОНФИГ ИЗ FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyAaz1Sat0zPHZdeUESxkV8lNEtUJE7EEPA",
  authDomain: "gen-lang-client-0640974949.firebaseapp.com",
  projectId: "gen-lang-client-0640974949",
  storageBucket: "gen-lang-client-0640974949.firebasestorage.app",
  messagingSenderId: "90325346449",
  appId: "1:90325346449:web:86b3b2f10f9bc94155f730"
};

// ИНИЦИАЛИЗИРУЕМ FIREBASE (ОДИН РАЗ, БЛЯДЬ)
const app = initializeApp(firebaseConfig);

// ЭКСПОРТИРУЕМ ВСЕ ЧТО НУЖНО
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// ========== ХЕЛПЕРЫ ДЛЯ ОШИБОК ==========
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ ==========
export async function ensureUserDocument(user: any) {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        role: 'user',
        subscriptionStatus: 'inactive', // ПО УМОЛЧАНИЮ НЕТ ПОДПИСКИ
        subscription: 'none',
        hwid: null, // ДЛЯ ПРИВЯЗКИ К КОМПУ
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Пользователь создан в Firestore:', user.uid);
    } else {
      console.log('✅ Пользователь уже существует:', user.uid);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
  }
}

// ========== ФУНКЦИИ ДЛЯ ПЛАТЕЖЕЙ ==========
export async function createPendingPayment(userId: string, amount: number, tier: string) {
  try {
    const docRef = await addDoc(collection(db, 'payments'), {
      userId,
      amount,
      tier,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    console.log('💳 Создан платеж:', docRef.id);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'payments');
  }
}

// ========== ФУНКЦИЯ ДЛЯ ПРОВЕРКИ СТАТУСА ПОДПИСКИ ==========
export async function checkSubscriptionStatus(userId: string) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        hasSubscription: data.subscriptionStatus === 'active',
        status: data.subscriptionStatus,
        expiresAt: data.expiresAt?.toDate?.() || null,
        hwid: data.hwid || null
      };
    }
    return { hasSubscription: false, status: 'inactive', expiresAt: null, hwid: null };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    return { hasSubscription: false, status: 'inactive', expiresAt: null, hwid: null };
  }
}

// ========== ФУНКЦИЯ ДЛЯ ПРИВЯЗКИ HWID (БУДЕТ ВЫЗЫВАТЬСЯ ИЗ КЛИЕНТА) ==========
export async function setUserHwid(userId: string, hwid: string) {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { hwid: hwid }, { merge: true });
    console.log('🔒 HWID привязан:', hwid);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    return false;
  }
}