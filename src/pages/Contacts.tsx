import React from 'react';

export default function Contacts() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Контакты</h1>
        
        <div className="space-y-8">
          <div className="bg-zinc-900/50 rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-semibold text-white mb-6">Свяжитесь с нами</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-zinc-400 mb-1">Email для связи</p>
                <a href="mailto:sowingrim@mail.ru" className="text-xl text-blue-400 hover:text-blue-300">sowingrim@mail.ru</a>
              </div>
            </div>
          </div>
          
          <div className="bg-zinc-900/50 rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-semibold text-white mb-4">Техническая поддержка</h2>
            <p className="text-zinc-300">Ответы в течение 24 часов (в рабочие дни). Для ускорения обработки указывайте email, который использовали при регистрации.</p>
            <p className="mt-4 text-sm text-zinc-500">По вопросам багов, оплаты и активации пишите на почту.</p>
          </div>
          
          <div className="bg-zinc-900/50 rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-semibold text-white mb-4">Юридическая информация</h2>
            <p className="text-zinc-300">Индивидуальный предприниматель / Самозанятый</p>
            <p className="text-zinc-300 mt-2">Email для официальных обращений: sowingrim@mail.ru</p>
            <p className="text-zinc-300 mt-2">Сайт: aura-client-sites.vercel.app</p>
          </div>
        </div>
        
        <a href="/" className="inline-block mt-8 text-blue-400 hover:text-blue-300 transition">← Вернуться на главную</a>
      </div>
    </div>
  );
}