import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, get, update } from 'firebase/database';

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
const auth = getAuth(app);
const db = getDatabase(app);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Принимаем оба формата (и login/pass, и email/password)
  const email = req.body.email || req.body.login;
  const password = req.body.password || req.body.pass;
  const hwid = req.body.hwid;

  if (!email || !password) {
    return res.status(200).json({ success: false, message: 'Введите email и пароль' });
  }

  try {
    // 1. Авторизация в Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const uid = user.uid;

    // 2. Проверка/создание записи в БД
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    let userData = snapshot.val();

    if (!userData) {
      await update(userRef, { email: email, subscription: 'none', role: 'user' });
      userData = { email, subscription: 'none' };
    }

    // 3. Проверка подписки
    if (userData.subscription === 'none' || !userData.subscription) {
      return res.status(200).json({ success: false, message: '⛔ Подписка неактивна' });
    }

    // 4. Привязка HWID (если есть)
    if (hwid && (!userData.hwid || userData.hwid === '')) {
      await update(userRef, { hwid: hwid });
    }

    // 5. Успех!
    return res.status(200).json({
      success: true,
      user: {
        login: email,
        id: uid,
        role: userData.role || 'User',
        subscription: userData.subscription
      }
    });

  } catch (error) {
    console.error('Auth error:', error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      return res.status(200).json({ success: false, message: '❌ Неверный логин или пароль' });
    }
    return res.status(200).json({ success: false, message: 'Серверная ошибка' });
  }
}