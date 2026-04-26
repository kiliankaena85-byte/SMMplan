import { LoginForm } from './login-form';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Вход | Smmplan',
  description: 'Войдите в личный кабинет Smmplan — управляйте заказами на продвижение.',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ── Left: Branding panel ── */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-10 text-primary-foreground">
        <div>
          <Link href="/" className="flex items-center gap-2.5" aria-label="На главную">
            <div className="w-9 h-9 rounded-xl bg-primary-foreground/15 backdrop-blur flex items-center justify-center font-black text-primary-foreground text-lg">
              S
            </div>
            <span className="font-bold text-xl">Smmplan</span>
          </Link>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="text-4xl font-black leading-tight">
              Продвижение<br />в социальных<br />сетях
            </div>
            <p className="text-primary-foreground/70 text-base leading-relaxed">
              Быстрая накрутка подписчиков, лайков и просмотров. 
              Результат в течение нескольких минут.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '10K+', label: 'Клиентов' },
              { value: '99%',  label: 'Выполнено' },
              { value: '24/7', label: 'Поддержка' },
            ].map(({ value, label }) => (
              <div key={label} className="bg-primary-foreground/10 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black">{value}</div>
                <div className="text-xs text-primary-foreground/60 font-semibold mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-primary-foreground/40">
          © {new Date().getFullYear()} Smmplan · Безопасная оплата через ЮKassa
        </p>
      </div>

      {/* ── Right: Form panel ── */}
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Link href="/" className="flex items-center gap-2 justify-center" aria-label="На главную">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-black text-primary-foreground text-lg">
              S
            </div>
            <span className="font-bold text-xl text-foreground">Smmplan</span>
          </Link>
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl font-bold text-foreground">Вход в аккаунт</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Введите email — мы пришлём ссылку для входа. Пароль не нужен.
            </p>
          </div>

          <LoginForm />

          {/* P3.5: New user hint — magic link works for both login & registration */}
          <div className="bg-muted/50 border border-border rounded-xl px-4 py-3 text-center">
            <p className="text-xs font-semibold text-foreground">
              Новый пользователь?
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Аккаунт создаётся автоматически при первом входе — пароль не нужен
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Вводя email, вы соглашаетесь с{' '}
            <Link href="/p/offer" className="underline hover:text-foreground transition-colors">
              Публичной офертой
            </Link>{' '}
            и{' '}
            <Link href="/p/privacy" className="underline hover:text-foreground transition-colors">
              политикой конфиденциальности
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
