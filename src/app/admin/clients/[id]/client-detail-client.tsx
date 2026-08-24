'use client';

/**
 * ClientDetailClient — Enterprise FinTech CRM Client Workspace
 * Orchestrates 5 specialized tabs:
 * 1. Balance & Goodwill adjustments (BalanceTab)
 * 2. Payments & Card Refunds (PaymentsTab)
 * 3. B2B Configuration & Legal Details (B2bTab)
 * 4. Discounts & Operator Notes (NotesTab)
 * 5. Security & Access Control (SecurityTab)
 */

import { useState } from 'react';
import {
  Shield,
  Wallet,
  Percent,
  CreditCard,
  Building2,
} from 'lucide-react';
import { UserDTO, PaymentDTO, OrderDTO, LoginLogDTO } from './tabs/types';
import { BalanceTab } from './tabs/balance-tab';
import { PaymentsTab } from './tabs/payments-tab';
import { B2bTab } from './tabs/b2b-tab';
import { NotesTab } from './tabs/notes-tab';
import { SecurityTab } from './tabs/security-tab';

export type { UserDTO, PaymentDTO, OrderDTO, LoginLogDTO };

interface Props {
  user: UserDTO;
  loginLogs: LoginLogDTO[];
  payments: PaymentDTO[];
  orders: OrderDTO[];
  canSeeFinances: boolean;
}

export function ClientDetailClient({ user, loginLogs, payments, orders, canSeeFinances }: Props) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'balance' | 'b2b' | 'payments' | 'security' | 'notes'>('balance');

  const isB2b = user.b2bConfig?.isB2b ?? Boolean(user.inn);

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3 overflow-x-auto scrollbar-hide">
        {[
          { id: 'balance', label: 'Баланс & Начисление', icon: Wallet },
          { id: 'payments', label: `Платежи & Возвраты (${payments.length})`, icon: CreditCard },
          { id: 'b2b', label: 'B2B & Реквизиты', icon: Building2, badge: isB2b ? 'B2B' : null },
          { id: 'notes', label: 'Скидки & Заметки', icon: Percent },
          { id: 'security', label: 'Безопасность', icon: Shield },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as unknown as typeof activeTab)}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all select-none cursor-pointer whitespace-nowrap border ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-card/60 backdrop-blur-md text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {t.badge && (
                <span className="px-1.5 py-0.2 bg-warning/20 text-warning-text border border-warning/30 rounded text-[9px] font-black uppercase">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: FULL-WIDTH BALANCE TERMINAL & FINANCIAL ANALYTICS */}
      {activeTab === 'balance' && (
        <BalanceTab
          user={user}
          orders={orders}
          payments={payments}
          canSeeFinances={canSeeFinances}
          onNavigateToPayments={() => setActiveTab('payments')}
        />
      )}

      {/* TAB 2: PAYMENTS & IN-TABLE CARD REFUNDS */}
      {activeTab === 'payments' && (
        <PaymentsTab
          user={user}
          payments={payments}
          canSeeFinances={canSeeFinances}
        />
      )}

      {/* TAB 3: B2B & LEGAL DETAILS */}
      {activeTab === 'b2b' && (
        <B2bTab user={user} />
      )}

      {/* TAB 4: NOTES & DISCOUNTS */}
      {activeTab === 'notes' && (
        <NotesTab
          user={user}
          canSeeFinances={canSeeFinances}
        />
      )}

      {/* TAB 5: SECURITY CENTER */}
      {activeTab === 'security' && (
        <SecurityTab
          user={user}
          loginLogs={loginLogs}
        />
      )}
    </div>
  );
}
