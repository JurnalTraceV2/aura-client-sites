// api/hwid-check.js
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';

// Firebase конфиг (КОПИРУЙ ИЗ ТВОЕГО firebase.ts)
const firebaseConfig = {
  apiKey: "AIzaSyAaz1Sat0zPHZdeUESxkV8lNEtUJE7EEPA",
  authDomain: "gen-lang-client-0640974949.firebaseapp.com",
  projectId: "gen-lang-client-0640974949",
  storageBucket: "gen-lang-client-0640974949.firebasestorage.app",
  messagingSenderId: "90325346449",
  appId: "1:90325346449:web:86b3b2f10f9bc94155f730",
  databaseURL: "https://gen-lang-client-0640974949-default-rtdb.firebaseio.com"
};

// Инициализируем Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default async function handler(req, res) {
  // Разрешаем только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { hwid, username } = req.body;

  if (!hwid || !username) {
    return res.status(400).json({ 
      allowed: false, 
      message: 'Недостаточно данных. Обратитесь в поддержку.' 
    });
  }

  console.log(`🔍 Проверка HWID: ${hwid}, Username: ${username}`);

  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    let userFound = null;
    let userId = null;
    
    // Ищем пользователя с таким HWID
    snapshot.forEach((childSnapshot) => {
      const userData = childSnapshot.val();
      if (userData.hwid === hwid) {
        userFound = userData;
        userId = childSnapshot.key;
      }
    });
    
    if (!userFound) {
      return res.status(200).json({
        allowed: false,
        message: '❌ Лицензия не найдена. Приобретите доступ на сайте.'
      });
    }
    
    const subscription = userFound.subscription;
    const isActive = subscription !== 'none' && subscription !== null;
    
    if (!isActive) {
      return res.status(200).json({
        allowed: false,
        message: '⛔ Подписка неактивна. Продлите на сайте.'
      });
    }
    
    if (userFound.banned === true) {
      return res.status(200).json({
        allowed: false,
        message: '🔒 Аккаунт заблокирован. Обратитесь в поддержку.'
      });
    }
    
    console.log(`✅ Доступ разрешен для HWID: ${hwid}`);
    
    return res.status(200).json({
      allowed: true,
      message: '✅ Доступ разрешен',
      subscription: subscription,
      username: userFound.email
    });
    
  } catch (error) {
    console.error('❌ Ошибка проверки HWID:', error);
    return res.status(500).json({
      allowed: false,
      message: '⚠️ Сервер временно недоступен. Попробуйте позже.'
    });
  }
}