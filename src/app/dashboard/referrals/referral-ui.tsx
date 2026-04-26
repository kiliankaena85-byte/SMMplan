'use client';

import { useState, useTransition } from 'react';
import { Copy, Gift, Users, CreditCard, CheckCheck, AlertTriangle } from 'lucide-react';
import { generateApiKey, revokeApiKey } from '@/actions/auth/api-key';
import { transferReferralBalanceAction } from '@/actions/user/referral.action';
import { useRouter } from 'next/navigation';

export function ReferralUi({
  referralLink,
  referralsCount,
  earnedRub,
}: {
  referralLink: string;
  referralsCount: number;
  earnedRub: number;
}) {
  const [copied, setCopied] = useState(false);
  const [isTransferring, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleTransfer = () => {
    if (earnedRub <= 0) return;
    setError(null);
    startTransition(async () => {
      try {
        await transferReferralBalanceAction();
        router.refresh();
      } catch (e: any) {
        setError(e.message || 'Ошибка перевода');
      }
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: Users,
            label: 'Приглашено',
            value: referralsCount,
            suffix: 'чел.',
            color: 'text-primary bg-primary/10',
          },
          {
            icon: CreditCard,
            label: 'Заработано',
            value: earnedRub.toFixed(0),
            suffix: '₽',
            color: 'text-emerald-600 bg-emerald-50',
          },
          {
            icon: Gift,
            label: 'Ваш бонус',
            value: '15',
            suffix: '%',
            color: 'text-amber-600 bg-amber-50',
          },
        ].map(({ icon: Icon, label, value, suffix, color }) => (
          <div
            key={label}
            className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {label}
              </div>
              <div className="text-2xl font-black text-foreground tabular-nums">
                {value}
                <span className="text-base font-semibold text-muted-foreground ml-1">
                  {suffix}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Transfer Action */}
      {earnedRub > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-foreground">Перевод на баланс</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Моментальный перевод доступного бонуса ({earnedRub.toFixed(2)} ₽) на основной счет
            </div>
            {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
          </div>
          <button
            onClick={handleTransfer}
            disabled={isTransferring || earnedRub <= 0}
            className="shrink-0 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {isTransferring ? 'Перевод...' : 'Перевести на баланс'}
          </button>
        </div>
      )}

      {/* Referral link */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Ваша реферальная ссылка
          </div>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0 bg-muted rounded-xl px-4 py-3 text-sm font-mono text-foreground truncate border border-border">
              {referralLink}
            </div>
            <button
              type="button"
              onClick={copyToClipboard}
              aria-label="Скопировать реферальную ссылку"
              className={`shrink-0 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-200 ${
                copied
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
              }`}
            >
              {copied ? (
                <>
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Скопировано</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Копировать</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Как это работает
        </div>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Поделитесь реферальной ссылкой с друзьями и коллегами' },
            { step: '2', text: 'Друг регистрируется и делает первый заказ на платформе' },
            { step: '3', text: 'Вы получаете 15% от суммы каждого его заказа навсегда' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {step}
              </div>
              <p className="text-sm text-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
