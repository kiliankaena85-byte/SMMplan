'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ShoppingCart, 
  Wallet, 
  Users, 
  TrendingUp, 
  ArrowRight, 
  Clock, 
  Copy, 
  Check, 
  Sparkles, 
  Zap, 
  RotateCcw,
  ArrowUpRight
} from 'lucide-react';
import { formatBalance } from '@/lib/utils';
import { PaymentAutoSync } from '@/components/orders/PaymentAutoSync';
import { SocialIcon } from '@/components/ui/SocialIcon';

const STATUS_LABEL: Record<string, string> = {
  COMPLETED:       'Выполнен',
  IN_PROGRESS:     'В работе',
  PENDING:         'Ожидание',
  AWAITING_PAYMENT:'Ожидает оплаты',
  ERROR:           'Ошибка',
  CANCELED:        'Отменён',
  PARTIAL:         'Частично',
  PROVISIONING:    'Запуск',
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED:       'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
  IN_PROGRESS:     'text-sky-700 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20',
  PENDING:         'text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20',
  AWAITING_PAYMENT:'text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20',
  PROVISIONING:    'text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20',
  ERROR:           'text-rose-700 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20',
  PARTIAL:         'text-orange-700 dark:text-orange-400 bg-orange-500/10 border border-orange-500/20',
  CANCELED:        'text-muted-foreground bg-muted border border-border',
};

const TOP_LAUNCHPAD = [
  { slug: 'telegram', name: 'Telegram', desc: 'Подписчики, Просмотры, Реакции', bg: 'hover:border-sky-500/40 hover:shadow-sky-500/10' },
  { slug: 'vk', name: 'ВКонтакте', desc: 'Подписчики, Лайки, Просмотры', bg: 'hover:border-blue-500/40 hover:shadow-blue-500/10' },
  { slug: 'instagram', name: 'Instagram', desc: 'Фолловеры, Лайки, Reels', bg: 'hover:border-pink-500/40 hover:shadow-pink-500/10' },
  { slug: 'youtube', name: 'YouTube', desc: 'Просмотры с удержанием, Shorts', bg: 'hover:border-red-500/40 hover:shadow-red-500/10' },
  { slug: 'tiktok', name: 'TikTok', desc: 'Просмотры, Лайки, Подписчики', bg: 'hover:border-neutral-500/40 hover:shadow-neutral-500/10' },
  { slug: 'twitch', name: 'Twitch', desc: 'Зрители на стрим, Фолловеры', bg: 'hover:border-purple-500/40 hover:shadow-purple-500/10' },
];


export interface ClassicDashboardUser {
  id?: string;
  email?: string | null;
  balance?: number | bigint;
  balanceCents?: number | bigint;
  totalSpent?: number | bigint;
  referralCode?: string | null;
  referralBalance?: number | bigint;
}

export interface ClassicDashboardOrder {
  id: string;
  numericId: number;
  status: string;
  charge: number | bigint;
  quantity: number;
  link?: string;
  serviceId?: string;
  service?: {
    name: string;
    category?: {
      network?: {
        slug: string;
      } | null;
    } | null;
  } | null;
}

export function ClassicDashboardHome({
  user,
  orders,
  referralCount,
  activeOrders,
  hasPendingPayments,
  origin,
  initialCatalog = [],
}: {
  user: ClassicDashboardUser;
  orders: ClassicDashboardOrder[];
  referralCount: number;
  activeOrders: number;
  hasPendingPayments: boolean;
  origin: string;
  initialCatalog?: Array<{ id: string; name: string; slug: string; [key: string]: unknown }>;
}) {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyReferral = () => {
    if (!user.referralCode) return;
    const link = `${origin}/r/${user.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-foreground">
      {hasPendingPayments && <PaymentAutoSync />}

      {/* ══════════ HERO GREETING BANNER ══════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card/90 to-primary/5 border border-border/80 p-6 sm:p-8 shadow-xl shadow-primary/5">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Личный кабинет SMMplan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Добро пожаловать 👋
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              {user.email} • Оптовые тарифы от 1 штуки без посредников
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/new-order"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <Zap className="w-4 h-4" />
              <span>Создать заказ</span>
            </Link>
            <Link
              href="/dashboard/add-funds"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-card hover:bg-secondary border border-border text-foreground font-bold text-xs sm:text-sm shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <Wallet className="w-4 h-4 text-primary" />
              <span>Пополнить</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════ BENTO KPI CARDS ══════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Баланс */}
        <div className="group relative overflow-hidden bg-card/85 backdrop-blur-xl border border-border/80 rounded-3xl p-6 shadow-md hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Текущий баланс
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-pink-500 dark:from-sky-400 dark:via-indigo-400 dark:to-pink-400">
              {formatBalance(user.balanceCents ?? user.balance)}
            </div>
            <span className="text-[11px] text-muted-foreground font-medium block mt-0.5">
              Доступно для моментального списания
            </span>
          </div>
          <Link
            href="/dashboard/add-funds"
            className="w-full py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center gap-1.5 text-xs font-extrabold transition-all duration-200"
          >
            + Пополнить счет <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Всего потрачено */}
        <div className="group relative overflow-hidden bg-card/85 backdrop-blur-xl border border-border/80 rounded-3xl p-5 sm:p-6 shadow-md hover:shadow-xl hover:border-border transition-all duration-300 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Всего потрачено
            </span>
            <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground">
                {(Number(user.totalSpent ?? 0) / 100).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-sm font-bold text-muted-foreground">₽</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium block mt-0.5">
              Суммарный объем за все время
            </span>
          </div>
          <Link
            href="/dashboard/transactions"
            className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground flex items-center justify-center gap-1.5 text-xs font-extrabold transition-all duration-200"
          >
            История транзакций <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* В работе */}
        <div className="group relative overflow-hidden bg-card/85 backdrop-blur-xl border border-border/80 rounded-3xl p-5 sm:p-6 shadow-md hover:shadow-xl hover:border-sky-500/40 transition-all duration-300 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Заказы в работе
            </span>
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500">
              {activeOrders > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
              )}
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-foreground font-mono tracking-tight flex items-center gap-2">
              <span>{activeOrders}</span>
              {activeOrders > 0 && (
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full animate-pulse">
                  Активно
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground font-medium block mt-0.5">
              {activeOrders > 0 ? 'Выполняются в фоновом режиме' : 'Нет активных задач прямо сейчас'}
            </span>
          </div>
          <Link
            href="/dashboard/orders"
            className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground flex items-center justify-center gap-1.5 text-xs font-extrabold transition-all duration-200"
          >
            Мои заказы <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Партнерка */}
        <div className="group relative overflow-hidden bg-card/85 backdrop-blur-xl border border-border/80 rounded-3xl p-5 sm:p-6 shadow-md hover:shadow-xl hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Рефералы
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-foreground font-mono tracking-tight flex items-baseline gap-1.5">
              <span>{referralCount}</span>
              <span className="text-xs font-bold text-muted-foreground">партнёров</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <button
                type="button"
                onClick={handleCopyReferral}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>Скопировано!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Скопировать реф-ссылку</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <Link
            href="/dashboard/referrals"
            className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground flex items-center justify-center gap-1.5 text-xs font-extrabold transition-all duration-200"
          >
            Партнёрка <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ══════════ QUICK LAUNCHPAD (БЫСТРЫЙ ЗАКАЗ ПО СОЦСЕТЯМ) ══════════ */}
      {(() => {
        const activeNetworksCount = initialCatalog.length > 0 ? initialCatalog.length : TOP_LAUNCHPAD.length;
        const n = activeNetworksCount;
        const pluralWord = (n % 10 === 1 && n % 100 !== 11) ? 'соцсеть' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 'соцсети' : 'соцсетей';
        return (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                  Быстрый заказ по соцсетям
                </h2>
                <p className="text-xs text-muted-foreground">
                  Выберите соцсеть для мгновенного перехода в визард
                </p>
              </div>
              <Link
                href="/dashboard/new-order"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 shrink-0 self-start sm:self-auto"
              >
                <span>Все {n} {pluralWord}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {TOP_LAUNCHPAD.map((item) => (
                <Link
                  key={item.slug}
                  href={`/dashboard/new-order?network=${item.slug}`}
                  className={`group bg-card/90 backdrop-blur-md border border-border/70 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:-translate-y-1 hover:shadow-xl transition-all duration-200 ${item.bg}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-secondary/80 flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                      <SocialIcon slug={item.slug} className="w-6 h-6" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-foreground group-hover:text-primary transition-colors">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium line-clamp-1 mt-0.5">
                      {item.desc}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })()}

      {/* ══════════ RECENT ORDERS FEED ══════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-foreground tracking-tight">
              Последние заказы
            </h2>
            <p className="text-xs text-muted-foreground">
              История активности и статусы выполнения в реальном времени
            </p>
          </div>
          {orders.length > 0 && (
            <Link
              href="/dashboard/orders"
              className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3.5 py-1.5 rounded-xl transition-all duration-200 flex items-center gap-1.5"
            >
              Все заказы <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {orders.length > 0 ? (
          <div className="bg-card/90 backdrop-blur-xl border border-border/80 rounded-3xl overflow-hidden shadow-lg shadow-black/5 divide-y divide-border/50">
            {orders.map((order) => {
              const color = STATUS_COLOR[order.status] || STATUS_COLOR.CANCELED;
              const label = STATUS_LABEL[order.status] || order.status;
              return (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:px-6 hover:bg-secondary/40 transition-colors duration-200 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-secondary/80 border border-border/60 flex items-center justify-center p-2 shrink-0 group-hover:scale-105 transition-transform">
                      <SocialIcon slug={order.service?.category?.network?.slug || 'telegram'} className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-extrabold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                          #{order.numericId}
                        </span>
                        <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {order.service?.name || 'Услуга продвижения'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{order.quantity.toLocaleString('ru-RU')} шт.</span>
                        <span>•</span>
                        <span className="truncate max-w-[200px] sm:max-w-[300px]">{order.link}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    <div className="text-right">
                      <div className="text-sm font-black text-foreground font-mono tabular-nums">
                        {(Number(order.charge) / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                      </div>
                      <span className={`inline-flex items-center text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg uppercase tracking-wider ${color}`}>
                        {label}
                      </span>
                    </div>

                    <Link
                      href={`/dashboard/new-order?serviceId=${order.serviceId}&link=${encodeURIComponent(order.link || '')}&quantity=${order.quantity}`}
                      title="Повторить этот заказ"
                      className="p-2.5 rounded-xl bg-secondary hover:bg-primary/10 hover:text-primary text-muted-foreground border border-border/60 transition-all duration-200"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card/85 backdrop-blur-xl border border-dashed border-border/80 rounded-3xl p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
              <ShoppingCart className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-foreground text-base">У вас пока нет активных заказов</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Создайте свой первый заказ на продвижение за 30 секунд. Тарифы от 1 штуки без минимального порога!
              </p>
            </div>
            <Link
              href="/dashboard/new-order"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-xs shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              Создать первый заказ <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </section>

      {/* ══════════ PARTNER REFERRAL SNIPPET ══════════ */}
      {user.referralCode && (
        <section className="bg-gradient-to-r from-card via-secondary/20 to-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" />
              <span>Зарабатывайте с SMMplan</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Ваша реферальная ссылка
            </h2>
            <p className="text-xs text-muted-foreground max-w-md">
              Делитесь ссылкой и получайте пожизненный процент с каждого пополнения привлеченных клиентов.
            </p>
          </div>

          <div className="flex items-center gap-2 max-w-md w-full sm:w-auto">
            <div className="font-mono text-xs font-bold bg-secondary/80 px-4 py-2.5 rounded-2xl text-foreground truncate border border-border/80 flex-1 select-all">
              {`${origin}/r/${user.referralCode}`}
            </div>
            <button
              onClick={handleCopyReferral}
              className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Скопировано' : 'Копировать'}</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
