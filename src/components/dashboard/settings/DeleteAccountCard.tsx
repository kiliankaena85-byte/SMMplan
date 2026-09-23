'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { deleteAccountAction } from '@/actions/auth/delete-account';
import { ShieldAlert, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DeleteAccountModal } from './delete-account/DeleteAccountModal';

export interface DeleteAccountCardProps {
  hasPassword: boolean;
}

export default function DeleteAccountCard({ hasPassword }: DeleteAccountCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(hasPassword);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setRequiresPassword(hasPassword);
  }, [hasPassword]);

  const openModal = () => {
    setConfirmText('');
    setPassword('');
    setIsOpen(true);
  };

  const closeModal = () => {
    if (!isPending) setIsOpen(false);
  };

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== 'УДАЛИТЬ') return toast.error('Необходимо ввести слово "УДАЛИТЬ"');
    if (requiresPassword && !password) return toast.error('Пожалуйста, введите ваш пароль');

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('confirmText', confirmText);
        if (password) formData.append('password', password);

        const res = await deleteAccountAction(null, formData);
        if (!res.success) {
          if (res.error?.toLowerCase().includes('парол')) setRequiresPassword(true);
          toast.error(res.error || 'Ошибка при удалении аккаунта');
          return;
        }

        toast.success('Аккаунт успешно удален. Прощайте!');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } catch {
        toast.error('Произошла ошибка при отправке запроса');
      }
    });
  };

  return (
    <div className="bg-card border border-destructive/20 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md hover:border-destructive/40">
      <div className="px-5 py-4 border-b border-destructive/10 flex items-center gap-2.5 bg-destructive/5">
        <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
          <Trash2 className="w-4 h-4" />
        </div>
        <div>
          <h2 className="font-semibold text-destructive text-sm">Опасная зона</h2>
          <p className="text-[10px] text-muted-foreground font-semibold">
            Действия по безвозвратному удалению вашего личного кабинета
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="bg-destructive/5 border border-destructive/10 rounded-xl p-4 flex gap-3 text-xs text-destructive/85">
          <ShieldAlert className="w-5 h-5 shrink-0 text-destructive/90" />
          <div className="space-y-1.5">
            <p className="font-bold text-foreground">Внимание при удалении:</p>
            <p className="leading-relaxed">
              Удаление аккаунта приведет к мгновенному выходу со всех устройств. 
              Вы больше не сможете войти, пополнить баланс или создавать заказы.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div className="text-xs text-muted-foreground font-semibold max-w-[70%] leading-relaxed">
            Подтвердите удаление вашего аккаунта.
          </div>
          <Button
            type="button"
            intent="destructive"
            size="sm"
            onClick={openModal}
            className="rounded-xl shrink-0 w-full sm:w-auto font-black px-6 shadow-sm min-h-[44px]"
          >
            Удалить аккаунт
          </Button>
        </div>
      </div>

      <DeleteAccountModal
        isOpen={isOpen}
        onClose={closeModal}
        isPending={isPending}
        confirmText={confirmText}
        setConfirmText={setConfirmText}
        requiresPassword={requiresPassword}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        onDelete={handleDelete}
      />
    </div>
  );
}
