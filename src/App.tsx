import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Sword, 
  ShieldAlert, 
  Zap, 
  Crosshair, 
  Cpu, 
  ChevronRight, 
  CheckCircle2,
  ShoppingCart,
  Youtube,
  Sparkles,
  User
} from 'lucide-react';
import { auth } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { AuthModal } from './components/AuthModal';
import { DashboardModal } from './components/DashboardModal';
import { PaymentModal } from './components/PaymentModal';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [selectedPrice, setSelectedPrice] = useState('');
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [hasPaymentReturn, setHasPaymentReturn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paymentReturn') === '1') {
      setHasPaymentReturn(true);
      setPaymentNotice('Платеж создан. Обновляем статус подписки...');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (hasPaymentReturn && user) {
      setIsDashboardOpen(true);
      setHasPaymentReturn(false);
    }
  }, [hasPaymentReturn, user]);

  const handleBuyClick = (tierId: string, tierLabel: string, price: string) => {
    if (user) {
      setSelectedTierId(tierId);
      setSelectedTier(tierLabel);
      setSelectedPrice(price);
      setIsPaymentOpen(true);
    } else {
      setIsAuthOpen(true);
    }
  };

  const handleResetHwidBuy = () => {
    setSelectedTierId('hwid_reset');
    setSelectedTier('Сброс HWID');
    setSelectedPrice('499 ₽');
    setIsPaymentOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-50 selection:bg-white/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white to-zinc-400 flex items-center justify-center font-display font-black text-2xl text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              A
            </div>
            <span className="font-display font-bold text-2xl tracking-wider">AURA</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Функции</a>
            <a href="#pricing" className="hover:text-white transition-colors">Тарифы</a>
            <div className="flex items-center gap-3 pl-8 border-l border-white/10">
              <SocialIcon href="https://discord.gg/9XYURMb5" icon={<DiscordIcon />} hoverColor="hover:text-[#5865F2] hover:bg-[#5865F2]/10 hover:border-[#5865F2]/50" />
              <SocialIcon href="https://t.me/AuraClients" icon={<TelegramIcon />} hoverColor="hover:text-[#2AABEE] hover:bg-[#2AABEE]/10 hover:border-[#2AABEE]/50" />
              <SocialIcon href="https://www.youtube.com/@turbingecho" icon={<Youtube className="w-4 h-4" />} hoverColor="hover:text-[#FF0000] hover:bg-[#FF0000]/10 hover:border-[#FF0000]/50" />
            </div>
          </div>
          
          {user ? (
            <button 
              onClick={() => setIsDashboardOpen(true)}
              className="bg-white text-black px-6 py-2.5 rounded-full font-bold text-sm hover:bg-zinc-200 hover:scale-105 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
            >
              <User className="w-4 h-4" />
              Личный кабинет
            </button>
          ) : (
            <button 
              onClick={() => setIsAuthOpen(true)}
              className="bg-white text-black px-6 py-2.5 rounded-full font-bold text-sm hover:bg-zinc-200 hover:scale-105 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
            >
              <ShoppingCart className="w-4 h-4" />
              Войти
            </button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden min-h-screen flex items-center">
        <div className="absolute inset-0 bg-grid-pattern opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-white/5 rounded-full blur-[120px]" />
        
        <div className="max-w-7xl mx-auto relative z-10 w-full">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="flex-1 text-center lg:text-left"
            >
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/5 border border-white/10 text-sm font-medium mb-8 backdrop-blur-md"
              >
                <Sparkles className="w-4 h-4 text-zinc-300" />
                <span className="text-zinc-300">Версия 1.16.5 • Обновление 3.0</span>
              </motion.div>
              
              <h1 className="text-6xl md:text-8xl font-display font-black tracking-tight mb-8 leading-[1.1]">
                Доминируй в pvp <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500 filter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                  AURA CLIENT
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                Приватный клиент для Minecraft 1.16.5 с лучшей KillAura на рынке. 
                Уничтожай игроков, выигрывай дуэли и будь на шаг впереди благодаря 
                умным алгоритмам обхода античитов.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <a href="#pricing" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] hover:scale-105 transition-all flex items-center justify-center gap-2">
                  Приобрести доступ
                  <ChevronRight className="w-5 h-5" />
                </a>
                <a 
                  href="https://www.youtube.com/@turbingecho"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-white font-bold text-lg hover:bg-zinc-800 hover:border-zinc-600 transition-all text-center flex items-center justify-center gap-3 group"
                >
                  <Youtube className="w-6 h-6 text-zinc-400 group-hover:text-red-500 transition-colors" />
                  Смотреть видео
                </a>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              className="flex-1 flex justify-center relative w-full max-w-lg"
            >
              <div className="absolute inset-0 bg-white/10 blur-[120px] rounded-full" />
              <motion.div 
                animate={{ y: [-15, 15, -15] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-full aspect-square rounded-[3rem] bg-gradient-to-br from-zinc-900/80 to-black/80 border border-white/10 flex items-center justify-center shadow-[0_0_80px_rgba(255,255,255,0.05)] overflow-hidden backdrop-blur-2xl"
              >
                <div className="absolute inset-0 opacity-40">
                  <motion.div animate={{ rotate: 360, y: [-20, 20, -20] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute top-10 left-10 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent border border-white/20 backdrop-blur-md rounded-2xl" />
                  <motion.div animate={{ rotate: -360, x: [-20, 20, -20] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute bottom-16 right-12 w-32 h-32 bg-gradient-to-tl from-white/5 to-transparent border border-white/10 backdrop-blur-md rounded-3xl" />
                </div>
                <div className="relative z-20 flex items-center justify-center">
                  <span className="absolute text-[16rem] font-display font-black text-transparent" style={{ WebkitTextStroke: '3px rgba(255,255,255,0.6)', filter: 'drop-shadow(0 0 50px rgba(255,255,255,0.4))' }}>
                    A
                  </span>
                  <span className="text-[16rem] font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-600 relative z-30">
                    A
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6 bg-zinc-950 relative">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-6xl font-display font-black mb-6">Бескомпромиссное преимущество</h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">Мы собрали лучшие функции для комфортной игры и доминации на серверах.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              delay={0.1}
              icon={<Sword className="w-7 h-7 text-white" />}
              title="Smart KillAura"
              description="Умная аура с настройкой FOV, дистанции и приоритета целей. деально бьет игроков, обходит популярные античиты (Matrix, Vulcan, Grim)."
            />
            <FeatureCard 
              delay={0.2}
              icon={<ShieldAlert className="w-7 h-7 text-zinc-300" />}
              title="AutoTotem & PvP Helper"
              description="Моментальный свап тотемов, авто-зелья, авто-броня и автоматическое уклонение от стрел в PvP."
            />
            <FeatureCard 
              delay={0.3}
              icon={<Crosshair className="w-7 h-7 text-zinc-400" />}
              title="Advanced ESP"
              description="Подсветка игроков, их брони, здоровья и предметов сквозь стены. Полностью настраиваемые цвета."
            />
            <FeatureCard 
              delay={0.4}
              icon={<Zap className="w-7 h-7 text-white" />}
              title="Velocity / AntiKB"
              description="Настраиваемое откидывание. Не дай врагам скинуть тебя в бездну или сбить комбо."
            />
            <FeatureCard 
              delay={0.5}
              icon={<Cpu className="w-7 h-7 text-zinc-300" />}
              title="Оптимизация FPS"
              description="Встроенные патчи рендеринга. Клиент выдает больше FPS в замесах, чем OptiFine или Sodium."
            />
            <FeatureCard 
              delay={0.6}
              icon={<CheckCircle2 className="w-7 h-7 text-zinc-400" />}
              title="Удобный GUI"
              description="Красивое ClickGUI с анимациями, биндами на любую клавишу и облачным сохранением конфигов."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 to-zinc-900" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-6xl font-display font-black mb-6">Выбери свой тариф</h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">Моментальная выдача после оплаты. Автоматические обновления.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto items-stretch">
            <PricingCard 
              delay={0.1}
              title="1 Месяц"
              price="299₽"
              features={['Доступ ко всем функциям', 'Обновления клиента', 'Поддержка в Discord', 'Готовые конфиги']}
              onBuy={() => handleBuyClick('1_month', '1 Месяц', '299₽')}
            />
            <PricingCard 
              delay={0.2}
              title="Навсегда"
              price="890₽"
              isPopular
              features={['Доступ ко всем функциям', 'Пожизненные обновления', 'Приоритетная поддержка', 'Премиум конфиги', 'Уникальная роль в Discord']}
              onBuy={() => handleBuyClick('lifetime', 'Навсегда', '890₽')}
            />
            <PricingCard 
              delay={0.3}
              title="Бета"
              price="1290₽"
              features={['Ранний доступ к обходам', 'Эксклюзивные функции', 'Прямая связь с кодером', 'Уникальная Beta роль', 'Влияние на разработку']}
              onBuy={() => handleBuyClick('beta', 'Бета', '1290₽')}
            />
            <PricingCard 
              delay={0.4}
              title="Сброс HWID"
              price="499₽"
              features={['Сброс привязки к ПК', 'Безлимитная активация', 'Одноразовая услуга', 'Подходит для всех тарифов']}
              onBuy={() => handleBuyClick('hwid_reset', 'Сброс HWID', '499₽')}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-zinc-950 py-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-display font-black text-sm text-black">A</div>
            <span className="font-display font-bold tracking-wider">AURA</span>
          </div>
          <p className="text-zinc-500 text-sm">
            © 2026 Aura Client. Не является официальным продуктом Minecraft.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="/offer" className="text-sm text-zinc-500 hover:text-white transition-colors">Публичная оферта</a>
            <a href="/privacy" className="text-sm text-zinc-500 hover:text-white transition-colors">Политика конфиденциальности</a>
            <a href="/contacts" className="text-sm text-zinc-500 hover:text-white transition-colors">Контакты</a>
          </div>
        </div>
        <p className="max-w-7xl mx-auto mt-4 text-center text-xs text-zinc-500">
          Самозанятый: Игорь Глебов Александрович, НН 20639063753
        </p>
      </footer>

      {/* Modals */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <DashboardModal
        isOpen={isDashboardOpen}
        onClose={() => {
          setIsDashboardOpen(false);
          setPaymentNotice(null);
        }}
        onResetHwid={handleResetHwidBuy}
        paymentNotice={paymentNotice}
      />
      <PaymentModal 
        isOpen={isPaymentOpen} 
        onClose={() => setIsPaymentOpen(false)} 
        tierId={selectedTierId}
        tier={selectedTier}
        price={selectedPrice}
      />
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -8 }}
      className="group p-8 rounded-3xl bg-zinc-900/40 backdrop-blur-sm border border-white/5 hover:border-white/20 hover:bg-zinc-900/60 transition-all duration-300"
    >
      <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(255,255,255,0.02)] group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-zinc-400 leading-relaxed text-lg">{description}</p>
    </motion.div>
  );
}

function PricingCard({ title, price, features, isPopular = false, delay, onBuy }: { title: string, price: string, features: string[], isPopular?: boolean, delay: number, onBuy: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className={`relative p-10 rounded-[2.5rem] border backdrop-blur-md transition-all duration-300 ${isPopular ? 'bg-zinc-900/80 border-white/30 shadow-[0_0_50px_rgba(255,255,255,0.1)] scale-105 z-10' : 'bg-zinc-900/30 border-white/10 hover:border-white/20 hover:bg-zinc-900/50'}`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-white rounded-full text-sm font-bold uppercase tracking-widest text-black shadow-[0_0_30px_rgba(255,255,255,0.6)]">
          Хит продаж
        </div>
      )}
      <h3 className="text-2xl font-medium text-zinc-400 mb-4">{title}</h3>
      <div className="text-5xl font-display font-black mb-10">{price}</div>
      
      <ul className="space-y-5 mb-10">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-4 text-zinc-300 text-lg">
            <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button 
        onClick={onBuy}
        className={`w-full py-5 rounded-2xl font-bold text-lg transition-all duration-300 ${isPopular ? 'bg-white text-black hover:bg-zinc-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
      >
        Выбрать тариф
      </button>
    </motion.div>
  );
}

function SocialIcon({ href, icon, hoverColor }: { href: string, icon: React.ReactNode, hoverColor: string }) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 transition-all duration-300 ${hoverColor}`}
    >
      {icon}
    </a>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  );
}

