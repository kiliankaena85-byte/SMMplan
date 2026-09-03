import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { cleanCategoryName } from "@/components/ui/CategoryIcon";
import { getBrandStyles } from "@/utils/brand-styles";

export function useMobileWizard(engine: OrderEngine) {
  const [isFocused, setIsFocused] = useState(false);
  const [localUrlError, setLocalUrlError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeStepRaw, setActiveStepRaw] = useState<1 | 2 | 3 | 4>(1);
  const [lastResolvedUrl, setLastResolvedUrl] = useState<string>("");
  const [catalogHint, setCatalogHint] = useState(false);
  const userManuallyBrowsingRef = useRef(false);

  // Refs for scroll-into-view on step transitions
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);

  const setActiveStep = useCallback((step: 1 | 2 | 3 | 4) => {
    userManuallyBrowsingRef.current = true;
    setActiveStepRaw((prevStep) => {
      if (prevStep === step) return prevStep;
      
      if (typeof window !== 'undefined') {
        if (step > prevStep) {
          window.history.pushState({ wizardStep: step }, '', '#step-' + step);
        } else if (step === 1) {
          if (window.location.hash.startsWith('#step-')) {
            window.history.replaceState({ wizardStep: 1 }, '', window.location.pathname + window.location.search);
          }
        } else {
          window.history.replaceState({ wizardStep: step }, '', '#step-' + step);
        }
      }

      return step;
    });

    // Smooth scroll to the new step without jumping
    setTimeout(() => {
      const refMap: Record<number, React.RefObject<HTMLDivElement | null>> = { 2: step2Ref, 3: step3Ref, 4: step4Ref };
      const ref = refMap[step];
      if (ref?.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, []);

  // Listen to browser Back button / gesture (popstate)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      const hash = window.location.hash;
      let targetStep: 1 | 2 | 3 | 4 = 1;
      if (event.state?.wizardStep && typeof event.state.wizardStep === 'number') {
        targetStep = event.state.wizardStep as 1 | 2 | 3 | 4;
      } else if (hash.startsWith('#step-')) {
        const parsed = parseInt(hash.replace('#step-', ''), 10);
        if (parsed >= 1 && parsed <= 4) targetStep = parsed as 1 | 2 | 3 | 4;
      }

      userManuallyBrowsingRef.current = true;
      setActiveStepRaw(targetStep);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const {
    url,
    networkId,
    categoryId,
    selectedService,
    catalog,
    isLoading,
    validationErrors,
  } = engine;

  // CRITICAL INVARIANT:
  // 1. If selectedService is already set (e.g. from Catalog Modal / deep link) -> Step 4
  // 2. If valid url is already set -> Step 2
  // 3. DEFAULT: Always Step 1 (Вставьте ссылку) — never skip to Step 3 just because categoryId has default value!
  useEffect(() => {
    setMounted(true);
    if (selectedService) {
      setActiveStepRaw(4);
    } else if (url && url.trim().length >= 5) {
      setLastResolvedUrl(url);
      setActiveStepRaw(2);
    } else {
      setActiveStepRaw(1);
    }
  }, []);

  const proceedFromStep1 = () => {
    userManuallyBrowsingRef.current = true;
    if (selectedService) setActiveStep(4);
    else setActiveStep(2);
  };

  // URL auto-detection sync: when user pastes a valid link in Step 1, advance to next logical step
  useEffect(() => {
    if (!isLoading && url && url.trim().length >= 5) {
      const isUrlValid = !validationErrors?.link && !localUrlError;
      if (isUrlValid && url !== lastResolvedUrl) {
        setLastResolvedUrl(url);
        if (activeStepRaw === 1) {
          userManuallyBrowsingRef.current = true;
          if (selectedService) setActiveStep(4);
          else setActiveStep(2);
        }
      }
    }
  }, [isLoading, url, validationErrors?.link, localUrlError, lastResolvedUrl, selectedService, categoryId, activeStepRaw, setActiveStep]);

  const prevSelectedServiceIdRef = useRef<string | null>(selectedService?.id || null);
  const prevCategoryIdRef = useRef<string | null>(categoryId || null);

  // Reactive selection auto-advance: ONLY advance to Step 4 when the user actually picks a service.
  // Never auto-advance to Step 3 on category change (Step 3 advance is triggered explicitly by user clicking a category chip).
  useEffect(() => {
    if (!userManuallyBrowsingRef.current && activeStepRaw === 1 && !selectedService) {
      return;
    }

    if (selectedService && selectedService.id !== prevSelectedServiceIdRef.current) {
      prevSelectedServiceIdRef.current = selectedService.id;
      setActiveStep(4);
    } else if (!selectedService) {
      prevSelectedServiceIdRef.current = null;
    }

    if (categoryId && categoryId !== prevCategoryIdRef.current) {
      prevCategoryIdRef.current = categoryId;
    } else if (!categoryId) {
      prevCategoryIdRef.current = null;
    }
  }, [selectedService, categoryId, activeStepRaw, setActiveStep]);

  const selectedCategoryName = useMemo(() => {
    if (!catalog || !networkId || !categoryId) return "Тарифы";
    const net = catalog.find(n => n.id === networkId);
    if (!net) return "Тарифы";
    const cat = net.categories.find(c => c.id === categoryId);
    return cat ? cleanCategoryName(cat.name) : "Тарифы";
  }, [catalog, networkId, categoryId]);

  const brandStyle = useMemo(() => {
    if (!catalog || !networkId) return undefined;
    const net = catalog.find(n => n.id === networkId);
    return net ? getBrandStyles(net.slug) : undefined;
  }, [catalog, networkId]);

  const isLinkFilled = Boolean(url && url.trim().length >= 5);
  const hasCategory = Boolean(categoryId);
  const hasService = Boolean(selectedService);
  const shouldShowCategories = true;
  const shouldShowTariffs = true;
  const shouldShowParameters = true;
  const currentStep = activeStepRaw as 1 | 2 | 3 | 4;

  return {
    isFocused, setIsFocused,
    localUrlError, setLocalUrlError,
    mounted,
    currentStep, setActiveStep,
    step2Ref, step3Ref, step4Ref,
    catalogHint, setCatalogHint,
    proceedFromStep1,
    selectedCategoryName,
    brandStyle,
    isLinkFilled,
    hasCategory,
    hasService,
    shouldShowCategories,
    shouldShowTariffs,
    shouldShowParameters,
  };
}
