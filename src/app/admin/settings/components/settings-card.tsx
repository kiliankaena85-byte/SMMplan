'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';

interface SettingsCardProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  statusBadge?: React.ReactNode;
  children: React.ReactNode;
  action: (prevState: any, formData: FormData) => Promise<any>;
  testButton?: React.ReactNode;
}

export function SettingsCard({
  id,
  title,
  icon,
  statusBadge,
  children,
  action,
  testButton,
}: SettingsCardProps) {
  const [state, formAction, isPending] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      try {
        const res = await action(prevState, formData);
        if (res && typeof res === 'object' && 'success' in res && !res.success) {
          return res;
        }
        return { success: true };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return { success: false, error: errorMsg || 'Ошибка при сохранении' };
      }
    },
    null
  );

  const formState = state as { success?: boolean; error?: string; errors?: Record<string, string[]> } | null;

  useEffect(() => {
    if (formState?.success) {
      toast.success(`${title} успешно сохранены`);
    } else if (formState?.error) {
      toast.error(formState.error);
    } else if (formState?.errors) {
      const messages = Object.entries(formState.errors)
        .flatMap(([field, errs]) =>
          (errs || []).map((e) => (field === '_form' ? e : `${field}: ${e}`))
        )
        .filter(Boolean);
      toast.error(messages.length > 0 ? messages.join('; ') : 'Ошибка валидации формы');
    }
  }, [formState, title]);

  return (
    <Card id={id} className="scroll-mt-24 border border-border/50 rounded-2xl overflow-hidden shadow-sm flex flex-col transition-colors focus-within:border-primary/50">
      <form action={formAction} className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 bg-muted/10 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              {icon}
            </div>
            <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
          </div>
          <div className="flex items-center gap-3">
            {statusBadge}
          </div>
        </div>

        <div className="p-6 flex-1 flex flex-col gap-5">
          {children}
        </div>

        <div className="px-6 py-4 bg-muted/20 border-t border-border/50 flex items-center justify-between mt-auto">
          <div>{testButton}</div>
          <Button type="submit" disabled={isPending} size="sm">
            {isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
            Сохранить настройки
          </Button>
        </div>
      </form>
    </Card>
  );
}
