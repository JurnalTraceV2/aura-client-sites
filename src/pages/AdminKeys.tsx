import React, { useState, useEffect, type FormEvent } from 'react';
import { Key, Plus, Copy, Check, AlertCircle, Loader2, Download } from 'lucide-react';
import { auth } from '../firebase.ts';

interface GeneratedKey {
  key: string;
  tier: string;
  expiresAt: number | null;
  maxActivations: number;
}

export default function AdminKeys() {
  const [count, setCount] = useState(1);
  const [tier, setTier] = useState('1_month');
  const [durationDays, setDurationDays] = useState('');
  const [maxActivations, setMaxActivations] = useState(1);
  const [loading, setLoading] = useState(false);
  const [canGenerate, setCanGenerate] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [generatedKeys, setGeneratedKeys] = useState<GeneratedKey[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  const tiers = [
    { value: '1_month', label: '1 месяц', defaultDuration: 30 },
    { value: '3_month', label: '3 месяца', defaultDuration: 90 },
    { value: '6_month', label: '6 месяцев', defaultDuration: 180 },
    { value: '12_month', label: '12 месяцев', defaultDuration: 365 },
    { value: 'lifetime', label: 'Навсегда', defaultDuration: 0 },
    { value: 'beta', label: 'Бета доступ', defaultDuration: 0 }
  ];

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    const selected = tiers.find(t => t.value === tier);
    if (selected && selected.defaultDuration > 0) {
      setDurationDays(String(selected.defaultDuration));
    } else {
      setDurationDays('');
    }
  }, [tier]);

  const checkAdminStatus = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setCanGenerate(false);
        setCheckingAdmin(false);
        return;
      }

      const idToken = await user.getIdToken();
      const res = await fetch('/api/account/me', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      
      const data = await res.json();
      setCanGenerate(data.role === 'admin' || data.role === 'youtuber');
    } catch {
      setCanGenerate(false);
    } finally {
      setCheckingAdmin(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setGeneratedKeys([]);

    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Необходимо войти в аккаунт');
        return;
      }

      const idToken = await user.getIdToken();
      
      const res = await fetch('/api/admin/generate-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          count,
          tier,
          durationDays: durationDays ? parseInt(durationDays) : null,
          maxActivations
        })
      });

      const data = await res.json();

      if (data.ok) {
        setGeneratedKeys(data.keys);
      } else {
        setError(data.error || 'Ошибка генерации ключей');
      }
    } catch {
      setError('Ошибка сети. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (key: string, index: number) => {
    navigator.clipboard.writeText(key);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const downloadKeys = () => {
    const content = generatedKeys.map(k => 
      `${k.key}\t${k.tier}\t${k.maxActivations} активаций\t${k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'Навсегда'}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keys_${tier}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!canGenerate) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-red-500/30 p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Доступ запрещен</h1>
          <p className="text-slate-400">Генерация ключей доступна только для ролей Admin и Youtuber.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6 md:p-8 shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Key className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Генератор ключей</h1>
              <p className="text-slate-400">Создание лицензионных ключей для пользователей</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Количество ключей
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Тариф
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500"
              >
                {tiers.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Длительность (дней)
              </label>
              <input
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder={tier === 'lifetime' ? 'Навсегда' : 'Авто'}
                disabled={tier === 'lifetime'}
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Макс. активаций на ключ
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxActivations}
                onChange={(e) => setMaxActivations(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Сгенерировать {count} {count === 1 ? 'ключ' : count < 5 ? 'ключа' : 'ключей'}
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {generatedKeys.length > 0 && (
            <div className="border-t border-slate-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Сгенерировано: {generatedKeys.length} ключей
                </h2>
                <button
                  onClick={downloadKeys}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Скачать
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {generatedKeys.map((key, index) => (
                  <div
                    key={key.key}
                    className="flex items-center justify-between bg-slate-900/50 rounded-xl p-4 border border-slate-700"
                  >
                    <div>
                      <code className="text-amber-400 font-mono text-lg">{key.key}</code>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                        <span>{tiers.find(t => t.value === key.tier)?.label}</span>
                        <span>•</span>
                        <span>{key.maxActivations} активаций</span>
                        {key.expiresAt && (
                          <>
                            <span>•</span>
                            <span>до {new Date(key.expiresAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(key.key, index)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Копировать"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <Copy className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
