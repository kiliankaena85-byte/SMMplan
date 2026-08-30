import React from "react";
import { Link2, AlertCircle, ChevronDown, ClipboardPaste } from "lucide-react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { DynamicPayloadWarnings } from "../DynamicPayloadWarnings";

interface MobileStep1LinkProps {
  engine: OrderEngine;
  currentStep: number;
  setActiveStep: (step: 1 | 2 | 3 | 4) => void;
  proceedFromStep1: () => void;
  isFocused: boolean;
  setIsFocused: (focused: boolean) => void;
  localUrlError: string | null;
  setLocalUrlError: (error: string | null) => void;
  catalogHint: boolean;
  onOpenGuide?: () => void;
  onOpenCatalog?: () => void;
}

export function MobileStep1Link({
  engine,
  currentStep,
  setActiveStep,
  proceedFromStep1,
  isFocused,
  setIsFocused,
  localUrlError,
  setLocalUrlError,
  catalogHint,
  onOpenGuide,
  onOpenCatalog
}: MobileStep1LinkProps) {
  const { url, setUrl, validationErrors, selectedService } = engine;

  const handlePasteFromClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
          setUrl(text.trim());
          if (localUrlError) setLocalUrlError(null);
        }
      }
    } catch {
      // Non-blocking clipboard permission fallback
    }
  };

  if (currentStep !== 1) {
    if (url.trim().length >= 5) {
      return (
        <button
          type="button"
          onClick={() => setActiveStep(1)}
          className="w-full text-left p-3 bg-content2 hover:bg-content3 border border-border/40 rounded-2xl flex items-center justify-between transition-all cursor-pointer active:scale-[0.99]"
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider">1. Ссылка на канал / пост</span>
            <span className="text-xs font-bold text-foreground truncate font-mono">
              {url}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 rotate-90" />
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setActiveStep(1)}
        className="w-full text-left p-3 bg-primary/5 hover:bg-primary/10 border border-dashed border-primary/40 rounded-2xl flex items-center justify-between transition-all cursor-pointer active:scale-[0.99]"
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] text-primary uppercase font-extrabold tracking-wider">1. Ссылка на канал / пост</span>
          <span className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Укажите ссылку для заказа</span>
          </span>
        </div>
        <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg shrink-0">
          Ввести →
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pl-1">
        <label htmlFor="standard-url-input" className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
          1. Введите ссылку на канал, профиль или пост
        </label>
      </div>
      
      <div className={`relative w-full group rounded-2xl transition-all duration-300 ${isFocused ? 'p-[2px] scale-[1.01]' : 'p-[1px] scale-100'}`}>
        <div
          className={`absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none ${
            validationErrors?.link || localUrlError
              ? "warning-border-shimmer opacity-100"
              : "google-border-shimmer opacity-100"
          }`}
        />
        
        <div
          className={`absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none blur-md ${
            validationErrors?.link || localUrlError
              ? "warning-border-shimmer opacity-40"
              : isFocused
              ? "google-border-shimmer opacity-60 scale-[1.02]"
              : "google-border-shimmer opacity-20 group-hover:opacity-35"
          }`}
        />
        
        <div className="relative flex items-center w-full bg-content1 rounded-2xl p-0.5 z-10">
          <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <input
            id="standard-url-input"
            type="url"
            value={url}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={e => {
              setUrl(e.target.value);
              if (localUrlError) setLocalUrlError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                proceedFromStep1();
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="https://t.me/channel_or_post"
            aria-label="Введите ссылку на канал, профиль или пост"
            aria-describedby={validationErrors?.link || localUrlError ? "mobile-step1-url-error" : undefined}
            className="w-full h-11 pl-10 pr-24 rounded-2xl bg-transparent text-base font-semibold text-foreground placeholder:text-muted-foreground/50 outline-none border-none"
          />
          {url.trim().length === 0 ? (
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <ClipboardPaste className="w-3 h-3" />
              <span>Вставить</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setUrl('');
                if (localUrlError) setLocalUrlError(null);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {validationErrors?.link && (
        <p id="mobile-step1-url-error" role="alert" aria-live="assertive" className="text-[11px] font-bold text-danger pl-1 animate-pulse">
          {validationErrors.link}
        </p>
      )}
      {localUrlError && (
        <p id="mobile-step1-url-error" role="alert" aria-live="assertive" className="text-[11px] font-bold text-danger pl-1 animate-pulse">
          {localUrlError}
        </p>
      )}

      {(validationErrors?.link || localUrlError) && (
        <div className="mt-1.5">
          <DynamicPayloadWarnings engine={engine} minimalMode={true} />
        </div>
      )}

      {catalogHint && selectedService && (
        <div className="flex items-start gap-2.5 p-3 bg-primary/5 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-foreground/80 font-semibold leading-relaxed">
            <span className="font-extrabold text-foreground">Тариф «{selectedService.name}» выбран.</span>{" "}
            Теперь вставьте ссылку на ваш канал, пост или профиль, чтобы оформить заказ.
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1.5">
        <div className="flex justify-between items-center px-1">
          <button
            type="button"
            onClick={onOpenGuide}
            aria-label="Где взять ссылку для заказа? Гайд по ссылкам"
            className="text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-1 cursor-pointer active:scale-95 transition-all h-10 px-1 -ml-1"
          >
            <span>❓</span>
            <span className="underline">Где взять ссылку?</span>
          </button>
        </div>
        
        <button
          type="button"
          onClick={() => {
            if (onOpenCatalog) {
              onOpenCatalog();
            } else {
              setActiveStep(2);
            }
          }}
          className="text-xs font-bold text-primary hover:underline h-11 min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 w-full border border-dashed border-primary/30 rounded-xl bg-primary/5 active:scale-95 transition-all cursor-pointer"
        >
          <span>📂</span>
          <span>Или выбрать услугу вручную из каталога →</span>
        </button>
      </div>
    </div>
  );
}
