import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle } from 'lucide-react';
import { auth, createPendingPayment } from '../firebase';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: string;
  price: string;
}

export function PaymentModal({ isOpen, onClose, tier, price }: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = auth.currentUser;

  const CRYPTOBOT_TOKEN = '558239:AAXiteBh9epNMEQSXK4ixIbuBrJ9Qn1ROlF';

  const handlePayment = async () => {
    if (!user) {
      alert('Сначала войдите в аккаунт');
      onClose();
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const amountUSD = Math.ceil(parseInt(price) / 90);
      
      // Создаем запись о платеже в Firebase
      const paymentId = await createPendingPayment(user.uid, parseInt(price), tier);
      
      if (!paymentId) {
        throw new Error('Не удалось создать платеж');
      }
      
      // Создаем инвойс в CryptoBot
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
      
      if (data.ok && data.result?.bot_url) {
        window.open(data.result.bot_url, '_blank');
        alert(`Оплатите ${amountUSD} USDT в Telegram. После оплаты подписка активируется.`);
        onClose();
      } else {
        throw new Error(data.error || 'Ошибка создания платежа');
      }
      
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Ошибка при создании платежа');
    } finally {
      setLoading(false);
    }
  };

  const priceNum = parseInt(price);
  const usdtAmount = Math.ceil(priceNum / 90);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-8">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-2xl font-bold text-white mb-2">Оплата подписки</h2>
              <p className="text-zinc-400 mb-6">Тариф: <span className="text-purple-400">{tier}</span> • {price} ₽</p>
              
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              
              <div className="bg-zinc-800 rounded-2xl p-6 mb-6">
                <p className="text-sm text-zinc-400 mb-2">Способ оплаты:</p>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">₿</span>
                  <span className="text-white font-medium">USDT (TRC20) через Telegram</span>
                </div>
                <div className="border-t border-zinc-700 pt-4">
                  <p className="text-sm text-zinc-400">К оплате: <span className="text-white font-bold text-lg">{usdtAmount} USDT</span></p>
                  <p className="text-xs text-zinc-500 mt-1">Курс: ~1 USDT = 90 RUB</p>
                </div>
              </div>
              
              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Создание платежа...
                  </>
                ) : (
                  `Оплатить ${usdtAmount} USDT`
                )}
              </button>
              
              <button
                onClick={onClose}
                className="w-full mt-3 text-zinc-400 hover:text-white py-3 transition"
              >
                Отмена
              </button>
              
              <p className="text-center text-xs text-zinc-500 mt-4">
                Вопросы: <a href="mailto:sowingrim@mail.ru" className="text-blue-400">sowingrim@mail.ru</a>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}