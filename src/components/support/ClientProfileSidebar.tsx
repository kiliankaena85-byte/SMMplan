'use client';

import { useState, useTransition } from 'react';
import { ChevronRight, ChevronLeft, User, ShoppingCart, CreditCard } from 'lucide-react';
import Link from 'next/link';

type OrderSummary = {
  id: string;
  status: string;
  quantity: number;
  charge: number;
  createdAt: string;
  service: { name: string };
};

type PaymentSummary = {
  id: string;
  amount: number;
  status: string;
  gateway: string;
  createdAt: string;
};

export type ClientProfileData = {
  id: string;
  email: string;
  balance: number;
  totalSpent: number;
  createdAt: string;
  orders: OrderSummary[];
  payments: PaymentSummary[];
};

const ORDER_STATUS_MAP: Record<string, { label: string, color: string }> = {
  IN_PROGRESS: { label: 'В работе', color: 'text-indigo-600 bg-indigo-50' },
  PENDING: { label: 'Ожидание', color: 'text-amber-600 bg-amber-50' },
  COMPLETED: { label: 'Выполнен', color: 'text-emerald-600 bg-emerald-50' },
  CANCELED: { label: 'Отменен', color: 'text-slate-500 bg-slate-50' },
  ERROR: { label: 'Ошибка', color: 'text-rose-600 bg-rose-50' },
};

const PAYMENT_STATUS_MAP: Record<string, { label: string, color: string }> = {
  SUCCEEDED: { label: 'Успешно', color: 'text-emerald-600 bg-emerald-50' },
  PENDING: { label: 'Ожидание', color: 'text-amber-600 bg-amber-50' },
  CANCELED: { label: 'Отмена', color: 'text-slate-500 bg-slate-50' },
};

import { requestTelegramBind, adminManualTelegramBind } from '@/actions/support/ticket';

export default function ClientProfileSidebar({ user, ticketId }: { user: ClientProfileData, ticketId: string }) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <div className="h-full flex items-center justify-center shrink-0 border-l border-border bg-card rounded-xl w-12 transition-all">
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Показать профиль клиента"
          className="w-8 h-8 rounded-full bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary flex items-center justify-center transition-all duration-200"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[340px] shrink-0 h-full bg-card border border-border rounded-xl flex flex-col relative animate-in slide-in-from-right-8 duration-300">
      <button
        onClick={() => setIsOpen(false)}
        aria-label="Скрыть панель профиля"
        className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground flex items-center justify-center transition-all duration-200"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Profile header */}
      <div className="p-5 border-b border-border flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 text-primary flex items-center justify-center mb-3 text-lg font-bold uppercase">
          {user.email.substring(0, 2)}
        </div>
        <h3 className="font-bold text-foreground mb-1 truncate w-full px-2 text-sm" title={user.email}>
          {user.email}
        </h3>
        {user.email.startsWith('tg_') && (
          <div className="w-full mb-3 mt-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-lg p-2 text-[10px] text-center font-medium">
            <p className="mb-2">Временный профиль. Вы можете запросить у клиента авторизацию:</p>
            <div className="mb-3">
              <button 
                disabled={isPending}
                onClick={() => {
                  console.log('[Sidebar] Request Auth Link Clicked');
                  startTransition(async () => {
                    const fd = new FormData();
                    fd.set('ticketId', ticketId);
                    await requestTelegramBind(fd);
                  });
                }}
                className="w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-bold transition-colors disabled:opacity-50"
              >
                {isPending ? 'Отправка...' : 'Отправить ссылку для привязки'}
              </button>
            </div>
            <div className="border-t border-amber-500/20 pt-2 text-left">
              <p className="mb-1 text-[9px] uppercase tracking-wider font-bold opacity-80">Или привязать вручную:</p>
              <div className="flex gap-1 mt-1">
                <input 
                  type="email" 
                  id="manual-bind-email"
                  disabled={isPending}
                  placeholder="email@client.ru" 
                  className="flex-1 bg-white border border-amber-500/30 rounded px-2 py-1 outline-none text-slate-800" 
                />
                <button 
                  disabled={isPending}
                  onClick={() => startTransition(async () => {
                    const email = (document.getElementById('manual-bind-email') as HTMLInputElement)?.value;
                    if (!email) return;
                    const fd = new FormData();
                    fd.set('ticketId', ticketId);
                    fd.set('targetEmail', email);
                    await adminManualTelegramBind(fd);
                  })}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded font-bold transition-colors disabled:opacity-50"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground mb-4">
          Регистрация: {new Date(user.createdAt).toLocaleDateString('ru-RU')}
        </p>

        <div className="flex w-full gap-2">
          <div className="flex-1 bg-muted/40 rounded-xl p-3 border border-border">
            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Баланс</div>
            <div className="font-bold text-emerald-600 text-sm">{(user.balance / 100).toLocaleString('ru-RU')} ₽</div>
          </div>
          <div className="flex-1 bg-muted/40 rounded-xl p-3 border border-border">
            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">LTV</div>
            <div className="font-bold text-foreground text-sm">{(user.totalSpent / 100).toLocaleString('ru-RU')} ₽</div>
          </div>
        </div>

        <Link
          href={`/admin/clients/${user.id}`}
          aria-label="Открыть полный профиль клиента"
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-border bg-background text-foreground hover:bg-muted transition-all duration-200"
        >
          <User className="w-3.5 h-3.5" /> В профиль клиента
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        
        {/* Последние заказы */}
        <div>
           <div className="flex items-center justify-between mb-3 px-1">
             <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5">
               <ShoppingCart className="w-3.5 h-3.5" /> Заказы (последние 3)
             </h4>
           </div>
           
           <div className="space-y-2">
             {user.orders.map(order => {
               const st = ORDER_STATUS_MAP[order.status] || { label: order.status, color: 'text-slate-500 bg-slate-50' };
               return (
                 <div key={order.id} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm flex flex-col gap-2">
                   <div className="flex justify-between items-start">
                     <span className="text-[10px] font-mono text-slate-400">#{order.id.slice(-6)}</span>
                     <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${st.color}`}>
                       {st.label}
                     </span>
                   </div>
                   <div className="text-xs font-medium text-slate-800 line-clamp-2 leading-tight">
                     {order.service.name}
                   </div>
                   <div className="flex justify-between items-center mt-1">
                     <span className="text-[10px] text-slate-500">{order.quantity} шт.</span>
                     <span className="text-[10px] font-bold text-slate-700">{(order.charge / 100).toLocaleString('ru-RU')} ₽</span>
                   </div>
                 </div>
               );
             })}
             {user.orders.length === 0 && <div className="text-xs text-slate-400 text-center py-2">Нет заказов</div>}
           </div>

           {user.orders.length > 0 && (
             <Link href={`/admin/orders?userId=${user.id}`} className="block mt-2 text-[11px] text-center font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
               Смотреть все заказы →
             </Link>
           )}
        </div>

        {/* Последние транзакции */}
        <div>
           <div className="flex items-center justify-between mb-3 px-1">
             <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5">
               <CreditCard className="w-3.5 h-3.5" /> Транзакции
             </h4>
           </div>
           
           <div className="space-y-2">
             {user.payments.map(payment => {
               const st = PAYMENT_STATUS_MAP[payment.status] || { label: payment.status, color: 'text-slate-500 bg-slate-50' };
               return (
                 <div key={payment.id} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm flex items-center justify-between gap-2">
                   <div>
                     <div className="text-xs font-bold text-slate-800">
                       {(payment.amount / 100).toLocaleString('ru-RU')} {payment.gateway === 'cryptobot' ? 'USDT' : '₽'}
                     </div>
                     <div className="text-[10px] text-slate-400 mt-0.5 capitalize">{payment.gateway.replace('yookassa', 'Ru Карта')}</div>
                   </div>
                   <div className="text-right">
                     <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${st.color}`}>
                       {st.label}
                     </span>
                     <div className="text-[9px] text-slate-400 mt-1">
                       {new Date(payment.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                     </div>
                   </div>
                 </div>
               );
             })}
             {user.payments.length === 0 && <div className="text-xs text-slate-400 text-center py-2">Нет пополнений</div>}
           </div>
        </div>

      </div>
    </div>
  );
}
