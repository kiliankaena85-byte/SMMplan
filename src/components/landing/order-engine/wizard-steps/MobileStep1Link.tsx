'use client';

import React from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { DynamicPayloadWarnings } from "../DynamicPayloadWarnings";
import { getSocialLinkConfig } from "@/utils/social-link-placeholder";
import { MobileStep1DetectionBadge } from "./MobileStep1DetectionBadge";
import { MobileStep1Summary } from "./MobileStep1Summary";
import { MobileStep1CatalogActions } from "./MobileStep1CatalogActions";
import { MobileStep1EmailCard } from "./MobileStep1EmailCard";
import { MobileStep1UrlHint } from "./MobileStep1UrlHint";
import { MobileStep1Input } from "./MobileStep1Input";

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
  step1Ref?: React.RefObject<HTMLDivElement | null>;
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
  onOpenCatalog,
  step1Ref,
}: MobileStep1LinkProps) {
  const { url, setUrl, setEmail, validationErrors, selectedService, activeNetwork, platform } = engine;
  const isEmailDetected = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url.trim());

  const step1LinkConfig = React.useMemo(() => (
    getSocialLinkConfig(activeNetwork?.slug || platform, null, null, null)
  ), [activeNetwork?.slug, platform]);

  const handleEnterPress = () => {
    if (isEmailDetected) {
      setEmail(url.trim());
      setUrl("");
      if (localUrlError) setLocalUrlError(null);
      toast.success("Email сохранен! Теперь вставьте ссылки на продвижение.");
      return;
    }
    proceedFromStep1();
  };

  if (currentStep !== 1) {
    return (
      <MobileStep1Summary
        url={url}
        setActiveStep={setActiveStep}
        step1Ref={step1Ref}
      />
    );
  }

  return (
    <div id="step-1" ref={step1Ref} className="space-y-2 scroll-mt-20">
      <div className="flex items-center justify-between pl-1">
        <label htmlFor="standard-url-input" className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
          1. Введите ссылку на канал, профиль или пост
        </label>
      </div>

      <MobileStep1EmailCard
        isEmailDetected={isEmailDetected}
        url={url}
        setEmail={setEmail}
        setUrl={setUrl}
        localUrlError={localUrlError}
        setLocalUrlError={setLocalUrlError}
      />

      <MobileStep1Input
        url={url}
        setUrl={setUrl}
        isFocused={isFocused}
        setIsFocused={setIsFocused}
        localUrlError={localUrlError}
        setLocalUrlError={setLocalUrlError}
        validationError={validationErrors?.link}
        step1LinkConfig={step1LinkConfig}
        onEnterPress={handleEnterPress}
      />

      {/* Smart Detection Live Badge */}
      <MobileStep1DetectionBadge engine={engine} url={url} />

      {/* Guidance card when bare handle or word without domain is entered */}
      <MobileStep1UrlHint
        urlHint={engine.urlHint}
        hasErrors={Boolean(validationErrors?.link || localUrlError)}
        url={url}
        setUrl={setUrl}
      />

      {(validationErrors?.link || localUrlError) && (
        <p id="mobile-step1-url-error" role="alert" aria-live="assertive" className="text-[11px] font-bold text-danger pl-1 animate-pulse">
          {validationErrors?.link || localUrlError}
        </p>
      )}

      {/* Dynamic Warnings & Smart Bridge */}
      {url.trim().length >= 5 && (
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

      <MobileStep1CatalogActions
        onOpenGuide={onOpenGuide}
        onOpenCatalog={onOpenCatalog}
        setActiveStep={setActiveStep}
      />
    </div>
  );
}
