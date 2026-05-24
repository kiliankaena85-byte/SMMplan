'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, ChevronDown, ChevronUp, Trash2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_OPTIONS = [
  { value: 'ALL',              label: 'Все статусы' },
  { value: 'PENDING',           label: 'В очереди' },
  { value: 'IN_PROGRESS',       label: 'В работе' },
  { value: 'COMPLETED',         label: 'Выполнен' },
  { value: 'PARTIAL',           label: 'Частичный' },
  { value: 'CANCELED',          label: 'Отменён' },
  { value: 'ERROR',             label: 'Ошибка' },
  { value: 'AWAITING_PAYMENT',  label: 'Ожидает оплату' },
] as const;

interface NetworkOption {
  id: string;
  name: string;
  slug: string;
}

export function OrdersFilterForm({ networks = [] }: { networks?: NetworkOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read current URL parameter values to pre-populate inputs
  const currentQ = searchParams.get('q') || '';
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

  // Check if any advanced filters are currently active in URL to auto-expand
  const hasActiveAdvancedFilters = !!(
    currentQ ||
    currentOrderId ||
    currentExternalId ||
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
    const params = new URLSearchParams();

    // Preserve original user ID or route ID filters if they exist
    const userId = searchParams.get('userId');
    if (userId) {
      params.set('userId', userId);
    }

    fd.forEach((value, key) => {
      const valStr = String(value).trim();
      // Only include non-empty values to keep URL clean and pretty
      if (valStr && valStr !== 'ALL') {
        params.set(key, valStr);
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.currentTarget.form?.requestSubmit();
  };

  const handleReset = () => {
    // Navigate to base pathname to fully clear all search filters
    router.push(pathname);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 3-Field Primary Search Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
        {/* Email клиента */}
        <div className="relative col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-2 space-y-1">
          <label className="block font-bold text-muted-foreground uppercase tracking-wider text-[9px] pl-1">Email клиента</label>
          <input
            type="text"
            name="clientEmail"
            defaultValue={currentClientEmail}
            placeholder="📧 Email (например: client@example.com)"
            className="w-full px-4 h-11 text-sm bg-background border border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200"
          />
        </div>

        {/* Соцсеть */}
        <div className="col-span-1 space-y-1">
          <label className="block font-bold text-muted-foreground uppercase tracking-wider text-[9px] pl-1">Социальная сеть</label>
          <select
            name="networkSlug"
            defaultValue={currentNetworkSlug}
            onChange={handleSelectChange}
            aria-label="Фильтр по соцсети"
            className="w-full px-3 h-11 text-sm border border-border rounded-xl bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200 cursor-pointer"
          >
            <option value="ALL">🌐 Все соцсети</option>
            {networks.map(n => (
              <option key={n.id} value={n.slug}>
                {n.name}
              </option>
            ))}
          </select>
        </div>

        {/* Ключевое слово */}
        <div className="relative col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-2 space-y-1">
          <label className="block font-bold text-muted-foreground uppercase tracking-wider text-[9px] pl-1">Ключевое слово в услуге</label>
          <input
            type="text"
            name="serviceName"
            defaultValue={currentServiceName}
            placeholder="🔍 Поиск (пример: подписчики -bot)"
            className="w-full px-4 h-11 text-sm bg-background border border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200"
          />
        </div>

        {/* Actions & Status Group */}
        <div className="col-span-1 space-y-1 w-full">
          <label className="block font-bold text-muted-foreground uppercase tracking-wider text-[9px] pl-1">Параметры</label>
          <div className="flex gap-2 items-center w-full justify-stretch">
            <select
              name="status"
              defaultValue={currentStatus}
              onChange={handleSelectChange}
              aria-label="Фильтр по статусу заказа"
              className="flex-1 min-w-0 px-2 h-11 text-xs border border-border rounded-xl bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200 cursor-pointer"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              aria-label="Показать дополнительные фильтры"
              className={`flex items-center justify-center gap-1.5 px-3 h-11 text-xs font-semibold border rounded-xl transition-all duration-200 cursor-pointer
                ${showAdvanced 
                  ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/15' 
                  : 'bg-background text-foreground border-border hover:bg-muted/50'
                }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="submit"
              className="px-4 h-11 text-xs font-bold text-primary-foreground bg-primary hover:opacity-90 active:opacity-95 shadow-sm rounded-xl transition-all duration-200 cursor-pointer"
            >
              Найти
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel (Framer Motion Drawer) */}
      <AnimatePresence initial={false}>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-1 border-t border-border/50 mt-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
                {/* General Omnibus Search Query */}
                <div className="space-y-1">
                  <label className="block font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Код оплаты / Чек</label>
                  <input
                    type="text"
                    name="q"
                    defaultValue={currentQ}
                    placeholder="ID платежа, чек кассы..."
                    className="w-full px-3 h-10 bg-background border border-border rounded-lg focus:border-primary outline-none text-foreground transition-all duration-200"
                  />
                </div>

                {/* Order Numeric ID */}
                <div className="space-y-1">
                  <label className="block font-bold text-muted-foreground uppercase tracking-wider text-[10px]">ID заказа (Число)</label>
                  <input
                    type="number"
                    name="orderId"
                    defaultValue={currentOrderId}
                    placeholder="Например: 310"
                    className="w-full px-3 h-10 bg-background border border-border rounded-lg focus:border-primary outline-none text-foreground transition-all duration-200 font-mono"
                  />
                </div>

                {/* Provider External ID */}
                <div className="space-y-1">
                  <label className="block font-bold text-muted-foreground uppercase tracking-wider text-[10px]">ID у провайдера</label>
                  <input
                    type="text"
                    name="externalId"
                    defaultValue={currentExternalId}
                    placeholder="Например: 1422"
                    className="w-full px-3 h-10 bg-background border border-border rounded-lg focus:border-primary outline-none text-foreground transition-all duration-200 font-mono"
                  />
                </div>

                {/* Target URL */}
                <div className="space-y-1">
                  <label className="block font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Ссылка заказа</label>
                  <input
                    type="text"
                    name="link"
                    defaultValue={currentLink}
                    placeholder="https://t.me/your_channel"
                    className="w-full px-3 h-10 bg-background border border-border rounded-lg focus:border-primary outline-none text-foreground transition-all duration-200 font-mono"
                  />
                </div>

                {/* Min / Max Price */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Цена заказа (RUB)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      name="minPrice"
                      defaultValue={currentMinPrice}
                      placeholder="От"
                      className="flex-1 px-3 h-10 bg-background border border-border rounded-lg focus:border-primary outline-none text-foreground transition-all duration-200 font-mono"
                    />
                    <span className="text-muted-foreground">—</span>
                    <input
                      type="number"
                      step="0.01"
                      name="maxPrice"
                      defaultValue={currentMaxPrice}
                      placeholder="До"
                      className="flex-1 px-3 h-10 bg-background border border-border rounded-lg focus:border-primary outline-none text-foreground transition-all duration-200 font-mono"
                    />
                  </div>
                </div>

                {/* Min / Max Quantity */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="block font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Объем заказа (Количество)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="minQuantity"
                      defaultValue={currentMinQty}
                      placeholder="От"
                      className="flex-1 px-3 h-10 bg-background border border-border rounded-lg focus:border-primary outline-none text-foreground transition-all duration-200 font-mono"
                    />
                    <span className="text-muted-foreground">—</span>
                    <input
                      type="number"
                      name="maxQuantity"
                      defaultValue={currentMaxQty}
                      placeholder="До"
                      className="flex-1 px-3 h-10 bg-background border border-border rounded-lg focus:border-primary outline-none text-foreground transition-all duration-200 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Reset Button Bar */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-4 h-9 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100/70 active:bg-rose-100 rounded-lg transition-all duration-200 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Очистить фильтры
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
