'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, Check } from 'lucide-react';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const consent = document.cookie.includes('cookie_consent=true');
    if (!consent) {
      // Small delay for smooth entry
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    // Save cookie consent for 1 year (compliant with 152-FZ)
    document.cookie = 'cookie_consent=true; path=/; max-age=31536000; SameSite=Lax; Secure';
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Согласие на использование файлов cookie"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-[9999] p-4 rounded-2xl bg-zinc-900/95 text-zinc-100 border border-zinc-800 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 shrink-0 mt-0.5">
          <Cookie className="w-5 h-5" />
        </div>
        <div className="flex-1 text-xs text-zinc-300 leading-relaxed">
          <p className="font-semibold text-zinc-100 mb-1">
            Мы используем файлы cookie (152-ФЗ)
          </p>
          <p>
            Этот сайт использует технические и аналитические cookies для обеспечения стабильной работы сервиса и повышения удобства. Продолжая использовать сайт, вы соглашаетесь с{' '}
            <Link href="/legal/cookies" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
              Политикой использования cookie
            </Link>{' '}
            и{' '}
            <Link href="/legal/privacy" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
              Политикой конфиденциальности
            </Link>.
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={handleAccept}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-medium text-xs transition-all cursor-pointer shadow-lg shadow-blue-600/20"
            >
              <Check className="w-3.5 h-3.5" />
              Принять и продолжить
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
