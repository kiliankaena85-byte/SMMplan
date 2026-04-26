import Link from 'next/link';

export const metadata = {
  title: 'Страница не найдена | Smmplan',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-6 animate-in fade-in duration-500">
        <div className="text-8xl font-black text-primary/20 select-none tabular-nums">
          404
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Страница не найдена</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Такой страницы не существует или она была перемещена
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all duration-200 shadow-sm"
          >
            Личный кабинет
          </Link>
          <Link
            href="/"
            className="px-6 py-3 bg-card border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-muted transition-all duration-200"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
