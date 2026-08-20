'use client';

/**
 * ClientDetailClient — Enterprise FinTech CRM Client Workspace
 *
 * Implements:
 * 1. Ultra-compact Balance & Goodwill adjustment with Anti-Double-Click Idempotency Lock.
 * 2. Explicit Direction Segmented Control (Credit vs Debit) with positive-only amount input.
 * 3. Live Math Balance Projection ("Было → Операция → Станет").
 * 4. Context-aware predictive auto-fill chips (Orders & Deposits).
 * 5. In-table Card Refund Dialog for Payments (YooKassa / Robokassa) with Instant Hold & Anti-Double-Click.
 * 6. B2B Configuration & Legal Details.
 * 7. Security Center & Password Management.
 */

import { useState, useTransition, useRef, useId } from 'react';
import { toast } from 'sonner';
import { updateClientDiscountAction, updateClientNoteAction } from '@/actions/admin/clients';
import { 
  updateBalanceAction, 
  adminChangeUserPasswordAction,
  requestCardRefundAction,
  updateUserB2bAction,
  adminChangeUserEmailAction,
  adminGenerateMagicLinkAction,
  adminRevokeUserSessionsAction
} from '@/actions/admin/users';
import {
  Shield,
  Wallet,
  FileText,
  Check,
  Copy,
  Percent,
  KeyRound,
  Sparkles,
  CreditCard,
  Building2,
  Receipt,
  RotateCcw,
  Zap,
  PlusCircle,
  MinusCircle,
  AlertTriangle,
  ArrowRight,
  X,
  Lock,
  Mail,
  Link as LinkIcon,
  LogOut,
  Edit3
} from 'lucide-react';

interface UserDTO {
  id: string;
  email: string;
  role: string;
  personalDiscount: number;
  discountEndsAt: string | null;
  adminNote: string;
  adminNoteUpdatedAt: string | null;
  adminNoteUpdatedBy: string | null;
  telegramId: string | null;
  referralCode: string | null;
  companyName: string;
  inn: string;
  kpp: string;
  legalAddress: string;
  b2bConfig: {
    isB2b: boolean;
    prioritySupport: boolean;
    webhookUrl: string;
  } | null;
  createdAt: string;
  ordersCount: number;
  ticketsCount: number;
  paymentsCount: number;
  balance?: number;
  quarantineBalance?: number;
  totalSpent?: number;
  referralBalance?: number;
}

interface PaymentDTO {
  id: string;
  amountRub: number;
  amountCents: number;
  currency: string;
  status: string;
  gateway: string;
  gatewayId: string | null;
  receiptId: string | null;
  refundReceiptId: string | null;
  createdAt: string;
}

interface OrderDTO {
  id: string;
  numericId: number;
  status: string;
  quantity: number;
  chargeRub: number;
  serviceName: string;
  createdAt: string;
}

interface LoginLogDTO {
  id: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failReason: string | null;
  createdAt: string;
}

interface Props {
  user: UserDTO;
  loginLogs: LoginLogDTO[];
  payments: PaymentDTO[];
  orders: OrderDTO[];
  canSeeFinances: boolean;
}

function parseUserAgent(ua: string) {
  if (!ua) return 'Unknown Browser / OS';
  let browser = 'Other Browser';
  let os = 'Other OS';
  const lowerUA = ua.toLowerCase();
  
  if (lowerUA.includes('firefox')) browser = 'Firefox';
  else if (lowerUA.includes('chrome') && !lowerUA.includes('chromium')) browser = 'Chrome';
  else if (lowerUA.includes('safari') && !lowerUA.includes('chrome')) browser = 'Safari';
  else if (lowerUA.includes('edge') || lowerUA.includes('edg')) browser = 'Edge';
  else if (lowerUA.includes('opera') || lowerUA.includes('opr')) browser = 'Opera';
  
  if (lowerUA.includes('windows')) os = 'Windows';
  else if (lowerUA.includes('macintosh') || lowerUA.includes('mac os')) os = 'macOS';
  else if (lowerUA.includes('android')) os = 'Android';
  else if (lowerUA.includes('iphone') || lowerUA.includes('ipad')) os = 'iOS';
  else if (lowerUA.includes('linux')) os = 'Linux';
  
  return `${browser} on ${os}`;
}

export function ClientDetailClient({ user, loginLogs, payments, orders, canSeeFinances }: Props) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'balance' | 'b2b' | 'payments' | 'security' | 'notes'>('balance');

  // Anti-Double-Click Balance State
  const [direction, setDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [amountRub, setAmountRub] = useState('');
  const [reasonCode, setReasonCode] = useState('GOODWILL_LOYALTY');
  const [customReason, setCustomReason] = useState('');
  const [isPendingBalance, startBalanceTransition] = useTransition();
  const [balanceIdempotencyKey, setBalanceIdempotencyKey] = useState<string>(() => `balance-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  // Calculations
  const currentBalanceRub = (user.balance || 0) / 100;
  const totalDepositedRub = payments
    .filter(p => p.status === 'SUCCEEDED')
    .reduce((acc, p) => acc + p.amountRub, 0);
  const totalSpentRub = (user.totalSpent || 0) / 100;
  const parsedAmountRub = parseFloat(amountRub) || 0;
  const validPositiveAmount = parsedAmountRub > 0 ? parsedAmountRub : 0;
  const rawCents = Math.round(validPositiveAmount * 100);
  const signedAmountCents = direction === 'CREDIT' ? rawCents : -rawCents;
  const projectedBalanceRub = direction === 'CREDIT' 
    ? currentBalanceRub + validPositiveAmount 
    : currentBalanceRub - validPositiveAmount;
  const isOverdraft = direction === 'DEBIT' && projectedBalanceRub < 0;

  // Card Refund Modal State (In Payments Tab)
  const [refundModalPayment, setRefundModalPayment] = useState<PaymentDTO | null>(null);
  const [refundAmountRub, setRefundAmountRub] = useState('');
  const [refundReason, setRefundReason] = useState('Возврат средств по запросу клиента');
  const [isPendingRefund, startRefundTransition] = useTransition();
  const [refundIdempotencyKey, setRefundIdempotencyKey] = useState<string>(() => `refund-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  // B2B fields
  const [isB2b, setIsB2b] = useState(user.b2bConfig?.isB2b ?? Boolean(user.inn));
  const [prioritySupport, setPrioritySupport] = useState(user.b2bConfig?.prioritySupport ?? false);
  const [companyName, setCompanyName] = useState(user.companyName);
  const [inn, setInn] = useState(user.inn);
  const [kpp, setKpp] = useState(user.kpp);
  const [legalAddress, setLegalAddress] = useState(user.legalAddress);
  const [webhookUrl, setWebhookUrl] = useState(user.b2bConfig?.webhookUrl ?? '');
  const [isPendingB2b, startB2bTransition] = useTransition();

  // Password & Notes & Discounts
  const [note, setNote] = useState(user.adminNote);
  const [discount, setDiscount] = useState(user.personalDiscount);
  const [discountEndsAt, setDiscountEndsAt] = useState(
    user.discountEndsAt ? new Date(user.discountEndsAt).toISOString().slice(0, 16) : ''
  );
  const [newPass, setNewPass] = useState('');
  const [copiedPass, setCopiedPass] = useState(false);

  const [isPendingNote, startNoteTransition] = useTransition();
  const [isPendingDiscount, startDiscountTransition] = useTransition();
  const [isPendingPass, startPassTransition] = useTransition();

  // Predictive Context Chips
  const problematicOrders = orders.filter(o => o.status === 'FAILED' || o.status === 'CANCELLED' || o.status === 'PARTIAL');
  const recentSuccessfulPayment = payments.find(p => p.status === 'SUCCEEDED');

  const applyPredictiveChip = (amount: number, code: string, noteText: string, dir: 'CREDIT' | 'DEBIT' = 'CREDIT') => {
    setDirection(dir);
    setAmountRub(amount.toFixed(2));
    setReasonCode(code);
    setCustomReason(noteText);
    toast.success(`Подставлена сумма ${amount.toFixed(2)} ₽ из контекста`);
  };

  // Submit Balance with Anti-Double-Click Guard
  const handleBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPendingBalance) return; // Prevent double clicks
    if (validPositiveAmount <= 0) {
      toast.error('Укажите сумму больше 0 ₽');
      return;
    }
    if (isOverdraft) {
      toast.error('Списание превышает доступный баланс клиента');
      return;
    }
    const finalReason = customReason.trim() || reasonCode;
    if (finalReason.length < 5) {
      toast.error('Обоснование должно содержать минимум 5 символов');
      return;
    }

    startBalanceTransition(async () => {
      const fd = new FormData();
      fd.append('userId', user.id);
      fd.append('amount', signedAmountCents.toString());
      fd.append('reason', finalReason);
      fd.append('idempotencyKey', balanceIdempotencyKey);

      const res = await updateBalanceAction(fd);
      if (res.success) {
        toast.success(res.message || 'Баланс успешно обновлен');
        setAmountRub('');
        setCustomReason('');
        // Regenerate idempotency key for next action
        setBalanceIdempotencyKey(`balance-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
      } else {
        toast.error(res.error || 'Ошибка при изменении баланса');
      }
    });
  };

  // Submit Card Refund with Anti-Double-Click Guard
  const handleCardRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPendingRefund || !refundModalPayment) return; // Prevent double clicks
    
    const val = parseFloat(refundAmountRub);
    if (isNaN(val) || val <= 0) {
      toast.error('Укажите корректную сумму возврата');
      return;
    }
    if (val > refundModalPayment.amountRub) {
      toast.error(`Сумма возврата не может превышать исходный платеж (${refundModalPayment.amountRub.toFixed(2)} ₽)`);
      return;
    }
    if (val > currentBalanceRub) {
      toast.error(`Недостаточно средств на балансе клиента (${currentBalanceRub.toFixed(2)} ₽) для списания`);
      return;
    }

    startRefundTransition(async () => {
      const fd = new FormData();
      fd.append('userId', user.id);
      fd.append('paymentId', refundModalPayment.id);
      fd.append('amountKopecks', Math.round(val * 100).toString());
      fd.append('reason', refundReason.trim());
      fd.append('idempotencyKey', refundIdempotencyKey);

      const res = await requestCardRefundAction(fd);
      if (res.success) {
        toast.success(res.message || 'Средства списаны с баланса. Заявка на возврат передана финансисту');
        setRefundModalPayment(null);
        setRefundAmountRub('');
        setRefundIdempotencyKey(`refund-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
      } else {
        toast.error(res.error || 'Ошибка при создании заявки на возврат');
      }
    });
  };

  // Helper for B2B save
  const handleB2bSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startB2bTransition(async () => {
      const fd = new FormData();
      fd.append('userId', user.id);
      fd.append('isB2b', isB2b ? 'true' : 'false');
      fd.append('prioritySupport', prioritySupport ? 'true' : 'false');
      fd.append('companyName', companyName);
      fd.append('inn', inn);
      fd.append('kpp', kpp);
      fd.append('legalAddress', legalAddress);
      fd.append('webhookUrl', webhookUrl);

      const res = await updateUserB2bAction(fd);
      if (res.success) {
        toast.success(res.message || 'B2B реквизиты обновлены');
      } else {
        toast.error(res.error || 'Ошибка при сохранении B2B данных');
      }
    });
  };

  function saveNote() {
    startNoteTransition(async () => {
      const r = await updateClientNoteAction(user.id, note);
      if (r.success) toast.success('📝 Заметка сохранена');
      else toast.error(r.error ?? 'Ошибка');
    });
  }

  function saveDiscount() {
    if (discount < 0 || discount > 50) {
      toast.error('Скидка должна быть в диапазоне от 0% до 50%');
      return;
    }
    startDiscountTransition(async () => {
      const r = await updateClientDiscountAction(
        user.id,
        discount,
        discountEndsAt ? new Date(discountEndsAt).toISOString() : undefined
      );
      if (r.success) toast.success(`✅ Скидка ${discount}% применена`);
      else toast.error(r.error ?? 'Ошибка');
    });
  }

  function generateRandomPassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPass(res);
  }

  async function copyNewPassword() {
    if (!newPass) return;
    try {
      await navigator.clipboard.writeText(newPass);
      setCopiedPass(true);
      toast.success('Пароль скопирован');
      setTimeout(() => setCopiedPass(false), 2000);
    } catch {
      toast.error('Ошибка копирования');
    }
  }

  function savePassword() {
    if (!newPass || newPass.length < 8) {
      toast.error('Пароль должен содержать минимум 8 символов');
      return;
    }
    startPassTransition(async () => {
      const r = await adminChangeUserPasswordAction(user.id, newPass);
      if (r.success) {
        toast.success('🔑 Пароль изменен, сессии клиента сброшены');
        setNewPass('');
      } else {
        toast.error(r.error ?? 'Ошибка при смене пароля');
      }
    });
  }

  // Magic link state & handler
  const [isPendingMagicLink, startMagicLinkTransition] = useTransition();
  const [copiedMagicLink, setCopiedMagicLink] = useState(false);

  function handleGenerateMagicLink() {
    startMagicLinkTransition(async () => {
      const res = await adminGenerateMagicLinkAction(user.id);
      if (res.success && res.magicUrl) {
        const fullUrl = `${window.location.origin}${res.magicUrl}`;
        await navigator.clipboard.writeText(fullUrl);
        setCopiedMagicLink(true);
        toast.success('🔗 Одноразовая ссылка входа скопирована в буфер обмена (действует 15 минут)!');
        setTimeout(() => setCopiedMagicLink(false), 3000);
      } else {
        toast.error(res.error || 'Ошибка при генерации ссылки');
      }
    });
  }

  // Revoke sessions handler
  const [isPendingRevoke, startRevokeTransition] = useTransition();

  function handleRevokeSessions() {
    if (!confirm('Вы уверены, что хотите завершить все активные сессии пользователя со всех устройств?')) return;
    startRevokeTransition(async () => {
      const res = await adminRevokeUserSessionsAction(user.id);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error || 'Ошибка сброса сессий');
      }
    });
  }

  // Email Change Modal State & Handler
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [editEmail, setEditEmail] = useState(user.email);
  const [emailReason, setEmailReason] = useState('Опечатка при регистрации / Обращение в чат');
  const [isPendingEmailChange, startEmailChangeTransition] = useTransition();

  function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!editEmail || !editEmail.includes('@')) {
      toast.error('Введите корректный email');
      return;
    }
    if (!emailReason.trim() || emailReason.trim().length < 3) {
      toast.error('Укажите причину изменения (мин. 3 символа)');
      return;
    }
    startEmailChangeTransition(async () => {
      const res = await adminChangeUserEmailAction(user.id, editEmail, emailReason);
      if (res.success) {
        toast.success(res.message);
        setShowEmailModal(false);
      } else {
        toast.error(res.error || 'Ошибка смены email');
      }
    });
  }

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
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Interactive Financial Terminal */}
          <div className="lg:col-span-7 space-y-6">
            {canSeeFinances && (
              <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-6 ring-1 ring-border/5 space-y-5">
                <div className="flex items-center justify-between border-b border-border/50 pb-4">
                  <div>
                    <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                      <span className="bg-primary/10 text-primary p-1.5 rounded-lg"><Zap className="w-4 h-4" /></span>
                      Терминал изменения баланса
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Ручное начисление или списание средств оператором поддержки</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Текущий баланс</span>
                    <span className="text-xl font-black text-foreground font-mono">
                      {currentBalanceRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                    </span>
                  </div>
                </div>

                {/* 1. Explicit Direction Segmented Control */}
                <div className="grid grid-cols-2 gap-3 p-1.5 bg-muted/40 rounded-2xl border border-border/50">
                  <button
                    type="button"
                    onClick={() => setDirection('CREDIT')}
                    className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer select-none border ${
                      direction === 'CREDIT'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 shadow-xs ring-1 ring-emerald-500/20'
                        : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>➕ Начислить (Credit)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('DEBIT')}
                    className={`flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer select-none border ${
                      direction === 'DEBIT'
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 shadow-xs ring-1 ring-rose-500/20'
                        : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground'
                    }`}
                  >
                    <MinusCircle className="w-4 h-4" />
                    <span>➖ Списать (Debit)</span>
                  </button>
                </div>

                {/* 2. Predictive Context Chips */}
                {(problematicOrders.length > 0 || recentSuccessfulPayment) && (
                  <div className="space-y-1.5 p-3.5 rounded-xl bg-muted/20 border border-border/40">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> Предиктивные подсказки контекста
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {problematicOrders.slice(0, 2).map(po => (
                        <button
                          key={po.id}
                          type="button"
                          onClick={() => applyPredictiveChip(
                            po.chargeRub, 
                            'ORDER_DELAY_COMPENSATION', 
                            `Компенсация по заказу #${po.numericId || po.id.slice(-4)} (${po.serviceName})`,
                            'CREDIT'
                          )}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer shadow-2xs"
                        >
                          <span>Заказ #{po.numericId || po.id.slice(-4)} ({po.chargeRub.toFixed(2)} ₽)</span>
                        </button>
                      ))}
                      {recentSuccessfulPayment && (
                        <button
                          key={recentSuccessfulPayment.id}
                          type="button"
                          onClick={() => applyPredictiveChip(
                            recentSuccessfulPayment.amountRub, 
                            'GOODWILL_LOYALTY', 
                            `Бонус лояльности (${recentSuccessfulPayment.gateway.toUpperCase()})`,
                            'CREDIT'
                          )}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer shadow-2xs"
                        >
                          <span>Пополнение ({recentSuccessfulPayment.amountRub.toFixed(2)} ₽)</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleBalanceSubmit} className="space-y-4">
                  {/* Large Amount Input */}
                  <div>
                    <label className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5 block">
                      Сумма операции (в рублях)
                    </label>
                    <div className="relative flex items-center">
                      <span className={`absolute left-4 font-mono font-black text-2xl ${direction === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {direction === 'CREDIT' ? '+' : '−'}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={amountRub}
                        onChange={e => setAmountRub(e.target.value)}
                        placeholder="0.00"
                        required
                        className="w-full h-14 text-2xl pl-10 pr-12 rounded-2xl border border-border/60 bg-background/50 shadow-sm text-foreground font-mono tracking-tight font-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <span className="absolute right-4 text-base font-mono font-bold text-muted-foreground">₽</span>
                    </div>
                  </div>

                  {/* Large Live Equation Projection Card */}
                  {parsedAmountRub > 0 && (
                    <div className={`p-4 rounded-2xl border transition-all ${
                      isOverdraft 
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400' 
                        : 'bg-muted/40 border-border/60 text-foreground'
                    }`}>
                      <div className="grid grid-cols-3 gap-2 items-center text-center font-mono">
                        <div className="p-2.5 rounded-xl bg-background/40 border border-border/40">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">Было</span>
                          <span className="font-bold text-base">{currentBalanceRub.toFixed(2)} ₽</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-background/40 border border-border/40">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">Операция</span>
                          <span className={`font-black text-lg ${direction === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {direction === 'CREDIT' ? '+' : '−'}{parsedAmountRub.toFixed(2)} ₽
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-background/70 border border-border/60 shadow-xs">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">Станет</span>
                          <span className={`font-black text-xl ${isOverdraft ? 'text-rose-600' : 'text-primary'}`}>
                            {projectedBalanceRub.toFixed(2)} ₽
                          </span>
                        </div>
                      </div>
                      {isOverdraft && (
                        <p className="text-xs font-bold text-rose-600 mt-2.5 flex items-center justify-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" /> Внимание: списание превышает текущий баланс клиента!
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5 block">
                        Причина
                      </label>
                      <select
                        value={reasonCode}
                        onChange={e => setReasonCode(e.target.value)}
                        className="w-full h-11 text-xs px-3 py-2 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground outline-none focus:border-primary transition-all font-medium cursor-pointer"
                      >
                        <option value="GOODWILL_LOYALTY">🎁 Лояльность / Бонус клиенту</option>
                        <option value="ORDER_DELAY_COMPENSATION">⏱️ Компенсация за заказ</option>
                        <option value="MANUAL_CORRECTION">🛠️ Корректировка баланса</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between">
                        <span>Обоснование для аудита <span className="text-destructive">*</span></span>
                        <span className="text-[10px] text-muted-foreground">min 5 симв.</span>
                      </label>
                      <input
                        name="reasonNote"
                        value={customReason}
                        onChange={e => setCustomReason(e.target.value)}
                        minLength={5}
                        placeholder="Номер тикета или причина..."
                        required
                        className="w-full h-11 text-xs px-3 py-2 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Submit Button with Anti-Double-Click Lock */}
                  <button
                    type="submit"
                    disabled={isPendingBalance || isOverdraft || parsedAmountRub <= 0}
                    className={`w-full h-12 text-sm font-black rounded-xl shadow-sm active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                      direction === 'CREDIT'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {isPendingBalance ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Обработка операции...
                      </span>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 opacity-70" />
                        {direction === 'CREDIT' ? (
                          <span>Начислить +{parsedAmountRub > 0 ? parsedAmountRub.toFixed(2) : '0.00'} ₽ на баланс</span>
                        ) : (
                          <span>Списать −{parsedAmountRub > 0 ? parsedAmountRub.toFixed(2) : '0.00'} ₽ с баланса</span>
                        )}
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right Column (5 cols): Financial Snapshot & Policies */}
          <div className="lg:col-span-5 space-y-6">
            {/* Financial Overview Card */}
            <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-6 ring-1 ring-border/5 space-y-4">
              <h4 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2 border-b border-border/50 pb-3">
                <CreditCard className="w-4 h-4 text-primary" />
                Финансовая сводка клиента
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Всего пополнений</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {totalDepositedRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Всего потрачено</span>
                  <span className="text-lg font-black text-foreground font-mono">
                    {totalSpentRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Платежей проведено</span>
                  <span className="text-lg font-black text-foreground font-mono">
                    {payments.filter(p => p.status === 'SUCCEEDED').length}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Заказов оформлено</span>
                  <span className="text-lg font-black text-foreground font-mono">
                    {orders.length}
                  </span>
                </div>
              </div>

              {/* Card Refund Quick Navigation Banner */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-3 mt-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground block">Возврат средств на карту?</span>
                  <p className="text-[11px] text-muted-foreground">Инициируйте возврат из таблицы платежей</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('payments')}
                  className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg shadow-xs hover:bg-primary/90 transition-all cursor-pointer whitespace-nowrap"
                >
                  В платежи →
                </button>
              </div>

              {/* Support Policy Notice */}
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40 space-y-1.5 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Shield className="w-3.5 h-3.5 text-primary" /> Правило финансового аудита:
                </div>
                <p>
                  Все операции баланса логируются в журнал аудита с фиксацией IP, User-Agent и причины. Списания проверяются на овердрафт.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENTS & IN-TABLE CARD REFUNDS */}
      {activeTab === 'payments' && (
        <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl overflow-hidden ring-1 ring-border/5 space-y-4">
          <div className="px-5 py-3.5 border-b border-border/60 flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="bg-primary/10 text-primary p-1 rounded-md"><CreditCard className="w-3.5 h-3.5" /></span>
              История платежей и шлюз возврата на карту
            </h3>
            <span className="text-xs font-bold text-muted-foreground font-mono">
              Всего пополнений: {payments.length}
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-sm">У клиента пока нет платежей</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/60 text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-muted/20">
                    <th className="py-2.5 px-4">Сумма</th>
                    <th className="py-2.5 px-3">Шлюз</th>
                    <th className="py-2.5 px-3">Статус</th>
                    <th className="py-2.5 px-3">ID Транзакции</th>
                    <th className="py-2.5 px-3">Чек 54-ФЗ</th>
                    <th className="py-2.5 px-3">Дата</th>
                    <th className="py-2.5 pr-4 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-foreground">
                        {p.amountRub.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 bg-muted border border-border rounded font-mono uppercase text-[10px] font-bold text-foreground">
                          {p.gateway}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {p.status === 'SUCCEEDED' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-success/15 px-2 py-0.5 rounded-full border border-success/20">
                            Успешно
                          </span>
                        ) : p.status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-warning/15 px-2 py-0.5 rounded-full border border-warning/20">
                            В обработке
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-destructive/15 px-2 py-0.5 rounded-full border border-destructive/20">
                            {p.status}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground truncate max-w-[130px]" title={p.gatewayId || p.id}>
                        {p.gatewayId || p.id}
                      </td>
                      <td className="py-2.5 px-3">
                        {p.receiptId ? (
                          <span className="flex items-center gap-1 text-primary font-mono text-[10px] font-bold">
                            <Receipt className="w-3 h-3" /> Чек #54-ФЗ
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground whitespace-nowrap text-[11px]">
                        {new Date(p.createdAt).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        {p.status === 'SUCCEEDED' && canSeeFinances && (
                          <button
                            type="button"
                            onClick={() => {
                              setRefundModalPayment(p);
                              setRefundAmountRub(p.amountRub.toString());
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-all active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Возврат на карту</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CARD REFUND MODAL DIALOG */}
      {refundModalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border shadow-2xl rounded-2xl max-w-md w-full p-6 space-y-4 relative ring-1 ring-border/20">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                <span className="bg-amber-500/10 text-amber-600 p-1 rounded-md"><RotateCcw className="w-4 h-4" /></span>
                Оформление возврата на карту
              </h3>
              <button
                type="button"
                onClick={() => setRefundModalPayment(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-muted/40 p-3 rounded-xl border border-border/50 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Шлюз оплаты:</span>
                <span className="font-bold uppercase text-foreground">{refundModalPayment.gateway}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID транзакции:</span>
                <span className="font-bold text-foreground truncate max-w-[180px]">{refundModalPayment.gatewayId || refundModalPayment.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Сумма пополнения:</span>
                <span className="font-bold text-foreground">{refundModalPayment.amountRub.toFixed(2)} ₽</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-1">
                <span className="text-muted-foreground">Текущий баланс клиента:</span>
                <span className="font-bold text-primary">{currentBalanceRub.toFixed(2)} ₽</span>
              </div>
            </div>

            <form onSubmit={handleCardRefundSubmit} className="space-y-3.5">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 flex items-center justify-between">
                  <span>Сумма к возврату (в рублях)</span>
                  <span 
                    className="text-[10px] font-bold text-primary cursor-pointer hover:underline"
                    onClick={() => setRefundAmountRub(refundModalPayment.amountRub.toString())}
                  >
                    Вся сумма: {refundModalPayment.amountRub.toFixed(2)} ₽
                  </span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={refundModalPayment.amountRub}
                    value={refundAmountRub}
                    onChange={e => setRefundAmountRub(e.target.value)}
                    required
                    className="w-full h-9 text-sm pl-3 pr-8 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground font-mono font-bold outline-none focus:border-primary transition-all"
                  />
                  <span className="absolute right-3 text-xs font-mono font-bold text-muted-foreground">₽</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                  Причина возврата (для заявления и чека 54-ФЗ)
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  required
                  className="w-full h-9 text-xs px-3 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Защита от двойного расхода:
                </p>
                <p>
                  Сумма будет <strong>моментально списана с баланса в личном кабинете</strong>, а заявка с номером платежа передана финансисту для проведения возврата в ЮKassa / Робокассе.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundModalPayment(null)}
                  className="flex-1 h-9 rounded-xl text-xs font-bold bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isPendingRefund}
                  className="flex-2 h-9 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-primary-foreground shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isPendingRefund ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Списание...
                    </span>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Списать и передать финансисту</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: B2B & LEGAL DETAILS */}
      {activeTab === 'b2b' && (
        <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-5 ring-1 ring-border/5 space-y-5 max-w-3xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="bg-primary/10 text-primary p-1 rounded-md"><Building2 className="w-3.5 h-3.5" /></span>
              B2B-Конфигурация & Юридические реквизиты
            </h3>
            {isB2b && (
              <span className="px-2.5 py-0.5 bg-warning/15 text-warning-text border border-warning/30 rounded-full text-xs font-black uppercase">
                B2B Партнер
              </span>
            )}
          </div>

          <form onSubmit={handleB2bSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 p-3 bg-background/60 border border-border/60 rounded-xl">
                <input
                  type="checkbox"
                  id="isB2bToggle"
                  checked={isB2b}
                  onChange={e => setIsB2b(e.target.checked)}
                  className="w-4 h-4 text-primary rounded cursor-pointer"
                />
                <label htmlFor="isB2bToggle" className="text-xs font-bold text-foreground cursor-pointer select-none">
                  Активировать B2B-профиль
                </label>
              </div>

              <div className="flex items-center gap-2.5 p-3 bg-background/60 border border-border/60 rounded-xl">
                <input
                  type="checkbox"
                  id="prioritySupportToggle"
                  checked={prioritySupport}
                  onChange={e => setPrioritySupport(e.target.checked)}
                  className="w-4 h-4 text-primary rounded cursor-pointer"
                />
                <label htmlFor="prioritySupportToggle" className="text-xs font-bold text-foreground cursor-pointer select-none">
                  Приоритетная линия (Priority Support)
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                  Название организации / ИП
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="ООO «Компания» или ИП Иванов И.И."
                  className="w-full h-9 text-xs px-3 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground outline-none focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                  ИНН (10 или 12 цифр)
                </label>
                <input
                  type="text"
                  value={inn}
                  onChange={e => setInn(e.target.value)}
                  placeholder="7701234567"
                  className="w-full h-9 text-xs font-mono px-3 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground outline-none focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                  КПП (для юрлиц)
                </label>
                <input
                  type="text"
                  value={kpp}
                  onChange={e => setKpp(e.target.value)}
                  placeholder="770101001"
                  className="w-full h-9 text-xs font-mono px-3 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground outline-none focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                  Webhook URL для уведомлений
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://api.domain.ru/webhook"
                  className="w-full h-9 text-xs font-mono px-3 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                Юридический адрес
              </label>
              <input
                type="text"
                value={legalAddress}
                onChange={e => setLegalAddress(e.target.value)}
                placeholder="119021, г. Москва, ул. Льва Толстого, д. 16"
                className="w-full h-9 text-xs px-3 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground outline-none focus:border-primary transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isPendingB2b}
              className="px-5 h-9 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPendingB2b ? 'Сохранение...' : 'Сохранить B2B-реквизиты'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: NOTES & DISCOUNTS */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl">
          {/* Card: Personal Discount */}
          {canSeeFinances && (
            <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-5 ring-1 ring-border/5 space-y-3.5">
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                <span className="bg-primary/10 text-primary p-1 rounded-md"><Percent className="w-3.5 h-3.5" /></span>
                Управление персональной скидкой
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                    Скидка % (0 = выключена, макс 50%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={1}
                      value={discount}
                      onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-20 h-9 px-2.5 text-xs font-mono rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground outline-none focus:border-primary"
                    />
                    <span className="text-xs font-medium text-muted-foreground">%</span>
                    {discount > 0 && (
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 bg-success/15 text-emerald-700 border border-success/20 rounded-full">
                        Клиент платит {(100 - discount).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                    Действует до (необязательно)
                  </label>
                  <input
                    type="datetime-local"
                    value={discountEndsAt}
                    onChange={e => setDiscountEndsAt(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground outline-none focus:border-primary"
                  />
                </div>

                <button
                  type="button"
                  onClick={saveDiscount}
                  disabled={isPendingDiscount}
                  className="w-full h-9 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPendingDiscount ? 'Применяется...' : 'Сохранить скидку'}
                </button>
              </div>
            </div>
          )}

          {/* Card: Operator Note */}
          <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-5 ring-1 ring-border/5 flex flex-col justify-between space-y-3.5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span className="bg-primary/10 text-primary p-1 rounded-md"><FileText className="w-3.5 h-3.5" /></span>
                  Внутренняя заметка оператора
                </h3>
                {user.adminNoteUpdatedBy && (
                  <span className="text-[9px] uppercase font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/40 truncate">
                    {user.adminNoteUpdatedBy.split('@')[0]} · {user.adminNoteUpdatedAt ? new Date(user.adminNoteUpdatedAt).toLocaleDateString('ru-RU') : ''}
                  </span>
                )}
              </div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Внутренняя заметка (клиент ее не видит)..."
                rows={4}
                className="w-full text-xs px-3 py-2 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary resize-none"
              />
            </div>
            <button
              type="button"
              onClick={saveNote}
              disabled={isPendingNote}
              className="w-full h-9 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPendingNote ? 'Сохранение...' : 'Сохранить заметку'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY CENTER */}
      {activeTab === 'security' && (
        <div className="space-y-5 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1: Quick Access & Identity */}
            <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-5 ring-1 ring-border/5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                    <span className="bg-primary/10 text-primary p-1 rounded-md"><LinkIcon className="w-3.5 h-3.5" /></span>
                    Быстрый доступ и Сессии
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Генерация одноразовой ссылки прямого входа без пароля (действует 15 минут) или принудительный сброс активных сессий при подозрении на взлом.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleGenerateMagicLink}
                  disabled={isPendingMagicLink}
                  className="w-full h-9 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {copiedMagicLink ? <Check className="w-3.5 h-3.5 text-success" /> : <LinkIcon className="w-3.5 h-3.5" />}
                  {isPendingMagicLink ? 'Генерация...' : copiedMagicLink ? 'Ссылка скопирована!' : 'Скопировать Magic Link (15 мин)'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditEmail(user.email);
                    setShowEmailModal(true);
                  }}
                  className="w-full h-9 rounded-xl text-xs font-bold bg-muted text-foreground border border-border/60 hover:bg-muted/80 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  Исправить Email клиента
                </button>

                <button
                  type="button"
                  onClick={handleRevokeSessions}
                  disabled={isPendingRevoke}
                  className="w-full h-9 rounded-xl text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {isPendingRevoke ? 'Сброс...' : 'Завершить все сессии (Force Logout)'}
                </button>
              </div>
            </div>

            {/* Card 2: Password Management */}
            <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-5 ring-1 ring-border/5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                    <span className="bg-amber-500/10 text-amber-600 p-1 rounded-md"><KeyRound className="w-3.5 h-3.5" /></span>
                    Смена пароля клиента
                  </h3>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Сгенерировать
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                      Новый пароль (минимум 8 символов)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={newPass}
                        onChange={e => setNewPass(e.target.value)}
                        placeholder="Введите или сгенерируйте..."
                        className="w-full h-9 text-xs pl-3 pr-9 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground font-mono outline-none focus:border-primary"
                      />
                      {newPass && (
                        <button
                          type="button"
                          onClick={copyNewPassword}
                          className="absolute right-2 p-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                          title="Скопировать"
                        >
                          {copiedPass ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!newPass || newPass.length < 8) {
                    toast.error('Пароль должен содержать не менее 8 символов');
                    return;
                  }
                  savePassword();
                }}
                disabled={isPendingPass}
                className="w-full h-9 rounded-xl text-xs font-bold bg-warning text-warning-foreground shadow-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isPendingPass ? 'Сохранение...' : 'Установить новый пароль'}
              </button>
            </div>

            {/* Card 3: Security Log */}
            <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-5 ring-1 ring-border/5 space-y-3.5 md:col-span-2 lg:col-span-1">
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                <span className="bg-primary/10 text-primary p-1 rounded-md"><Shield className="w-3.5 h-3.5" /></span>
                Журнал авторизаций (Logs)
              </h3>
              {loginLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 italic py-3">Логи авторизации отсутствуют</p>
              ) : (
                <div className="overflow-x-auto scrollbar-hide max-h-[160px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 text-[9px] uppercase font-bold tracking-wider text-muted-foreground">
                        <th className="pb-2 pr-2">Дата</th>
                        <th className="pb-2 px-1">IP</th>
                        <th className="pb-2 pl-1 text-right">Статус</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-xs">
                      {loginLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                          <td className="py-1.5 pr-2 font-mono tabular-nums text-muted-foreground text-[10px]">
                            {new Date(log.createdAt).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-1.5 px-1 font-mono text-foreground text-[10px]">
                            {log.ipAddress}
                          </td>
                          <td className="py-1.5 pl-1 text-right">
                            {log.success ? (
                              <span className="inline-flex items-center text-[8px] font-bold uppercase text-emerald-700 bg-success/15 px-1.5 py-0.2 rounded-full">
                                OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[8px] font-bold uppercase text-rose-700 bg-destructive/15 px-1.5 py-0.2 rounded-full">
                                Сбой
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Change Client Email */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-md p-6 space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowEmailModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <Edit3 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">Замена Email клиента</h3>
                <p className="text-xs text-muted-foreground">Текущий адрес: <span className="font-mono text-foreground font-semibold">{user.email}</span></p>
              </div>
            </div>

            <form onSubmit={handleSaveEmail} className="space-y-3.5 pt-2">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                  Новый адрес Email
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="ivan@gmail.com"
                  className="w-full h-9 text-xs font-mono px-3 rounded-xl border border-border/60 bg-background/50 text-foreground outline-none focus:border-primary shadow-sm"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                  Обоснование смены (для аудита 152-ФЗ)
                </label>
                <input
                  type="text"
                  required
                  value={emailReason}
                  onChange={e => setEmailReason(e.target.value)}
                  placeholder="Опечатка при регистрации / Сверен чек ЮKassa"
                  className="w-full h-9 text-xs px-3 rounded-xl border border-border/60 bg-background/50 text-foreground outline-none focus:border-primary shadow-sm"
                />
              </div>

              <div className="p-3 bg-muted/40 border border-border/40 rounded-xl text-[11px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-primary" /> Протокол безопасности:
                </p>
                <p>• Все активные сессии со старого адреса будут сброшены.</p>
                <p>• Баланс ({((user.balance || 0) / 100).toFixed(2)} ₽) и история заказов полностью сохранятся.</p>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 h-9 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isPendingEmailChange}
                  className="px-4 h-9 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPendingEmailChange ? 'Сохранение...' : 'Перенести аккаунт'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
