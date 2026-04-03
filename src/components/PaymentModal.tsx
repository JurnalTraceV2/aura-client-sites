import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, CreditCard } from 'lucide-react';
import { auth, createCheckoutPayment } from '../firebase';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tierId: string;
  tier: string;
  price: string;
}

export function PaymentModal({ isOpen, onClose, tierId, tier, price }: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = auth.currentUser;

  const handlePay = async () => {
    if (!user) {
      setError('������� ������� � �������.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const returnUrl = `${window.location.origin}/?paymentReturn=1`;
      const checkout = await createCheckoutPayment(tierId, returnUrl);
      if (!checkout.confirmationUrl) {
        throw new Error('��������� URL �� �������.');
      }

      localStorage.setItem('aura_last_payment_id', checkout.paymentId);
      window.location.href = checkout.confirmationUrl;
    } catch (err: any) {
      setError(err?.message || '�� ������� ������� ������.');
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

              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-display font-black text-xl text-black">A</div>
                <span className="font-display font-bold text-xl tracking-wider">AURA</span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">������ ��������</h2>
              <p className="text-zinc-400 mb-2">�����: <span className="text-white font-semibold">{tier}</span></p>
              <p className="text-zinc-400 mb-6">���������: <span className="text-white font-semibold">{price}</span></p>

              <div className="bg-zinc-800/70 rounded-xl border border-white/10 p-4 mb-6">
                <p className="text-sm text-zinc-300">
                  ����� ������� ��������� YooKassa checkout. �������� ������������ ������������� ����� �������� ������.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handlePay}
                disabled={loading}
                className="w-full bg-white text-black font-bold py-4 rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-zinc-200"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ������� � ������...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    ��������
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="w-full mt-3 text-zinc-500 hover:text-white py-2 text-sm transition"
              >
                �������
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
