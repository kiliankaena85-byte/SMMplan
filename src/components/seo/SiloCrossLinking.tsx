import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import type { SiloRecommendationBundle } from '@/types/silo';
import { ServiceIdBadge } from '@/components/ui/service-id-badge';
import { normalizeTenantId } from '@/lib/seo-helpers';

export interface SiloCrossLinkingProps {
  bundle: SiloRecommendationBundle | null;
  tenantId?: string;
  className?: string;
}

export function SiloCrossLinking({ bundle, tenantId, className = '' }: SiloCrossLinkingProps) {
  if (!bundle) return null;

  const hasServices = bundle.complementaryServices && bundle.complementaryServices.length > 0;
  const hasCategories = bundle.complementaryCategories && bundle.complementaryCategories.length > 0;

  if (!hasServices && !hasCategories) return null;

  const effectiveTenant = normalizeTenantId(tenantId || bundle.tenantId || 'smmplan');
  const isFlux = effectiveTenant === 'flux';

  return (
    <section
      aria-label="Сопутствующие услуги и рекомендации"
      className={`w-full space-y-6 pt-6 pb-8 font-sans ${className}`}
      itemScope
      itemType="https://schema.org/ItemList"
    >
      <meta itemProp="numberOfItems" content={String((bundle.complementaryServices || []).length)} />

      {/* ── Section Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span>Комплексное продвижение • Silo 2026</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-foreground" itemProp="name">
            {bundle.headline}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed" itemProp="description">
            {bundle.subheadline}
          </p>
        </div>

        {hasCategories && (
          <div className="flex flex-wrap gap-1.5 items-center">
            {bundle.complementaryCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/services/${cat.networkSlug}/${cat.slug}`}
                className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all duration-200 inline-flex items-center gap-1 min-h-[44px] ${
                  isFlux
                    ? 'bg-secondary/60 hover:bg-purple-500/15 border-border hover:border-purple-400 text-foreground hover:text-purple-600'
                    : 'bg-secondary/60 hover:bg-primary/10 border-border hover:border-primary/40 text-foreground hover:text-primary'
                }`}
                title={`Перейти к услугам: ${cat.name}`}
              >
                <span>{cat.name}</span>
                <ArrowRight className="w-3 h-3 opacity-60" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Complementary Services Cards Grid ── */}
      {hasServices && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {bundle.complementaryServices.map((srv, index) => (
            <div
              key={srv.id}
              className={`group relative rounded-2xl border bg-card p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md ${
                isFlux
                  ? 'border-border hover:border-purple-400/80 hover:-translate-y-0.5'
                  : 'border-border hover:border-primary/60 hover:-translate-y-0.5'
              }`}
              itemScope
              itemType="https://schema.org/Product"
              itemProp="itemListElement"
            >
              <meta itemProp="position" content={String(index + 1)} />
              <meta itemProp="url" content={srv.canonicalUrl} />
              <meta itemProp="name" content={srv.name} />

              <div className="space-y-3">
                {/* Category tag & ID */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground truncate max-w-[140px]">
                    {srv.networkName} • {srv.categoryName}
                  </span>
                  <ServiceIdBadge numericId={srv.numericId} size="xs" />
                </div>

                {/* Service Name */}
                <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
                  <Link
                    href={`/services/${srv.networkSlug}/${srv.categorySlug}/${srv.slug || srv.numericId}`}
                    className="focus:outline-none focus:underline"
                  >
                    {srv.name}
                  </Link>
                </h3>

                {/* Badges (Speed & Refill) */}
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {srv.hasRefill && (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Гарантия</span>
                    </span>
                  )}
                  {srv.speedClass && (
                    <span className="inline-flex items-center gap-1 font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>{srv.speedClass}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Price & Action */}
              <div
                className="pt-4 mt-3 border-t border-border flex items-end justify-between gap-2"
                itemScope
                itemType="https://schema.org/Offer"
                itemProp="offers"
              >
                <meta itemProp="price" content={srv.pricePerUnitRub.toFixed(4)} />
                <meta itemProp="priceCurrency" content="RUB" />
                <meta itemProp="availability" content="https://schema.org/InStock" />

                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium">Цена за 1 шт.</span>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-lg font-black tracking-tight ${
                        isFlux ? 'text-purple-600 dark:text-purple-400' : 'text-primary'
                      }`}
                    >
                      {srv.pricePerUnitRub.toFixed(4)} ₽
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">/ шт</span>
                  </div>
                </div>

                <Link
                  href={`/services/${srv.networkSlug}/${srv.categorySlug}/${srv.slug || srv.numericId}`}
                  className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl transition-all inline-flex items-center justify-center gap-1.5 shrink-0 ${
                    isFlux
                      ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'
                  }`}
                  aria-label={`Заказать услугу ${srv.name}`}
                >
                  <span>Заказать</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
