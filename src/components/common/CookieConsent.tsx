'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Cookie, Check } from 'lucide-react';

export function CookieConsent() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Admin / operator panels do not require public GDPR/152-FZ consent popups
    if (pathname?.startsWith('/admin')) {
      setIsVisible(false);
      return;
    }

    // Check if user has already accepted cookies
    const cookieConsent = document.cookie.includes('cookie_consent=true');
    const localConsent = typeof window !== 'undefined' && localStorage.getItem('cookie_consent') === 'true';
    if (!cookieConsent && !localConsent) {
      // Small delay for smooth entry
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // Completely omit rendering for admin routes
  if (pathname?.startsWith('/admin')) return null;

  const handleAccept = () => {
    // Save cookie consent for 1 year (compliant with 152-FZ)
    document.cookie = 'cookie_consent=true; path=/; max-age=31536000; SameSite=Lax; Secure';
    try {
      localStorage.setItem('cookie_consent', 'true');
    } catch {
      // Ignore localStorage security/private mode errors
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      role="region"
      aria-label="Использование файлов cookie"
      className="fixed bottom-3 inset-x-3 sm:left-auto sm:right-4 sm:max-w-md z-[9999] p-3 rounded-2xl bg-zinc-950/95 text-zinc-100 border border-zinc-800/80 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-300 flex items-center justify-between gap-3 text-xs"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
          <Cookie className="w-4 h-4" />
        </div>
        <p className="text-[11px] sm:text-xs text-zinc-300 leading-snug">
          Мы используем cookie для работы сервиса и аналитики.
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleAccept}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-sm"
        >
          Понятно
        </button>
      </div>
    </aside>
  );
}
