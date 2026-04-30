import React, { useState, type FormEvent, type ChangeEvent } from 'react';
import { Key, Check, X, Loader2, Gift } from 'lucide-react';
import { auth } from '../firebase.ts';

export default function ActivateKey() {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    tier?: string;
  } | null>(null);

  const formatKeyInput = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
    const parts = [
      cleaned.slice(0, 4),
      cleaned.slice(4, 8),
      cleaned.slice(8, 12),
      cleaned.slice(12, 16)
    ].filter(Boolean);
    return parts.join('-');
  };

  const handleKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatKeyInput(e.target.value);
    setKey(formatted);
    setResult(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (key.length < 19) return;

    setLoading(true);
    setResult(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        setResult({
          success: false,
          message: 'Необходимо войти в аккаунт для активации ключа'
        });
        return;
      }

      const idToken = await user.getIdToken();
      
      // First validate the key
      const validateRes = await fetch('/api/keys/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.replace(/-/g, '') })
      });
      
      const validateData = await validateRes.json();
      
      if (!validateData.ok || !validateData.valid) {
        setResult({
          success: false,
          message: validateData.reason || 'Неверный ключ'
        });
        return;
      }

      // Activate the key
      const activateRes = await fetch('/api/keys/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ key: key.replace(/-/g, '') })
      });

      const activateData = await activateRes.json();

      if (activateData.ok) {
        setResult({
          success: true,
          message: 'Ключ успешно активирован!',
          tier: activateData.tier
        });
        setKey('');
      } else {
        setResult({
          success: false,
          message: activateData.error || 'Ошибка активации ключа'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Ошибка сети. Попробуйте позже.'
      });
    } finally {
      setLoading(false);
    }
  };

  const getTierLabel = (tier?: string) => {
    const tiers: Record<string, string> = {
      '1_month': '1 месяц',
      '3_month': '3 месяца',
      '6_month': '6 месяцев',
      '12_month': '12 месяцев',
      'lifetime': 'Навсегда',
      'beta': 'Бета доступ'
    };
    return tier ? tiers[tier] || tier : '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-8 shadow-2xl">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Gift className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white text-center mb-2">
            Активация ключа
          </h1>
          <p className="text-slate-400 text-center mb-8">
            Введите ваш лицензионный ключ для активации подписки
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={key}
                onChange={handleKeyChange}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                maxLength={19}
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono text-lg tracking-wider"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={key.length < 19 || loading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Активировать ключ'
              )}
            </button>
          </form>

          {result && (
            <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 ${
              result.success 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-red-500/10 border border-red-500/30'
            }`}>
              {result.success ? (
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={result.success ? 'text-green-300' : 'text-red-300'}>
                  {result.message}
                </p>
                {result.tier && (
                  <p className="text-slate-400 text-sm mt-1">
                    Тариф: <span className="text-amber-400 font-medium">{getTierLabel(result.tier)}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              У вас нет ключа?{' '}
              <a href="/offer" className="text-amber-400 hover:text-amber-300 transition-colors">
                Приобрести подписку
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
