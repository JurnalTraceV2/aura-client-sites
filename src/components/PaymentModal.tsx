// src/components/PaymentModal.tsx
import { useState } from 'react';
import { auth, createPendingPayment } from '../firebase';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: string;
  price: string;
}

export default function PaymentModal({ isOpen, onClose, tier, price }: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;

  // ТВОЙ API TOKEN ИЗ CRYPTOBOT
  const CRYPTOBOT_TOKEN = '558239:AAXiteBh9epNMEQSXK4ixIbuBrJ9Qn1ROlF';

  const handlePayment = async () => {
    if (!user) {
      alert('Сначала войдите в аккаунт');
      onClose();
      return;
    }

    setLoading(true);
    
    try {
      // Создаем запись о платеже в Firebase
      const paymentId = await createPendingPayment(user.uid, parseInt(price), tier);
      
      // Конвертируем рубли в USDT (примерно 1 USDT = 90 RUB)
      const amountUSD = Math.ceil(parseInt(price) / 90);
      
      // Создаем инвойс через API CryptoBot
      const response = await fetch('https://pay.crypt.bot/api/createInvoice', {
        method: 'POST',
        headers: {
          'Crypto-Pay-API-Token': CRYPTOBOT_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          asset: 'USDT',
          amount: amountUSD,
          description: `Подписка ${tier} для Aura Client`,
          payload: paymentId,
          paid_btn_name: 'callback',
          paid_btn_url: 'https://aura-client-sites.vercel.app/success'
        })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        // Открываем ссылку на оплату
        window.open(data.result.bot_url, '_blank');
        alert(`Оплатите ${amountUSD} USDT в Telegram. После оплаты подписка активируется автоматически.`);
        onClose();
      } else {
        alert('Ошибка: ' + (data.error || 'Не удалось создать платеж'));
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      alert('Ошибка при создании платежа. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Конвертируем рубли в USDT для отображения
  const priceNum = parseInt(price);
  const usdtAmount = Math.ceil(priceNum / 90);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-white mb-4">Оплата подписки</h2>
        <p className="text-gray-300 mb-2">Тариф: <span className="text-purple-400">{tier}</span></p>
        <p className="text-gray-300 mb-2">Сумма: <span className="text-2xl font-bold text-white">{price} ₽</span></p>
        <p className="text-gray-400 text-sm mb-6">≈ {usdtAmount} USDT</p>
        
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-400 mb-2">Способ оплаты:</p>
          <div className="flex items-center gap-3">
            <span className="text-xl">₿</span>
            <span className="text-white">USDT (TRC20) через Telegram</span>
          </div>
          <p className="text-xs text-gray-500 mt-2 mt-3">После оплаты подписка активируется автоматически</p>
        </div>
        
        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 rounded-xl transition-all duration-200 disabled:opacity-50"
        >
          {loading ? 'Создание платежа...' : `Оплатить ${usdtAmount} USDT`}
        </button>
        
        <button
          onClick={onClose}
          className="w-full mt-3 text-gray-400 hover:text-white py-2 transition"
        >
          Отмена
        </button>
        
        <p className="text-center text-xs text-gray-500 mt-4">
          Вопросы: <a href="mailto:sowingrim@mail.ru" className="text-blue-400">sowingrim@mail.ru</a>
        </p>
      </div>
    </div>
  );
}