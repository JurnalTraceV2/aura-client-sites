import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, Copy, Check } from 'lucide-react';
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
  const [step, setStep] = useState<'choose' | 'details'>('choose');
  const [method, setMethod] = useState<'card' | 'sbp' | 'crypto'>('card');
  const [copied, setCopied] = useState(false);
  const user = auth.currentUser;

  const PAYMENT_DETAILS = {
    card: '2200 1234 5678 9012',
    sbp: '+7 999 123-45-67',
    crypto: 'USDT (TRC20): TXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
  };

  const handleCreatePayment = async () => {
    if (!user) {
      alert('Сначала войдите в аккаунт');
      onClose();
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const priceNum = parseInt(price);
      const paymentId = await createPendingPayment(user.uid, priceNum, tier);
      
      if (!paymentId) {
        throw new Error('Не удалось создать платеж');
      }
      
      setStep('details');
      
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Ошибка при создании платежа');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMethodDetails = () => {
    switch (method) {
      case 'card':
        return { name: 'Банковская карта', details: PAYMENT_DETAILS.card, hint: 'Переведите сумму на карту' };
      case 'sbp':
        return { name: 'СБП', details: PAYMENT_DETAILS.sbp, hint: 'Переведите по номеру телефона' };
      case 'crypto':
        return { name: 'Криптовалюта', details: PAYMENT_DETAILS.crypto, hint: 'Переведите USDT (TRC20)' };
      default:
        return { name: '', details: '', hint: '' };
    }
  };

  const methodDetails = getMethodDetails();

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

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-display font-black text-xl text-black">A</div>
                <span className="font-display font-bold text-xl tracking-wider">AURA</span>
              </div>

              {step === 'choose' ? (
                <>
                  <h2 className="text-2xl font-bold text-white mb-2">Оплата подписки</h2>
                  <p className="text-zinc-400 mb-6">Тариф: <span className="text-purple-400">{tier}</span> • {price} ₽</p>
                  
                  {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}
                  
                  <div className="bg-zinc-800 rounded-2xl p-4 mb-6">
                    <p className="text-sm text-zinc-400 mb-3">Выберите способ оплаты:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setMethod('card')}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${
                          method === 'card' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                        }`}
                      >
                        💳 Карта
                      </button>
                      <button
                        onClick={() => setMethod('sbp')}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${
                          method === 'sbp' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                        }`}
                      >
                        📱 СБП
                      </button>
                      <button
                        onClick={() => setMethod('crypto')}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${
                          method === 'crypto' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                        }`}
                      >
                        ₿ Крипта
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleCreatePayment}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Создание платежа...
                      </>
                    ) : (
                      `Оплатить ${price} ₽`
                    )}
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-2">Реквизиты для оплаты</h2>
                  <p className="text-zinc-400 mb-6">Сумма: <span className="text-2xl font-bold text-white">{price} ₽</span></p>
                  
                  <div className="bg-zinc-800 rounded-2xl p-6 mb-6">
                    <p className="text-sm text-zinc-400 mb-2">{methodDetails.name}</p>
                    <div className="flex items-center justify-between gap-3 bg-black/50 rounded-xl p-4 border border-white/10">
                      <code className="font-mono text-sm text-white break-all flex-1">
                        {methodDetails.details}
                      </code>
                      <button
                        onClick={() => copyToClipboard(methodDetails.details)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-3">{methodDetails.hint}</p>
                  </div>
                  
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                    <p className="text-yellow-400 text-sm font-medium mb-1">⚠️ Важно!</p>
                    <p className="text-zinc-400 text-xs">После оплаты отправьте скриншот на <a href="mailto:sowingrim@mail.ru" className="text-blue-400">sowingrim@mail.ru</a> с темой "{tier}" и укажите ваш email. Подписка будет активирована вручную в течение 24 часов.</p>
                  </div>
                  
                  <button
                    onClick={() => setStep('choose')}
                    className="w-full py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                  >
                    Назад
                  </button>
                </>
              )}
              
              <button
                onClick={onClose}
                className="w-full mt-3 text-zinc-500 hover:text-white py-2 text-sm transition"
              >
                Закрыть
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}