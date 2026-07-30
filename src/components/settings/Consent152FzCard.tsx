'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { confirm152FzConsentAction } from '@/actions/user/settings-extra';
import { ShieldCheck, CheckCircle2, AlertCircle, Calendar, Globe } from 'lucide-react';
import { toast } from 'sonner';

export interface Consent152FzCardProps {
  tosAcceptedAt?: Date | string | null;
  tosAcceptedIp?: string | null;
}

export default function Consent152FzCard({
  tosAcceptedAt: initialAcceptedAt,
  tosAcceptedIp: initialAcceptedIp,
}: Consent152FzCardProps) {
  const [isPending, startTransition] = useTransition();
  const [acceptedAt, setAcceptedAt] = useState<Date | string | null>(initialAcceptedAt || null);
  const [acceptedIp, setAcceptedIp] = useState<string | null>(initialAcceptedIp || null);

  const formatDate = (dateVal: Date | string | null) => {
    if (!dateVal) return null;
    try {
      const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
      return d.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateVal);
    }
  };

  const formattedDate = formatDate(acceptedAt);

  const handleConfirmConsent = () => {
    startTransition(async () => {
      try {
        const res = await confirm152FzConsentAction();
        if (!res.success) {
          toast.error(res.error || 'Ошибка при фиксации согласия 152-ФЗ');
          return;
        }
        setAcceptedAt(res.tosAcceptedAt || new Date());
        setAcceptedIp(res.tosAcceptedIp || null);
        toast.success('Согласие по 152-ФЗ успешно зафиксировано!');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
        toast.error(`Не удалось сохранить согласие: ${msg}`);
      }
    });
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-sm">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm">
              Согласие по 152-ФЗ (Персональные данные)
            </h2>
            <p className="text-[10px] text-muted-foreground">
              Фиксация юридического согласия с политикой обработки данных
            </p>
          </div>
        </div>

        {acceptedAt ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Подтверждено
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 shrink-0">
            <AlertCircle className="w-3.5 h-3.5" />
            Требуется подпись
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Согласие с Условиями использования и Политикой конфиденциальности по 152-ФЗ зафиксировано в соответствии с законодательством РФ.
        </p>

        {acceptedAt ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/40 border border-border/80 rounded-xl p-3.5">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Дата и время акцепта</div>
                <div className="text-xs font-semibold text-foreground">{formattedDate}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-primary shrink-0" />
              <div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">IP-адрес акцепта (tosAcceptedIp)</div>
                <div className="text-xs font-mono font-semibold text-foreground">{acceptedIp || 'Не зафиксирован'}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Подтвердите согласие с правилами сервиса для соответствия требованиям ФЗ № 152-ФЗ.
            </p>
            <Button
              type="button"
              onClick={handleConfirmConsent}
              disabled={isPending}
              intent="primary"
              size="sm"
              isAnimated={true}
              className="rounded-xl shrink-0 font-semibold px-5"
            >
              {isPending ? 'Запись...' : 'Подтвердить согласие 152-ФЗ'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
