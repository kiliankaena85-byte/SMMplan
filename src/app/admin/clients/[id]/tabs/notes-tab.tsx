'use client';

import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateClientDiscountAction, updateClientNoteAction, clearClientNoteAction } from '@/actions/admin/clients';
import { Percent, FileText } from 'lucide-react';
import { UserDTO } from './types';

interface NotesTabProps {
  user: UserDTO;
  canSeeFinances: boolean;
}

export function NotesTab({ user, canSeeFinances }: NotesTabProps) {
  const [note, setNote] = useState(user.adminNote || '');
  const [noteAuthor, setNoteAuthor] = useState(user.adminNoteUpdatedBy || null);
  const [noteDate, setNoteDate] = useState(user.adminNoteUpdatedAt || null);
  const [discount, setDiscount] = useState(user.personalDiscount);
  const [discountEndsAt, setDiscountEndsAt] = useState(
    user.discountEndsAt ? new Date(user.discountEndsAt).toISOString().slice(0, 16) : ''
  );

  const [isPendingNote, startNoteTransition] = useTransition();
  const [isPendingDiscount, startDiscountTransition] = useTransition();

  function saveNote() {
    if (!note.trim()) {
      handleClearNote();
      return;
    }
    startNoteTransition(async () => {
      const r = await updateClientNoteAction(user.id, note);
      if (r.success) {
        toast.success('📝 Заметка сохранена');
        setNoteAuthor(r.updatedBy);
        setNoteDate(r.updatedAt);
      } else {
        toast.error(r.error ?? 'Ошибка сохранения');
      }
    });
  }

  function handleClearNote() {
    if (!confirm('Удалить заметку оператора по этому клиенту?')) return;
    startNoteTransition(async () => {
      const r = await clearClientNoteAction(user.id);
      if (r.success) {
        toast.success('Заметка удалена');
        setNote('');
        setNoteAuthor(null);
        setNoteDate(null);
      } else {
        toast.error(r.error ?? 'Ошибка удаления заметки');
      }
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl">
      {/* Card: Personal Discount */}
      {canSeeFinances && (
        <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-5 ring-1 ring-border/5 space-y-3.5">
          <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="bg-primary/10 text-primary p-1 rounded-md">
              <Percent className="w-3.5 h-3.5" />
            </span>
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
              <span className="bg-primary/10 text-primary p-1 rounded-md">
                <FileText className="w-3.5 h-3.5" />
              </span>
              Внутренняя заметка оператора
            </h3>
            {noteAuthor && (
              <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/40 truncate font-mono">
                {noteAuthor.split('@')[0]} ·{' '}
                {noteDate
                  ? new Date(noteDate).toLocaleDateString('ru-RU')
                  : ''}
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={saveNote}
            disabled={isPendingNote}
            className="flex-1 h-9 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isPendingNote ? 'Сохранение...' : 'Сохранить заметку'}
          </button>
          {note && (
            <button
              type="button"
              onClick={handleClearNote}
              disabled={isPendingNote}
              className="h-9 px-3 rounded-xl text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              title="Очистить и удалить заметку"
            >
              Очистить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
