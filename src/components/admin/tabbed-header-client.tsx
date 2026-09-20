'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Info, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingFaq {
  q: string;
  a: string;
}

interface OnboardingData {
  description: string;
  faqs: OnboardingFaq[];
  docLink?: string;
}

interface TabItem {
  label: string;
  href: string;
}

export function OnboardingSection({
  onboardingKey,
  onboarding,
  children,
}: {
  onboardingKey: string;
  onboarding?: OnboardingData;
  children?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem(`admin_onboarding_${onboardingKey}`);
    if (saved === null) {
      setIsOpen(false);
    } else {
      setIsOpen(saved === 'true');
    }
  }, [onboardingKey]);

  const toggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    localStorage.setItem(`admin_onboarding_${onboardingKey}`, String(nextState));
  };

  return (
    <div className="flex flex-col gap-4 items-end self-start md:self-end">
      <div className="flex items-center gap-2">
        {onboarding && (
          <button
            onClick={toggleOpen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-primary bg-muted/50 border border-border hover:border-primary/20 rounded-xl shadow-xs transition-all duration-150 active:scale-95"
            aria-label="Toggle onboarding guide"
          >
            <Info className="w-3.5 h-3.5" />
            <span>База знаний</span>
            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>

      {onboarding && isMounted && isOpen && (
        <div className="w-full md:w-[600px] bg-card/60 backdrop-blur-md border border-primary/20 rounded-xl p-4 md:p-5 shadow-sm relative overflow-hidden animate-in slide-in-from-top-3 duration-200 ease-out text-left mt-2">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <div className="flex items-start gap-3 relative z-10">
            <div className="p-1.5 bg-primary/10 text-primary rounded-lg shadow-sm shrink-0 mt-0.5">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="space-y-3 flex-1 min-w-0">
              <div>
                <h3 className="font-extrabold text-sm text-foreground mb-1">Справочник оператора SMMplan</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{onboarding.description}</p>
              </div>

              {onboarding.faqs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/50">
                  {onboarding.faqs.map((faq, idx) => (
                    <div key={idx} className="bg-background/40 border border-border/40 rounded-lg p-3 hover:border-primary/10 transition-colors">
                      <h4 className="font-black text-xs text-foreground mb-1">❓ {faq.q}</h4>
                      <p className="text-muted-foreground text-[11px] leading-relaxed font-medium">{faq.a}</p>
                    </div>
                  ))}
                </div>
              )}

              {onboarding.docLink && (
                <div className="pt-2 flex items-center justify-between">
                  <a
                    href={onboarding.docLink}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    📖 Полное руководство оператора →
                  </a>
                  <button onClick={toggleOpen} className="text-[10px] font-bold text-muted-foreground hover:text-foreground">
                    Скрыть справочник
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { isNavTabActive } from '@/components/admin/navigation-data';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AdminTabsInner({ tabs }: { tabs: TabItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const allHrefs = React.useMemo(() => tabs.map((t) => t.href), [tabs]);
  const activeTabRef = React.useRef<HTMLAnchorElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Build full path including ?query for correct query-param tab matching
  const fullPath = React.useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  // Auto-scroll active tab into center on mobile
  React.useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [fullPath]);

  return (
    <div className="relative w-full max-w-full group pt-2 sm:pt-3 border-t border-border/30 overflow-hidden">
      {/* Tabs list container */}
      <div
        ref={containerRef}
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1 px-1 sm:px-0 w-full max-w-full scroll-smooth flex-nowrap"
      >
        {tabs.map((tab, idx) => {
          const isActive = isNavTabActive(fullPath, tab.href, allHrefs);
          return (
            <Link
              key={idx}
              ref={isActive ? activeTabRef : undefined}
              href={tab.href}
              className={cn(
                "px-3.5 sm:px-4 min-h-[42px] sm:min-h-0 h-10 sm:h-9 flex items-center justify-center text-xs font-bold rounded-xl border transition-all duration-150 whitespace-nowrap shadow-xs active:scale-95 shrink-0",
                isActive
                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                  : "bg-background text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Wrap in Suspense: useSearchParams() requires a Suspense boundary in Next.js App Router
export function AdminTabs({ tabs }: { tabs: TabItem[] }) {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1 border-t border-border/30 pt-3 w-full max-w-full flex-nowrap">
        {tabs.map((tab, idx) => (
          <div key={idx} className="px-4 py-2 min-h-[40px] sm:min-h-0 h-10 sm:h-9 text-xs font-bold rounded-xl border border-border bg-background text-muted-foreground whitespace-nowrap animate-pulse w-24 shrink-0" />
        ))}
      </div>
    }>
      <AdminTabsInner tabs={tabs} />
    </Suspense>
  );
}

