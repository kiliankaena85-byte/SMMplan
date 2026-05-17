'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, ShoppingCart, LayoutDashboard, MessageSquare, AlertTriangle, RefreshCw } from 'lucide-react';

type OrderStatus = {
  orderId: string;
  numericId: number;
  status: string; // AWAITING_PAYMENT | PENDING | IN_PROGRESS | COMPLETED | ERROR | CANCELED
  charge: number;
  quantity: number;
  serviceName: string;
};

type PageState = 'verifying' | 'confirmed' | 'awaiting' | 'error' | 'no-context';

const MAX_POLLS = 20; // 20 * 3s = 60 секунд максимум
const POLL_INTERVAL = 3000;

export function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');

  const [pageState, setPageState] = useState<PageState>(orderId ? 'verifying' : 'no-context');
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [autoRedirect, setAutoRedirect] = useState(10);

  const checkStatus = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/order-status?orderId=${orderId}`);
      if (!res.ok) {
        setPageState('error');
        return;
      }
      const data: OrderStatus = await res.json();
      setOrder(data);

      if (data.status === 'PENDING' || data.status === 'IN_PROGRESS' || data.status === 'COMPLETED') {
        // Оплата подтверждена (вебхук пришёл, заказ активен)
        setPageState('confirmed');
      } else if (data.status === 'AWAITING_PAYMENT') {
        // Вебхук ещё не пришёл
        setPageState('awaiting');
      } else if (data.status === 'ERROR' || data.status === 'CANCELED') {
        setPageState('error');
      }
    } catch {
      setPageState('error');
    }
  }, [orderId]);

  // Initial check + polling
  useEffect(() => {
    if (!orderId) return;
    checkStatus();
  }, [orderId, checkStatus]);

  // Auto-poll while awaiting
  useEffect(() => {
    if (pageState !== 'awaiting' && pageState !== 'verifying') return;
    if (pollCount >= MAX_POLLS) return;

    const timer = setTimeout(() => {
      setPollCount(prev => prev + 1);
      checkStatus();
    }, POLL_INTERVAL);

    return () => clearTimeout(timer);
  }, [pageState, pollCount, checkStatus]);

  // Auto-redirect countdown when confirmed
  useEffect(() => {
    if (pageState !== 'confirmed') return;
    if (autoRedirect <= 0) {
      router.push('/dashboard/orders');
      return;
    }
    const timer = setTimeout(() => setAutoRedirect(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [pageState, autoRedirect, router]);

  // ── СОСТОЯНИЕ: Нет orderId (прямой заход на /success) ──
  if (pageState === 'no-context') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-muted border-4 border-border flex items-center justify-center">
              <LayoutDashboard className="w-10 h-10 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-foreground">Нет данных о платеже</h1>
            <p className="text-muted-foreground text-sm">
              Перейдите в раздел «Мои заказы», чтобы проверить статус.
            </p>
          </div>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all duration-200"
          >
            <LayoutDashboard className="w-4 h-4" /> Мои заказы
          </Link>
        </div>
      </div>
    );
  }

  // ── СОСТОЯНИЕ: Проверяем / Ждём вебхук ──
  if (pageState === 'verifying' || pageState === 'awaiting') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in duration-500">
          {/* Animated Verification Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-amber-50 border-4 border-amber-200 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-warning animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-amber-200 animate-ping opacity-20" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-black text-foreground">Проверяем оплату...</h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Ожидаем подтверждение от платёжной системы.
              {' '}Обычно это занимает <strong className="text-foreground">несколько секунд</strong>.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">Статус проверки</span>
              <span className="text-amber-600 font-bold flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Проверка {pollCount + 1}/{MAX_POLLS}
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-warning rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(((pollCount + 1) / MAX_POLLS) * 100, 100)}%` }}
              />
            </div>
            {order && (
              <p className="text-xs text-muted-foreground">
                Заказ #{order.numericId} · {order.serviceName} · {(order.charge / 100).toLocaleString('ru-RU')} ₽
              </p>
            )}
          </div>

          {/* Hint after ~15 seconds */}
          {pollCount >= 5 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left animate-in fade-in duration-300">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Подтверждение задерживается</p>
                  <p>Если вы уже оплатили — не волнуйтесь, мы автоматически зачислим платёж, когда банк пришлёт подтверждение. Вы также можете проверить статус позже в разделе «Мои заказы».</p>
                </div>
              </div>
            </div>
          )}

          {/* Manual fallback after max polls */}
          {pollCount >= MAX_POLLS && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <p className="text-sm text-muted-foreground">
                Автоматическая проверка завершена. Платёж может поступить с небольшой задержкой.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/dashboard/orders"
                  className="flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all duration-200"
                >
                  <LayoutDashboard className="w-4 h-4" /> Мои заказы
                </Link>
                <Link
                  href="/dashboard/tickets"
                  className="flex items-center justify-center gap-2 py-3 bg-card border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-muted transition-all duration-200"
                >
                  <MessageSquare className="w-4 h-4" /> Поддержка
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── СОСТОЯНИЕ: Оплата подтверждена! ──
  if (pageState === 'confirmed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-success" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-emerald-200 animate-ping opacity-20" />
            </div>
          </div>

          {/* Text */}
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-foreground">Оплата подтверждена!</h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              {order ? (
                <>Заказ <strong className="text-foreground">#{order.numericId}</strong> принят и поставлен в очередь на выполнение.
                Обычно запуск происходит в течение <strong className="text-foreground">1–5 минут</strong>.</>
              ) : (
                <>Заказ принят и поставлен в очередь. Обычно запуск происходит в течение <strong className="text-foreground">1–5 минут</strong>.</>
              )}
            </p>
          </div>

          {/* Steps */}
          <div className="bg-card border border-border rounded-2xl p-5 text-left space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Что дальше?
            </p>
            {[
              { step: '1', text: 'Заказ передан провайдеру' },
              { step: '2', text: 'Начнётся выполнение в течение нескольких минут' },
              { step: '3', text: 'Следите за статусом в разделе «Мои заказы»' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                  {step}
                </div>
                <p className="text-sm text-foreground">{text}</p>
              </div>
            ))}
          </div>

          {/* Auto-redirect hint */}
          <p className="text-xs text-muted-foreground">
            Переход в «Мои заказы» через {autoRedirect} сек.
          </p>

          {/* Actions */}
          <div className="grid grid-cols-1 gap-3">
            <Link
              href="/dashboard/orders"
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all duration-200 shadow-sm"
              aria-label="Перейти к моим заказам"
            >
              <LayoutDashboard className="w-4 h-4" />
              Мои заказы
            </Link>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/dashboard/new-order"
                className="flex items-center justify-center gap-2 py-3 bg-card border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-muted transition-all duration-200"
                aria-label="Создать ещё один заказ"
              >
                <ShoppingCart className="w-4 h-4" />
                Новый заказ
              </Link>
              <Link
                href="/dashboard/tickets"
                className="flex items-center justify-center gap-2 py-3 bg-card border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-muted transition-all duration-200"
                aria-label="Написать в поддержку"
              >
                <MessageSquare className="w-4 h-4" />
                Поддержка
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── СОСТОЯНИЕ: Ошибка ──
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-rose-50 border-4 border-rose-100 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-foreground">Что-то пошло не так</h1>
          <p className="text-muted-foreground text-sm">
            Платёж не был подтверждён или заказ отменён. Проверьте статус в разделе «Мои заказы» или обратитесь в поддержку.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/dashboard/orders"
            className="flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all duration-200"
          >
            <LayoutDashboard className="w-4 h-4" /> Мои заказы
          </Link>
          <Link
            href="/dashboard/tickets"
            className="flex items-center justify-center gap-2 py-3 bg-card border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-muted transition-all duration-200"
          >
            <MessageSquare className="w-4 h-4" /> Поддержка
          </Link>
        </div>
      </div>
    </div>
  );
}
