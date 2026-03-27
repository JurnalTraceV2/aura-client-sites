// api/crypto-webhook.js
export default async function handler(req, res) {
  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { payload, status } = req.body;

  console.log('🔔 Получен вебхук от CryptoBot:', { payload, status });

  if (status === 'paid') {
    // payload = paymentId из Firebase
    console.log('✅ Платеж успешен! Нужно активировать подписку для paymentId:', payload);
    
    // TODO: Обновить статус подписки в Firebase
    // Пока просто возвращаем OK
  }

  res.status(200).json({ ok: true });
}