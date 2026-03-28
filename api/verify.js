// api/verify.js
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

const firebaseConfig = { ... }; // тот же конфиг

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, hwid } = req.body;

  try {
    const sessionRef = ref(db, `sessions/${token}`);
    const session = await get(sessionRef);
    
    if (!session.exists()) {
      return res.status(200).json({ 
        valid: false, 
        message: 'Сессия не найдена' 
      });
    }
    
    const sessionData = session.val();
    
    // Проверка срока действия
    if (sessionData.expiresAt < Date.now()) {
      return res.status(200).json({ 
        valid: false, 
        message: 'Токен истек' 
      });
    }
    
    // Проверка HWID
    if (sessionData.hwid !== hwid) {
      return res.status(200).json({ 
        valid: false, 
        message: 'HWID не совпадает' 
      });
    }
    
    return res.status(200).json({ 
      valid: true, 
      userId: sessionData.userId 
    });
    
  } catch (error) {
    return res.status(500).json({ valid: false, message: 'Ошибка' });
  }
}