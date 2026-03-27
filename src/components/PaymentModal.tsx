import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, CheckCircle2, Loader2 } from 'lucide-react';
import { auth, createPendingPayment } from '../firebase';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: string;
  price: string;
}

export function PaymentModal({ isOpen, onClose, tier, price }: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError('');

    try {
      // Simulate payment gateway delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create pending payment in database
      const amount = parseInt(price.replace(/\D/g, ''));
      const tierId = tier === '1 Месяц' ? '1_month' : tier === 'Навсегда' ? 'lifetime' : 'beta';
      
      await createPendingPayment(auth.currentUser.uid, amount, tierId);
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 3000);
    } catch (err: any) {
      setError('Ошибка при создании платежа. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!loading && !success ? onClose : undefined}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-8">
              {!loading && !success && (
                <button 
                  onClick={onClose}
                  className="absolute top-6 right-6 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              )}

              {success ? (
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
                  >
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </motion.div>
                  <h2 className="text-3xl font-display font-bold mb-4">Платеж создан!</h2>
                  <p className="text-zinc-400">
                    Ожидаем подтверждения от платежной системы. Подписка будет выдана автоматически.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white to-zinc-400 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-display font-bold">Оплата</h2>
                      <p className="text-zinc-400 text-sm">Безопасный платеж</p>
                    </div>
                  </div>

                  <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6 mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-zinc-400">Тариф</span>
                      <span className="font-bold text-white">{tier}</span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-zinc-400">Email</span>
                      <span className="font-medium text-zinc-300">{auth.currentUser?.email}</span>
                    </div>
                    <div className="w-full h-px bg-white/10 my-4" />
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">К оплате</span>
                      <span className="text-3xl font-display font-black text-white">{price}</span>
                    </div>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <button 
                    onClick={handlePayment}
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Обработка...
                      </>
                    ) : (
                      <>
                        Перейти к оплате
                      </>
                    )}
                  </button>
                  <p className="text-center text-zinc-500 text-xs mt-4">
                    Нажимая кнопку, вы соглашаетесь с правилами сервиса (TOS).
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
