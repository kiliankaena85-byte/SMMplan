'use client';

import { useState, useTransition } from 'react';
import { generateApiKey, revokeApiKey } from '@/actions/auth/api-key';
import { Copy, RefreshCw, Trash2, CheckCheck, ShieldAlert } from 'lucide-react';

export default function ApiKeyManager({ hasKey }: { hasKey: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const handleGenerate = () => {
    setError('');
    setNewKey(null);
    startTransition(async () => {
      const res = await generateApiKey();
      if (!res.success) {
        setError(res.error || 'Ошибка при генерации ключа');
      } else {
        setNewKey(res.apiKey || null);
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
    setError('');
    startTransition(async () => {
      const res = await revokeApiKey();
      if (!res.success) {
        setError(res.error || 'Ошибка при отзыве ключа');
      } else {
        setNewKey(null);
      }
    });
  };

  const copyKey = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <div className="space-y-5">
      {hasKey || newKey ? (
        <div className="space-y-4">
          {/* Key display */}
          {newKey ? (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCheck className="w-5 h-5" />
                <span className="font-semibold text-sm">Новый API-ключ сгенерирован</span>
              </div>
              <p className="text-xs text-emerald-700/80">
                Скопируйте ключ прямо сейчас. В целях безопасности он больше никогда не будет показан.
              </p>
              <div className="flex gap-2">
                <div className="flex-1 min-w-0 bg-white border border-emerald-200 rounded-lg px-4 py-2.5 font-mono text-sm text-foreground truncate select-all">
                  {newKey}
                </div>
                <button
                  type="button"
                  onClick={copyKey}
                  aria-label="Скопировать API-ключ"
                  className={`shrink-0 px-4 py-2.5 rounded-lg border font-medium text-sm transition-all duration-200 ${
                    copied
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {copied ? 'Скопировано!' : 'Скопировать'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 border border-border rounded-xl p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">API-ключ активен</p>
                <p className="text-xs text-muted-foreground mt-1">
                  В целях безопасности ключ скрыт и не может быть восстановлен. Если вы его забыли, сгенерируйте новый.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending}
              aria-label="Перегенерировать API-ключ"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 transition-all duration-200"
            >
              <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
              Сгенерировать новый
            </button>

            {confirmRevoke ? (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 animate-in fade-in">
                <span className="text-xs text-rose-700 font-semibold">Отозвать ключ навсегда?</span>
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={isPending}
                  className="text-xs font-bold text-rose-700 underline hover:no-underline"
                >
                  Да, удалить
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isPending}
                aria-label="Отозвать API-ключ"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50/50 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg disabled:opacity-50 transition-all duration-200"
              >
                <Trash2 className="w-4 h-4" />
                Отозвать
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-muted/30 border border-border rounded-xl p-4 text-sm text-muted-foreground">
            У вас ещё нет API-ключа. Сгенерируйте его чтобы начать использовать B2B API.
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            aria-label="Сгенерировать API-ключ"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
            Сгенерировать ключ
          </button>
        </div>
      )}

      {error && (
        <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 animate-in slide-in-from-top-1">
          {error}
        </div>
      )}

      <p className="text-xs text-muted-foreground pt-2">
        Никогда не передавайте API-ключ третьим лицам. При компрометации немедленно отзовите его.
      </p>
    </div>
  );
}
