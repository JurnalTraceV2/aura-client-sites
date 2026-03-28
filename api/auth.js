import { initializeApp } from 'firebase/app';
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
const db = getDatabase(app);
const SECRET_KEY = "YOUR_SECRET_KEY_FOR_TOKENS"; // Смени на свой

function generateToken(userId, hwid) {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const token = crypto.createHash('sha256')
    .update(`${userId}:${hwid}:${timestamp}:${nonce}:${SECRET_KEY}`)
    .digest('hex');
  
  return {
    token: token,
    expiresAt: timestamp + 10 * 60 * 1000 // 10 минут
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { hwid, username } = req.body;

  if (!hwid) {
    return res.status(400).json({ success: false, message: 'HWID не получен' });
  }

  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    let userFound = null;
    let userId = null;
    
    snapshot.forEach((childSnapshot) => {
      const userData = childSnapshot.val();
      if (userData.hwid === hwid || userData.email === username) {
        userFound = userData;
        userId = childSnapshot.key;
      }
    });
    
    if (!userFound) {
      return res.status(200).json({ 
        success: false, 
        message: '❌ Лицензия не найдена' 
      });
    }
    
    if (userFound.subscription === 'none' || !userFound.subscription) {
      return res.status(200).json({ 
        success: false, 
        message: '⛔ Подписка неактивна' 
      });
    }
    
    if (userFound.banned === true) {
      return res.status(200).json({ 
        success: false, 
        message: '🔒 Аккаунт заблокирован' 
      });
    }
    
    // Привязываем HWID если нужно
    if (!userFound.hwid) {
      await update(ref(db, `users/${userId}`), { 
        hwid: hwid,
        lastLogin: Date.now()
      });
    }
    
    // Генерируем токен
    const tokenData = generateToken(userId, hwid);
    
    console.log(`✅ Авторизован: ${userFound.email}`);
    
    return res.status(200).json({
      success: true,
      token: tokenData.token,
      expiresAt: tokenData.expiresAt
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    return res.status(500).json({ success: false, message: 'Серверная ошибка' });
  }
}