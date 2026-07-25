'use client';

/**
 * ClientDetailClient — Single-Tab Operator Dashboard
 *
 * - No tabs! Single consolidated view optimized for quick customer support actions.
 * - Balance adjustment form (Ruble to Cents auto-converter + mandatory reason min 5).
 * - Password management form (Random password generator + clipboard copy).
 * - Personal discount control (0-50% & datetime picker).
 * - Operator Note editor (internal notes with author tracking).
 * - Security Center (last 5 login attempts with User-Agent parsing).
 */

import { useState, useTransition, useRef } from 'react';
import { toast } from 'sonner';
import { updateClientDiscountAction, updateClientNoteAction } from '@/actions/admin/clients';
import { updateBalanceAction, adminChangeUserPasswordAction } from '@/actions/admin/users';
import { ActionForm } from '@/components/admin/action-form';
import { SubmitButton } from '@/components/admin/submit-button';
import {
  Shield,
  Wallet,
  FileText,
  Check,
  Copy,
  Percent,
  KeyRound,
  Sparkles
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

export function ClientDetailClient({ user, loginLogs, canSeeFinances }: Props) {
  const [note, setNote] = useState(user.adminNote);
  const [discount, setDiscount] = useState(user.personalDiscount);
  const [discountEndsAt, setDiscountEndsAt] = useState(
    user.discountEndsAt ? new Date(user.discountEndsAt).toISOString().slice(0, 16) : ''
  );
  
  // Balance adjustment fields
  const [amountRub, setAmountRub] = useState('');
  const amountCents = amountRub ? Math.round(parseFloat(amountRub) * 100) : '';

  // Password change fields
  const [newPass, setNewPass] = useState('');
  const [copiedPass, setCopiedPass] = useState(false);

  const [isPendingNote, startNoteTransition] = useTransition();
  const [isPendingDiscount, startDiscountTransition] = useTransition();
  const [isPendingPass, startPassTransition] = useTransition();

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
      {/* LEFT COLUMN: Frequent Operations (Balance, Password, Discount) */}
      <div className="space-y-6">
        {/* Card: Balance Adjustment */}
        {canSeeFinances && (
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
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 flex items-center justify-between">
                  <span>Причина / Обоснование <span className="text-destructive font-black">*</span></span>
                  <span className="text-[9px] text-destructive/80 font-normal">min 5 символов</span>
                </label>
                <input
                  name="reason"
                  minLength={5}
                  placeholder="Например: Компенсация за задержку заказа"
                  required
                  className="w-full h-10 text-sm px-3 py-2 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
              </div>

              <SubmitButton className="w-full h-10 text-sm gap-1.5 shadow-sm active:scale-95 transition-all" confirmMessage="Вы уверены, что хотите изменить баланс клиента?">
                Применить изменение баланса
              </SubmitButton>
            </ActionForm>
          </div>
        )}

        {/* Card: Password Management */}
        <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-6 ring-1 ring-border/5 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="bg-amber-500/10 text-amber-600 p-1.5 rounded-md"><KeyRound className="w-4 h-4" /></span>
              Смена пароля клиента
            </h3>
            <button
              type="button"
              onClick={generateRandomPassword}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Сгенерировать
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                Новый пароль (минимум 8 символов)
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Введите или сгенерируйте пароль..."
                  className="w-full h-10 text-sm pl-3 pr-10 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground font-mono tracking-tight outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                />
                {newPass && (
                  <button
                    type="button"
                    onClick={copyNewPassword}
                    className="absolute right-2 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                    title="Скопировать"
                  >
                    {copiedPass ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
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
              className="w-full h-10 rounded-xl text-sm font-medium bg-warning text-warning-foreground shadow-sm hover:opacity-90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:active:scale-100"
            >
              {isPendingPass ? 'Сохранение...' : 'Установить новый пароль'}
            </button>
          </div>
        </div>

        {/* Card: Personal Discount */}
        {canSeeFinances && (
          <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-6 ring-1 ring-border/5 space-y-4">
            <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="bg-primary/10 text-primary p-1.5 rounded-md"><Percent className="w-4 h-4" /></span>
              Управление персональной скидкой
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
                {isPendingDiscount ? 'Применяется...' : 'Сохранить скидку'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Context & Security Log */}
      <div className="space-y-6">
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
              rows={6}
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

        {/* Card: Security Log */}
        <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-6 ring-1 ring-border/5 space-y-4">
          <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="bg-primary/10 text-primary p-1.5 rounded-md"><Shield className="w-4 h-4" /></span>
            Журнал авторизаций (Security Center)
          </h3>
          {loginLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground/60 italic py-4">Логи авторизации отсутствуют</p>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left border-collapse min-w-[450px]">
                <thead>
                  <tr className="border-b border-border/60 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-4">Дата и время</th>
                    <th className="pb-3 px-3">IP-адрес</th>
                    <th className="pb-3 px-3">Устройство</th>
                    <th className="pb-3 pl-3 text-right">Статус</th>
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
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-xs tabular-nums text-foreground font-medium">
                          {log.ipAddress}
                        </td>
                        <td className="py-3.5 px-3 text-xs text-muted-foreground truncate max-w-[140px]" title={log.userAgent}>
                          {displayUA}
                        </td>
                        <td className="py-3.5 pl-3 text-right">
                          {log.success ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-success/15 px-2 py-0.5 rounded-full border border-success/20">
                              Успех
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-destructive/15 px-2 py-0.5 rounded-full border border-destructive/20" title={log.failReason || 'Неизвестная ошибка'}>
                              Сбой
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
      </div>
    </div>
  );
}
