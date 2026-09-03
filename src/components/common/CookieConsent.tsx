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
    const consent = document.cookie.includes('cookie_consent=true');
    if (!consent) {
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
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Использование cookies"
      className="fixed bottom-3 inset-x-3 sm:left-auto sm:right-4 sm:max-w-md z-[9999] px-3 py-2 rounded-xl bg-zinc-900/95 text-zinc-100 border border-zinc-800 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-300 flex items-center justify-between gap-3 text-xs"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Cookie className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="text-[11px] sm:text-xs text-zinc-300">
          Мы используем cookie для работы сервиса.
        </span>
      </div>
      <button
        onClick={handleAccept}
        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-[11px] transition-all cursor-pointer shrink-0"
      >
        Понятно
      </button>
    </aside>
  );
}
