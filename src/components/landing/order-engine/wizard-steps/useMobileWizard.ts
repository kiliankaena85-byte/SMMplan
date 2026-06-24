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
  const [lastSelectedServiceId, setLastSelectedServiceId] = useState<string | undefined>(undefined);
  const [lastCategoryId, setLastCategoryId] = useState<string | null>(null);
  const [catalogHint, setCatalogHint] = useState(false);

  // Refs for scroll-into-view on step transitions
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);

  const setActiveStep = useCallback((step: 1 | 2 | 3 | 4) => {
    setActiveStepRaw(step);
    // Scroll to the new step after a short delay for AnimatePresence
    setTimeout(() => {
      const refMap: Record<number, React.RefObject<HTMLDivElement | null>> = { 2: step2Ref, 3: step3Ref, 4: step4Ref };
      const ref = refMap[step];
      if (ref?.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);
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

  useEffect(() => {
    setMounted(true);
    if (url.trim().length >= 5) {
      setLastResolvedUrl(url);
      if (selectedService) setActiveStep(4);
      else if (categoryId) setActiveStep(3);
      else setActiveStep(2);
    } else {
      if (selectedService) setCatalogHint(true);
      setActiveStep(1);
    }
  }, []);

  const proceedFromStep1 = () => {
    if (selectedService) setActiveStep(4);
    else if (categoryId) setActiveStep(3);
    else setActiveStep(2);
  };

  useEffect(() => {
    if (url.trim().length < 5) {
      setActiveStep(1);
      setLastResolvedUrl("");
      return;
    }
    if (!isLoading) {
      const isUrlValid = !validationErrors?.link && !localUrlError;
      if (isUrlValid && url !== lastResolvedUrl) {
        setLastResolvedUrl(url);
        if (selectedService) setActiveStep(4);
        else if (categoryId) setActiveStep(3);
        else setActiveStep(2);
      }
    }
  }, [isLoading, url, validationErrors?.link, localUrlError, lastResolvedUrl, selectedService, categoryId]);

  useEffect(() => {
    if (selectedService?.id !== lastSelectedServiceId) {
      setLastSelectedServiceId(selectedService?.id);
      if (selectedService) {
        if (url.trim().length >= 5) {
          setActiveStep(4);
        } else {
          setCatalogHint(true);
          setActiveStep(1);
        }
      } else {
        // Rollback step when selectedService is cleared (e.g. closing checkout drawer)
        if (url.trim().length >= 5) {
          if (categoryId) {
            setActiveStep(3);
          } else {
            setActiveStep(2);
          }
        } else {
          setActiveStep(1);
        }
      }
    }
  }, [selectedService, lastSelectedServiceId, url, categoryId, setActiveStep]);

  useEffect(() => {
    if (categoryId !== lastCategoryId) {
      setLastCategoryId(categoryId);
      if (categoryId && !selectedService && url.trim().length >= 5) {
        setActiveStep(3);
      } else if (!categoryId && url.trim().length >= 5) {
        setActiveStep(2);
      }
    }
  }, [categoryId, lastCategoryId, selectedService, url]);

  useEffect(() => {
    if (catalogHint && url.trim().length >= 5) {
      setCatalogHint(false);
    }
  }, [url, catalogHint]);

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

  const isLinkFilled = url.trim().length >= 5;
  const shouldShowCategories = isLinkFilled;
  const shouldShowTariffs = (isLinkFilled && !!categoryId) || !!selectedService;
  const shouldShowParameters = isLinkFilled && !!selectedService;
  const currentStep = activeStepRaw as number;

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
    shouldShowCategories,
    shouldShowTariffs,
    shouldShowParameters,
  };
}
