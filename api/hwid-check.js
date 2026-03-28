// api/hwid-check.js
// Эндпоинт для проверки HWID: https://aura-client-sites.vercel.app/api/hwid-check

import { ref, get, update } from 'firebase/database';
import { db } from '../../src/firebase'; // Или как у тебя импортируется

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
    // Ищем пользователя по email (или создаем отдельную коллекцию по HWID)
    // Здесь упрощенно: ищем в users по HWID
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
      // HWID не найден — доступ запрещен
      return res.status(200).json({
        allowed: false,
        message: '❌ Лицензия не найдена. Приобретите доступ на сайте.'
      });
    }
    
    // Проверяем подписку
    const subscription = userFound.subscription;
    const isActive = subscription !== 'none';
    
    if (!isActive) {
      return res.status(200).json({
        allowed: false,
        message: '⛔ Подписка истекла или неактивна. Продлите на сайте.'
      });
    }
    
    // Проверяем, не заблокирован ли пользователь
    if (userFound.banned === true) {
      return res.status(200).json({
        allowed: false,
        message: '🔒 Аккаунт заблокирован. Обратитесь в поддержку.'
      });
    }
    
    // ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ — ДОСТУП РАЗРЕШЕН
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