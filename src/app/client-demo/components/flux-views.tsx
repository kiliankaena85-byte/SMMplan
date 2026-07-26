'use client';

import React, { useState } from 'react';
import '../dashboards.css';
import { 
  Send, 
  Instagram, 
  Youtube, 
  Video, 
  Share2, 
  CreditCard, 
  Zap, 
  Sparkles, 
  ShieldCheck, 
  ArrowUpRight,
  Menu,
  X,
  Copy,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Key,
  Bell,
  Lock,
  User,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { DASHBOARD_DATA } from './dashboards';

export type FluxTab = 'dashboard' | 'orders' | 'new-order' | 'transactions' | 'deposit' | 'referrals' | 'support' | 'settings';

export function SmmFluxFullApp({ initialTab = 'dashboard' }: { initialTab?: FluxTab }) {
  const [activeTab, setActiveTab] = useState<FluxTab>(initialTab);

  // Form states
  const [selectedNetwork, setSelectedNetwork] = useState('tg');
  const [selectedCategory, setSelectedCategory] = useState('subs');
  const [selectedTariff, setSelectedTariff] = useState('std');
  const [quantity, setQuantity] = useState('1000');
  const [targetLink, setTargetLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [depositAmount, setDepositAmount] = useState('1000');
  const [paymentGateway, setPaymentGateway] = useState('yookassa');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  const handleCopyRef = () => {
    navigator.clipboard?.writeText(`https://smmflux.ru/ref/${DASHBOARD_DATA.refCode}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const calculateTotalCost = () => {
    const tariff = DASHBOARD_DATA.tariffs.find(t => t.id === selectedTariff);
    const rate = parseFloat(tariff?.price || '0.03');
    const qty = parseInt(quantity || '0', 10);
    return (qty * rate).toFixed(2);
  };

  return (
    <div className="smmflux-scope w-full min-h-screen bg-white text-[#100d18] flex flex-col md:flex-row pb-20 md:pb-0">
      
      {/* ── 1. LEFT SIDEBAR NAVIGATION (Desktop) & BOTTOM BAR (Mobile) ── */}
      <aside className="hidden md:flex flex-col justify-between w-64 border-r border-[#ece9f5] p-6 shrink-0 bg-[#ffffff] sticky top-0 h-screen">
        <div className="space-y-8">
          {/* Flux Brand Header */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
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
            {[
              { id: 'dashboard', label: 'Дашборд', icon: '⚡' },
              { id: 'new-order', label: 'Создать заказ', icon: '🚀' },
              { id: 'orders', label: 'Мои заказы', icon: '📦' },
              { id: 'transactions', label: 'Транзакции', icon: '🔄' },
              { id: 'deposit', label: 'Пополнение', icon: '💎' },
              { id: 'referrals', label: 'Рефералы', icon: '🎁' },
              { id: 'support', label: 'Поддержка', icon: '💬' },
              { id: 'settings', label: 'Настройки', icon: '⚙️' },
            ].map((nav) => {
              const isActive = activeTab === nav.id;
              return (
                <button
                  key={nav.id}
                  onClick={() => setActiveTab(nav.id as FluxTab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                    isActive
                      ? 'bg-[#14121d] text-white shadow-md shadow-black/10'
                      : 'text-[#423f54] hover:bg-[#f6f5fb]'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs ${
                    isActive ? 'bg-[#e0218a] text-white' : 'bg-[#ece9f5] text-[#7c3aed]'
                  }`}>
                    {nav.icon}
                  </div>
                  <span>{nav.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info Footer */}
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

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#14121d]/95 backdrop-blur-lg border-t border-white/10 px-2 py-2 flex items-center justify-around text-white">
        {[
          { id: 'dashboard', label: 'Главная', icon: '⚡' },
          { id: 'new-order', label: 'Заказ', icon: '🚀' },
          { id: 'orders', label: 'Заказы', icon: '📦' },
          { id: 'transactions', label: 'Баланс', icon: '🔄' },
          { id: 'deposit', label: 'Пополнить', icon: '💎' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as FluxTab)}
            className={`flex flex-col items-center gap-1 ${
              activeTab === tab.id ? 'text-[#e0218a]' : 'text-white/70'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[10px] font-bold">{tab.label}</span>
          </button>
        ))}
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
          <button 
            onClick={() => setActiveTab('deposit')}
            className="bg-[#14121d] text-white px-3 py-1.5 rounded-full text-xs font-bold"
          >
            {DASHBOARD_DATA.balance}
          </button>
        </div>

        {/* ── PAGE 1: DASHBOARD OVERVIEW ── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="space-y-2">
              <h1 className="font-heading text-2xl sm:text-4xl lg:text-5xl font-extrabold text-[#100d18] tracking-tight leading-tight">
                Что хотите <span className="marker-highlight">продвигать</span> сегодня?
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-[#79748c]">
                Заряжаем социальные сети максимальной активностью за считанные минуты
              </p>
            </div>

            {/* AURORA HERO CARD */}
            <div className="relative rounded-3xl p-6 sm:p-8 text-white overflow-hidden shadow-[0_20px_46px_rgba(124,58,237,0.30)] min-w-0"
                 style={{ background: 'radial-gradient(120% 130% at 12% 0%, #3b82f6 0%, #7c3aed 38%, #d6249f 66%, #f59e6b 100%)' }}>
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

                  <button 
                    onClick={() => setActiveTab('deposit')}
                    className="bg-[#14121d] hover:bg-black text-white px-6 py-3 rounded-full font-extrabold text-xs transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    <span>Мгновенное пополнение</span>
                    <ArrowUpRight className="w-4 h-4 text-[#e0218a]" />
                  </button>
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => setActiveTab('new-order')}
                className="p-6 rounded-3xl bg-[#f6f5fb] border border-[#ece9f5] text-left hover:border-[#e0218a] transition-all group space-y-2"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#e0218a] text-white flex items-center justify-center font-bold">
                  🚀
                </div>
                <h3 className="font-heading text-lg font-bold group-hover:text-[#e0218a] transition-colors">Создать новый заказ</h3>
                <p className="text-xs text-[#79748c]">Выбор из 500+ вариантов продвижения</p>
              </button>

              <button 
                onClick={() => setActiveTab('orders')}
                className="p-6 rounded-3xl bg-[#f6f5fb] border border-[#ece9f5] text-left hover:border-[#7c3aed] transition-all group space-y-2"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#7c3aed] text-white flex items-center justify-center font-bold">
                  📦
                </div>
                <h3 className="font-heading text-lg font-bold group-hover:text-[#7c3aed] transition-colors">Отследить статус заказов</h3>
                <p className="text-xs text-[#79748c]">312 активных и выполненных операций</p>
              </button>
            </div>
          </div>
        )}

        {/* ── PAGE 2: NEW ORDER WIZARD ── */}
        {activeTab === 'new-order' && (
          <section className="bg-[#f6f5fb] rounded-3xl p-6 sm:p-8 border border-[#ece9f5] space-y-6 shadow-sm">
            <div className="border-b border-[#ece9f5] pb-4">
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#100d18]">
                Быстрый запуск <span className="marker-highlight">продвижения</span>
              </h1>
              <p className="text-xs text-[#79748c] mt-1">Заполните параметры и запустите выполнение за 3 секунды</p>
            </div>

            {/* Neon Link Input */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#79748c] block">
                1. Ссылка на объект:
              </span>
              <div className="relative flex items-center min-w-0">
                <input
                  type="url"
                  placeholder="Вставьте ссылку на пост / канал (например: t.me/channel)..."
                  value={targetLink}
                  onChange={(e) => setTargetLink(e.target.value)}
                  className="w-full bg-white border-2 border-[#e0218a]/40 focus:border-[#e0218a] rounded-full px-6 py-4 pr-16 text-xs sm:text-sm font-semibold text-[#100d18] placeholder-[#79748c] outline-none shadow-lg shadow-[#e0218a]/5 transition-all truncate"
                />
                <button className="absolute right-2 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#14121d] text-white flex items-center justify-center hover:bg-[#e0218a] transition-all shadow-md active:scale-90 shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Social Chips */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#79748c] block">
                2. Социальная сеть:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
                {[
                  { id: 'tg', label: 'Telegram', icon: '✈️' },
                  { id: 'ig', label: 'Instagram', icon: '📸' },
                  { id: 'yt', label: 'YouTube', icon: '▶️' },
                  { id: 'tt', label: 'TikTok', icon: '🎵' },
                  { id: 'vk', label: 'VKontakte', icon: '🟦' },
                ].map((chip) => {
                  const isSelected = selectedNetwork === chip.id;
                  return (
                    <button
                      key={chip.id}
                      onClick={() => setSelectedNetwork(chip.id)}
                      className={`px-5 py-3 rounded-full text-xs font-bold flex items-center gap-2 shrink-0 transition-all ${
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

            {/* Horizontal Sliding Tariffs */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#79748c] block">
                3. Выберите тариф:
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

            {/* Submit Action */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#ece9f5]">
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#79748c]">Итого к оплате:</span>
                <div className="font-heading text-2xl font-black text-[#100d18]">{calculateTotalCost()} ₽</div>
              </div>

              <button className="w-full sm:w-auto bg-[#14121d] hover:bg-[#e0218a] text-white px-8 py-4 rounded-full font-extrabold text-xs transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2">
                <span>Оплатить и запустить</span>
                <ArrowUpRight className="w-4 h-4 text-[#e0218a]" />
              </button>
            </div>
          </section>
        )}

        {/* ── PAGE 3: ORDERS LIST ── */}
        {activeTab === 'orders' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#100d18]">
                  Мои <span className="marker-highlight">заказы</span>
                </h1>
                <p className="text-xs text-[#79748c]">Карточки вашей активности со статусами и деталями</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {['ALL', 'IN_PROGRESS', 'COMPLETED', 'ERROR'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      orderStatusFilter === st
                        ? 'bg-[#14121d] text-white shadow-md'
                        : 'bg-[#f6f5fb] text-[#423f54] hover:bg-white'
                    }`}
                  >
                    {st === 'ALL' ? 'Все' : st === 'IN_PROGRESS' ? 'В работе' : st === 'COMPLETED' ? 'Выполнены' : 'Ошибки'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {DASHBOARD_DATA.recentOrders
                .filter(o => orderStatusFilter === 'ALL' || o.status === orderStatusFilter)
                .map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white p-5 rounded-3xl border border-[#ece9f5] shadow-sm hover:shadow-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#f6f5fb] flex items-center justify-center shrink-0 text-xl">
                        {ord.network === 'Telegram' ? '✈️' : ord.network === 'Instagram' ? '📸' : '▶️'}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-heading text-base font-bold text-[#100d18] truncate">
                            {ord.service}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#79748c]">{ord.id}</span>
                        </div>
                        <p className="text-xs text-[#79748c] truncate">{ord.link}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#ece9f5]">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                        ord.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : ord.status === 'IN_PROGRESS'
                          ? 'bg-sky-500/10 text-sky-600'
                          : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        {ord.statusText}
                      </span>
                      <span className="font-heading text-lg font-extrabold text-[#100d18]">
                        {ord.amount}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* ── PAGE: TRANSACTIONS & REFUNDS LEDGER ── */}
        {activeTab === 'transactions' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#100d18]">
                  История <span className="marker-highlight">транзакций</span>
                </h1>
                <p className="text-xs text-[#79748c]">Все списания, пополнения и гарантированные авто-возвраты</p>
              </div>

              <div className="bg-[#e0218a]/10 border border-[#e0218a]/20 text-[#e0218a] px-4 py-2 rounded-full text-xs font-extrabold flex items-center gap-2">
                <span>🔄 100% честный возврат средств</span>
              </div>
            </div>

            {/* Metric Strips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-3xl bg-[#f6f5fb] border border-[#ece9f5] space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-[#79748c] block">Всего пополнено</span>
                <span className="font-heading text-2xl font-black text-emerald-600">{DASHBOARD_DATA.transactionsSummary.totalCredited}</span>
              </div>
              <div className="p-5 rounded-3xl bg-[#f6f5fb] border border-[#ece9f5] space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-[#79748c] block">Возвращено за отмены</span>
                <span className="font-heading text-2xl font-black text-[#e0218a]">+{DASHBOARD_DATA.transactionsSummary.totalRefunded}</span>
              </div>
              <div className="p-5 rounded-3xl bg-[#f6f5fb] border border-[#ece9f5] space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-[#79748c] block">Списано на заказы</span>
                <span className="font-heading text-2xl font-black text-[#100d18]">{DASHBOARD_DATA.transactionsSummary.totalDebited}</span>
              </div>
            </div>

            {/* Transactions Cards */}
            <div className="space-y-3">
              {DASHBOARD_DATA.transactions.map((tx) => {
                const isCredit = tx.type === 'CREDIT';
                const isRefund = tx.category === 'REFUND';
                return (
                  <div
                    key={tx.id}
                    className="bg-white p-5 rounded-3xl border border-[#ece9f5] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                        isRefund ? 'bg-pink-500/10 text-pink-600' : isCredit ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {isRefund ? '🔄' : isCredit ? '💳' : '📦'}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-heading text-base font-bold text-[#100d18]">
                            {tx.title}
                          </span>
                          <span className="text-xs font-mono text-[#79748c]">{tx.id}</span>
                        </div>
                        <p className="text-xs text-[#79748c]">{tx.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-[#ece9f5] pt-2 sm:pt-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                        isRefund ? 'bg-[#e0218a]/10 text-[#e0218a]' : isCredit ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {tx.statusText}
                      </span>
                      <span className={`font-heading text-xl font-black ${
                        isRefund ? 'text-[#e0218a]' : isCredit ? 'text-emerald-600' : 'text-[#100d18]'
                      }`}>
                        {tx.amount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── PAGE 4: DEPOSIT ── */}
        {activeTab === 'deposit' && (
          <section className="bg-[#f6f5fb] rounded-3xl p-6 sm:p-8 border border-[#ece9f5] space-y-6">
            <div className="border-b border-[#ece9f5] pb-4">
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#100d18]">
                Мгновенное <span className="marker-highlight">пополнение</span>
              </h1>
              <p className="text-xs text-[#79748c]">Пополняйте баланс банковскими картами или криптовалютой</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-xs font-bold text-[#423f54] block">Сумма пополнения (рубли):</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-white border-2 border-[#ece9f5] focus:border-[#e0218a] rounded-2xl px-5 py-3.5 text-lg font-heading font-extrabold text-[#100d18] outline-none"
                />

                <div className="grid grid-cols-2 gap-3">
                  {['yookassa', 'sbp', 'cryptobot', 'robokassa'].map((gw) => (
                    <button
                      key={gw}
                      onClick={() => setPaymentGateway(gw)}
                      className={`p-4 rounded-2xl font-bold text-xs text-left transition-all ${
                        paymentGateway === gw
                          ? 'bg-[#14121d] text-white shadow-lg'
                          : 'bg-white text-[#423f54] border border-[#ece9f5]'
                      }`}
                    >
                      {gw === 'yookassa' ? 'ЮKassa' : gw === 'sbp' ? 'СБП' : gw === 'cryptobot' ? 'CryptoBot' : 'Robokassa'}
                    </button>
                  ))}
                </div>

                <button className="w-full bg-[#e0218a] hover:bg-pink-600 text-white py-4 rounded-2xl font-extrabold text-sm transition-all shadow-lg shadow-[#e0218a]/20">
                  Оплатить {depositAmount} ₽
                </button>
              </div>

              <div className="bg-gradient-to-br from-[#7c3aed] to-[#e0218a] text-white p-6 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-extrabold uppercase bg-white/20 px-3 py-1 rounded-full">Бонусы</span>
                  <h3 className="font-heading text-2xl font-extrabold">Получите до +10% к балансу</h3>
                  <p className="text-xs text-white/80">При пополнении от 5 000 ₽ мы автоматически начислим подарочный бонус.</p>
                </div>
                <div className="font-mono text-xs bg-black/20 p-3 rounded-2xl">
                  Ваша персональная скидка: 5%
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── PAGE 5: REFERRALS ── */}
        {activeTab === 'referrals' && (
          <section className="bg-gradient-to-br from-[#14121d] to-[#252136] text-white p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-2">
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold">
                  Партнёрская программа Flux
                </h1>
                <p className="text-xs text-white/70">Приглашайте друзей и делитесь бонусами 10%</p>
              </div>
              <span className="bg-[#e0218a] px-4 py-1.5 rounded-full text-xs font-extrabold">
                Начислено: {DASHBOARD_DATA.refBalance}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <span className="font-mono font-bold truncate">https://smmflux.ru/ref/{DASHBOARD_DATA.refCode}</span>
              <button
                onClick={handleCopyRef}
                className="bg-[#e0218a] text-white px-4 py-2 rounded-xl font-extrabold shrink-0 hover:bg-pink-600"
              >
                {isCopied ? 'Скопировано!' : 'Копировать'}
              </button>
            </div>
          </section>
        )}

        {/* ── PAGE 6: SUPPORT ── */}
        {activeTab === 'support' && (
          <section className="bg-[#f6f5fb] rounded-3xl p-6 sm:p-8 border border-[#ece9f5] space-y-6">
            <div className="border-b border-[#ece9f5] pb-4 flex items-center justify-between">
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#100d18]">
                  Чат с <span className="marker-highlight">поддержкой</span>
                </h1>
                <p className="text-xs text-[#79748c]">Решаем любые вопросы по заказам за 3 минуты</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#ece9f5] space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#423f54]">Ваше сообщение:</label>
                <textarea
                  rows={4}
                  placeholder="Опишите вопрос по заказу..."
                  className="w-full bg-[#f6f5fb] border border-[#ece9f5] rounded-2xl p-4 text-xs outline-none focus:border-[#e0218a]"
                />
              </div>
              <button className="bg-[#14121d] hover:bg-[#e0218a] text-white px-6 py-3 rounded-full font-extrabold text-xs transition-all">
                Отправить в поддержку
              </button>
            </div>
          </section>
        )}

        {/* ── PAGE 7: SETTINGS ── */}
        {activeTab === 'settings' && (
          <section className="bg-[#f6f5fb] rounded-3xl p-6 sm:p-8 border border-[#ece9f5] space-y-6">
            <div className="border-b border-[#ece9f5] pb-4">
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#100d18]">
                Настройки <span className="marker-highlight">профиля</span>
              </h1>
              <p className="text-xs text-[#79748c]">Управление параметрами аккаунта SMMflux</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-[#ece9f5] space-y-4 max-w-xl text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#423f54]">Email аккаунта:</label>
                <input
                  type="email"
                  readOnly
                  value="client@smmflux.ru"
                  className="w-full bg-[#f6f5fb] border border-[#ece9f5] rounded-2xl px-4 py-3 font-mono"
                />
              </div>

              <div className="space-y-1 pt-2">
                <label className="font-bold text-[#423f54]">Новый пароль:</label>
                <input
                  type="password"
                  placeholder="Мин. 12 символов..."
                  className="w-full bg-[#f6f5fb] border border-[#ece9f5] rounded-2xl px-4 py-3 font-mono"
                />
              </div>

              <button className="bg-[#14121d] hover:bg-black text-white px-6 py-3 rounded-full font-extrabold">
                Сохранить данные
              </button>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
