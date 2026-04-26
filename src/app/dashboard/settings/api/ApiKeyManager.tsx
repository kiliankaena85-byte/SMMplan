'use client';

import { useState, useTransition } from 'react';
import { generateApiKey, revokeApiKey } from '@/actions/auth/api-key';
import { Copy, RefreshCw, Trash2, CheckCheck, Eye, EyeOff, ShieldAlert } from 'lucide-react';

export default function ApiKeyManager({ currentKey }: { currentKey: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);
  // Inline confirmation state — replaces window.confirm()
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const handleGenerate = () => {
    setError('');
    startTransition(async () => {
      const res = await generateApiKey();
      if (!res.success) {
        setError(res.error || 'Ошибка при генерации ключа');
      }
    });
  };

  const handleRevoke = () => {
    if (!confirmRevoke) {
      // First click — show inline confirm
      setConfirmRevoke(true);
      // Auto-reset after 5 seconds
      setTimeout(() => setConfirmRevoke(false), 5000);
      return;
    }
    // Second click — confirmed
    setConfirmRevoke(false);
    setError('');
    startTransition(async () => {
      const res = await revokeApiKey();
      if (!res.success) {
        setError(res.error || 'Ошибка при отзыве ключа');
      }
    });
  };

  const copyKey = async () => {
    if (!currentKey) return;
    try {
      await navigator.clipboard.writeText(currentKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — user can copy manually
    }
  };

  const masked = currentKey
    ? `${currentKey.slice(0, 8)}${'•'.repeat(24)}${currentKey.slice(-4)}`
    : null;

  return (
    <div className="space-y-5">
      {currentKey ? (
        <div className="space-y-3">
          {/* Key display */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Ваш API-ключ
            </label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0 bg-muted border border-border rounded-xl px-4 py-3 font-mono text-sm text-foreground truncate">
                {visible ? currentKey : masked}
              </div>
              <button
                type="button"
                onClick={() => setVisible(v => !v)}
                aria-label={visible ? 'Скрыть ключ' : 'Показать ключ'}
                className="shrink-0 px-3 py-3 bg-background border border-border rounded-xl hover:bg-muted transition-all duration-200 text-muted-foreground hover:text-foreground"
              >
                {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={copyKey}
                aria-label="Скопировать API-ключ"
                className={`shrink-0 px-3 py-3 rounded-xl border transition-all duration-200 ${
                  copied
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending}
              aria-label="Перегенерировать API-ключ"
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
              Перегенерировать
            </button>

            {/* Inline confirm revoke — replaces window.confirm() */}
            {confirmRevoke ? (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-xs text-rose-700 font-semibold">Подтвердите отзыв ключа:</span>
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={isPending}
                  className="text-xs font-bold text-rose-700 underline hover:no-underline"
                >
                  Да, отозвать
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRevoke(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isPending}
                aria-label="Отозвать API-ключ"
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 disabled:opacity-50 transition-all duration-200"
              >
                <Trash2 className="w-4 h-4" />
                Отозвать
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-muted/50 border border-border rounded-xl p-4 text-sm text-muted-foreground">
            У вас ещё нет API-ключа. Сгенерируйте его чтобы начать использовать B2B API.
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            aria-label="Сгенерировать API-ключ"
            className="flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
            Сгенерировать ключ
          </button>
        </div>
      )}

      {error && (
        <div
          className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3"
          role="alert"
        >
          {error}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Никогда не передавайте API-ключ третьим лицам. При компрометации немедленно отзовите его.
      </p>
    </div>
  );
}
