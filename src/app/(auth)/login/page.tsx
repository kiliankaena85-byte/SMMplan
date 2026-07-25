import { LoginForm } from './login-form';
import Link from 'next/link';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { UserCheck, Sparkles, Zap, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const isLovable = resolvedParams?.tenant === 'lovable';

  return {
    title: isLovable ? 'Вход | SMMflux' : 'Вход | SMMplan',
    description: 'Войдите в личный кабинет — управляйте заказами на продвижение.',
  };
}

interface PageProps {
  searchParams: Promise<{ error?: string; tenant?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const error = resolvedParams?.error;

  const reqHeaders = await headers();
  const host = reqHeaders.get('host') || '';
  const xTenant = reqHeaders.get('x-tenant-id') || '';
  const isLovable = xTenant === 'lovable' || host.includes('lovable') || resolvedParams?.tenant === 'lovable';

  const session = await verifySession();
  let activeEmail = '';
  let activeRole = 'USER';
  if (session?.userId) {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { email: true, role: true }
    });
    activeEmail = user?.email || '';
    activeRole = user?.role || 'USER';
  }

  if (activeEmail) {
    const isStaff = ["OWNER", "ADMIN", "MANAGER", "SUPPORT"].includes(activeRole);
    const redirectLink = isStaff ? "/admin/dashboard" : "/dashboard";

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
        {isLovable && (
          <div className="absolute top-0 inset-x-0 h-screen z-0 pointer-events-none overflow-hidden select-none">
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] rounded-full bg-blue-500/90 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/85 blur-[120px] animate-pulse" style={{ animationDuration: '9s' }} />
          </div>
        )}
        <div className={`relative z-10 w-full max-w-md p-8 text-center space-y-6 animate-in fade-in duration-300 ${
          isLovable
            ? 'bg-white/50 dark:bg-black/50 backdrop-blur-3xl border border-white/20 dark:border-white/10 rounded-[2.5rem] shadow-2xl'
            : 'bg-content1 border border-border/80 rounded-[var(--radius)] shadow-[0_20px_50px_rgba(0,0,0,0.05)]'
        }`}>
          <div className="flex justify-center">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center border shadow-sm ${
              isLovable 
                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white border-white/20 font-black text-2xl' 
                : 'bg-primary/10 text-primary border-primary/20 font-black text-2xl'
            }`}>
              {isLovable ? 'F' : <UserCheck className="w-8 h-8" />}
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Вы уже вошли</h1>
            <p className="text-muted-foreground text-xs leading-relaxed font-semibold">
              Вы авторизованы как: <span className="font-bold text-foreground block text-sm mt-1">{activeEmail}</span>
            </p>
          </div>
          
          <div className="space-y-3 pt-2">
            <Link
              href={redirectLink}
              className={`w-full flex items-center justify-center h-12 rounded-xl font-black text-sm hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 ${
                isLovable
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-primary text-primary-foreground hover:shadow-lg'
              }`}
            >
              Продолжить как {activeEmail.split('@')[0]}
            </Link>
            
            <a
              href="/api/auth/logout"
              className="w-full flex items-center justify-center h-12 rounded-xl bg-content2 hover:bg-content3 text-foreground font-bold text-sm transition-all duration-200 border border-border/50"
            >
              Войти под другим аккаунтом
            </a>
          </div>
        </div>
      </div>
    );
  }

  {/* ── SMMFLUX VARIANT ── */}
  if (isLovable) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-foreground font-sans flex flex-col justify-center items-center relative overflow-x-clip p-4 md:p-8">
        {/* SMMFLUX ELEGANT HERO BACKGROUND (Toned down for high contrast) */}
        <div className="absolute top-0 inset-x-0 h-screen z-0 pointer-events-none overflow-hidden select-none bg-slate-50 dark:bg-zinc-950">
          <div className="absolute top-[-10%] left-[-5%] w-[55%] h-[45%] rounded-full bg-blue-500/35 blur-[140px] animate-pulse" style={{ animationDuration: '10s' }} />
          <div className="absolute top-[5%] right-[-5%] w-[45%] h-[45%] rounded-full bg-indigo-400/30 blur-[140px] animate-pulse" style={{ animationDuration: '14s' }} />
          <div className="absolute bottom-[-10%] left-[10%] w-[50%] h-[50%] rounded-full bg-purple-500/30 blur-[150px] animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute bottom-[5%] right-[-5%] w-[50%] h-[50%] rounded-full bg-sky-400/30 blur-[130px] animate-pulse" style={{ animationDuration: '11s' }} />
        </div>

        <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Hero branding for SMMflux */}
          <div className="hidden lg:flex flex-col space-y-8 p-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-500/25">
                F
              </div>
              <span className="font-black text-3xl tracking-tight text-foreground">SMMflux</span>
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Next-Gen AI Growth
              </div>
              <h1 className="text-4xl xl:text-5xl font-black text-foreground tracking-tight leading-tight">
                Продвижение нового уровня
              </h1>
              <p className="text-foreground/80 font-medium text-base leading-relaxed bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-5 rounded-2xl border border-black/5 dark:border-white/10 shadow-sm">
                Войдите в личный кабинет SMMflux — управляйте проектами с невероятной скоростью и элегантным дизайном.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-1" />, value: 'AI-Driven', label: 'Алгоритмы' },
                { icon: <Zap className="w-5 h-5 text-amber-500 mb-1" />, value: 'Мгновенно', label: 'Старт заказов' },
                { icon: <ShieldCheck className="w-5 h-5 text-emerald-500 mb-1" />, value: '24/7', label: 'Поддержка' },
              ].map(({ icon, value, label }) => (
                <div key={label} className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 shadow-md p-4 text-center rounded-2xl flex flex-col items-center justify-center min-h-[104px] hover:scale-105 transition-all duration-300">
                  {icon}
                  <div className="text-base font-black text-foreground">{value}</div>
                  <div className="text-[11px] text-muted-foreground font-semibold mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right High-Contrast SMMflux Card */}
          <div className="w-full max-w-md mx-auto bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/15 rounded-[2.5rem] p-8 md:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] space-y-8 text-foreground">
            <div className="text-center lg:text-left">
              <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-lg">
                  F
                </div>
                <span className="font-black text-2xl tracking-tight text-foreground">SMMflux</span>
              </div>
              <h2 className="text-2xl font-black text-foreground tracking-tight">Вход в SMMflux</h2>
              <p className="text-muted-foreground text-sm mt-1 font-semibold">
                Введите email и пароль для доступа к кабинету.
              </p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3 text-xs text-rose-500 text-center font-bold">
                {error === 'AccountBlocked' && 'Ваш аккаунт заблокирован или удален.'}
                {error === 'InvalidToken' && 'Неверный или поврежденный токен входа.'}
                {error === 'ExpiredToken' && 'Срок действия ссылки входа истек.'}
                {error === 'AlreadyUsed' && 'Эта ссылка входа уже была использована.'}
                {!['AccountBlocked', 'InvalidToken', 'ExpiredToken', 'AlreadyUsed'].includes(error) && 'Произошла ошибка при входе. Попробуйте снова.'}
              </div>
            )}

            <LoginForm />
          </div>
        </div>
      </div>
    );
  }

  {/* ── CLASSIC SMMPLAN VARIANT ── */}
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ── Left: Branding panel ── */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-10 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.15),rgba(255,255,255,0))] pointer-events-none z-0" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0" />
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary-foreground/15 rounded-full blur-3xl pointer-events-none z-0" />
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-primary-foreground/5 rounded-full blur-3xl pointer-events-none z-0" />
        
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2.5" aria-label="На главную">
            <div className="w-9 h-9 rounded-xl bg-primary-foreground/15 backdrop-blur flex items-center justify-center font-black text-primary-foreground text-lg">
              S
            </div>
            <span className="font-bold text-xl">SMMplan</span>
          </Link>
        </div>

        <div className="space-y-6 relative z-10">
          <div className="space-y-4">
            <div className="text-4xl font-black leading-tight">
              Продвижение<br />в социальных<br />сетях
            </div>
            <p className="text-primary-foreground/80 text-base leading-relaxed">
              Быстрое продвижение подписчиков, лайков и просмотров. 
              Результат в течение нескольких минут.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '10K+', label: 'Клиентов' },
              { value: '99%',  label: 'Выполнено' },
              { value: '9-21', label: 'Поддержка (МСК)' },
            ].map(({ value, label }) => (
              <div key={label} className="bg-primary-foreground/10 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black">{value}</div>
                <div className="text-xs text-primary-foreground/60 font-semibold mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-primary-foreground/40 relative z-10">
          © {new Date().getFullYear()} SMMplan · Безопасная оплата через ЮKassa
        </p>
      </div>

      {/* ── Right: Form panel ── */}
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background">
        <div className="lg:hidden mb-8">
          <Link href="/" className="flex items-center gap-2 justify-center" aria-label="На главную">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-black text-primary-foreground text-lg">
              S
            </div>
            <span className="font-bold text-xl text-foreground">SMMplan</span>
          </Link>
        </div>

        <div className="w-full max-w-sm space-y-6">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl font-bold text-foreground">Вход в аккаунт</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Войдите в личный кабинет по паролю или с помощью ссылки на почту.
            </p>
          </div>

          {error && (
            <div className="bg-destructive/15 border border-destructive/20 rounded-xl px-4 py-3 text-xs text-destructive text-center font-bold">
              {error === 'AccountBlocked' && 'Ваш аккаунт заблокирован или удален.'}
              {error === 'InvalidToken' && 'Неверный или поврежденный токен входа.'}
              {error === 'ExpiredToken' && 'Срок действия ссылки входа истек.'}
              {error === 'AlreadyUsed' && 'Эта ссылка входа уже была использована.'}
              {!['AccountBlocked', 'InvalidToken', 'ExpiredToken', 'AlreadyUsed'].includes(error) && 'Произошла ошибка при входе. Попробуйте снова.'}
            </div>
          )}

          <LoginForm />
        </div>
      </div>
    </div>
  );
}

