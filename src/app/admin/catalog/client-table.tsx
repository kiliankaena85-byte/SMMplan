'use client';

import { ProgressBar, Button as HeroButton, Switch } from "@heroui/react";
import { updateMarkupAction, toggleServiceAction } from '@/actions/admin/catalog';
import { TOTAL_MANDATORY_DEDUCTIONS, SAFETY_FLOOR_MARKUP, applyBeautifulRounding, USD_TO_RUB } from '@/lib/financial-constants';
import { ActionForm } from '@/components/admin/action-form';
import { useRef, useState } from "react";

const SAFETY_MULTIPLIER = (1 + SAFETY_FLOOR_MARKUP) / (1 - TOTAL_MANDATORY_DEDUCTIONS);

function calcSellingPrice(ratePerK: number, markup: number, usdToRub: number): number {
  return ratePerK * markup * usdToRub;
}

function PricingCell({ service }: { service: any }) {
  const [markup, setMarkup] = useState(service.markup);
  const [price, setPrice] = useState(calcSellingPrice(service.rate, service.markup, USD_TO_RUB));
  const formRef = useRef<HTMLFormElement>(null);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = parseFloat(e.target.value) || 0;
    setPrice(newPrice);
    const newMarkup = (service.rate > 0) ? (newPrice / (service.rate * USD_TO_RUB)) : 3.0;
    setMarkup(newMarkup);
  };

  const handleMarkupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMarkup = parseFloat(e.target.value) || 1.0;
    setMarkup(newMarkup);
    setPrice(calcSellingPrice(service.rate, newMarkup, USD_TO_RUB));
  };

  const isBelowSafety = markup < SAFETY_MULTIPLIER;
  const progressValue = Math.min((markup / 5) * 100, 100);
  const progressColor = isBelowSafety ? "danger" : (markup > 3 ? "success" : "warning");

  return (
    <div className="flex items-start gap-4">
      <ActionForm action={updateMarkupAction} formRef={formRef} className="flex gap-2 isolate">
        <input type="hidden" name="serviceId" value={service.id} />
        <input type="hidden" name="markup" value={markup.toFixed(2)} />
        
        <div className="flex flex-col gap-1 relative">
          <label className="text-[9px] uppercase text-slate-400 font-semibold mb-[-4px]">Продажа (₽)</label>
          <input
            type="number"
            step="0.01"
            value={price === 0 ? '' : price.toFixed(2)}
            onChange={handlePriceChange}
            onBlur={() => formRef.current?.requestSubmit()}
            className={`w-20 px-2 py-1 text-sm font-mono font-bold rounded-lg outline-none transition-all tabular-nums shadow-sm
              ${isBelowSafety ? 'border border-rose-300 bg-rose-50 text-rose-900 focus:ring-2 focus:ring-rose-500/20' 
              : 'border border-slate-200 bg-white text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 hover:border-slate-300'}
            `}
          />
        </div>
        
        <div className="flex flex-col gap-1 relative">
          <label className="text-[9px] uppercase text-slate-400 font-semibold mb-[-4px]">Маржа (x)</label>
          <input
            type="number"
            step="0.1"
            value={markup === 0 ? '' : markup.toFixed(2)}
            onChange={handleMarkupChange}
            onBlur={() => formRef.current?.requestSubmit()}
            className="w-16 px-2 py-1 text-xs font-mono rounded-lg outline-none transition-all tabular-nums border border-slate-200 bg-slate-50 text-slate-500 hover:bg-white focus:bg-white focus:border-sky-500"
          />
        </div>
      </ActionForm>
      
      <div className="flex flex-col gap-1 w-24 pt-4">
        <ProgressBar value={progressValue} size="sm" color={progressColor} className="bg-slate-100" />
        <span className={`text-[9px] font-semibold leading-none ${isBelowSafety ? "text-rose-500" : "text-emerald-600"}`}>
          {isBelowSafety ? `УБЫТОК < ${SAFETY_MULTIPLIER.toFixed(1)}` : `Маржа +${((markup-1)*100).toFixed(0)}%`}
        </span>
      </div>
    </div>
  );
}

function StatusSwitch({ service }: { service: any }) {
  const formRef = useRef<HTMLFormElement>(null);
  
  return (
    <form ref={formRef} action={toggleServiceAction} className="flex items-center justify-end">
      <input type="hidden" name="serviceId" value={service.id} />
      <input type="hidden" name="isActive" value={service.isActive ? 'false' : 'true'} />
      <Switch 
        isSelected={service.isActive} 
        onChange={() => formRef.current?.requestSubmit()} 
        size="sm" 
      />
    </form>
  );
}

export function CatalogTable({ services }: { services: any[] }) {
  return (
    <div className="rounded-2xl border border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-medium text-slate-700">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-widest text-slate-400 bg-slate-50/50">
              <th className="py-3.5 px-4 font-bold">ID</th>
              <th className="py-3.5 px-4 font-bold min-w-[200px]">Услуга</th>
              <th className="py-3.5 px-4 font-bold text-right hidden sm:table-cell">Закуп ($)</th>
              <th className="py-3.5 px-4 font-bold">Ценообразование (Розница & Маржа)</th>
              <th className="py-3.5 px-4 font-bold text-right hidden lg:table-cell">Лимиты</th>
              <th className="py-3.5 px-4 font-bold text-right hidden sm:table-cell">Заказы</th>
              <th className="py-3.5 px-4 font-bold text-right">Активность</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s: any) => {
              const sellingPrice = calcSellingPrice(s.rate, s.markup, USD_TO_RUB);
              const roundedPrice = applyBeautifulRounding(sellingPrice);
              const margin = ((s.markup - 1) * 100).toFixed(0);
              const isBelowSafety = s.markup < SAFETY_MULTIPLIER;

              const progressValue = Math.min((s.markup / 5) * 100, 100);
              const progressColor = isBelowSafety ? "danger" : (s.markup > 3 ? "success" : "warning");

              return (
                <tr 
                  key={s.id} 
                  className={`transition-colors even:bg-slate-50/30 group ${!s.isActive ? 'opacity-50 grayscale bg-slate-50/10' : 'hover:bg-slate-50/80'}`}
                >
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-xs tabular-nums text-slate-500">#{s.numericId}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="max-w-[200px]">
                      <span className={`font-semibold truncate block text-xs ${!s.isActive ? 'text-slate-500' : 'text-slate-900'}`}>{s.name}</span>
                      {s.badge && (
                        <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-700 rounded px-1.5 py-px inline-block mt-1 mb-1">
                          {s.badge}
                        </span>
                      )}
                      {s.externalId && (
                        <div className="text-[10px] text-slate-400 mt-1">Provider ID: {s.externalId}</div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="text-xs text-slate-500">{s.category?.name || "Без категории"}</span>
                  </td>
                  <td className="py-3 px-4 text-right hidden sm:table-cell">
                    <span className="font-mono text-[11px] font-medium tabular-nums text-slate-600 bg-slate-100/80 px-1.5 py-0.5 rounded border border-slate-200">
                      ${s.rate.toFixed(4)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <PricingCell service={s} />
                  </td>
                  <td className="py-3 px-4 text-right hidden lg:table-cell">
                    <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {s.minQty.toLocaleString('ru-RU')} – {s.maxQty.toLocaleString('ru-RU')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right hidden sm:table-cell">
                    <span className="text-xs font-medium text-slate-600 tabular-nums">
                      {s._count?.orders?.toLocaleString('ru-RU') || 0}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <StatusSwitch service={s} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {services.length === 0 && (
        <div className="h-24 w-full flex items-center justify-center text-sm text-slate-500 bg-white">
          Нет услуг.
        </div>
      )}
    </div>
  );
}
