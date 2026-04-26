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
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">📝 Заметка оператора</h3>
          {user.adminNoteUpdatedBy && (
            <span className="text-[10px] text-muted-foreground">
              {user.adminNoteUpdatedBy} · {user.adminNoteUpdatedAt ? new Date(user.adminNoteUpdatedAt).toLocaleDateString('ru-RU') : ''}
            </span>
          )}
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Внутренняя заметка (клиент не видит)..."
          rows={4}
          className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all duration-200"
          aria-label="Заметка оператора для клиента"
        />
        <button
          onClick={saveNote}
          disabled={isPendingNote}
          aria-label="Сохранить заметку"
          className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200 disabled:opacity-50"
        >
          {isPendingNote ? 'Сохранение...' : 'Сохранить заметку'}
        </button>
      </div>

      {/* Personal discount */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">🎯 Персональная скидка</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
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
                className="w-24 px-3 py-2 text-sm font-mono rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary transition-all duration-200"
              />
              <span className="text-sm text-muted-foreground">%</span>
              {discount > 0 && (
                <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-medium">
                  Клиент платит {(100 - discount).toFixed(0)}%
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Действует до (необязательно)
            </label>
            <input
              type="datetime-local"
              value={discountEndsAt}
              onChange={e => setDiscountEndsAt(e.target.value)}
              aria-label="Дата окончания скидки"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary transition-all duration-200"
            />
          </div>

          <button
            onClick={saveDiscount}
            disabled={isPendingDiscount}
            aria-label="Применить скидку"
            className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-card border border-border text-foreground hover:bg-muted transition-all duration-200 disabled:opacity-50"
          >
            {isPendingDiscount ? 'Применяется...' : 'Применить скидку'}
          </button>
        </div>

        {/* Contacts */}
        <div className="border-t border-border pt-3 space-y-1">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Telegram ID:</span>{' '}
            {user.telegramId ? (
              <code className="font-mono bg-muted px-1 rounded">{user.telegramId}</code>
            ) : (
              <span className="text-muted-foreground/60">не привязан</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Реф. код:</span>{' '}
            {user.referralCode ? (
              <code className="font-mono bg-muted px-1 rounded">{user.referralCode}</code>
            ) : (
              <span className="text-muted-foreground/60">нет</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
