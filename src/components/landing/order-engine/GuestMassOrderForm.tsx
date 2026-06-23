"use client";

import React, { useState, useEffect } from "react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { Loader2, LayoutList, Settings2, AlertCircle, AlertTriangle, Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/admin/hero-ui";

interface ValidMassOrder {
  numericId: number;
  link: string;
  priceRub: number;
}

interface GuestMassOrderFormProps {
  engine: OrderEngine;
  handleCheckout: () => void;
  isSubmitting: boolean;
}

export function GuestMassOrderForm({ engine, handleCheckout, isSubmitting }: GuestMassOrderFormProps) {
  const [mode, setMode] = useState<"simple" | "pro">("simple");

  const {
    unfilteredCatalog,
    networkId,
    setNetworkId,
    categoryId,
    setCategoryId,
    services,
    selectedService,
    setSelectedService,
    setUrl,
    massCalculation,
    isMassCalculating,
    isLoading,
  } = engine;

  // Local state for Visual (Simple) Mode inputs
  const [simpleLinks, setSimpleLinks] = useState("");
  const [simpleQuantity, setSimpleQuantity] = useState("100");

  // Local state for Pro Mode text area (debounced update to engine.url)
  const [proText, setProText] = useState("");

  // Sync mode transitions and clear engine URL on tab/mode switch
  useEffect(() => {
    setUrl("");
    setSimpleLinks("");
    setSimpleQuantity("100");
    setProText("");
  }, [mode, setUrl]);

  // Visual Mode computed text effect
  useEffect(() => {
    if (mode === "simple") {
      const trimmedLinks = simpleLinks.trim();
      const qtyNum = parseInt(simpleQuantity, 10);
      if (selectedService && trimmedLinks && !isNaN(qtyNum) && qtyNum > 0) {
        const computed = trimmedLinks
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => `${selectedService.numericId} | ${l} | ${simpleQuantity}`)
          .join("\n");
        setUrl(computed);
      } else {
        setUrl("");
      }
    }
  }, [mode, simpleLinks, simpleQuantity, selectedService, setUrl]);

  // Pro Mode input handler
  const handleProTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setProText(val);
    setUrl(val);
  };

  // Safe category selection defaults
  const handleNetworkSelect = (netId: string) => {
    if (navigator.vibrate) navigator.vibrate(15);
    setNetworkId(netId);
    const net = unfilteredCatalog.find((n) => n.id === netId);
    if (net && net.categories.length > 0) {
      setCategoryId(net.categories[0].id);
    } else {
      setCategoryId("");
    }
    setSelectedService(null);
  };

  const handleCategorySelect = (catId: string) => {
    setCategoryId(catId);
    setSelectedService(null);
  };

  // Formatting helpers
  const formatPricePerUnit = (price: number): string => {
    if (price === 0) return "0.00";
    let formatted: string;
    if (price < 0.01) {
      formatted = price.toFixed(6);
    } else if (price < 0.1) {
      formatted = price.toFixed(4);
    } else {
      formatted = price.toFixed(2);
    }

    if (formatted.includes(".")) {
      while (formatted.endsWith("0") && formatted.split(".")[1].length > 2) {
        formatted = formatted.slice(0, -1);
      }
    }
    return formatted;
  };

  const activeNetwork = unfilteredCatalog.find((n) => n.id === networkId);
  const categoriesList = activeNetwork ? activeNetwork.categories : [];

  const validCount = massCalculation?.validCount || 0;
  const errors = massCalculation?.errors || [];
  const validOrders = massCalculation?.validOrders || [];
  const totalRub = massCalculation?.totalRub || 0;

  // Maximum guest mass orders validation limit (50 lines)
  const linesCount = mode === "simple" 
    ? simpleLinks.split("\n").filter((l) => l.trim()).length
    : proText.split("\n").filter((l) => l.trim()).length;
  const isLimitExceeded = linesCount > 50;

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      {/* Segmented Mode Switcher */}
      <div className="flex w-full sm:w-max gap-1 p-1 bg-default-100 rounded-2xl border border-border/50">
        <button
          type="button"
          onClick={() => setMode("simple")}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            mode === "simple"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-default-200/50"
          }`}
        >
          <LayoutList className="w-4 h-4 shrink-0" />
          <span>Визуальный режим</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("pro")}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            mode === "pro"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-default-200/50"
          }`}
        >
          <Settings2 className="w-4 h-4 shrink-0" />
          <span>Pro (Текст)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Input Form Column */}
        <div className="lg:col-span-2 space-y-6 bg-content2/30 border border-border/40 rounded-[2rem] p-5 sm:p-6 shadow-sm">
          {mode === "simple" ? (
            <div className="space-y-5">
              {/* Platform Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">
                  Платформа
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {unfilteredCatalog.map((net) => {
                    const isSelected = networkId === net.id;
                    return (
                      <button
                        key={net.id}
                        type="button"
                        onClick={() => handleNetworkSelect(net.id)}
                        className={`h-11 px-4 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 flex items-center gap-2 border cursor-pointer ${
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]"
                            : "bg-content2 border-border/40 text-muted-foreground hover:text-foreground hover:bg-default-100"
                        }`}
                      >
                        {net.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Selector */}
              <div className="space-y-2">
                <label htmlFor="guest-category-select" className="block text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">
                  Категория
                </label>
                <div className="relative">
                  <select
                    id="guest-category-select"
                    value={categoryId || ""}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                    disabled={categoriesList.length === 0}
                    className="w-full h-12 pl-4 pr-10 rounded-xl border border-border bg-background text-sm font-semibold text-foreground outline-none transition-all duration-200 appearance-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer disabled:opacity-50"
                  >
                    <option value="" disabled>-- Выберите категорию --</option>
                    {categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>

              {/* Service Selector */}
              <div className="space-y-2">
                <label htmlFor="guest-service-select" className="block text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">
                  Услуга
                </label>
                <div className="relative">
                  <select
                    id="guest-service-select"
                    value={selectedService?.id || ""}
                    onChange={(e) => {
                      const s = services.find((x) => x.id === e.target.value);
                      setSelectedService(s || null);
                    }}
                    disabled={isLoading || services.length === 0}
                    className="w-full h-12 pl-4 pr-10 rounded-xl border border-border bg-background text-sm font-semibold text-foreground outline-none transition-all duration-200 appearance-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer disabled:opacity-50"
                  >
                    <option value="" disabled>-- Выберите услугу --</option>
                    {services.map((srv) => {
                      const isQuarantined = srv.cooldownUntil && new Date(srv.cooldownUntil) > new Date();
                      return (
                        <option key={srv.id} value={srv.id} disabled={!!isQuarantined}>
                          ID {srv.numericId} • {srv.name} — {formatPricePerUnit(srv.pricePerUnitRub)} ₽ / шт {isQuarantined ? "(Временно недоступна)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m6 9 6 6 6-6"/></svg>}
                  </div>
                </div>
                {selectedService && (
                  <div className="text-xs text-muted-foreground pl-1 mt-1 flex justify-between font-semibold">
                    <span>Минимум: {selectedService.minQty.toLocaleString()} шт.</span>
                    <span>Максимум: {selectedService.maxQty.toLocaleString()} шт.</span>
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <label htmlFor="guest-qty-input" className="block text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">
                  Количество (для каждой ссылки)
                </label>
                <input
                  id="guest-qty-input"
                  type="number"
                  value={simpleQuantity}
                  onChange={(e) => setSimpleQuantity(e.target.value)}
                  placeholder="Например: 100"
                  min={selectedService?.minQty || 1}
                  max={selectedService?.maxQty || 1000000}
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm font-bold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              {/* Links List */}
              <div className="space-y-2">
                <label htmlFor="guest-links-input" className="block text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1 flex items-center justify-between">
                  <span>Список ссылок</span>
                  <span className="bg-default-100 text-muted-foreground px-2 py-0.5 rounded text-[10px] font-bold">
                    {linesCount} / 50
                  </span>
                </label>
                <textarea
                  id="guest-links-input"
                  value={simpleLinks}
                  onChange={(e) => setSimpleLinks(e.target.value)}
                  placeholder="Вставьте список ссылок (каждая с новой строки)&#10;Пример:&#10;https://t.me/durov&#10;https://t.me/durov_channel"
                  className="w-full min-h-[160px] p-4 rounded-xl border border-border bg-background text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-y shadow-inner font-mono leading-relaxed"
                />
              </div>
            </div>
          ) : (
            // Pro (Text) Mode
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs font-semibold leading-relaxed text-foreground">
                  <p className="font-extrabold uppercase mb-1">Формат ввода:</p>
                  Каждая строка должна соответствовать шаблону: <code className="bg-content3 px-1.5 py-0.5 rounded text-primary">ID услуги | Ссылка | Количество</code>.
                  <p className="mt-1 opacity-70">
                    ID тарифов можно найти в каталоге услуг ниже или скопировать напрямую из карточек тарифов.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label htmlFor="guest-pro-input" className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Ввод заказов пакетом
                  </label>
                  <span className="bg-default-100 text-muted-foreground px-2 py-0.5 rounded text-[10px] font-bold">
                    {linesCount} / 50
                  </span>
                </div>
                <textarea
                  id="guest-pro-input"
                  value={proText}
                  onChange={handleProTextChange}
                  placeholder={`15 | https://t.me/durov | 100\n18 | https://vk.com/wall-1_1 | 500`}
                  className="w-full min-h-[240px] p-4 rounded-xl border border-border bg-background text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-y shadow-inner font-mono leading-relaxed"
                />
              </div>
            </div>
          )}

          {isLimitExceeded && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-in slide-in-from-top-1">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Гостевой лимит превышен (максимум 50 ссылок). Пожалуйста, сократите список или пройдите регистрацию для работы без ограничений.
              </span>
            </div>
          )}
        </div>

        {/* Calculation / Checkout Column */}
        <div className="space-y-6">
          {isMassCalculating ? (
            <div className="w-full flex flex-col items-center justify-center py-16 gap-4 bg-content2/30 border border-border/40 rounded-[2rem]">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-foreground">Анализируем список заказов...</p>
                <p className="text-xs text-muted-foreground">Рассчитываем тарифы и проверяем лимиты</p>
              </div>
            </div>
          ) : massCalculation ? (
            <div className="w-full bg-content2/30 border border-border/40 rounded-[2rem] p-6 shadow-sm space-y-6">
              <div>
                <h4 className="text-lg font-black text-foreground mb-1">Сводка по пакету</h4>
                <p className="text-xs text-muted-foreground">Итоговый расчет стоимости перед переходом к оплате</p>
              </div>

              {/* Brief orders preview */}
              {validOrders.length > 0 && (
                <div className="border border-border/50 rounded-2xl overflow-hidden bg-background max-h-[220px] overflow-y-auto custom-scrollbar">
                  <Table aria-label="Валидные заказы в пакете" className="w-full text-xs">
                    <Table.Header>
                      <Table.Column className="font-extrabold text-[10px]">Услуга</Table.Column>
                      <Table.Column className="font-extrabold text-[10px]">Ссылка</Table.Column>
                      <Table.Column className="font-extrabold text-[10px] text-right">Стоимость</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {(validOrders as ValidMassOrder[]).map((ord, idx) => (
                        <Table.Row key={idx} className="border-b border-border/50 last:border-0 hover:bg-default-50">
                          <Table.Cell className="font-bold text-primary">ID {ord.numericId}</Table.Cell>
                          <Table.Cell className="text-muted-foreground max-w-[120px] truncate">
                            <span title={ord.link}>{ord.link}</span>
                          </Table.Cell>
                          <Table.Cell className="text-right font-black tabular-nums">
                            {ord.priceRub ? ord.priceRub.toFixed(2) : "0.00"} ₽
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </div>
              )}

              {/* Parsing errors in lines */}
              {errors.length > 0 && (
                <div className="bg-warning/10 border border-warning/20 p-4 rounded-2xl text-xs text-warning-text max-h-[160px] overflow-y-auto">
                  <p className="font-extrabold mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Некоторые строки содержат ошибки ({errors.length}):
                  </p>
                  <ul className="list-disc pl-4 space-y-1 font-semibold leading-relaxed">
                    {errors.map((err, i) => (
                      <li key={i}>
                        Строка {err.line > 0 ? err.line : "?"}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-4 border-y border-border/50 py-4 font-semibold text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Всего позиций:</span>
                  <span className="text-foreground font-bold tabular-nums">{validOrders.length + errors.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Валидных заказов:</span>
                  <span className="text-success font-bold tabular-nums">{validCount}</span>
                </div>
                {errors.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Пропущено строк:</span>
                    <span className="text-destructive font-bold tabular-nums">{errors.length}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">
                  Общая стоимость
                </p>
                <p className="text-3xl font-black text-foreground tabular-nums">
                  {totalRub.toFixed(2)} <span className="text-xl font-black text-primary">₽</span>
                </p>
              </div>

              {/* Offerta notice */}
              <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed text-center px-1">
                Нажимая «Оформить пакет», вы соглашаетесь с{" "}
                <a href="/legal/terms" target="_blank" className="underline text-foreground/80 hover:text-primary">
                  Офертой
                </a>{" "}
                и{" "}
                <a href="/legal/privacy" target="_blank" className="underline text-foreground/80 hover:text-primary">
                  Политикой ФЗ-152
                </a>
              </p>

              <Button
                onClick={handleCheckout}
                disabled={validCount === 0 || isSubmitting || isLimitExceeded}
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Оформить пакет <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </Button>

              <div className="bg-primary/5 rounded-2xl p-4 flex gap-3 border border-primary/10">
                <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-foreground">Защищенная транзакция</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                    Платежи принимаются через ЮKassa и CryptoBot. Данные шифруются по стандарту PCI DSS.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border/50 rounded-[2rem] bg-content2/10">
              <LayoutList className="w-10 h-10 text-muted-foreground/40 mb-3 animate-pulse" />
              <p className="text-sm font-bold text-foreground mb-1">Заполните поля слева</p>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Введите ссылки на продвигаемые профили или посты для автоматического расчета сметы
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
