'use client';

/**
 * ClientDetailClient — interactive panel for client detail page
 *
 * - Tabs navigation (General, Finance & Discounts, Security Logs)
 * - Operator Note editor (auto-save on blur / save button)
 * - Balance adjustment form (Ruble to Cents auto-converter)
 * - Personal discount control (0-50% & date-picker)
 * - Security Center (last 5 login attempts, User-Agent parser)
 */

import { useState, useTransition, useRef } from 'react';
import { toast } from 'sonner';
import { updateClientDiscountAction, updateClientNoteAction } from '@/actions/admin/clients';
import { updateBalanceAction } from '@/actions/admin/users';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui/tabs';
import { ActionForm } from '@/components/admin/action-form';
import { SubmitButton } from '@/components/admin/submit-button';
import {
  User as UserIcon,
  Shield,
  Wallet,
  FileText,
  Check,
  Copy,
  Percent
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
  createdAt: string;
  ordersCount: number;
  ticketsCount: number;
  balance?: number;
  quarantineBalance?: number;
  totalSpent?: number;
  referralBalance?: number;
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

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Скопировано в буфер обмена');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Не удалось скопировать');
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors duration-150 active:scale-95"
      title="Копировать"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function ClientDetailClient({ user, loginLogs, canSeeFinances }: Props) {
  const [note, setNote] = useState(user.adminNote);
  const [discount, setDiscount] = useState(user.personalDiscount);
  const [discountEndsAt, setDiscountEndsAt] = useState(
    user.discountEndsAt ? new Date(user.discountEndsAt).toISOString().slice(0, 16) : ''
  );
  
  // Balance adjustment fields
  const [amountRub, setAmountRub] = useState('');
  const amountCents = amountRub ? Math.round(parseFloat(amountRub) * 100) : '';

  const [isPendingNote, startNoteTransition] = useTransition();
  const [isPendingDiscount, startDiscountTransition] = useTransition();

  const balanceFormRef = useRef<HTMLFormElement | null>(null);

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

  return (
    <Tabs defaultValue="general" className="w-full space-y-6">
      <TabsList className="flex border-b border-border bg-transparent p-0 rounded-none w-full justify-start gap-4 sm:gap-6 h-12" variant="line">
        <TabsTrigger
          value="general"
          className="px-1 py-3 text-sm font-semibold border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none bg-transparent"
        >
          <UserIcon className="w-4 h-4 mr-1.5 shrink-0" />
          Общие сведения
        </TabsTrigger>
        {canSeeFinances && (
          <TabsTrigger
            value="finance"
            className="px-1 py-3 text-sm font-semibold border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none bg-transparent"
          >
            <Wallet className="w-4 h-4 mr-1.5 shrink-0" />
            Финансы и Скидки
          </TabsTrigger>
        )}
        <TabsTrigger
          value="security"
          className="px-1 py-3 text-sm font-semibold border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none bg-transparent"
        >
          <Shield className="w-4 h-4 mr-1.5 shrink-0" />
          Безопасность
        </TabsTrigger>
      </TabsList>

      {/* General Tab */}
      <TabsContent value="general" className="space-y-6 outline-none">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Client Profile */}
          <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-6 ring-1 ring-border/5 space-y-4">
            <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="bg-primary/10 text-primary p-1.5 rounded-md"><UserIcon className="w-4 h-4" /></span>
              Профиль клиента
            </h3>
            <div className="divide-y divide-border/40 text-sm">
              <div className="py-3 flex justify-between items-center gap-4">
                <span className="text-muted-foreground">Email</span>
                <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs" title={user.email}>{user.email}</span>
              </div>
              <div className="py-3 flex justify-between items-center gap-4">
                <span className="text-muted-foreground">ID клиента</span>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="bg-muted px-2 py-0.5 rounded border border-border/40 text-foreground truncate max-w-[120px] sm:max-w-none">{user.id}</span>
                  <CopyButton value={user.id} />
                </div>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="text-muted-foreground">Роль</span>
                <span className="font-semibold px-2.5 py-0.5 rounded-full text-xs bg-muted text-foreground border border-border/40">{user.role}</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="text-muted-foreground">Регистрация</span>
                <span className="font-medium text-foreground tabular-nums tracking-tight">
                  {new Date(user.createdAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="py-3 flex justify-between items-center gap-4">
                <span className="text-muted-foreground">Telegram ID</span>
                {user.telegramId ? (
                  <div className="flex items-center gap-1.5">
                    <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded border border-border/40 text-foreground">{user.telegramId}</code>
                    <CopyButton value={user.telegramId} />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/60 italic">Не привязан</span>
                )}
              </div>
              <div className="py-3 flex justify-between items-center gap-4">
                <span className="text-muted-foreground">Реф. код</span>
                {user.referralCode ? (
                  <div className="flex items-center gap-1.5">
                    <code className="font-mono text-xs bg-primary/5 text-primary border border-primary/20 px-2 py-0.5 rounded font-semibold">{user.referralCode}</code>
                    <CopyButton value={user.referralCode} />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/60 italic">Нет кода</span>
                )}
              </div>
            </div>
          </div>

          {/* Card: Operator Note */}
          <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-6 ring-1 ring-border/5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span className="bg-primary/10 text-primary p-1.5 rounded-md"><FileText className="w-4 h-4" /></span>
                  Заметка оператора
                </h3>
                {user.adminNoteUpdatedBy && (
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-full border border-border/40 truncate max-w-[150px] sm:max-w-none" title={user.adminNoteUpdatedBy}>
                    {user.adminNoteUpdatedBy.split('@')[0]} · {user.adminNoteUpdatedAt ? new Date(user.adminNoteUpdatedAt).toLocaleDateString('ru-RU') : ''}
                  </span>
                )}
              </div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Внутренняя заметка (клиент ее не видит)..."
                rows={5}
                className="w-full text-sm px-4 py-3 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all duration-200 hover:border-border"
                aria-label="Заметка оператора для клиента"
              />
            </div>
            <button
              onClick={saveNote}
              disabled={isPendingNote}
              aria-label="Сохранить заметку"
              className="w-full h-10 rounded-xl text-sm font-medium bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:active:scale-100"
            >
              {isPendingNote ? 'Сохранение...' : 'Сохранить заметку'}
            </button>
          </div>
        </div>
      </TabsContent>

      {/* Finance Tab */}
      {canSeeFinances && (
        <TabsContent value="finance" className="space-y-6 outline-none">
          {/* Finance Overview Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Баланс', value: `${((user.balance ?? 0) / 100).toFixed(2)} ₽`, sub: user.quarantineBalance && user.quarantineBalance > 0 ? `${(user.quarantineBalance / 100).toFixed(2)} ₽ эскроу` : null },
              { label: 'Всего потрачено', value: `${((user.totalSpent ?? 0) / 100).toFixed(2)} ₽`, sub: 'LTV клиента' },
              { label: 'Скидка', value: `${user.personalDiscount}%`, sub: user.discountEndsAt ? `До ${new Date(user.discountEndsAt).toLocaleDateString('ru-RU')}` : 'Бессрочно' },
              { label: 'Реф. баланс', value: `${((user.referralBalance ?? 0) / 100).toFixed(2)} ₽`, sub: 'За привлечение рефералов' },
            ].map(card => (
              <div key={card.label} className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-4 transition-all">
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">{card.label}</div>
                <div className="text-base sm:text-lg font-bold tabular-nums tracking-tight font-mono text-foreground">{card.value}</div>
                {card.sub && <div className="text-[10px] text-muted-foreground mt-1 truncate">{card.sub}</div>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card: Balance Adjustment */}
            <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-6 ring-1 ring-border/5 space-y-4">
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                <span className="bg-primary/10 text-primary p-1.5 rounded-md"><Wallet className="w-4 h-4" /></span>
                Корректировка баланса
              </h3>
              <ActionForm
                action={async (formData) => {
                  const res = await updateBalanceAction(formData);
                  if (res.success) {
                    setAmountRub('');
                    toast.success('Баланс успешно обновлен');
                  }
                  return res;
                }}
                className="space-y-4"
                formRef={balanceFormRef}
              >
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="amount" value={amountCents} />
                
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                    Сумма в рублях (например: 150.50, минус для списания)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountRub}
                    onChange={e => setAmountRub(e.target.value)}
                    placeholder="Пример: 500 или -250.50"
                    required
                    className="w-full h-10 text-sm px-3 py-2 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground font-mono tracking-tight outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  />
                  {amountRub && (
                    <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
                      Будет начислено/списано: <span className="font-semibold text-foreground">{amountCents}</span> копеек
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                    Причина / Обоснование
                  </label>
                  <input
                    name="reason"
                    placeholder="Например: Компенсация за задержку заказа"
                    required
                    className="w-full h-10 text-sm px-3 py-2 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  />
                </div>

                <SubmitButton className="w-full h-10 text-sm gap-1.5 shadow-sm active:scale-95 transition-all" confirmMessage="Вы уверены, что хотите изменить баланс клиента?">
                  Применить изменение
                </SubmitButton>
              </ActionForm>
            </div>

            {/* Card: Personal Discount settings */}
            <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-6 ring-1 ring-border/5 space-y-4">
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                <span className="bg-primary/10 text-primary p-1.5 rounded-md"><Percent className="w-4 h-4" /></span>
                Управление скидкой
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5 block">
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
                      aria-label="Размер персональной скидки"
                      className="w-24 h-10 px-3 py-2 text-sm font-mono tracking-tight tabular-nums rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground outline-none focus:border-primary transition-all duration-200 hover:border-border"
                    />
                    <span className="text-sm font-medium text-muted-foreground">%</span>
                    {discount > 0 && (
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm rounded-full">
                        Клиент платит {(100 - discount).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5 block">
                    Действует до (необязательно)
                  </label>
                  <input
                    type="datetime-local"
                    value={discountEndsAt}
                    onChange={e => setDiscountEndsAt(e.target.value)}
                    aria-label="Дата окончания скидки"
                    className="w-full h-10 px-3 py-2 text-sm tabular-nums tracking-tight rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground outline-none focus:border-primary transition-all duration-200 hover:border-border"
                  />
                </div>

                <button
                  onClick={saveDiscount}
                  disabled={isPendingDiscount}
                  aria-label="Применить скидку"
                  className="w-full h-10 rounded-xl text-sm font-medium bg-muted/50 border border-border/60 shadow-sm text-foreground hover:bg-muted hover:border-border active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:active:scale-100"
                >
                  {isPendingDiscount ? 'Применяется...' : 'Применить скидку'}
                </button>
              </div>
            </div>
          </div>
        </TabsContent>
      )}

      {/* Security Tab */}
      <TabsContent value="security" className="space-y-6 outline-none">
        <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-6 ring-1 ring-border/5 space-y-4">
          <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="bg-primary/10 text-primary p-1.5 rounded-md"><Shield className="w-4 h-4" /></span>
            Последние попытки входа (Security Center)
          </h3>
          {loginLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground/60 italic py-4">Логи авторизации отсутствуют</p>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-border/60 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-4">Дата и время</th>
                    <th className="pb-3 px-4">IP-адрес</th>
                    <th className="pb-3 px-4">Браузер / ОС</th>
                    <th className="pb-3 pl-4 text-right">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {loginLogs.map((log) => {
                    const displayUA = parseUserAgent(log.userAgent);
                    return (
                      <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3.5 pr-4 font-mono text-xs tabular-nums text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-foreground font-medium">
                          {log.ipAddress}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground truncate max-w-xs" title={log.userAgent}>
                          {displayUA}
                        </td>
                        <td className="py-3.5 pl-4 text-right">
                          {log.success ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-success-text bg-success/15 px-2.5 py-0.5 rounded-full border border-success/20">
                              Успех
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-destructive-text bg-destructive/15 px-2.5 py-0.5 rounded-full border border-destructive/20" title={log.failReason || 'Неизвестная ошибка'}>
                              Сбой ({log.failReason || 'Ошибка'})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
