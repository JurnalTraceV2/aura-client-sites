import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogOut, Key, Shield, Clock, AlertCircle, RefreshCw, Download, Loader2, Copy, Plus } from 'lucide-react';
import { signOut } from 'firebase/auth';
import {
  auth,
  createAdminSubscriptionKey,
  fetchAccountProfile,
  fetchAdminSubscriptionKeys,
  redeemSubscriptionKey,
  requestLauncherDownloadLink,
  requestManualHwidReset
} from '../firebase';

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
  username: string | null;
  email: string | null;
  role: string;
  uidShort: string | null;
  subscription: string;
  subscriptionExpiresAt: number | null;
  banned: boolean;
  canDownloadLauncher: boolean;
  hwidHash: string | null;
  resetCredits: number;
  paidResetCredits: number;
  lastHwidResetAt: number | null;
  payments: AccountPayment[];
}

function normalizeProfile(payload: any): AccountProfile {
  const source = payload?.user && typeof payload.user === 'object' ? payload.user : payload || {};
  const paymentsRaw = Array.isArray(source.payments) ? source.payments : [];

  return {
    uid: String(source.uid || auth.currentUser?.uid || ''),
    username: source.username ?? null,
    email: source.email ?? auth.currentUser?.email ?? null,
    role: String(source.role || 'user').toLowerCase(),
    uidShort: source.uidShort ?? null,
    subscription: String(source.subscription || 'none'),
    subscriptionExpiresAt:
      typeof source.subscriptionExpiresAt === 'number' ? source.subscriptionExpiresAt : null,
    banned: Boolean(source.banned),
    canDownloadLauncher:
      typeof source.canDownloadLauncher === 'boolean'
        ? source.canDownloadLauncher
        : String(source.subscription || 'none') !== 'none' && !Boolean(source.banned),
    hwidHash: source.hwidHash ?? null,
    resetCredits: typeof source.resetCredits === 'number' ? source.resetCredits : 0,
    paidResetCredits: typeof source.paidResetCredits === 'number' ? source.paidResetCredits : 0,
    lastHwidResetAt: typeof source.lastHwidResetAt === 'number' ? source.lastHwidResetAt : null,
    payments: paymentsRaw.map((item: any) => ({
      paymentId: String(item?.paymentId || item?.id || ''),
      tier: item?.tier ?? null,
      amount: typeof item?.amount === 'number' ? item.amount : null,
      status: String(item?.status || 'pending'),
      createdAt: typeof item?.createdAt === 'number' ? item.createdAt : null,
      processedAt: typeof item?.processedAt === 'number' ? item.processedAt : null
    }))
  };
}

const LAUNCHER_VERSION = String(import.meta.env.VITE_LAUNCHER_VERSION || 'mega-webview-x64-20260329');
const LAUNCHER_SHA256 = String(
  import.meta.env.VITE_LAUNCHER_SHA256 || '79acf4084f7665c87ee91389c1d9773b2e80d67f963dd3441d9836c9e8226ccb'
);
const LAUNCHER_LINK_TTL_MS = Number(import.meta.env.VITE_LAUNCHER_LINK_TTL_MS || 5 * 60 * 1000);
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
      return sub && sub !== 'none' ? sub : 'Нет активной подписки';
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
  const [redeemKeyValue, setRedeemKeyValue] = useState('');
  const [redeemingKey, setRedeemingKey] = useState(false);
  const [adminPlan, setAdminPlan] = useState('1_month');
  const [adminDurationDays, setAdminDurationDays] = useState(30);
  const [adminNote, setAdminNote] = useState('');
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState('');
  const [adminKeys, setAdminKeys] = useState<any[]>([]);
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
      const normalized = normalizeProfile(payload);
      setProfile(normalized);
      setLauncherInfo(null);
      setAdminKeys([]);

      const recentPaymentId = localStorage.getItem('aura_last_payment_id');
      if (recentPaymentId) {
        const payment = normalized.payments.find((item) => item.paymentId === recentPaymentId);
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
      const secureLink = await requestLauncherDownloadLink();
      setLauncherInfo({
        version: secureLink.version || LAUNCHER_VERSION || 'unknown',
        sha256: secureLink.sha256 || LAUNCHER_SHA256 || '',
        expiresAt: secureLink.expiresAt || Date.now() + LAUNCHER_LINK_TTL_MS
      });
      window.location.href = secureLink.url;
    } catch (err: any) {
      setError(err?.message || 'Failed to start launcher download.');
    } finally {
      setDownloading(false);
    }
  };

  const handleRedeemKey = async (event: React.FormEvent) => {
    event.preventDefault();
    const key = redeemKeyValue.trim();
    if (!key) return;

    setRedeemingKey(true);
    setError(null);
    try {
      const result = await redeemSubscriptionKey(key);
      setRedeemKeyValue('');
      setRuntimeNotice(
        result.expiresAt
          ? `Ключ активирован. Подписка действует до: ${formatDate(result.expiresAt)}.`
          : 'Ключ активирован. Подписка без срока действия.'
      );
      await loadProfile();
    } catch (err: any) {
      setError(err?.message || 'Не удалось активировать ключ.');
    } finally {
      setRedeemingKey(false);
    }
  };

  const handleCreateAdminKey = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdminBusy(true);
    setAdminError(null);
    setError(null);
    try {
      const result = await createAdminSubscriptionKey(adminPlan, adminDurationDays, adminNote);
      setGeneratedKey(result.key);
      setAdminNote('');
      const keys = await fetchAdminSubscriptionKeys();
      setAdminKeys(keys);
    } catch (err: any) {
      setAdminError(err?.message || 'Не удалось сгенерировать ключ.');
    } finally {
      setAdminBusy(false);
    }
  };

  const handleResetClick = () => {
    if (!profile) return;

    if (profile.resetCredits > 0) {
      void (async () => {
        try {
          setLoading(true);
          setError(null);
          const result = await requestManualHwidReset();
          setRuntimeNotice(`HWID reset completed. Remaining credits: ${result.remainingResetCredits}.`);
          await loadProfile();
        } catch (err: any) {
          setError(err?.message || 'Failed to reset HWID.');
        } finally {
          setLoading(false);
        }
      })();
      return;
    }

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
            className="relative w-full max-w-3xl max-h-[calc(100vh-2rem)] bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain p-6 sm:p-8">
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
                  <p className="text-zinc-400 text-sm">{profile?.username || 'unknown'}</p>
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
                          �?стекает: <span className="font-semibold text-zinc-200">{formatDate(profile.subscriptionExpiresAt)}</span>
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusBadge.className}`}>
                        {statusBadge.label}
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-zinc-400">
                      Available reset credits: <span className="text-zinc-200 font-medium">{profile.resetCredits}</span>
                    </p>
                  </div>

                  <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6">
                    <p className="text-zinc-500 text-sm mb-3 flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Активация ключа
                    </p>
                    <form onSubmit={handleRedeemKey} className="flex flex-col sm:flex-row gap-3">
                      <input
                        value={redeemKeyValue}
                        onChange={(event) => setRedeemKeyValue(event.target.value)}
                        placeholder="AURA-XXXXX-XXXXX-XXXXX-XXXXX"
                        className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                      />
                      <button
                        type="submit"
                        disabled={redeemingKey || !redeemKeyValue.trim()}
                        className="px-5 py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {redeemingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                        Активировать
                      </button>
                    </form>
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

                  {profile.role === 'admin' && (
                    <div className="bg-zinc-950 border border-white/5 rounded-2xl p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="text-zinc-500 text-sm mb-1 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Админ-панель
                          </p>
                          <h3 className="text-xl font-bold text-white">Ключи подписки</h3>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase border border-green-500/30 bg-green-500/10 text-green-300">
                          admin
                        </span>
                      </div>

                      <form onSubmit={handleCreateAdminKey} className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
                        <select
                          value={adminPlan}
                          onChange={(event) => setAdminPlan(event.target.value)}
                          className="bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30"
                        >
                          <option value="1_month">Ограниченная подписка</option>
                          <option value="lifetime">Навсегда</option>
                          <option value="beta">Beta</option>
                        </select>
                        <input
                          type="number"
                          min={1}
                          max={3650}
                          value={adminDurationDays}
                          disabled={adminPlan === 'lifetime' || adminPlan === 'beta'}
                          onChange={(event) => setAdminDurationDays(Number(event.target.value || 1))}
                          className="bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white disabled:opacity-50 focus:outline-none focus:border-white/30"
                          aria-label="Duration in days"
                        />
                        <input
                          value={adminNote}
                          onChange={(event) => setAdminNote(event.target.value)}
                          placeholder="Комментарий для себя"
                          className="md:col-span-2 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                        />
                        <button
                          type="submit"
                          disabled={adminBusy}
                          className="md:col-span-2 px-5 py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {adminBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          Сгенерировать ключ
                        </button>
                      </form>

                      {adminError && (
                        <div className="mt-4 p-3 rounded-xl border border-red-500/25 bg-red-500/10 text-red-200 text-sm">
                          {adminError}
                        </div>
                      )}

                      {generatedKey && (
                        <div className="mt-4 p-3 rounded-xl border border-green-500/20 bg-green-500/10">
                          <p className="text-xs text-green-300 mb-2">Новый ключ показывается только сейчас:</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white break-all">
                              {generatedKey}
                            </code>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard?.writeText(generatedKey)}
                              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
                              title="Скопировать"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {adminKeys.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {adminKeys.slice(0, 5).map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs">
                              <div className="text-zinc-300">
                                <span className="font-medium">{item.plan}</span>
                                <span className="text-zinc-500 ml-2">
                                  {item.durationDays ? `${item.durationDays} дн.` : 'без срока'}
                                </span>
                              </div>
                              <span className={item.redeemed ? 'text-yellow-300' : 'text-green-300'}>
                                {item.redeemed ? 'использован' : 'активен'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

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

