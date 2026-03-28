// api/auth.js
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, get, update } from 'firebase/database';
import crypto from 'crypto';

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
const SECRET_KEY = "AuraClientSecretKey2024";

function generateToken(userId, hwid) {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const token = crypto.createHash('sha256')
    .update(`${userId}:${hwid}:${timestamp}:${nonce}:${SECRET_KEY}`)
    .digest('hex');
  
  return {
    token: token,
    expiresAt: timestamp + 10 * 60 * 1000
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, hwid } = req.body;

  if (!email || !password) {
    return res.status(200).json({ 
      success: false, 
      message: 'Введите email и пароль' 
    });
  }

  if (!hwid) {
    return res.status(200).json({ 
      success: false, 
      message: 'HWID не получен' 
    });
  }

  try {
    // 1. Проверяем логин через Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const uid = user.uid;
    
    // 2. Получаем данные из Realtime Database
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    
    let userData = snapshot.val();
    
    // 3. Если пользователь не найден в RTDB, создаем
    if (!userData) {
      await update(userRef, {
        email: email,
        subscription: 'none',
        role: 'user',
        createdAt: Date.now()
      });
      userData = { email, subscription: 'none' };
    }
    
    // 4. Проверяем подписку
    if (userData.subscription === 'none' || !userData.subscription) {
      return res.status(200).json({ 
        success: false, 
        message: '⛔ Подписка неактивна. Купите на сайте.' 
      });
    }
    
    // 5. Проверяем бан
    if (userData.banned === true) {
      return res.status(200).json({ 
        success: false, 
        message: '🔒 Аккаунт заблокирован' 
      });
    }
    
    // 6. Привязываем HWID (если не привязан или сбрасывается)
    if (!userData.hwid || userData.hwid === '') {
      await update(ref(db, `users/${uid}`), { 
        hwid: hwid,
        lastLogin: Date.now()
      });
      console.log(`🔗 HWID привязан к ${email}: ${hwid}`);
    }
    
    // 7. Проверяем, что HWID совпадает
    if (userData.hwid && userData.hwid !== hwid) {
      return res.status(200).json({ 
        success: false, 
        message: '❌ HWID не совпадает! Сбросьте в личном кабинете (499₽)' 
      });
    }
    
    // 8. Генерируем токен
    const tokenData = generateToken(uid, hwid);
    
    console.log(`✅ Авторизован: ${email}, подписка: ${userData.subscription}`);
    
    return res.status(200).json({
      success: true,
      token: tokenData.token,
      expiresAt: tokenData.expiresAt,
      subscription: userData.subscription
    });
    
  } catch (error) {
    console.error('Auth error:', error);
    
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      return res.status(200).json({ 
        success: false, 
        message: '❌ Неверный email или пароль' 
      });
    }
    
    return res.status(200).json({ 
      success: false, 
      message: 'Серверная ошибка. Попробуйте позже.' 
    });
  }
}