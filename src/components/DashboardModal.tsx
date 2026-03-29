import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogOut, Key, Shield, Clock, AlertCircle, RefreshCw, Download, Loader2 } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, fetchAccountProfile, requestLauncherDownloadLink } from '../firebase';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetHwid?: () => void;
  paymentNotice?: string | null;
}

interface AccountPayment {
  paymentId: string;
  tier: string | null;
  amount: number | null;
  status: string;
  createdAt: number | null;
  processedAt: number | null;
}

interface AccountProfile {
  uid: string;
  email: string | null;
  uidShort: string | null;
  subscription: string;
  subscriptionExpiresAt: number | null;
  banned: boolean;
  canDownloadLauncher: boolean;
  hwidHash: string | null;
  payments: AccountPayment[];
}

function formatDate(timestamp: number | null | undefined) {
  if (!timestamp) {
    return '—';
  }
  return new Date(timestamp).toLocaleString();
}

function prettySubscription(sub: string) {
  switch (sub) {
    case '1_month':
      return '1 Месяц';
    case 'lifetime':
      return 'Навсегда';
    case 'beta':
      return 'Beta';
    default:
      return 'Нет активной подписки';
  }
}

function paymentStatusLabel(status: string) {
  switch (String(status || '').toLowerCase()) {
    case 'completed':
      return 'Оплачено';
    case 'failed':
      return 'Ошибка';
    default:
      return 'Ожидание';
  }
}

export function DashboardModal({ isOpen, onClose, onResetHwid, paymentNotice }: DashboardModalProps) {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [runtimeNotice, setRuntimeNotice] = useState<string | null>(paymentNotice || null);
  const [launcherInfo, setLauncherInfo] = useState<{
    version: string;
    sha256: string;
    expiresAt: number;
  } | null>(null);

  const statusBadge = useMemo(() => {
    if (!profile) {
      return { label: 'Unknown', className: 'bg-zinc-700/40 text-zinc-200 border-zinc-500/30' };
    }
    if (profile.banned) {
      return { label: 'BANNED', className: 'bg-red-500/20 text-red-300 border-red-500/30' };
    }
    if (profile.subscription !== 'none') {
      return { label: 'ACTIVE', className: 'bg-green-500/20 text-green-300 border-green-500/30' };
    }
    return { label: 'INACTIVE', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
  }, [profile]);

  const launcherState = useMemo(() => {
    if (!profile) {
      return {
        canDownload: false,
        className: 'text-zinc-400',
        message: 'Статус загрузки лаунчера будет доступен после загрузки профиля.'
      };
    }
    if (profile.banned) {
      return {
        canDownload: false,
        className: 'text-red-300',
        message: 'Скачивание недоступно: аккаунт заблокирован.'
      };
    }
    if (profile.subscription === 'none') {
      return {
        canDownload: false,
        className: 'text-yellow-300',
        message: 'Скачивание недоступно: активируйте подписку.'
      };
    }
    if (!profile.canDownloadLauncher) {
      return {
        canDownload: false,
        className: 'text-yellow-300',
        message: 'Скачивание временно недоступно. Проверьте статус подписки.'
      };
    }
    return {
      canDownload: true,
      className: 'text-green-300',
      message: 'Скачивание доступно.'
    };
  }, [profile]);

  const loadProfile = async () => {
    if (!auth.currentUser) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchAccountProfile();
      setProfile(payload as AccountProfile);
      setLauncherInfo(null);

      const recentPaymentId = localStorage.getItem('aura_last_payment_id');
      if (recentPaymentId) {
        const payment = (payload as AccountProfile).payments.find((item) => item.paymentId === recentPaymentId);
        if (payment) {
          const status = String(payment.status || '').toLowerCase();
          if (status === 'completed') {
            setRuntimeNotice('Оплата подтверждена. Подписка активирована.');
            localStorage.removeItem('aura_last_payment_id');
          } else if (status === 'failed') {
            setRuntimeNotice('Оплата завершилась ошибкой. Попробуйте снова.');
            localStorage.removeItem('aura_last_payment_id');
          } else {
            setRuntimeNotice('Платеж в обработке. Обновляем данные автоматически.');
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить данные кабинета.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !auth.currentUser) {
      return;
    }
    if (paymentNotice) {
      setRuntimeNotice(paymentNotice);
    }
    loadProfile();
  }, [isOpen, paymentNotice]);

  useEffect(() => {
    if (!isOpen || !runtimeNotice || !runtimeNotice.toLowerCase().includes('в обработке')) {
      return;
    }

    const timer = window.setTimeout(() => {
      loadProfile();
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [isOpen, runtimeNotice]);

  const handleLogout = async () => {
    await signOut(auth);
    onClose();
  };

  const handleDownloadLauncher = async () => {
    setDownloading(true);
    setError(null);
    try {
      const payload = await requestLauncherDownloadLink();
      setLauncherInfo({
        version: payload.version || 'unknown',
        sha256: payload.sha256 || '',
        expiresAt: payload.expiresAt || 0
      });
      window.location.href = payload.url;
    } catch (err: any) {
      setError(err?.message || 'Не удалось получить ссылку на скачивание.');
    } finally {
      setDownloading(false);
    }
  };

  const handleResetClick = () => {
    if (window.confirm('Сброс HWID открывает оплату тарифа "Сброс HWID". Продолжить?')) {
      onResetHwid?.();
      onClose();
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
            className="relative w-full max-w-3xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
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

              {runtimeNotice && (
                <div className="mb-5 p-4 rounded-xl border border-blue-500/25 bg-blue-500/10 text-blue-200 text-sm">
                  {runtimeNotice}
                </div>
              )}

              {error && (
                <div className="mb-5 p-4 rounded-xl border border-red-500/25 bg-red-500/10 text-red-200 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {loading ? (
                <div className="py-14 flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                  <p className="text-zinc-400 text-sm">Загрузка данных...</p>
                </div>
              ) : profile ? (
                <div className="space-y-6">
                  <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-zinc-500 text-sm mb-1 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Статус лицензии
                        </p>
                        <h3 className="text-2xl font-bold text-white">{prettySubscription(profile.subscription)}</h3>
                        <p className="text-zinc-400 text-sm mt-2">
                          UID: <span className="font-semibold text-zinc-200">{profile.uidShort || 'AURA-000000'}</span>
                        </p>
                        <p className="text-zinc-400 text-sm">
                          Истекает: <span className="font-semibold text-zinc-200">{formatDate(profile.subscriptionExpiresAt)}</span>
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusBadge.className}`}>
                        {statusBadge.label}
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6">
                    <p className="text-zinc-500 text-sm mb-3 flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Скачать лаунчер
                    </p>
                    <p className={`text-sm mb-3 ${launcherState.className}`}>
                      {launcherState.message}
                    </p>
                    <button
                      onClick={handleDownloadLauncher}
                      disabled={!launcherState.canDownload || downloading}
                      className="px-5 py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Скачать Aura Launcher
                    </button>
                    {launcherInfo && (
                      <div className="mt-4 p-3 rounded-xl border border-white/10 bg-black/30 text-xs text-zinc-300 space-y-1">
                        <p>Версия: <span className="text-zinc-100 font-medium">{launcherInfo.version}</span></p>
                        <p className="break-all">SHA-256: <span className="text-zinc-100 font-mono">{launcherInfo.sha256 || 'недоступно'}</span></p>
                        <p>Ссылка активна до: <span className="text-zinc-100">{formatDate(launcherInfo.expiresAt)}</span></p>
                      </div>
                    )}
                  </div>

                  <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6">
                    <p className="text-zinc-500 text-sm mb-3 flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      HWID
                    </p>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 bg-black border border-white/10 rounded-xl p-3 font-mono text-xs text-zinc-300 break-all">
                        {profile.hwidHash || 'Не привязан'}
                      </code>
                      {profile.hwidHash && (
                        <button
                          onClick={handleResetClick}
                          className="px-4 py-2 rounded-xl bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors flex items-center gap-2 text-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Сброс
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6">
                    <p className="text-zinc-500 text-sm mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Последние платежи
                    </p>
                    {profile.payments.length === 0 ? (
                      <p className="text-zinc-500 text-sm">Платежей пока нет.</p>
                    ) : (
                      <div className="space-y-2">
                        {profile.payments.slice(0, 5).map((payment) => (
                          <div key={payment.paymentId} className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-sm">
                            <div className="text-zinc-300">
                              <span className="font-medium">{payment.tier || 'unknown'}</span>
                              <span className="text-zinc-500 ml-2">{formatDate(payment.createdAt)}</span>
                            </div>
                            <div className="text-zinc-200">{paymentStatusLabel(payment.status)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-zinc-500">Нет данных профиля.</div>
              )}

              <div className="mt-8 pt-6 border-t border-white/10 flex justify-between gap-3">
                <button
                  onClick={loadProfile}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-100 hover:bg-zinc-700 transition text-sm"
                >
                  Обновить
                </button>
                <button
                  onClick={handleLogout}
                  className="px-6 py-3 rounded-xl bg-red-500/10 text-red-400 font-medium hover:bg-red-500/20 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Выйти
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
