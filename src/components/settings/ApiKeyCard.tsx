'use client';

import { useState, useTransition } from 'react';
import { generateApiKeyAction, resetApiKeyAction, revokeApiKeyAction } from '@/actions/settings';
import { Key, Copy, RefreshCw, Trash2, CheckCheck, ShieldAlert, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';

export interface ApiKeyCardProps {
  hasKey: boolean;
  onKeyGenerated?: (key: string | null) => void;
}

export default function ApiKeyCard({ hasKey: initialHasKey, onKeyGenerated }: ApiKeyCardProps) {
  const [isPending, startTransition] = useTransition();
  const [hasKey, setHasKey] = useState(initialHasKey);
  const [rawApiKey, setRawApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await generateApiKeyAction();
        if (!res.success || !res.apiKey) {
          const err = res.error || 'Не удалось сгенерировать API-ключ';
          setError(err);
          toast.error(err);
          return;
        }

        setRawApiKey(res.apiKey);
        setHasKey(true);
        if (onKeyGenerated) onKeyGenerated(res.apiKey);
        toast.success('Новый B2B API-ключ успешно сгенерирован!');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(msg);
        toast.error(`Ошибка генерации: ${msg}`);
      }
    });
  };

  const handleReset = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await resetApiKeyAction();
        if (!res.success || !res.apiKey) {
          const err = res.error || 'Не удалось сбросить API-ключ';
          setError(err);
          toast.error(err);
          return;
        }

        setRawApiKey(res.apiKey);
        setHasKey(true);
        if (onKeyGenerated) onKeyGenerated(res.apiKey);
        toast.success('API-ключ успешно сброшен и обновлён!');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(msg);
        toast.error(`Ошибка сброса: ${msg}`);
      }
    });
  };

  const handleRevoke = () => {
    if (!confirmRevoke) {
      setConfirmRevoke(true);
      setTimeout(() => setConfirmRevoke(false), 5000);
      return;
    }

    setConfirmRevoke(false);
    setError(null);
    startTransition(async () => {
      try {
        const res = await revokeApiKeyAction();
        if (!res.success) {
          const err = res.error || 'Не удалось отозвать API-ключ';
          setError(err);
          toast.error(err);
          return;
        }

        setRawApiKey(null);
        setHasKey(false);
        if (onKeyGenerated) onKeyGenerated(null);
        toast.success('API-ключ отозван');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(msg);
        toast.error(`Ошибка при отзыве: ${msg}`);
      }
    });
  };

  const copyKey = async () => {
    if (!rawApiKey) return;
    try {
      await navigator.clipboard.writeText(rawApiKey);
      setCopied(true);
      toast.success('API-ключ скопирован в буфер обмена');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Не удалось скопировать ключ');
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-sm">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2.5 bg-muted/20">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Key className="w-4 h-4" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground text-sm">
            Управление API-ключами B2B (apiKeyHash)
          </h2>
          <p className="text-[10px] text-muted-foreground">
            Безопасный ключ для работы с REST API SMMplan / SMMflux
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Single-time modal / alert display upon key generation or reset */}
        {rawApiKey && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                <CheckCheck className="w-5 h-5 text-emerald-500" />
                <span>Новый API-ключ сгенерирован</span>
              </div>
              <button
                type="button"
                onClick={() => setRawApiKey(null)}
                aria-label="Закрыть окно просмотра ключа"
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                <strong>Внимание!</strong> Сохраните этот ключ прямо сейчас. В целях безопасности (в базе данных хранится только SHA-256 хэш <code className="font-mono text-foreground font-bold">apiKeyHash</code>) исходный ключ показывает <strong>ОДИН РАЗ</strong> и больше никогда не сможет быть восстановлен.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <div className="flex-1 min-w-0 bg-background border border-emerald-500/30 rounded-xl px-4 py-2.5 font-mono text-sm text-foreground truncate select-all">
                {rawApiKey}
              </div>
              <button
                type="button"
                onClick={copyKey}
                aria-label="Скопировать API-ключ"
                className={`shrink-0 px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all duration-200 ${
                  copied
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-card border-border hover:bg-muted text-foreground'
                }`}
              >
                {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Скопировано!' : 'Скопировать'}
              </button>
            </div>
          </div>
        )}

        {/* Current status display */}
        {hasKey && !rawApiKey && (
          <div className="bg-muted/30 border border-border rounded-xl p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">API-ключ активен (apiKeyHash зафиксирован в БД)</p>
              <p className="text-xs text-muted-foreground mt-1">
                В целях безопасности значение ключа захэшировано по алгоритму SHA-256. Если вы потеряли ключ, выполните сброс.
              </p>
            </div>
          </div>
        )}

        {!hasKey && !rawApiKey && (
          <div className="bg-muted/30 border border-border rounded-xl p-4 text-xs text-muted-foreground">
            У вас ещё нет сгенерированного API-ключа. Нажмите «Сгенерировать API-ключ» для работы с интеграциями.
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {!hasKey ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending}
              aria-label="Сгенерировать API-ключ"
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
              {isPending ? 'Генерация...' : 'Сгенерировать API-ключ'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending}
              aria-label="Сбросить API-ключ"
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-secondary text-secondary-foreground border border-border/80 rounded-xl hover:bg-secondary/80 disabled:opacity-50 transition-all duration-200"
            >
              <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
              {isPending ? 'Сброс...' : 'Сбросить API-ключ (resetApiKey)'}
            </button>
          )}

          {hasKey && (
            confirmRevoke ? (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-1.5">
                <span className="text-xs text-rose-700 dark:text-rose-400 font-bold">Отозвать ключ навсегда?</span>
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={isPending}
                  className="text-xs font-bold text-rose-600 underline hover:no-underline"
                >
                  Да, отозвать
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isPending}
                aria-label="Отозвать API-ключ"
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl disabled:opacity-50 transition-all duration-200"
              >
                <Trash2 className="w-4 h-4" />
                Отозвать
              </button>
            )
          )}
        </div>

        {error && (
          <div className="text-xs text-rose-600 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
