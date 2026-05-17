'use client';

import { useState, useTransition, useActionState } from 'react';
import { requestMagicLink } from '@/actions/auth/request-magic-link';
import { loginWithPasswordAction } from '@/actions/auth/password-login';
import { Mail, Loader2, CheckCircle2, ArrowRight, Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'sonner';

const inputCls =
  'w-full rounded-xl border border-border bg-background text-foreground px-4 py-3 ' +
  'text-sm outline-none placeholder:text-muted-foreground ' +
  'focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200';

export function LoginForm() {
  const [activeTab, setActiveTab] = useState<'magic' | 'password'>('password'); // Password by default
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  // 1. Magic Link Action
  const [magicState, magicFormAction, magicPending] = useActionState(requestMagicLink, {
    error: null,
    success: false,
  });

  // 2. Password login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const toggleShowPassword = () => setShowPassword(!showPassword);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);

        const res = await loginWithPasswordAction(null, formData);
        if (!res.success) {
          toast.error(res.error || 'Ошибка при входе');
          return;
        }

        toast.success('Успешный вход в аккаунт!');
        // Redirect to dashboard
        if (res.redirectTo) {
          window.location.href = res.redirectTo;
        }
      } catch (err: any) {
        toast.error('Произошла непредвиденная ошибка. Пожалуйста, попробуйте позже.');
      }
    });
  };

  if (activeTab === 'magic' && magicState?.success) {
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
        <button
          onClick={() => {
            // Reset success state to try again
            window.location.reload();
          }}
          className="text-xs font-semibold text-primary underline mt-2"
        >
          Вернуться на страницу входа
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Tabs control */}
      <div className="flex p-1 bg-muted/30 border border-border/40 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('password')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all duration-200 ${
            activeTab === 'password'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Войти по паролю
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('magic')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all duration-200 ${
            activeTab === 'magic'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Войти по ссылке
        </button>
      </div>

      {/* Tab 1: Password Login */}
      {activeTab === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="block text-sm font-medium text-foreground">
              Email адрес
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                id="login-email"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${inputCls} pl-10`}
                aria-label="Email адрес для входа"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="login-password" className="block text-sm font-medium text-foreground">
                Пароль
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls} pl-10 pr-10`}
                aria-label="Пароль для входа"
              />
              <button
                type="button"
                onClick={toggleShowPassword}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || !email || !password}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 shadow-sm cursor-pointer font-bold"
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" />
                Вход...
              </>
            ) : (
              <>
                Войти в кабинет
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Tab 2: Magic Link Login */}
      {activeTab === 'magic' && (
        <form action={magicFormAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="login-email-magic" className="block text-sm font-medium text-foreground">
              Email адрес
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                id="login-email-magic"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@example.com"
                className={`${inputCls} pl-10`}
                aria-label="Email адрес для отправки ссылки"
              />
            </div>
          </div>

          {magicState?.error && (
            <div
              className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5"
              role="alert"
            >
              {magicState.error}
            </div>
          )}

          <button
            type="submit"
            disabled={magicPending}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 shadow-sm cursor-pointer font-bold"
          >
            {magicPending ? (
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
      )}
    </div>
  );
}
