'use client';

import React from 'react';
import type { PublicNetwork, PublicService } from '@/actions/order/catalog';
import { MegaFooter } from '@/components/landing/MegaFooter';
import { BoostOrderClient } from './BoostOrderClient';
import { BoostTrustStats } from './BoostTrustStats';
import { BoostVsCompetitors } from './BoostVsCompetitors';
import { BoostReviewsSlider } from './BoostReviewsSlider';
import { BoostFAQ } from './BoostFAQ';
import type { ContactAndLegalSettings } from '@/lib/settings';
import Link from 'next/link';

interface BoostLandingProps {
  catalog: PublicNetwork[];
  initialServices?: PublicService[];
  siteName: string;
  tenantId: string;
  userEmail?: string;
  contactSettings: ContactAndLegalSettings;
}

export const BoostLanding: React.FC<BoostLandingProps> = ({
  catalog,
  initialServices = [],
  siteName,
  tenantId,
  userEmail,
  contactSettings,
}) => {
  return (
    <div className="min-h-screen bg-[#F7F9FB] dark:bg-background text-foreground font-sans flex flex-col relative selection:bg-[#009FE3]/20">
      
      {/* ── PRIMELIKE HEADER ── */}
      <header className="w-full max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
        {/* Logo */}
        <Link href="/?tenant=boost" className="flex items-center gap-2 select-none group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#007cb0] to-[#009FE3] flex items-center justify-center text-white text-xl font-bold shadow-md shadow-[#009FE3]/20">
            ⚡
          </div>
          <span className="text-2xl font-black tracking-tight text-foreground">
            Prime<span className="text-[#009FE3]">Boost</span>
          </span>
        </Link>

        {/* Center Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
          <Link href="#services" className="hover:text-foreground transition-colors">Услуги</Link>
          <Link href="#contacts" className="hover:text-foreground transition-colors">Контакты</Link>
          <Link href="#faq" className="hover:text-foreground transition-colors">FAQ</Link>
        </nav>

        {/* Right CTA */}
        <Link
          href="/auth/login"
          className="h-11 px-5 rounded-full bg-[#009FE3] hover:bg-[#008cc9] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all select-none"
        >
          <span>Войти в аккаунт</span>
          <span className="text-base font-light">＋</span>
        </Link>
      </header>

      {/* ── PRIMELIKE HERO & ORDER TERMINAL ── */}
      <main className="flex-1 flex flex-col items-center">
        <section className="w-full max-w-5xl mx-auto px-4 pt-6 sm:pt-10 pb-12 text-center">
          
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-foreground tracking-tight leading-tight mb-3">
            Накрутка подписчиков в ТГ
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8 font-medium">
            Ваша аудитория Телеграм — наша забота.
          </p>

          {/* PrimeLike Exact Order Widget */}
          <BoostOrderClient
            initialCatalog={catalog}
            initialEmail={userEmail}
            initialServices={initialServices}
          />
        </section>

        {/* PrimeLike Trust Stats */}
        <BoostTrustStats />

        {/* PrimeLike Comparison (How we work vs others) */}
        <BoostVsCompetitors />

        {/* PrimeLike Reviews Slider */}
        <BoostReviewsSlider />

        {/* PrimeLike FAQ */}
        <div id="faq" className="w-full">
          <BoostFAQ companyName="PrimeBoost" />
        </div>
      </main>

      {/* Footer */}
      <div id="contacts" className="w-full">
        <MegaFooter contactSettings={contactSettings} tenantId={tenantId} />
      </div>
    </div>
  );
};
