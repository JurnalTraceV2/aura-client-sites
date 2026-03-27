import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogOut, Key, Shield, Clock, AlertCircle } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DashboardModal({ isOpen, onClose }: DashboardModalProps) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !auth.currentUser) return;

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      doc(db, 'users', auth.currentUser.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          setError('Данные пользователя не найдены');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Firestore error:', error);
        setError('Ошибка загрузки данных. Проверьте подключение к интернету.');
        setLoading(false);
        handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}`);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  const handleLogout = async () => {
    await signOut(auth);
    onClose();
  };

  const getSubscriptionName = (sub: string) => {
    switch (sub) {
      case '1_month': return '1 Месяц';
      case 'lifetime': return 'Навсегда';
      case 'beta': return 'Beta Access';
      default: return 'Нет активной подписки';
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
            className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-8">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white to-zinc-400 flex items-center justify-center font-display font-black text-2xl text-black">A</div>
                <div>
                  <h2 className="text-3xl font-display font-bold">Личный кабинет</h2>
                  <p className="text-zinc-400 text-sm">{auth.currentUser?.email}</p>
                </div>
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  <p className="text-zinc-500 text-sm">Загрузка данных...</p>
                </div>
              ) : error ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-red-400 mb-4">{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
                  >
                    Перезагрузить
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Subscription Status */}
                  <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <p className="text-zinc-500 text-sm mb-1 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Текущий статус
                        </p>
                        <h3 className="text-2xl font-bold text-white">
                          {getSubscriptionName(userData?.subscription)}
                        </h3>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${userData?.subscription !== 'none' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                        {userData?.subscription !== 'none' ? 'Активен' : 'Неактивен'}
                      </div>
                    </div>
                  </div>

                  {/* Client Key */}
                  <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6">
                    <p className="text-zinc-500 text-sm mb-3 flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Ключ доступа (HWID)
                    </p>
                    {userData?.subscription !== 'none' ? (
                      <div className="flex items-center gap-4">
                        <code className="flex-1 bg-black border border-white/10 rounded-xl p-4 font-mono text-sm text-zinc-300">
                          {userData?.clientKey || 'Ожидание генерации ключа...'}
                        </code>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-zinc-500 bg-black/50 border border-white/5 rounded-xl p-4">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm">Приобретите подписку, чтобы получить ключ доступа.</p>
                      </div>
                    )}
                  </div>

                  {/* Role & Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-950 border border-white/5 rounded-2xl p-4">
                      <p className="text-zinc-500 text-xs mb-1">Роль аккаунта</p>
                      <p className="font-medium capitalize">{userData?.role || 'User'}</p>
                    </div>
                    <div className="bg-zinc-950 border border-white/5 rounded-2xl p-4">
                      <p className="text-zinc-500 text-xs mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Регистрация</p>
                      <p className="font-medium text-sm">
                        {userData?.createdAt?.toDate().toLocaleDateString() || 'Неизвестно'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                <button 
                  onClick={handleLogout}
                  className="px-6 py-3 rounded-xl bg-red-500/10 text-red-500 font-medium hover:bg-red-500/20 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Выйти из аккаунта
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}