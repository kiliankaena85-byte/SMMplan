'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { analyzeUrl } from "@/actions/order/analyze-url";
import { getServicesByCategoryAction, PublicNetwork, PublicCategory, PublicService, getPublicCatalogAction } from "@/actions/order/catalog";
import { calculatePriceAction } from "@/actions/order/checkout";
import { PricingResult } from "@/services/marketing.service";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { mutateLink, getLinkValidator } from "@/validators/link-mutators";
import { formatCents } from "@/lib/utils";
import { orderFormSchema } from "@/validators/order.validators";
import { matchesSuggestedCategory } from "@/services/analyzer/category-matcher";
import {
  inferTargetTypeFromCategory,
  inferTargetTypeFromName,
  isTargetTypeCompatible,
  normalizeTargetType,
  TargetTypeEnum
} from "@/utils/target-type";
import { toast } from "sonner";

export type OrderEngine = ReturnType<typeof useOrderEngine>;

function getCategoryDemandScore(name: string): number {
  const n = name.toLowerCase();
  
  if ((n.includes('подписчик') || n.includes('участник') || n.includes('follow') || n.includes('member')) && !n.includes('premium') && !n.includes('премиум') && !n.includes('бот')) {
    return 10;
  }
  if (n.includes('просмотр') || n.includes('охват') || n.includes('view') || n.includes('watch') || n.includes('stat') || n.includes('стат')) {
    return 20;
  }
  if (n.includes('лайк') || n.includes('like') || n.includes('нравится') || n.includes('heart')) {
    return 30;
  }
  if (n.includes('реакц') || n.includes('reaction') || n.includes('emoji') || n.includes('эмоци')) {
    return 40;
  }
  if (n.includes('premium') || n.includes('премиум')) {
    return 95;
  }
  if (n.includes('буст') || n.includes('boost') || n.includes('level')) {
    return 60;
  }
  if (n.includes('коммент') || n.includes('comment') || n.includes('отзыв') || n.includes('review')) {
    return 70;
  }
  if (n.includes('репост') || n.includes('repost') || n.includes('share') || n.includes('поделит')) {
    return 80;
  }
  if (n.includes('звезд') || n.includes('star') || n.includes('coin')) {
    return 90;
  }
  if (n.includes('бот') || n.includes('bot') || n.includes('инвайт') || n.includes('invite') || n.includes('referral') || n.includes('рефер')) {
    return 100;
  }
  return 999;
}

function sortCategories<T extends { name: string }>(categories: T[]): T[] {
  return [...categories].sort((a, b) => {
    const scoreA = getCategoryDemandScore(a.name);
    const scoreB = getCategoryDemandScore(b.name);
    
    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }
    return a.name.localeCompare(b.name);
  });
}

export function useOrderEngine(
  initialCatalog: PublicNetwork[] = [], 
  initialEmail: string = "", 
  initialServiceId: string = "",
  initialCategoryId: string = "",
  initialNetworkId: string = "",
  initialServices: PublicService[] = []
) {
  const sortedInitialCatalog: PublicNetwork[] = useMemo(() => {
    return initialCatalog.map(net => ({
      ...net,
      categories: sortCategories(net.categories)
    }));
  }, [initialCatalog]);

  // Smart defaults: preselect Telegram + Подписчики so user can browse immediately.
  // User chooses their own path: link-first OR browse-first — we don't restrict.
  const defaultNet = sortedInitialCatalog.length > 0 
    ? (initialNetworkId ? sortedInitialCatalog.find(n => n.id === initialNetworkId) : null) || (sortedInitialCatalog.find((n: PublicNetwork) => n.slug === 'telegram') || sortedInitialCatalog[0]) 
    : null;
  const defaultCat = defaultNet && defaultNet.categories.length > 0 
    ? (initialCategoryId ? defaultNet.categories.find(c => c.id === initialCategoryId) : null) || (defaultNet.categories.find((c: PublicCategory) => c.name.toLowerCase().includes('подписчики')) || defaultNet.categories[0]) 
    : null;

  const [url, setUrl] = useState("");
  const [networkId, setNetworkId] = useState(defaultNet?.id || "");
  const [categoryId, setCategoryId] = useState(defaultCat?.id || "");
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [email, setEmail] = useState(initialEmail);
  const [customData, setCustomData] = useState("");
  const [mediaGroupUrl, setMediaGroupUrl] = useState("");
  const [promoCode, setPromoCode] = useState("");
  // BUG-03: Default to false — per ст. 438 ГК РФ & 152-FZ, user must actively agree.
  // The text "Нажимая «Оплатить», вы соглашаетесь..." is replaced by active checkbox.
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLinkOverridden, setIsLinkOverridden] = useState(false);
  const [isWarningConfirmed, setIsWarningConfirmed] = useState(false);
  const [warningHasError, setWarningHasError] = useState(false);

  // BUG-10: Restore session state on mount (url, networkId, categoryId only — no email/promo per PCI DSS)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('smmplan_draft');
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.url && typeof draft.url === 'string' && draft.url !== 'https://' && draft.url !== 'http://') {
          setUrl(draft.url);
        }
        if (draft.networkId && sortedInitialCatalog.some((n: PublicNetwork) => n.id === draft.networkId)) {
          setNetworkId(draft.networkId);
        }
        if (draft.categoryId) setCategoryId(draft.categoryId);
        if (draft.quantity && typeof draft.quantity === 'number' && draft.quantity > 0) {
          setQuantity(draft.quantity);
        }
      }
    } catch { /* sessionStorage unavailable (SSR/incognito) */ }
   
  }, []);

  // BUG-10: Save draft progress to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('smmplan_draft', JSON.stringify({
        url, networkId, categoryId, quantity
      }));
    } catch { /* sessionStorage unavailable */ }
  }, [url, networkId, categoryId, quantity]);

  // Reset category when URL transitions to filled state (length >= 5) and no service is selected yet
  const prevUrlRef = useRef("");
  useEffect(() => {
    const prevUrl = prevUrlRef.current;
    if (url.trim().length >= 5 && prevUrl.trim().length < 5 && !selectedServiceRef.current) {
      setCategoryId("");
    }
    prevUrlRef.current = url;
  }, [url]);
  
  // Drip-feed states
  const [dripFeedEnabled, setDripFeedEnabled] = useState(false);
  const [runs, setRuns] = useState(2);
  const [dripInterval, setDripInterval] = useState(5);

  // Smart Drip states
  const [isSmartDrip, setIsSmartDrip] = useState(false);
  const [smartDripDays, setSmartDripDays] = useState(7);

  // Data states - initialized with SSR pre-fetched services to prevent client waterfall
  const [catalog, setCatalog] = useState<PublicNetwork[]>(sortedInitialCatalog);
  const [services, setServices] = useState<PublicService[]>(initialServices);
  const isInitialServicesMount = useRef(initialServices.length > 0);
  const [platform, setPlatform] = useState<IntelligencePlatform | null>(null);
  const [manualPlatform, setManualPlatform] = useState<IntelligencePlatform | null>(null);
  const [promoPricing, setPromoPricing] = useState<PricingResult | null>(null);
  const [pricingError, setPricingError] = useState<'voucher' | null>(null);
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [detectedType, setDetectedType] = useState<string | null>(null);
  
  // Mass Order states
  const [massCalculation, setMassCalculation] = useState<{
    totalRub: number;
    totalCents: number;
    validCount: number;
    errors: { line: number; text: string; error: string }[];
        validOrders: Array<{ priceRub?: number; serviceId: string; numericId?: number; link: string; quantity: number; providerId?: string | null; providerServiceId?: string | null; costRub?: number }>;
  } | null>(null);
  const [isMassCalculating, setIsMassCalculating] = useState(false);
  const isMassMode = url.includes("\n") || url.split(/\s+/).filter(Boolean).length > 1;

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [urlMutatedTrigger, setUrlMutatedTrigger] = useState(false);


  const handleSetUrl = useCallback((newUrl: string) => {
    setUrl(newUrl);
    setIsLinkOverridden(false);
    setIsWarningConfirmed(false);
    setWarningHasError(false);
    if (!newUrl) {
      setValidationErrors(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { link, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  const handleSetManualPlatform = useCallback((p: IntelligencePlatform | null) => {
    setManualPlatform(p);
    if (p !== null) {
      setSuggestedCategories([]);
    }
  }, []);

  const hasFetchedCatalog = useRef(false);
  const lastPlatformRef = useRef<IntelligencePlatform | null>(null);
  const lastManualPlatformRef = useRef<IntelligencePlatform | null>(null);

  // Keep refs of selectedService and networkId to prevent re-triggering URL analysis on manual selection
  const selectedServiceRef = useRef<PublicService | null>(null);
  const networkIdRef = useRef(networkId);
  
  useEffect(() => {
    selectedServiceRef.current = selectedService;
    networkIdRef.current = networkId;
  }, [selectedService, networkId]);

  // 1. Initial Catalog Load (if not provided)
  useEffect(() => {
    if (catalog.length === 0 && !hasFetchedCatalog.current) {
      hasFetchedCatalog.current = true;
      getPublicCatalogAction().then(res => {
        if (res.success && res.data) {
          const sortedData = res.data.map(net => ({
            ...net,
            categories: sortCategories(net.categories)
          }));
          setCatalog(sortedData);
          // Set defaults if they are still empty
          setNetworkId((current: string) => {
            if (!current && sortedData.length > 0) {
              if (initialNetworkId) {
                if (initialCategoryId) setCategoryId(initialCategoryId);
                return initialNetworkId;
              }

              const defNet = sortedData.find((n: PublicNetwork) => n.slug === 'telegram') || sortedData[0];
              if (defNet) {
                const defCat = defNet.categories.find((c: PublicCategory) => c.name.toLowerCase().includes('подписчики')) || defNet.categories[0];
                if (defCat) {
                  setCategoryId(defCat.id);
                }
                return defNet.id;
              }
            }
            return current;
          });
        }
      });
    } else if (catalog.length > 0 && initialNetworkId && !hasFetchedCatalog.current) {
       hasFetchedCatalog.current = true;
       // We already have the catalog, try to auto-select from initial properties
       setNetworkId(initialNetworkId);
       if (initialCategoryId) setCategoryId(initialCategoryId);
    }
  }, [catalog.length, initialNetworkId, initialCategoryId]);

  // 2. Analyze URL (Debounced)
  useEffect(() => {
    if (!url || url.length < 5) {
      setPlatform(null);
      setManualPlatform(null);
      setSuggestedCategories([]);
      setDetectedType(null);
      setIsLoading(false);
      return;
    }

    // BUG-FIX: Do NOT set isLoading here — if the timer is cleaned up before firing,
    // isLoading would stay `true` forever (the finally block never runs).
    // Instead, set it inside the timer callback.
    let stale = false;

    const handler = setTimeout(async () => {
      if (stale) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await analyzeUrl(url.trim());
        if (stale) return; // effect was cleaned up during fetch
        if (res.success && res.data) {
          const analysisData = res.data;
          setPlatform(analysisData.platform !== IntelligencePlatform.OTHER ? analysisData.platform : null);
          setManualPlatform(null); // Reset manual platform on new analysis
          setSuggestedCategories(analysisData.suggestedCategories || []);
          setDetectedType(analysisData.type || null);
          
          const activePlatformStr = analysisData.platform !== IntelligencePlatform.OTHER ? analysisData.platform.toLowerCase() : null;
          
          // Auto-select network
          if (activePlatformStr) {
            const matchedNet = catalog.find(n => n.slug.toLowerCase().includes(activePlatformStr) || activePlatformStr.includes(n.slug.toLowerCase()));
            if (matchedNet) {
               if (matchedNet.id !== networkIdRef.current || !selectedServiceRef.current) {
                  setNetworkId(matchedNet.id);
                  const catsForNet = matchedNet.categories;
                  let filteredCats = catsForNet;
                  if (analysisData.suggestedCategories && analysisData.suggestedCategories.length > 0) {
                      const f = catsForNet.filter(c => matchesSuggestedCategory(c.name, analysisData.suggestedCategories, c.analyzerTags, analysisData.type));
                      if (f.length > 0) filteredCats = f;
                  }
                  if (filteredCats.length > 0) {
                     if (url.trim().length >= 5) {
                        if (!selectedServiceRef.current) {
                           setCategoryId("");
                        }
                     } else {
                        setCategoryId(filteredCats[0].id);
                     }
                  }
               }
            }
          }
        }
      } catch (err) {
        console.error("URL analysis failed:", err);
      } finally {
        if (!stale) setIsLoading(false);
      }
    }, 350);

    return () => { stale = true; clearTimeout(handler); };
     
    // selectedService and networkId intentionally omitted — tracked via refs
    // to prevent URL re-analysis on manual service/network selection
  }, [url, catalog]);

  // 2.5 Auto-select network on platform or manual platform changes/catalog loads
  useEffect(() => {
    const activePlatform = platform || manualPlatform;
    const platformChanged = platform !== lastPlatformRef.current || manualPlatform !== lastManualPlatformRef.current;
    const catalogJustLoaded = catalog.length > 0 && lastPlatformRef.current === null && lastManualPlatformRef.current === null;
    
    lastPlatformRef.current = platform;
    lastManualPlatformRef.current = manualPlatform;

    if ((platformChanged || catalogJustLoaded) && activePlatform && activePlatform !== IntelligencePlatform.OTHER && catalog.length > 0) {
      const activePlatformStr = activePlatform.toLowerCase();
      const matchedNet = catalog.find(n => n.slug.toLowerCase().includes(activePlatformStr) || activePlatformStr.includes(n.slug.toLowerCase()));
      if (matchedNet) {
        setNetworkId(matchedNet.id);
        const catsForNet = matchedNet.categories;
        let filteredCats = catsForNet;
        if (suggestedCategories.length > 0 || detectedType) {
          const f = catsForNet.filter(c => matchesSuggestedCategory(c.name, suggestedCategories, c.analyzerTags, detectedType));
          if (f.length > 0) filteredCats = f;
        }
        if (filteredCats.length > 0) {
          if (url.trim().length >= 5) {
            if (!selectedServiceRef.current) {
              setCategoryId("");
            } else if (!categoryId || !catsForNet.some(c => c.id === categoryId)) {
              setCategoryId("");
            }
          } else {
            if (!categoryId || !catsForNet.some(c => c.id === categoryId)) {
              setCategoryId(filteredCats[0].id);
            }
          }
        }
      }
    }
  }, [platform, manualPlatform, catalog, suggestedCategories, categoryId, url]);

  // Handle cascaded selections (Network -> Category) manually
  useEffect(() => {
     if (networkId && catalog.length > 0) {
        // Reset media group URL when switching networks
        setMediaGroupUrl("");
        const net = catalog.find(n => n.id === networkId);
        if (net) {
           const catsForNet = net.categories;
           const matchedCats = suggestedCategories.length > 0
              ? catsForNet.filter(c => matchesSuggestedCategory(c.name, suggestedCategories))
              : [];
           const availableCats = matchedCats.length > 0 ? matchedCats : catsForNet;
           if (availableCats.length > 0 && !availableCats.some(c => c.id === categoryId)) {
              setCategoryId(availableCats[0].id);
              setSelectedService(null);
           }
        }
     }
  }, [networkId, catalog, categoryId, suggestedCategories]);

  // 3. Load Services when Category changes
  useEffect(() => {
    // If we already pre-fetched services during SSR for the initial default category, reuse them instantly
    if (isInitialServicesMount.current && categoryId === defaultCat?.id && initialServices.length > 0) {
      isInitialServicesMount.current = false;
      if (initialServiceId && !selectedServiceRef.current) {
        const found = initialServices.find(s => s.id === initialServiceId);
        if (found) setSelectedService(found);
      }
      return;
    }
    isInitialServicesMount.current = false;

    // Clear instantly to prevent loading latency & mismatched state
    setServices([]);
    setSelectedService(null);

    if (!categoryId) {
      setDripFeedEnabled(false);
      setRuns(2);
      setDripInterval(5);
      return;
    }

    // BUG-FIX: Use stale flag to prevent race condition when category changes rapidly.
    // Without this, if user clicks Cat-A then immediately Cat-B, the Cat-A response
    // could arrive after Cat-B and overwrite services + set isLoading=false prematurely.
    let stale = false;

    const loadServices = async () => {
      setIsLoading(true);
      try {
        const svcs = await getServicesByCategoryAction(categoryId);
        if (stale) return; // Category changed while we were fetching — discard result
        
        // WAVE 4.1: Marketing UX Sorting & TargetType Compatibility Prioritization
        const sortedSvcs = [...svcs].sort((a, b) => {
            const aQuarantined = a.cooldownUntil && new Date(a.cooldownUntil) > new Date();
            const bQuarantined = b.cooldownUntil && new Date(b.cooldownUntil) > new Date();
            if (aQuarantined && !bQuarantined) return 1;
            if (!aQuarantined && bQuarantined) return -1;
            return 0;
        });

        // If detectedType is active, prioritize or filter compatible services
        let finalSvcs = sortedSvcs;
        if (detectedType) {
          const compatibleSvcs = sortedSvcs.filter(s =>
            isTargetTypeCompatible(detectedType, s.targetType || inferTargetTypeFromName(s.name))
          );
          if (compatibleSvcs.length > 0) {
            finalSvcs = compatibleSvcs;
          }
        }

        setServices(finalSvcs);
        
        if (initialServiceId && !selectedServiceRef.current) {
           const found = finalSvcs.find(s => s.id === initialServiceId);
           if (found) {
              setSelectedService(found);
           } else {
              setSelectedService(null);
           }
        } else {
           setSelectedService(null);
        }
      } catch (err) {
        if (stale) return;
        console.error("Failed to load services:", err);
        setServices([]);
        setSelectedService(null);
        toast.error("Не удалось загрузить услуги. Проверьте подключение к сети.");
      } finally {
        if (!stale) setIsLoading(false);
      }
    };

    loadServices();
    return () => { stale = true; };
  }, [categoryId, initialServiceId]);

  // 4. Update quantity limits when Service changes or initializes
  useEffect(() => {
    if (selectedService) {
      setQuantity(selectedService.minQty);
      setDripFeedEnabled(false);
      setRuns(2);
      setDripInterval(5);
      setIsSmartDrip(false);
      setSmartDripDays(7);
      setIsLinkOverridden(false);
      setIsWarningConfirmed(false);
      setWarningHasError(false);
    }
  }, [selectedService]);

  // 5. Calculate Price (Synchronous useMemo for standard, state-based for promo codes)
  const pricing = useMemo(() => {
    if (!selectedService || quantity < 1) return null;

    if (promoCode && promoCode.trim().length > 0) {
      return promoPricing;
    }

    const totalQty = quantity;
    const originalTotalCents = Math.max(1, Math.ceil(selectedService.pricePerUnitRub * 100 * totalQty));

    let totalCents = originalTotalCents;
    if (isSmartDrip && selectedService.smartConfig?.isEnabled) {
      totalCents = Math.round(totalCents * (1 + selectedService.smartConfig.markup));
    }

    return {
      totalCents,
      originalTotalCents,
      discountCents: 0,
      discountPercent: 0,
      providerCostCents: 0,
      safetyFloorCents: 0,
      tier: 'REGULAR'
    };
  }, [selectedService, quantity, promoCode, promoPricing, dripFeedEnabled, runs, isSmartDrip]);

  // 5.2 Server-side calculation only if a promo code needs validation
  useEffect(() => {
    if (!selectedService || quantity < 1 || !promoCode || promoCode.trim().length === 0) {
      setPromoPricing(null);
      setPricingError(null);
      setIsCalculating(false);
      return;
    }

    // BUG-FIX: Same race condition pattern as URL analysis.
    // Move setIsCalculating(true) inside the timer to prevent stuck state.
    let stale = false;

    const handler = setTimeout(async () => {
      if (stale) return;
      setIsCalculating(true);
      try {
        const res = await calculatePriceAction(
          selectedService.id, 
          quantity, 
          promoCode, 
          dripFeedEnabled ? runs : undefined
        );
        if (stale) return;
        if (res.success && res.data) {
          setPromoPricing(res.data);
          setPricingError(null);
        } else if (res.error?.startsWith('VOUCHER_USE_BALANCE:')) {
          setPromoPricing(null);
          setPricingError('voucher');
        } else {
          setPromoPricing(null);
          setPricingError(null);
        }
      } catch (err) {
        if (!stale) {
          console.error("Price calculation failed:", err);
          setPromoPricing(null);
          setPricingError(null);
        }
      } finally {
        if (!stale) setIsCalculating(false);
      }
    }, 150);

    return () => { stale = true; clearTimeout(handler); };
  }, [selectedService, quantity, promoCode, dripFeedEnabled, runs]);

  // 5.5 Calculate Mass Order Price (Debounced)
  useEffect(() => {
    if (!isMassMode || !url.trim()) {
      setMassCalculation(null);
      return;
    }

    const handler = setTimeout(async () => {
      setIsMassCalculating(true);
      try {
        const { massOrderCalculateAction } = await import("@/actions/order/mass");
        const res = await massOrderCalculateAction({ text: url });
        if (res.success) {
          setMassCalculation(res.data);
        } else {
          setMassCalculation({
            totalRub: 0,
            totalCents: 0,
            validCount: 0,
            errors: [{ line: 0, text: "", error: res.error || "Ошибка парсинга" }],
            validOrders: []
          });
        }
            } catch (e: unknown) {
        const err = e as Error;
        setMassCalculation({
          totalRub: 0,
          totalCents: 0,
          validCount: 0,
          errors: [{ line: 0, text: "", error: err.message || "Неизвестная ошибка" }],
          validOrders: []
        });
      } finally {
        setIsMassCalculating(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [url, isMassMode]);

  // Form Validation
  const validate = useCallback((shouldMutate = false) => {
    let currentUrl = url;

    // Advanced Link Validation & Mutation
    const currentNetwork = catalog.find(n => n.id === networkId);
    const activePlatform = currentNetwork?.slug || platform || manualPlatform || '';
    if (shouldMutate && selectedService && activePlatform) {
       const activeCat = catalog.flatMap(n => n.categories).find(c => c.id === selectedService.categoryId);
       const targetType = selectedService.targetType === 'POST'
         ? inferTargetTypeFromCategory(activeCat?.name)
         : (selectedService.targetType || inferTargetTypeFromCategory(activeCat?.name));
       const cleanUrl = mutateLink(currentUrl, activePlatform, targetType);
       if (cleanUrl !== currentUrl) {
           currentUrl = cleanUrl;
           setUrl(cleanUrl);
           toast.success('Ссылка автоматически скорректирована под выбранный тип услуги!');
           setUrlMutatedTrigger(true);
           setTimeout(() => setUrlMutatedTrigger(false), 2000);
       }
    }

    const result = orderFormSchema.safeParse({
      link: currentUrl,
      quantity,
      email,
      serviceId: selectedService?.id || "",
      customData: customData ? customData : undefined,
      agreedToTerms
    });

    const errors: Record<string, string> = {};
    if (!result.success) {
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          const fieldName = err.path[0].toString();
          // Filter initial blank errors to prevent visual noise on mount
          if (fieldName === 'link' && !currentUrl) return;
          if (fieldName === 'email' && !email) return;
          errors[fieldName] = err.message;
        }
      });
    }

    // Override generic URL error with strict targetType error if applicable
    if (selectedService && activePlatform && currentUrl && !isLinkOverridden) {
       const activeCat2 = catalog.flatMap(n => n.categories).find(c => c.id === selectedService.categoryId);
       const targetType = selectedService.targetType === 'POST'
         ? inferTargetTypeFromCategory(activeCat2?.name)
         : (selectedService.targetType || inferTargetTypeFromCategory(activeCat2?.name));
       const validator = getLinkValidator(activePlatform, targetType);
       const linkResult = validator.safeParse(currentUrl);
       
       if (!linkResult.success) {
           errors['link'] = linkResult.error.errors[0].message;
       }
    }

    if (selectedService) {
      if (dripFeedEnabled && runs > 0) {
        const chunk = Math.floor(quantity / runs);
        if (chunk < selectedService.minQty) {
          errors['dripfeed'] = `Для ${runs} запусков общее количество должно быть минимум ${selectedService.minQty * runs} шт.`;
        }
      } else if (isSmartDrip && smartDripDays > 0) {
        const chunk = Math.floor(quantity / smartDripDays);
        if (chunk < selectedService.minQty) {
          errors['dripfeed'] = `Для Умного Drip на ${smartDripDays} дней общее количество должно быть минимум ${selectedService.minQty * smartDripDays} шт.`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return false;
    }
    
    setValidationErrors({});
    return true;
  }, [url, quantity, email, selectedService, customData, agreedToTerms, platform, networkId, categoryId, catalog, manualPlatform]);

  // Real-time validation reaction
  useEffect(() => {
    validate(false); // Only run layout checking on typing, do NOT mutate URL
  }, [url, selectedService, email, quantity, customData, agreedToTerms, networkId, categoryId, validate]);

  // Helper getters
  const mediaGroupMultiplier = mediaGroupUrl.trim().length > 5 ? 2 : 1;
  
  let finalCents = pricing ? pricing.totalCents * mediaGroupMultiplier : 0;
  if (pricing && isSmartDrip && selectedService?.smartConfig?.isEnabled) {
    finalCents = Math.round(finalCents * (1 + selectedService.smartConfig.markup));
  }
  
  const totalPriceFormatted = finalCents > 0 
    ? formatCents(finalCents) 
    : formatCents(0); // REQUIRED BY PROTOCOL: Draw 0.00 RUB if empty

  const activeNetwork = catalog.find(n => n.id === networkId) || catalog[0] || null;
  let availableCategories = activeNetwork ? activeNetwork.categories : [];
  
  // Restore aggressive filtering to prevent users from ordering Post services (like Reactions) for a Profile link.
  // Apply suggestedCategories filter ONLY when the selected networkId matches the auto-detected platform to prevent empty panels when switching.
  const activePlatform = manualPlatform || platform;
  const isMatchingAutodetected = activeNetwork && activePlatform && activePlatform !== IntelligencePlatform.OTHER && activeNetwork.slug.toLowerCase().includes(activePlatform.toLowerCase());

  if (isMatchingAutodetected && (suggestedCategories.length > 0 || detectedType)) {
    const filteredCats = availableCategories.filter(c => matchesSuggestedCategory(c.name, suggestedCategories, c.analyzerTags, detectedType));
    if (filteredCats.length > 0) {
      const currentCat = activeNetwork?.categories.find(c => c.id === categoryId);
      if (currentCat && !filteredCats.some(c => c.id === categoryId)) {
        filteredCats.push(currentCat);
      }
      availableCategories = filteredCats;
    }
  }
  
  const displayCatalog = catalog;

  return {
    // State
    url, setUrl: handleSetUrl,
    networkId, setNetworkId,
    categoryId, setCategoryId,
    selectedService, setSelectedService,
    quantity, setQuantity,
    email, setEmail,
    customData, setCustomData,
    mediaGroupUrl, setMediaGroupUrl,
    promoCode, setPromoCode,
    agreedToTerms, setAgreedToTerms,
    isLinkOverridden, setIsLinkOverridden,
    isWarningConfirmed, setIsWarningConfirmed,
    warningHasError, setWarningHasError,
    
    // Drip-feed
    dripFeedEnabled, setDripFeedEnabled,
    runs, setRuns,
    dripInterval, setDripInterval,

    // Smart Drip
    isSmartDrip, setIsSmartDrip,
    smartDripDays, setSmartDripDays,
    
    platform,
    manualPlatform,
    setManualPlatform: handleSetManualPlatform,
    catalog: displayCatalog,
    unfilteredCatalog: catalog,
    availableCategories,
    services,
    pricing,
    pricingError,
    totalPriceFormatted,
    mediaGroupMultiplier,
    
    // Status
    isLoading,
    isCalculating,
    error,
    validationErrors,
    urlMutatedTrigger,
    
    // Mass Mode
    isMassMode,
    massCalculation,
    isMassCalculating,
    
    // Methods
    validate
  };
}
