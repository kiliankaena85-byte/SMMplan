"use client";

import { CheckCircle2, AlertTriangle, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderEngine } from "@/hooks/useOrderEngine";

interface MassOrderPreviewProps {
  engine: OrderEngine;
  handleCheckout: () => void;
  isSubmitting: boolean;
}

export function MassOrderPreview({ engine, handleCheckout, isSubmitting }: MassOrderPreviewProps) {
  const { massCalculation, isMassCalculating, agreedToTerms, setAgreedToTerms } = engine;

  if (isMassCalculating) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-16 gap-4 bg-content2/50 rounded-[2.5rem] border border-border/50">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-base font-bold text-foreground">Анализируем список заказов...</p>
          <p className="text-sm text-muted-foreground">Проверяем доступность услуг и рассчитываем стоимость</p>
        </div>
      </div>
    );
  }

  if (!massCalculation) return null;

  const { totalRub, validCount, errors, validOrders } = massCalculation;

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 items-start animate-fade-in mt-2">
      {/* Left Column: Ordered items list */}
      <div className="flex-1 w-full space-y-4">
        <h3 className="font-extrabold text-foreground text-xl md:text-2xl mb-2 flex items-center gap-3">
          Состав пакета заказов
          <span className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
            {validCount + errors.length} строк
          </span>
        </h3>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {/* Render Valid Orders */}
          {validOrders.map((order, i) => (
            <div
              key={`valid-${i}`}
              className="bg-content2 border border-green-500/20 hover:border-green-500/40 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 shadow-sm"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                      ID {order.serviceId}
                    </span>
                    <h4 className="text-sm font-bold text-foreground truncate max-w-[250px] sm:max-w-[350px]">
                      {order.serviceName}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1 font-semibold select-all">
                    {order.link}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 justify-between md:justify-end shrink-0 border-t md:border-t-0 border-border/50 pt-2 md:pt-0">
                <div className="text-left md:text-right">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">
                    Количество
                  </p>
                  <p className="text-sm font-black text-foreground tabular-nums">
                    {order.quantity.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">
                    Стоимость
                  </p>
                  <p className="text-base font-black text-primary tabular-nums">
                    {(order.priceRub).toFixed(2)} ₽
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Render Errors */}
          {errors.map((err, i) => (
            <div
              key={`err-${i}`}
              className="bg-content2 border border-red-500/20 hover:border-red-500/40 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 shadow-sm"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                      Строка {err.line}
                    </span>
                    <h4 className="text-sm font-bold text-red-500">Ошибка разбора</h4>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1 font-mono font-medium bg-content3/50 px-2 py-1 rounded-lg">
                    {err.text || "[пустая строка]"}
                  </p>
                  <p className="text-xs text-red-500 font-bold mt-1.5 flex items-center gap-1">
                    • {err.error}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {validOrders.length === 0 && errors.length === 0 && (
            <div className="text-center py-12 bg-content2 rounded-2xl border border-dashed border-border/50 text-muted-foreground">
              Введите заказы в формате: ID услуги | Ссылка | Количество
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Checkout Summary Sticky Card */}
      <div className="w-full lg:w-96 shrink-0 bg-content2 border border-border/60 rounded-3xl p-6 shadow-sm space-y-6 lg:sticky lg:top-24">
        <div>
          <h4 className="text-lg font-black text-foreground mb-1">Сводка по пакету</h4>
          <p className="text-xs text-muted-foreground">Итоговый расчет стоимости перед переходом к оплате</p>
        </div>

        <div className="space-y-3 border-y border-border/50 py-4 font-semibold text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Всего позиций:</span>
            <span className="text-foreground font-bold tabular-nums">{validOrders.length + errors.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Валидных заказов:</span>
            <span className="text-green-500 font-bold tabular-nums">{validCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Заказов с ошибками:</span>
            <span className="text-red-500 font-bold tabular-nums">{errors.length}</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider leading-none">Общая стоимость</p>
          <p className="text-4xl font-black text-foreground tabular-nums">
            {totalRub.toFixed(2)} <span className="text-2xl font-black text-primary">₽</span>
          </p>
        </div>

        {/* Terms agreement checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group select-none">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-5 h-5 rounded-md border-2 shrink-0 transition-all flex items-center justify-center ${
              agreedToTerms
                ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20 scale-100"
                : "border-border hover:border-primary/50"
            }`}
          >
            {agreedToTerms && (
              <svg className="w-3.5 h-3.5 stroke-current stroke-[3]" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </div>
          <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
            Я согласен с правилами предоставления услуг и договором{" "}
            <a href="/terms" target="_blank" className="text-primary hover:underline">
              Публичной оферты
            </a>
          </span>
        </label>

        <Button
          onClick={handleCheckout}
          disabled={validCount === 0 || isSubmitting}
          className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Оформить пакет <ChevronRight className="w-5 h-5" />
            </>
          )}
        </Button>

        <div className="bg-primary/5 rounded-2xl p-4 flex gap-3 border border-primary/10">
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-foreground">Защищенный шлюз</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
              Все платежи обрабатываются через сертифицированный шлюз YooKassa с поддержкой 3D-Secure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      className="w-4 h-4"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
