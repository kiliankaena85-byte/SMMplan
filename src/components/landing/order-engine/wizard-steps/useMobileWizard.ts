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
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);

  const prevStepRef = useRef<1 | 2 | 3 | 4>(activeStepRaw);

  const scrollToStep = useCallback((step: 1 | 2 | 3 | 4) => {
    if (typeof window === 'undefined') return;
    const refMap: Record<number, React.RefObject<HTMLDivElement | null>> = {
      1: step1Ref,
      2: step2Ref,
      3: step3Ref,
      4: step4Ref,
    };
    const ref = refMap[step];
    if (ref?.current) {
      // Offset for sticky header (64px) + comfortable breathing room (16px) = 80px
      const headerOffset = 80;
      const elementTop = ref.current.getBoundingClientRect().top;
      const targetScrollY = window.pageYOffset + elementTop - headerOffset;
      window.scrollTo({
        top: Math.max(0, targetScrollY),
        behavior: 'smooth',
      });
    }
  }, []);

  const setActiveStep = useCallback((step: 1 | 2 | 3 | 4) => {
    userManuallyBrowsingRef.current = true;
    setActiveStepRaw(step);

    // Smooth scroll to the new step with dual timing (immediate + post Framer-motion unfold)
    setTimeout(() => scrollToStep(step), 100);
    setTimeout(() => scrollToStep(step), 280);
  }, [scrollToStep]);

  // Dual-phase scroll when activeStepRaw changes from any trigger
  useEffect(() => {
    if (!mounted) return;
    const t1 = setTimeout(() => scrollToStep(activeStepRaw), 120);
    const t2 = setTimeout(() => scrollToStep(activeStepRaw), 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeStepRaw, mounted, scrollToStep]);


  // Single effect to synchronize browser history outside of React render/setState updaters (B3)
  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return;
    const prevStep = prevStepRef.current;
    if (prevStep === activeStepRaw) return;
    prevStepRef.current = activeStepRaw;

    if (activeStepRaw > prevStep) {
      window.history.pushState({ wizardStep: activeStepRaw }, '', '#step-' + activeStepRaw);
    } else if (activeStepRaw === 1) {
      if (window.location.hash.startsWith('#step-')) {
        window.history.replaceState({ wizardStep: 1 }, '', window.location.pathname + window.location.search);
      }
    } else {
      window.history.replaceState({ wizardStep: activeStepRaw }, '', '#step-' + activeStepRaw);
    }
  }, [activeStepRaw, mounted]);

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
    services,
    isLoading,
    validationErrors,
  } = engine;

  // Once services finish loading for step 3, ensure tariffs remain comfortably in view
  useEffect(() => {
    if (mounted && activeStepRaw === 3 && services?.length > 0 && !isLoading) {
      const timer = setTimeout(() => scrollToStep(3), 150);
      return () => clearTimeout(timer);
    }
  }, [mounted, activeStepRaw, services?.length, isLoading, scrollToStep]);

  // CRITICAL INVARIANT:
  // 1. If auth_resume=1 or hash is #step-4 or selectedService is already set -> Step 4
  // 2. If valid url is already set -> Step 2
  // 3. DEFAULT: Always Step 1 (Вставьте ссылку) — never skip to Step 3 just because categoryId has default value!
  useEffect(() => {
    setMounted(true);
    const isResume = typeof window !== 'undefined' && (
      window.location.search.includes('auth_resume=1') ||
      window.location.hash === '#step-4'
    );
    if (isResume || selectedService) {
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
    step1Ref, step2Ref, step3Ref, step4Ref,
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
