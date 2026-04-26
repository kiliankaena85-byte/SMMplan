'use client';

import { useActionState } from 'react';
import { requestMagicLink } from '@/actions/auth/request-magic-link';
import { Mail, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

const inputCls =
  'w-full rounded-xl border border-border bg-background text-foreground px-4 py-3 ' +
  'text-sm outline-none placeholder:text-muted-foreground ' +
  'focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200';

export function LoginForm() {
  const [state, formAction, pending] = useActionState(requestMagicLink, {
    error: null,
    success: false,
  });

  if (state.success) {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-3">
        <div className="flex justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h3 className="font-bold text-foreground">Проверьте почту</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Мы отправили волшебную ссылку для входа.
          Письмо придёт в течение 1–2 минут.
        </p>
        <p className="text-xs text-muted-foreground">
          Не получили? Проверьте папку «Спам»
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-foreground mb-1.5">
          Email адрес
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="name@example.com"
            className={`${inputCls} pl-10`}
            aria-label="Email адрес для входа"
          />
        </div>
      </div>

      {state.error && (
        <div
          className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        aria-label="Получить ссылку для входа"
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 shadow-sm"
      >
        {pending ? (
          <>
            <Loader2 className="animate-spin w-4 h-4" />
            Отправляем...
          </>
        ) : (
          <>
            Получить ссылку
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}
