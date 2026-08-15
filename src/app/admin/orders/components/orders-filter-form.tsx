'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmartSearch } from '@/components/admin/filters/SmartSearch';
import { QuickFilterChips } from '@/components/admin/filters/QuickFilterChips';

interface NetworkOption {
  id: string;
  name: string;
  slug: string;
}

export function OrdersFilterForm({ networks = [] }: { networks?: NetworkOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const currentQ = searchParams.get('q') || '';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const currentStatus = searchParams.get('status') || 'ALL';
  const currentClientEmail = searchParams.get('clientEmail') || '';
  const currentOrderId = searchParams.get('orderId') || '';
  const currentExternalId = searchParams.get('externalId') || '';
  const currentServiceName = searchParams.get('serviceName') || '';
  const currentNetworkSlug = searchParams.get('networkSlug') || 'ALL';
  const currentLink = searchParams.get('link') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentMinQty = searchParams.get('minQuantity') || '';
  const currentMaxQty = searchParams.get('maxQuantity') || '';

  const hasActiveAdvancedFilters = !!(
    currentClientEmail ||
    currentOrderId ||
    currentExternalId ||
    currentServiceName ||
    currentLink ||
    currentMinPrice ||
    currentMaxPrice ||
    currentMinQty ||
    currentMaxQty
  );

  const [showAdvanced, setShowAdvanced] = useState(hasActiveAdvancedFilters);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams(searchParams.toString());

    fd.forEach((value, key) => {
      const valStr = String(value).trim();
      if (valStr && valStr !== 'ALL') {
        params.set(key, valStr);
      } else {
        params.delete(key);
      }
    });

    params.delete('cursor');
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const handleReset = () => {
    router.push(pathname);
  };

  return (
    <div className="space-y-4">
      {/* Quick Filter Chips Bar */}
      <QuickFilterChips />

      {/* Top Search & Filter Bar */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <SmartSearch />

          {/* Social Network Selector */}
          <select
            name="networkSlug"
            defaultValue={currentNetworkSlug}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString());
              if (e.target.value && e.target.value !== 'ALL') {
                params.set('networkSlug', e.target.value);
              } else {
                params.delete('networkSlug');
              }
              params.delete('cursor');
              router.push(`${pathname}?${params.toString()}`);
            }}
            aria-label="Фильтр по соцсети"
            className="px-3.5 h-11 text-sm border border-border/60 shadow-sm rounded-xl bg-background/80 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
          >
            <option value="ALL">🌐 Все соцсети</option>
            {networks.map(n => (
              <option key={n.id} value={n.slug}>
                {n.name}
              </option>
            ))}
          </select>

          {/* Toggle Advanced Filters */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center justify-center gap-2 px-4 h-11 text-xs font-semibold border rounded-xl transition-all duration-200 cursor-pointer shrink-0
              ${showAdvanced 
                ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/15' 
                : 'bg-background text-foreground border-border/60 shadow-sm hover:bg-muted/50'
              } active:scale-95`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Фильтры
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        <AnimatePresence initial={false}>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="pt-4 pb-2 border-t border-border/50 mt-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
                  {/* Email клиента */}
                  <div className="space-y-1">
                    <label className="block font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Email клиента</label>
                    <input
                      type="text"
                      name="clientEmail"
                      defaultValue={currentClientEmail}
                      placeholder="client@example.com"
                      className="w-full px-3 h-10 bg-background/80 border border-border/60 rounded-xl focus:border-primary outline-none text-foreground transition-all"
                    />
                  </div>

                  {/* Ключевое слово в услуге */}
                  <div className="space-y-1">
                    <label className="block font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Услуга (Ключевые слова)</label>
                    <input
                      type="text"
                      name="serviceName"
                      defaultValue={currentServiceName}
                      placeholder="подписчики -bot"
                      className="w-full px-3 h-10 bg-background/80 border border-border/60 rounded-xl focus:border-primary outline-none text-foreground transition-all"
                    />
                  </div>

                  {/* ID у провайдера */}
                  <div className="space-y-1">
                    <label className="block font-bold text-muted-foreground uppercase tracking-wider text-[10px]">ID у провайдера</label>
                    <input
                      type="text"
                      name="externalId"
                      defaultValue={currentExternalId}
                      placeholder="1422"
                      className="w-full px-3 h-10 bg-background/80 border border-border/60 rounded-xl focus:border-primary outline-none text-foreground transition-all font-mono"
                    />
                  </div>

                  {/* Ссылка */}
                  <div className="space-y-1">
                    <label className="block font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Ссылка заказа</label>
                    <input
                      type="text"
                      name="link"
                      defaultValue={currentLink}
                      placeholder="https://t.me/..."
                      className="w-full px-3 h-10 bg-background/80 border border-border/60 rounded-xl focus:border-primary outline-none text-foreground transition-all font-mono"
                    />
                  </div>

                  {/* Min / Max Price */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="block font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Сумма заказа (RUB)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        name="minPrice"
                        defaultValue={currentMinPrice}
                        placeholder="От ₽"
                        className="flex-1 px-3 h-10 bg-background/80 border border-border/60 rounded-xl focus:border-primary outline-none text-foreground font-mono"
                      />
                      <span className="text-muted-foreground">—</span>
                      <input
                        type="number"
                        step="0.01"
                        name="maxPrice"
                        defaultValue={currentMaxPrice}
                        placeholder="До ₽"
                        className="flex-1 px-3 h-10 bg-background/80 border border-border/60 rounded-xl focus:border-primary outline-none text-foreground font-mono"
                      />
                    </div>
                  </div>

                  {/* Min / Max Quantity */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="block font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Количество</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="minQuantity"
                        defaultValue={currentMinQty}
                        placeholder="От"
                        className="flex-1 px-3 h-10 bg-background/80 border border-border/60 rounded-xl focus:border-primary outline-none text-foreground font-mono"
                      />
                      <span className="text-muted-foreground">—</span>
                      <input
                        type="number"
                        name="maxQuantity"
                        defaultValue={currentMaxQty}
                        placeholder="До"
                        className="flex-1 px-3 h-10 bg-background/80 border border-border/60 rounded-xl focus:border-primary outline-none text-foreground font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-border/40">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Сбросить всё
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2 text-xs font-bold text-primary-foreground bg-primary hover:opacity-90 active:scale-95 shadow-sm rounded-xl transition-all cursor-pointer"
                  >
                    Применить фильтры
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
