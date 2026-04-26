'use client';

import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-6 animate-in fade-in duration-500 max-w-sm">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">Что-то пошло не так</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Возникла непредвиденная ошибка. Попробуйте обновить страницу
            или вернитесь на главную.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/60 font-mono mt-2">
              Код: {error.digest}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all duration-200 shadow-sm"
            aria-label="Попробовать снова"
          >
            <RefreshCw className="w-4 h-4" />
            Попробовать снова
          </button>
          <Link
            href="/"
            className="px-5 py-3 bg-card border border-border text-foreground rounded-xl font-semibold text-sm hover:bg-muted transition-all duration-200"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
