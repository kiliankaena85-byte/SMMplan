'use client';

/**
 * ClientDetailClient — interactive panel for client detail page
 *
 * - Admin Note editor (auto-save on blur)
 * - Personal discount control (0-50%)
 * - Discount expiry date picker
 */

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateClientDiscountAction, updateClientNoteAction } from '@/actions/admin/clients';

interface UserDTO {
  id: string;
  email: string;
  personalDiscount: number;
  discountEndsAt: string | null;
  adminNote: string;
  adminNoteUpdatedAt: string | null;
  adminNoteUpdatedBy: string | null;
  telegramId: string | null;
  referralCode: string | null;
}

interface Props {
  user: UserDTO;
}

export function ClientDetailClient({ user }: Props) {
  const [note, setNote] = useState(user.adminNote);
  const [discount, setDiscount] = useState(user.personalDiscount);
  const [discountEndsAt, setDiscountEndsAt] = useState(
    user.discountEndsAt ? new Date(user.discountEndsAt).toISOString().slice(0, 16) : ''
  );
  const [isPendingNote, startNoteTransition] = useTransition();
  const [isPendingDiscount, startDiscountTransition] = useTransition();

  function saveNote() {
    startNoteTransition(async () => {
      const r = await updateClientNoteAction(user.id, note);
      if (r.success) toast.success('📝 Заметка сохранена');
      else toast.error(r.error ?? 'Ошибка');
    });
  }

  function saveDiscount() {
    if (discount < 0 || discount > 50) {
      toast.error('Скидка 0-50%');
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Admin note */}
      <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-6 ring-1 ring-border/5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="bg-primary/10 text-primary p-1 rounded-md">📝</span>
            Заметка оператора
          </h3>
          {user.adminNoteUpdatedBy && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/40">
              {user.adminNoteUpdatedBy} · {user.adminNoteUpdatedAt ? new Date(user.adminNoteUpdatedAt).toLocaleDateString('ru-RU') : ''}
            </span>
          )}
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Внутренняя заметка (клиент не видит)..."
          rows={4}
          className="w-full text-sm px-3 py-2 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all duration-200 hover:border-border"
          aria-label="Заметка оператора для клиента"
        />
        <button
          onClick={saveNote}
          disabled={isPendingNote}
          aria-label="Сохранить заметку"
          className="w-full h-10 rounded-xl text-sm font-medium bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:active:scale-100"
        >
          {isPendingNote ? 'Сохранение...' : 'Сохранить заметку'}
        </button>
      </div>

      {/* Personal discount */}
      <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-6 ring-1 ring-border/5 space-y-4">
        <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
          <span className="bg-primary/10 text-primary p-1 rounded-md">🎯</span>
          Персональная скидка
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
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm rounded-full">
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

        {/* Contacts */}
        <div className="border-t border-border/60 pt-4 space-y-2 mt-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Telegram ID</span>
            {user.telegramId ? (
              <code className="font-mono tracking-tight text-xs bg-muted/50 border border-border/40 shadow-sm px-1.5 py-0.5 rounded text-foreground">{user.telegramId}</code>
            ) : (
              <span className="text-[10px] font-medium text-muted-foreground/60 italic">Не привязан</span>
            )}
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Реф. код</span>
            {user.referralCode ? (
              <code className="font-mono tracking-tight text-xs bg-primary/5 text-primary border border-primary/20 shadow-sm px-1.5 py-0.5 rounded">{user.referralCode}</code>
            ) : (
              <span className="text-[10px] font-medium text-muted-foreground/60 italic">Нет</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
