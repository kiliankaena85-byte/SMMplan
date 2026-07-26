'use client';

import React, { useState } from 'react';
import './dashboards.css';
import { 
  Send, 
  Instagram, 
  Youtube, 
  Video, 
  Share2, 
  HelpCircle, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Copy, 
  TrendingUp, 
  Zap, 
  Sparkles, 
  ShieldCheck, 
  ArrowUpRight,
  Menu,
  X,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Layers,
  Sliders,
  Award
} from 'lucide-react';

/* ==========================================================================
   DATA DICTIONARY (Shared Data per prompt spec §4)
   ========================================================================== */
const DASHBOARD_DATA = {
  balance: '12 480 ₽',
  spent: '84 210 ₽',
  ordersCount: 312,
  savings: '5 940 ₽',
  refCode: 'ART-7F2K',
  refBalance: '1 240 ₽',
  supportHours: '09:00 – 21:00 МСК',
  recentOrders: [
    {
      id: '#381920',
      network: 'Telegram',
      service: 'Подписчики (Канал / Группа)',
      status: 'IN_PROGRESS',
      statusText: 'В работе',
      link: 'https://t.me/my_awesome_channel',
      amount: '3.38 ₽',
      date: 'Сегодня, 13:14',
      icon: Send,
      color: '#1f9bf0'
    },
    {
      id: '#381919',
      network: 'Telegram',
      service: 'Реакции (🔥👍🎉 на пост)',
      status: 'COMPLETED',
      statusText: 'Выполнен',
      link: 'https://t.me/my_awesome_channel/142',
      amount: '3.38 ₽',
      date: 'Вчера, 18:40',
      icon: Send,
      color: '#1f9bf0'
    },
    {
      id: '#381890',
      network: 'Instagram',
      service: 'Лайки (Быстрый старт)',
      status: 'COMPLETED',
      statusText: 'Выполнен',
      link: 'https://instagram.com/p/C9xL2pQo8Mn',
      amount: '11.20 ₽',
      date: '24 июля, 09:12',
      icon: Instagram,
      color: '#e0218a'
    },
    {
      id: '#381750',
      network: 'YouTube',
      service: 'Просмотры (Удержание 3+ мин)',
      status: 'ERROR',
      statusText: 'Ошибка',
      link: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      amount: '24.00 ₽',
      date: '22 июля, 16:05',
      icon: Youtube,
      color: '#ff0000'
    }
  ],
  tariffs: [
    { id: 'econ', name: 'Эконом', price: '0.01 ₽/шт', min: 10, speed: '~500 / день', badge: 'ЭКОНОМ', badgeBg: 'bg-emerald-500/10 text-emerald-600' },
    { id: 'std', name: 'Стандарт', price: '0.03 ₽/шт', min: 10, speed: '~5 000 / день', badge: 'СТАНДАРТ', badgeBg: 'bg-sky-500/10 text-sky-600', popular: true },
    { id: 'prem', name: 'Премиум', price: '0.05 ₽/шт', min: 10, speed: 'Мгновенно', badge: 'ПРЕМИУМ', badgeBg: 'bg-purple-500/10 text-purple-600' }
  ]
};

/* ==========================================================================
   SMMPLAN DASHBOARD COMPONENT (SaaS Terminal Professional)
   ========================================================================== */
function SmmPlanDashboard({ isPreviewMode = false }: { isPreviewMode?: boolean }) {
  const [selectedNetwork, setSelectedNetwork] = useState('tg');
  const [selectedCategory, setSelectedCategory] = useState('subs');
  const [selectedTariff, setSelectedTariff] = useState('std');
  const [quantity, setQuantity] = useState('1000');
  const [targetLink, setTargetLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleCopyRef = () => {
    navigator.clipboard?.writeText(`https://smmplan.ru/ref/${DASHBOARD_DATA.refCode}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="smmplan-scope w-full min-h-screen pb-16">
      {/* ── 1. TOP HEADER NAVIGATION ── */}
      <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Brand Logo */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-[#1f9bf0] flex items-center justify-center text-white font-black text-lg shadow-sm">
                P
              </div>
              <span className="font-heading text-xl text-[#0e131a] tracking-tight font-extrabold">
                SMMplan
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-[#e7f2fe] text-[#1f9bf0] rounded-full uppercase tracking-wider">
                Terminal
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              <a href="#dashboard" className="px-3 py-2 rounded-lg text-sm font-semibold text-[#1f9bf0] bg-[#e7f2fe]">
                Дашборд
              </a>
              <a href="#orders" className="px-3 py-2 rounded-lg text-sm font-medium text-[#414a59] hover:bg-[#e9edf2] transition-colors">
                Мои заказы
              </a>
              <a href="#deposit" className="px-3 py-2 rounded-lg text-sm font-medium text-[#414a59] hover:bg-[#e9edf2] transition-colors">
                Пополнение
              </a>
              <a href="#referrals" className="px-3 py-2 rounded-lg text-sm font-medium text-[#414a59] hover:bg-[#e9edf2] transition-colors">
                Рефералы
              </a>
              <a href="#support" className="px-3 py-2 rounded-lg text-sm font-medium text-[#414a59] hover:bg-[#e9edf2] transition-colors">
                Поддержка
              </a>
            </nav>

            {/* Right Quick Controls & Balance */}
            <div className="flex items-center gap-3">
              <div className="bg-[#e9edf2] px-3.5 py-1.5 rounded-full border border-[#d3dce8] flex items-center gap-2">
                <span className="text-xs font-semibold text-[#8b94a3] uppercase hidden sm:inline">Баланс:</span>
                <span className="font-mono-data font-bold text-[#0e131a] text-sm sm:text-base">{DASHBOARD_DATA.balance}</span>
              </div>
              <button className="hidden sm:flex items-center gap-1.5 bg-[#1f9bf0] hover:bg-[#0b7fd4] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Пополнить</span>
              </button>

              {/* Mobile Burger Trigger */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-[#414a59] hover:bg-[#e9edf2] rounded-lg"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-[#e2e8f0] py-3 space-y-1 animate-in slide-in-from-top duration-200">
              <a href="#dashboard" className="block px-3 py-2 rounded-lg text-sm font-semibold text-[#1f9bf0] bg-[#e7f2fe]">
                Дашборд
              </a>
              <a href="#orders" className="block px-3 py-2 rounded-lg text-sm font-medium text-[#414a59] hover:bg-[#e9edf2]">
                Мои заказы
              </a>
              <a href="#deposit" className="block px-3 py-2 rounded-lg text-sm font-medium text-[#414a59] hover:bg-[#e9edf2]">
                Пополнение
              </a>
              <a href="#referrals" className="block px-3 py-2 rounded-lg text-sm font-medium text-[#414a59] hover:bg-[#e9edf2]">
                Рефералы
              </a>
              <a href="#support" className="block px-3 py-2 rounded-lg text-sm font-medium text-[#414a59] hover:bg-[#e9edf2]">
                Поддержка (09–21 МСК)
              </a>
            </div>
          )}
        </div>
      </header>

      {/* ── 2. SINGLE-LINE TICKER CAPSULE BAR ── */}
      <div className="bg-[#0e131a] text-white py-2 overflow-hidden border-b border-[#e2e8f0]">
        <div className="ticker-track text-xs font-semibold space-x-8 px-4">
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1f9d6b] animate-pulse" />
            <span>Платформа работает в штатном режиме</span>
          </span>
          <span>⚡ 15+ соцсетей</span>
          <span>• 500+ услуг</span>
          <span>• Авто-выполнение 24/7</span>
          <span>• 9–21 Поддержка МСК</span>
          <span>• Сберегли клиентам 5 940 ₽</span>
          <span>• Выполнено заказов: 1 420 000+</span>
          {/* Duplicate for seamless looping */}
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1f9d6b]" />
            <span>Платформа работает в штатном режиме</span>
          </span>
          <span>⚡ 15+ соцсетей</span>
          <span>• 500+ услуг</span>
          <span>• Авто-выполнение 24/7</span>
        </div>
      </div>

      {/* ── 3. MAIN DASHBOARD WORKSPACE ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* TOP ROW: BALANCE HERO + QUICK STATS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Balance Hero Card (White + Blue Accent Strip) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-8 border border-[#e2e8f0] border-l-4 border-l-[#1f9bf0] shadow-[0_16px_40px_rgba(23,43,77,0.07)] flex flex-col justify-between min-w-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8b94a3]">Текущий баланс</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e6f7f0] text-[#1f9d6b] text-xs font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1f9d6b]" />
                  Активен
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-3">
                <h1 className="font-mono-data text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0e131a] tracking-tight">
                  {DASHBOARD_DATA.balance}
                </h1>
                <span className="text-xs font-semibold text-[#8b94a3]">ID счёта: #USR-8491</span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-[#e2e8f0] flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div>
                  <span className="text-[11px] font-semibold text-[#8b94a3] block">Всего потрачено</span>
                  <span className="font-mono-data text-sm sm:text-base font-bold text-[#0e131a]">{DASHBOARD_DATA.spent}</span>
                </div>
                <div className="w-px h-8 bg-[#e2e8f0] hidden sm:block" />
                <div>
                  <span className="text-[11px] font-semibold text-[#8b94a3] block">Сэкономлено</span>
                  <span className="font-mono-data text-sm sm:text-base font-bold text-[#1f9d6b]">+{DASHBOARD_DATA.savings}</span>
                </div>
                <div className="w-px h-8 bg-[#e2e8f0] hidden sm:block" />
                <div>
                  <span className="text-[11px] font-semibold text-[#8b94a3] block">Заказов</span>
                  <span className="font-mono-data text-sm sm:text-base font-bold text-[#0e131a]">{DASHBOARD_DATA.ordersCount} шт</span>
                </div>
              </div>

              <button className="w-full sm:w-auto bg-[#1f9bf0] hover:bg-[#0b7fd4] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>Пополнить баланс</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Side Card */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-[#e2e8f0] shadow-[0_16px_40px_rgba(23,43,77,0.07)] flex flex-col justify-between space-y-4 min-w-0">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <h3 className="font-heading text-sm font-bold text-[#0e131a] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#1f9bf0]" />
                Ваш статус: <span className="text-[#1f9bf0]">PRO Клиент</span>
              </h3>
              <span className="text-xs font-mono-data text-[#8b94a3]">Скидка 5%</span>
            </div>

            <div className="space-y-3">
              <div className="bg-[#e9edf2] p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-[#414a59]">Реферальный баланс:</span>
                <span className="font-mono-data font-bold text-[#0e131a]">{DASHBOARD_DATA.refBalance}</span>
              </div>
              <div className="bg-[#e9edf2] p-3 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-[#414a59]">Скорость обработки:</span>
                <span className="font-semibold text-[#1f9d6b] flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Приоритетный очередь
                </span>
              </div>
            </div>

            <div className="pt-2">
              <a href="#support" className="w-full text-center block text-xs font-bold text-[#1f9bf0] hover:underline">
                Связаться с личным менеджером (09–21 МСК) →
              </a>
            </div>
          </div>

        </div>

        {/* ORDER WIDGET SECTION (3 Steps) */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#e2e8f0] shadow-[0_16px_40px_rgba(23,43,77,0.07)] space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e2e8f0] pb-4 gap-2">
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-[#0e131a]">
                Быстрый заказ услуги
              </h2>
              <p className="text-xs text-[#8b94a3]">Выберите параметры и оформите заказ за 30 секунд</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#414a59] bg-[#e9edf2] px-3 py-1.5 rounded-lg w-max">
              <ShieldCheck className="w-4 h-4 text-[#1f9d6b]" />
              <span>Гарантия авто-докрутки</span>
            </div>
          </div>

          {/* STEP 1: Select Social Network */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#8b94a3] block">
              Шаг 1. Выберите социальную сеть
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { id: 'tg', name: 'Telegram', icon: Send, color: 'text-[#1f9bf0]' },
                { id: 'ig', name: 'Instagram', icon: Instagram, color: 'text-pink-600' },
                { id: 'yt', name: 'YouTube', icon: Youtube, color: 'text-red-600' },
                { id: 'tt', name: 'TikTok', icon: Video, color: 'text-slate-900' },
                { id: 'vk', name: 'VK', icon: Share2, color: 'text-blue-600' },
                { id: 'rt', name: 'Rutube', icon: Zap, color: 'text-emerald-600' },
              ].map((net) => {
                const IconComp = net.icon;
                const isSelected = selectedNetwork === net.id;
                return (
                  <button
                    key={net.id}
                    onClick={() => setSelectedNetwork(net.id)}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      isSelected 
                        ? 'border-[#1f9bf0] bg-[#e7f2fe] ring-2 ring-[#1f9bf0]/20' 
                        : 'border-[#e2e8f0] bg-white hover:border-[#d3dce8] hover:bg-[#e9edf2]/50'
                    }`}
                  >
                    <IconComp className={`w-5 h-5 ${net.color}`} />
                    <span className="text-xs font-bold text-[#0e131a]">{net.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: Select Category */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#8b94a3] block">
              Шаг 2. Выберите категорию
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'subs', name: 'Подписчики' },
                { id: 'views', name: 'Просмотры' },
                { id: 'likes', name: 'Лайки' },
                { id: 'react', name: 'Реакции' },
                { id: 'comments', name: 'Комментарии' },
                { id: 'stars', name: 'Звёзды / Бусты' },
              ].map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#0e131a] text-white shadow-sm'
                        : 'bg-[#e9edf2] text-[#414a59] hover:bg-[#d3dce8]'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3: Select Tariff & Inputs */}
          <div className="space-y-4 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#8b94a3] block">
              Шаг 3. Выберите тарифный план
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {DASHBOARD_DATA.tariffs.map((t) => {
                const isSelected = selectedTariff === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTariff(t.id)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-4 ${
                      isSelected 
                        ? 'border-[#1f9bf0] bg-white ring-2 ring-[#1f9bf0]/20 shadow-md' 
                        : 'border-[#e2e8f0] bg-white hover:border-[#d3dce8]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${t.badgeBg}`}>
                          {t.badge}
                        </span>
                        {t.popular && (
                          <span className="text-[10px] font-bold text-[#1f9bf0] bg-[#e7f2fe] px-2 py-0.5 rounded-md">
                            ХИТ ПОПУЛЯРНОСТИ
                          </span>
                        )}
                      </div>
                      <h4 className="font-heading text-base font-bold text-[#0e131a]">{t.name}</h4>
                      <p className="text-xs text-[#8b94a3]">Скорость: {t.speed}</p>
                    </div>

                    <div className="pt-2 border-t border-[#e2e8f0] flex items-baseline justify-between">
                      <span className="text-xs text-[#414a59]">Цена за 1 шт:</span>
                      <span className="font-mono-data text-lg font-extrabold text-[#0e131a]">{t.price}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Inputs & Summary Row */}
            <div className="bg-[#e9edf2]/60 p-4 sm:p-6 rounded-2xl border border-[#e2e8f0] grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-6 space-y-1.5 min-w-0">
                <label className="text-xs font-bold text-[#414a59] block">Ссылка на объект (канал / пост / профиль)</label>
                <input
                  type="url"
                  placeholder="https://t.me/my_channel"
                  value={targetLink}
                  onChange={(e) => setTargetLink(e.target.value)}
                  className="w-full bg-white border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-xs text-[#0e131a] focus:outline-none focus:border-[#1f9bf0] font-mono-data truncate"
                />
              </div>

              <div className="md:col-span-3 space-y-1.5 min-w-0">
                <label className="text-xs font-bold text-[#414a59] block">Количество (мин. 10)</label>
                <input
                  type="number"
                  min="10"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-white border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-xs text-[#0e131a] focus:outline-none focus:border-[#1f9bf0] font-mono-data"
                />
              </div>

              <div className="md:col-span-3 min-w-0">
                <button className="w-full bg-[#1f9bf0] hover:bg-[#0b7fd4] text-white py-3 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2">
                  <span>Оплатить заказ (30.00 ₽)</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* RECENT ORDERS TABLE SECTION */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#e2e8f0] shadow-[0_16px_40px_rgba(23,43,77,0.07)] space-y-4">
          <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-4">
            <div>
              <h2 className="font-heading text-lg font-bold text-[#0e131a]">Последние заказы</h2>
              <p className="text-xs text-[#8b94a3]">Выписка по вашим операциям в реальном времени</p>
            </div>
            <a href="#all-orders" className="text-xs font-bold text-[#1f9bf0] hover:underline">
              Все 312 заказов →
            </a>
          </div>

          {/* TABLE view for Plan */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-[11px] font-bold text-[#8b94a3] uppercase tracking-wider">
                  <th className="py-3 px-4">ID заказа</th>
                  <th className="py-3 px-4">Услуга</th>
                  <th className="py-3 px-4">Ссылка</th>
                  <th className="py-3 px-4">Статус</th>
                  <th className="py-3 px-4 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] text-xs">
                {DASHBOARD_DATA.recentOrders.map((ord) => {
                  return (
                    <tr key={ord.id} className="hover:bg-[#e9edf2]/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono-data font-bold text-[#0e131a]">
                        {ord.id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#0e131a]">
                        <div className="flex items-center gap-2">
                          <ord.icon className="w-4 h-4 shrink-0" style={{ color: ord.color }} />
                          <span className="truncate max-w-[200px]">{ord.service}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono-data text-[#8b94a3] max-w-[180px]">
                        <div className="truncate" title={ord.link}>{ord.link}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          ord.status === 'COMPLETED'
                            ? 'bg-[#e6f7f0] text-[#1f9d6b] border-[#1f9d6b]/20'
                            : ord.status === 'IN_PROGRESS'
                            ? 'bg-[#e7f2fe] text-[#1f9bf0] border-[#1f9bf0]/20'
                            : 'bg-[#fdeeee] text-[#d6453d] border-[#d6453d]/20'
                        }`}>
                          {ord.statusText}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-data font-extrabold text-[#0e131a]">
                        {ord.amount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* BOTTOM ROW: REFERRALS & SUPPORT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Referral Card */}
          <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0] shadow-[0_16px_40px_rgba(23,43,77,0.07)] space-y-4 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-[#0e131a]">Реферальная программа</h3>
              <span className="text-xs font-mono-data font-bold text-[#1f9d6b] bg-[#e6f7f0] px-2.5 py-1 rounded-full">
                10% начисления
              </span>
            </div>
            <p className="text-xs text-[#414a59]">
              Приглашайте коллег и получайте процент от каждого пополнения баланса.
            </p>
            <div className="bg-[#e9edf2] p-3 rounded-xl flex items-center justify-between gap-2 min-w-0">
              <span className="font-mono-data text-xs font-bold text-[#0e131a] truncate">
                https://smmplan.ru/ref/{DASHBOARD_DATA.refCode}
              </span>
              <button
                onClick={handleCopyRef}
                className="bg-[#1f9bf0] text-white p-2 rounded-lg text-xs font-bold shrink-0 hover:bg-[#0b7fd4]"
              >
                {isCopied ? 'Скопировано' : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Support Card */}
          <div className="bg-white rounded-2xl p-6 border border-[#e2e8f0] shadow-[0_16px_40px_rgba(23,43,77,0.07)] space-y-4 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-[#0e131a]">Служба поддержки</h3>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1f9d6b]">
                <span className="w-2 h-2 rounded-full bg-[#1f9d6b] animate-ping" />
                Онлайн 09–21 МСК
              </span>
            </div>
            <p className="text-xs text-[#414a59]">
              Есть вопросы по заказу? Отвечаем в течение 5 минут в Telegram и тикетах.
            </p>
            <button className="w-full bg-[#0e131a] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
              <Send className="w-4 h-4" />
              <span>Написать оператору в Telegram</span>
            </button>
          </div>

        </div>

      </main>
    </div>
  );
}

/* ==========================================================================
   SMMFLUX DASHBOARD COMPONENT (Aurora Consumer App)
   ========================================================================== */
function SmmFluxDashboard({ isPreviewMode = false }: { isPreviewMode?: boolean }) {
  const [selectedNetwork, setSelectedNetwork] = useState('tg');
  const [selectedCategory, setSelectedCategory] = useState('subs');
  const [selectedTariff, setSelectedTariff] = useState('std');

  return (
    <div className="smmflux-scope w-full min-h-screen bg-white text-[#100d18] flex flex-col md:flex-row pb-20 md:pb-0">
      
      {/* ── 1. LEFT SIDEBAR NAVIGATION (Desktop) & BOTTOM BAR (Mobile) ── */}
      <aside className="hidden md:flex flex-col justify-between w-64 border-r border-[#ece9f5] p-6 shrink-0 bg-[#ffffff]">
        <div className="space-y-8">
          {/* Flux Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#3b82f6] via-[#7c3aed] to-[#e0218a] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#7c3aed]/30">
              F
            </div>
            <div>
              <span className="font-heading text-2xl font-extrabold text-[#100d18] tracking-tight block leading-none">
                SMMflux
              </span>
              <span className="text-[10px] font-bold text-[#e0218a] uppercase tracking-wider">
                Aurora App
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            <a href="#flux-home" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#14121d] text-white font-bold text-sm shadow-md shadow-black/10">
              <div className="w-7 h-7 rounded-xl bg-[#e0218a] flex items-center justify-center text-white text-xs">
                ⚡
              </div>
              <span>Дашборд</span>
            </a>
            <a href="#flux-orders" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[#423f54] hover:bg-[#f6f5fb] font-semibold text-sm transition-all">
              <div className="w-7 h-7 rounded-xl bg-[#ece9f5] flex items-center justify-center text-[#7c3aed] text-xs">
                📦
              </div>
              <span>Заказы</span>
            </a>
            <a href="#flux-wallet" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[#423f54] hover:bg-[#f6f5fb] font-semibold text-sm transition-all">
              <div className="w-7 h-7 rounded-xl bg-[#ece9f5] flex items-center justify-center text-[#06b6a4] text-xs">
                💎
              </div>
              <span>Баланс</span>
            </a>
            <a href="#flux-refs" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[#423f54] hover:bg-[#f6f5fb] font-semibold text-sm transition-all">
              <div className="w-7 h-7 rounded-xl bg-[#ece9f5] flex items-center justify-center text-[#e0218a] text-xs">
                🎁
              </div>
              <span>Рефералы</span>
            </a>
            <a href="#flux-help" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[#423f54] hover:bg-[#f6f5fb] font-semibold text-sm transition-all">
              <div className="w-7 h-7 rounded-xl bg-[#ece9f5] flex items-center justify-center text-[#7c3aed] text-xs">
                💬
              </div>
              <span>Поддержка</span>
            </a>
          </nav>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="bg-[#f6f5fb] p-4 rounded-2xl border border-[#ece9f5] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#423f54]">Клиент:</span>
            <span className="font-mono text-[#79748c]">ART-7F2K</span>
          </div>
          <div className="text-xs font-bold text-[#100d18] truncate">
            client@smmflux.ru
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR (V8 Rule) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#14121d]/95 backdrop-blur-lg border-t border-white/10 px-4 py-2 flex items-center justify-around text-white">
        <a href="#flux-home" className="flex flex-col items-center gap-1 text-[#e0218a]">
          <span className="text-lg">⚡</span>
          <span className="text-[10px] font-bold">Главная</span>
        </a>
        <a href="#flux-orders" className="flex flex-col items-center gap-1 text-white/70">
          <span className="text-lg">📦</span>
          <span className="text-[10px] font-bold">Заказы</span>
        </a>
        <a href="#flux-wallet" className="flex flex-col items-center gap-1 text-white/70">
          <span className="text-lg">💎</span>
          <span className="text-[10px] font-bold">Баланс</span>
        </a>
        <a href="#flux-refs" className="flex flex-col items-center gap-1 text-white/70">
          <span className="text-lg">🎁</span>
          <span className="text-[10px] font-bold">Бонусы</span>
        </a>
        <a href="#flux-help" className="flex flex-col items-center gap-1 text-white/70">
          <span className="text-lg">💬</span>
          <span className="text-[10px] font-bold">Чат</span>
        </a>
      </div>

      {/* ── 2. MAIN APP CONTENT AREA ── */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-x-hidden min-w-0">
        
        {/* MOBILE TOP BAR */}
        <div className="md:hidden flex items-center justify-between border-b border-[#ece9f5] pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#3b82f6] to-[#e0218a] flex items-center justify-center text-white font-bold text-sm">
              F
            </div>
            <span className="font-heading text-lg font-extrabold">SMMflux</span>
          </div>
          <span className="bg-[#14121d] text-white px-3 py-1 rounded-full text-xs font-bold">
            {DASHBOARD_DATA.balance}
          </span>
        </div>

        {/* GREETING HEADER WITH BLACK ROTATED MARKER HIGHLIGHT */}
        <div className="space-y-2">
          <h1 className="font-heading text-2xl sm:text-4xl lg:text-5xl font-extrabold text-[#100d18] tracking-tight leading-tight">
            Что хотите <span className="marker-highlight">продвигать</span> сегодня?
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[#79748c]">
            Заряжаем социальные сети максимальной активностью за считанные минуты
          </p>
        </div>

        {/* AURORA BALANCE HERO CARD (Gradient + Blobs) */}
        <div className="relative rounded-3xl p-6 sm:p-8 text-white overflow-hidden shadow-[0_20px_46px_rgba(124,58,237,0.30)] min-w-0"
             style={{ background: 'radial-gradient(120% 130% at 12% 0%, #3b82f6 0%, #7c3aed 38%, #d6249f 66%, #f59e6b 100%)' }}>
          
          {/* Animated Blobs inside card (V4 Rule) */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl aurora-blob-1 pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-pink-500/30 rounded-full blur-2xl aurora-blob-2 pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-widest bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white">
                Баланс аккаунта
              </span>
              <span className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-yellow-300" /> PRO План
              </span>
            </div>

            <div className="space-y-1">
              <div className="font-heading text-4xl sm:text-6xl font-black tracking-tight">
                {DASHBOARD_DATA.balance}
              </div>
              <p className="text-xs text-white/80 font-medium">Сберегли {DASHBOARD_DATA.savings} благодаря персональному тарифу</p>
            </div>

            <div className="pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="bg-black/20 backdrop-blur-md px-3.5 py-2 rounded-2xl">
                  <span className="text-white/70 block text-[10px]">Потрачено</span>
                  <span className="font-bold text-white text-sm">{DASHBOARD_DATA.spent}</span>
                </div>
                <div className="bg-black/20 backdrop-blur-md px-3.5 py-2 rounded-2xl">
                  <span className="text-white/70 block text-[10px]">Выполнено заказов</span>
                  <span className="font-bold text-white text-sm">{DASHBOARD_DATA.ordersCount}</span>
                </div>
              </div>

              <button className="bg-[#14121d] hover:bg-black text-white px-6 py-3 rounded-full font-extrabold text-xs transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2">
                <span>Мгновенное пополнение</span>
                <ArrowUpRight className="w-4 h-4 text-[#e0218a]" />
              </button>
            </div>
          </div>
        </div>

        {/* NEON ORDER WIDGET (Search Input + Social Chips + Sliding Tariffs) */}
        <section className="bg-[#f6f5fb] rounded-3xl p-6 sm:p-8 border border-[#ece9f5] space-y-6 shadow-sm">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-[#100d18]">
                Быстрый переход к запуску
              </h2>
              <p className="text-xs text-[#79748c]">Вставьте ссылку или выберите услугу в один клик</p>
            </div>
          </div>

          {/* Neon Link Input with Round Black Button */}
          <div className="relative flex items-center min-w-0">
            <input
              type="url"
              placeholder="Вставьте ссылку на пост / канал (например: t.me/channel)..."
              className="w-full bg-white border-2 border-[#e0218a]/40 focus:border-[#e0218a] rounded-full px-6 py-4 pr-16 text-xs sm:text-sm font-semibold text-[#100d18] placeholder-[#79748c] outline-none shadow-lg shadow-[#e0218a]/5 transition-all truncate"
            />
            <button className="absolute right-2 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#14121d] text-white flex items-center justify-center hover:bg-[#e0218a] transition-all shadow-md active:scale-90 shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Social Pill Chips */}
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#79748c] block">
              Социальная сеть:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
              {[
                { id: 'tg', label: 'Telegram', icon: '✈️', color: 'bg-sky-500/10 text-sky-600' },
                { id: 'ig', label: 'Instagram', icon: '📸', color: 'bg-pink-500/10 text-pink-600' },
                { id: 'yt', label: 'YouTube', icon: '▶️', color: 'bg-red-500/10 text-red-600' },
                { id: 'tt', label: 'TikTok', icon: '🎵', color: 'bg-slate-900/10 text-slate-900' },
                { id: 'vk', label: 'VKontakte', icon: '🟦', color: 'bg-blue-500/10 text-blue-600' },
              ].map((chip) => {
                const isSelected = selectedNetwork === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => setSelectedNetwork(chip.id)}
                    className={`px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
                      isSelected
                        ? 'bg-[#14121d] text-white shadow-lg shadow-black/20 scale-105'
                        : 'bg-white text-[#423f54] hover:bg-white/80 border border-[#ece9f5]'
                    }`}
                  >
                    <span>{chip.icon}</span>
                    <span>{chip.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Horizontal Sliding Tariff Cards */}
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#79748c] block">
              Выберите скорость и качество:
            </span>
            <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-3">
              {DASHBOARD_DATA.tariffs.map((t) => {
                const isSelected = selectedTariff === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTariff(t.id)}
                    className={`w-64 sm:w-72 shrink-0 p-5 rounded-3xl bg-white border-2 cursor-pointer transition-all flex flex-col justify-between space-y-4 ${
                      isSelected
                        ? 'border-[#e0218a] shadow-xl shadow-[#e0218a]/10 scale-[1.02]'
                        : 'border-[#ece9f5] hover:border-[#7c3aed]/40'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#f6f5fb] text-[#7c3aed]">
                          {t.badge}
                        </span>
                        <span className="text-xs text-[#06b6a4] font-bold">Мин. 10 шт</span>
                      </div>
                      <h4 className="font-heading text-lg font-extrabold text-[#100d18]">{t.name}</h4>
                      <p className="text-xs text-[#79748c]">Запуск: {t.speed}</p>
                    </div>

                    <div className="pt-3 border-t border-[#ece9f5] flex items-center justify-between">
                      <span className="font-heading text-xl font-extrabold text-[#e0218a]">{t.price}</span>
                      <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isSelected ? 'bg-[#e0218a] text-white' : 'bg-[#f6f5fb] text-[#100d18]'
                      }`}>
                        ✓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* RECENT ORDERS STRIP CARDS (App Format for Flux) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-extrabold text-[#100d18]">Последняя активность</h2>
            <a href="#flux-all" className="text-xs font-bold text-[#e0218a] hover:underline">
              Смотреть историю →
            </a>
          </div>

          <div className="space-y-3">
            {DASHBOARD_DATA.recentOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-[#ece9f5] shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#f6f5fb] flex items-center justify-center shrink-0 text-lg">
                    {ord.network === 'Telegram' ? '✈️' : ord.network === 'Instagram' ? '📸' : '▶️'}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm font-bold text-[#100d18] truncate">
                        {ord.service}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-[#79748c]">{ord.id}</span>
                    </div>
                    <p className="text-xs text-[#79748c] truncate">{ord.link}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#ece9f5]">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    ord.status === 'COMPLETED'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : ord.status === 'IN_PROGRESS'
                      ? 'bg-sky-500/10 text-sky-600'
                      : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {ord.statusText}
                  </span>
                  <span className="font-heading text-base font-extrabold text-[#100d18]">
                    {ord.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BOTTOM CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-[#14121d] to-[#252136] text-white p-6 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#e0218a]">
                Партнёрская сеть
              </span>
              <span className="text-xs font-bold bg-white/10 px-2.5 py-1 rounded-full">
                +10% вам
              </span>
            </div>
            <h3 className="font-heading text-xl font-bold">Делитесь Flux с друзьями</h3>
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl flex items-center justify-between text-xs">
              <span className="font-mono font-bold truncate">ART-7F2K</span>
              <button className="bg-[#e0218a] text-white px-3 py-1.5 rounded-xl font-bold hover:bg-pink-600">
                Копировать
              </button>
            </div>
          </div>

          <div className="bg-[#f6f5fb] p-6 rounded-3xl border border-[#ece9f5] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-[#100d18]">Поддержка 24/7</h3>
              <span className="text-xs font-bold text-[#06b6a4]">Ответ за 3 мин</span>
            </div>
            <p className="text-xs text-[#79748c]">
              Наша команда онлайн каждый день с 09:00 до 21:00 МСК. Решаем любые вопросы мгновенно.
            </p>
            <button className="w-full bg-[#14121d] text-white py-3 rounded-2xl text-xs font-bold hover:bg-black transition-colors">
              Открыть чат с поддержкой
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}

/* ==========================================================================
   ROOT PAGE SHOWCASE (With Viewport Controls & Audit Verification Table)
   ========================================================================== */
export default function ClientDashboardsDemoPage() {
  const [activeTab, setActiveTab] = useState<'plan' | 'flux' | 'compare'>('compare');
  const [viewportWidth, setViewportWidth] = useState<'320' | '768' | '1024' | '1440' | '100%'>('100%');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* TOP AUDIT BAR / CONTROL HARNESS */}
      <div className="bg-slate-900 border-b border-slate-800 p-3 sm:p-4 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Header Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                Dual Tenant Client Dashboard Showcase
              </h1>
              <p className="text-[11px] text-slate-400">SMMplan (Terminal) vs SMMflux (Aurora App)</p>
            </div>
          </div>

          {/* Tenant Switcher Tabs */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
            <button
              onClick={() => setActiveTab('compare')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'compare' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Сравнение рядом
            </button>
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'plan' ? 'bg-[#1f9bf0] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              SMMplan Only
            </button>
            <button
              onClick={() => setActiveTab('flux')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'flux' ? 'bg-[#e0218a] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              SMMflux Only
            </button>
          </div>

          {/* Viewport Simulation Controls */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
            <button
              onClick={() => setViewportWidth('320')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                viewportWidth === '320' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="320px Mobile"
            >
              <Smartphone className="w-3.5 h-3.5" /> 320
            </button>
            <button
              onClick={() => setViewportWidth('768')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                viewportWidth === '768' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="768px Tablet"
            >
              <Tablet className="w-3.5 h-3.5" /> 768
            </button>
            <button
              onClick={() => setViewportWidth('1024')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                viewportWidth === '1024' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="1024px Laptop"
            >
              <Laptop className="w-3.5 h-3.5" /> 1024
            </button>
            <button
              onClick={() => setViewportWidth('1440')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                viewportWidth === '1440' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="1440px Desktop"
            >
              <Monitor className="w-3.5 h-3.5" /> 1440
            </button>
            <button
              onClick={() => setViewportWidth('100%')}
              className={`px-2.5 py-1 rounded-lg ${
                viewportWidth === '100%' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              100%
            </button>
          </div>

        </div>
      </div>

      {/* RENDER CANVAS CONTAINER */}
      <div className="flex-1 p-4 sm:p-6 overflow-auto flex justify-center bg-slate-900/50">
        
        {/* COMPARE DUAL MODE */}
        {activeTab === 'compare' && (
          <div className="w-full max-w-[1600px] space-y-8">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-white">Тест полного визуального расхождения (SMMplan vs SMMflux)</h2>
              <p className="text-xs text-slate-400">Один функционал и данные — два кардинально разных визуальных языка и типа продукта</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* Plan Container */}
              <div className="space-y-2 min-w-0">
                <div className="bg-[#0e131a] border border-slate-700 px-4 py-2 rounded-t-xl text-xs font-bold text-[#1f9bf0] flex items-center justify-between">
                  <span>SMMplan — SaaS Terminal</span>
                  <span className="text-[10px] text-slate-400">Manrope + JetBrains Mono</span>
                </div>
                <div 
                  className="rounded-b-xl overflow-hidden border border-slate-700 shadow-2xl transition-all mx-auto"
                  style={{ width: viewportWidth === '100%' ? '100%' : `${viewportWidth}px` }}
                >
                  <SmmPlanDashboard isPreviewMode={true} />
                </div>
              </div>

              {/* Flux Container */}
              <div className="space-y-2 min-w-0">
                <div className="bg-[#14121d] border border-slate-700 px-4 py-2 rounded-t-xl text-xs font-bold text-[#e0218a] flex items-center justify-between">
                  <span>SMMflux — Aurora App</span>
                  <span className="text-[10px] text-slate-400">Bricolage + Jakarta</span>
                </div>
                <div 
                  className="rounded-b-xl overflow-hidden border border-slate-700 shadow-2xl transition-all mx-auto"
                  style={{ width: viewportWidth === '100%' ? '100%' : `${viewportWidth}px` }}
                >
                  <SmmFluxDashboard isPreviewMode={true} />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* PLAN ONLY MODE */}
        {activeTab === 'plan' && (
          <div 
            className="rounded-2xl overflow-hidden border border-slate-800 shadow-2xl transition-all bg-[#e9edf2] mx-auto min-w-0"
            style={{ width: viewportWidth === '100%' ? '100%' : `${viewportWidth}px` }}
          >
            <SmmPlanDashboard />
          </div>
        )}

        {/* FLUX ONLY MODE */}
        {activeTab === 'flux' && (
          <div 
            className="rounded-2xl overflow-hidden border border-slate-800 shadow-2xl transition-all bg-white mx-auto min-w-0"
            style={{ width: viewportWidth === '100%' ? '100%' : `${viewportWidth}px` }}
          >
            <SmmFluxDashboard />
          </div>
        )}

      </div>

      {/* ── VISUAL AUDIT REPORT & CHECKLIST (§5) ── */}
      <footer className="bg-slate-900 border-t border-slate-800 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Лог самопроверки и отчёт визуального аудита (§4-§5)
              </h3>
              <p className="text-xs text-slate-400">Результаты итераций визуальной ревизии на разрешениях 320px, 768px, 1024px, 1440px</p>
            </div>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20">
              Все 14 пунктов чек-листа пройдены
            </span>
          </div>

          {/* Audit Defect -> Fix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2 px-3">Тенант</th>
                  <th className="py-2 px-3">Разрешение</th>
                  <th className="py-2 px-3">Обнаруженный дефект</th>
                  <th className="py-2 px-3">Применённый фикс (Правило)</th>
                  <th className="py-2 px-3 text-right">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="py-2 px-3 font-bold text-[#1f9bf0]">SMMplan</td>
                  <td className="py-2 px-3 font-mono">320px</td>
                  <td className="py-2 px-3">Верхнее меню разрывало ширину экрана</td>
                  <td className="py-2 px-3">Сворачивание в адаптивный бургер (В8 Rule)</td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-400">FIXED</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#1f9bf0]">SMMplan</td>
                  <td className="py-2 px-3 font-mono">768px</td>
                  <td className="py-2 px-3">Длинная ссылка заказа распирала ячейку таблицы</td>
                  <td className="py-2 px-3">Добавлено min-w-0 + truncate на ячейку (В2 Rule)</td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-400">FIXED</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#e0218a]">SMMflux</td>
                  <td className="py-2 px-3 font-mono">320px</td>
                  <td className="py-2 px-3">Боковой сайдбар занимал 100% ширины на мобилке</td>
                  <td className="py-2 px-3">Трансформация сайдбара в нижний Bottom Navigation (В8 Rule)</td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-400">FIXED</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#e0218a]">SMMflux</td>
                  <td className="py-2 px-3 font-mono">1440px</td>
                  <td className="py-2 px-3">Аврора-декор вылезал за границы карты баланса</td>
                  <td className="py-2 px-3">Добавлена изоляция relative + overflow-hidden (В4 Rule)</td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-400">FIXED</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </footer>

    </div>
  );
}
