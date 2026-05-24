"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { analyzeUrl } from "@/actions/order/analyze-url";
import { getServicesByCategoryAction, PublicNetwork, PublicCategory, PublicService, getPublicCatalogAction } from "@/actions/order/catalog";
import { calculatePriceAction } from "@/actions/order/checkout";
import { PricingResult } from "@/services/marketing.service";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { mutateLink, getLinkValidator } from "@/validators/link-mutators";
import { formatCents } from "@/lib/utils";
import { orderFormSchema } from "@/validators/order.validators";
import { matchesSuggestedCategory } from "@/services/analyzer/category-matcher";
import { inferTargetTypeFromCategory } from "@/utils/target-type";
import { toast } from "sonner";

export type OrderEngine = ReturnType<typeof useOrderEngine>;

export function useOrderEngine(initialCatalog: PublicNetwork[] = [], initialEmail: string = "") {
  // Determine initial defaults synchronously
  const defaultNet = initialCatalog.length > 0 
    ? (initialCatalog.find(n => n.slug === 'telegram') || initialCatalog[0]) 
    : null;
  const defaultCat = defaultNet && defaultNet.categories.length > 0 
    ? (defaultNet.categories.find(c => c.name.toLowerCase().includes('подписчики')) || defaultNet.categories[0]) 
    : null;

  // Input states
  const [url, setUrl] = useState("");
  const [networkId, setNetworkId] = useState(defaultNet?.id || "");
  const [categoryId, setCategoryId] = useState(defaultCat?.id || "");
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [email, setEmail] = useState(initialEmail);
  const [customData, setCustomData] = useState("");
  const [mediaGroupUrl, setMediaGroupUrl] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLinkOverridden, setIsLinkOverridden] = useState(false);
  
  // Drip-feed states
  const [dripFeedEnabled, setDripFeedEnabled] = useState(false);
  const [runs, setRuns] = useState(2);
  const [dripInterval, setDripInterval] = useState(5);

  // Data states
  const [catalog, setCatalog] = useState<PublicNetwork[]>(initialCatalog);
  const [services, setServices] = useState<PublicService[]>([]);
  const [platform, setPlatform] = useState<IntelligencePlatform | null>(null);
  const [manualPlatform, setManualPlatform] = useState<IntelligencePlatform | null>(null);
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [pricingError, setPricingError] = useState<'voucher' | null>(null);
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  
  // Mass Order states
  const [massCalculation, setMassCalculation] = useState<{
    totalRub: number;
    totalCents: number;
    validCount: number;
    errors: { line: number; text: string; error: string }[];
    validOrders: any[];
  } | null>(null);
  const [isMassCalculating, setIsMassCalculating] = useState(false);

  const isMassMode = url.includes("\n") || url.includes("|");

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [urlMutatedTrigger, setUrlMutatedTrigger] = useState(false);


  const handleSetUrl = useCallback((newUrl: string) => {
    setUrl(newUrl);
    setIsLinkOverridden(false);
    if (!newUrl) {
      setValidationErrors(prev => {
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

  // 1. Initial Catalog Load (if not provided)
  useEffect(() => {
    if (catalog.length === 0 && !hasFetchedCatalog.current) {
      hasFetchedCatalog.current = true;
      getPublicCatalogAction().then(res => {
        if (res.success && res.data) {
          setCatalog(res.data);
          // Set defaults if they are still empty
          setNetworkId(current => {
            if (!current && res.data.length > 0) {
              const defNet = res.data.find(n => n.slug === 'telegram') || res.data[0];
              if (defNet) {
                const defCat = defNet.categories.find(c => c.name.toLowerCase().includes('подписчики')) || defNet.categories[0];
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
    }
  }, [catalog.length]);

  // 2. Analyze URL (Debounced)
  useEffect(() => {
    if (!url || url.length < 5) {
      setPlatform(null);
      setManualPlatform(null);
      setSuggestedCategories([]);
      return;
    }

    const handler = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      const res = await analyzeUrl(url.trim());
      if (res.success && res.data) {
        setPlatform(res.data.platform !== IntelligencePlatform.OTHER ? res.data.platform : null);
        setManualPlatform(null); // Reset manual platform on new analysis
        setSuggestedCategories(res.data.suggestedCategories || []);
        
        const activePlatformStr = res.data.platform !== IntelligencePlatform.OTHER ? res.data.platform.toLowerCase() : null;
        
        // Auto-select network
        if (activePlatformStr) {
          const matchedNet = catalog.find(n => n.slug.toLowerCase().includes(activePlatformStr) || activePlatformStr.includes(n.slug.toLowerCase()));
          if (matchedNet) {
             // Only auto-select or override if the network has actually changed OR the user has not selected a service yet.
             // This protects manual selections from background URL debounced refetches/resets.
             if (matchedNet.id !== networkId || !selectedService) {
                setNetworkId(matchedNet.id);
                // Auto-select first category in that network if exist and match suggested filter
                const catsForNet = matchedNet.categories;
                let filteredCats = catsForNet;
                if (res.data.suggestedCategories && res.data.suggestedCategories.length > 0) {
                    const f = catsForNet.filter(c => matchesSuggestedCategory(c.name, res.data.suggestedCategories));
                    if (f.length > 0) filteredCats = f;
                }
                if (filteredCats.length > 0) {
                   setCategoryId(filteredCats[0].id);
                }
             }
          }
        }
      }
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(handler);
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
        if (suggestedCategories.length > 0) {
          const f = catsForNet.filter(c => matchesSuggestedCategory(c.name, suggestedCategories));
          if (f.length > 0) filteredCats = f;
        }
        if (filteredCats.length > 0) {
          if (!categoryId || !catsForNet.some(c => c.id === categoryId)) {
            setCategoryId(filteredCats[0].id);
          }
        }
      }
    }
  }, [platform, manualPlatform, catalog, suggestedCategories, categoryId]);

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
           }
        }
     }
  }, [networkId, catalog, categoryId, suggestedCategories]);

  // 3. Load Services when Category changes
  useEffect(() => {
    // Clear instantly to prevent loading latency & mismatched state
    setServices([]);
    setSelectedService(null);

    if (!categoryId) {
      setDripFeedEnabled(false);
      setRuns(2);
      setDripInterval(5);
      return;
    }

    const loadServices = async () => {
      setIsLoading(true);
      const svcs = await getServicesByCategoryAction(categoryId);
      
      // WAVE 4.1: Marketing UX Sorting
      // Push quarantined services to the bottom of the list
      const sortedSvcs = [...svcs].sort((a, b) => {
          const aQuarantined = a.cooldownUntil && new Date(a.cooldownUntil) > new Date();
          const bQuarantined = b.cooldownUntil && new Date(b.cooldownUntil) > new Date();
          if (aQuarantined && !bQuarantined) return 1;
          if (!aQuarantined && bQuarantined) return -1;
          return 0; // maintain default rate-based sorting otherwise
      });

      setServices(sortedSvcs);
      
      // WAVE 5 UX: Completely disable automatic service pre-selection on category change.
      // The user must explicitly read and click to choose a service card.
      setSelectedService(null);
      setIsLoading(false);
    };

    loadServices();
  }, [categoryId]);

  // 4. Update quantity limits when Service changes or initializes
  useEffect(() => {
    if (selectedService) {
      setQuantity(selectedService.minQty);
      setDripFeedEnabled(false);
      setRuns(2);
      setDripInterval(5);
      setIsLinkOverridden(false);
    }
  }, [selectedService]);

  // 5. Calculate Price (Debounced)
  useEffect(() => {
    if (!selectedService || quantity < 1) {
      setPricing(null);
      return;
    }

    const handler = setTimeout(async () => {
      setIsCalculating(true);
      const res = await calculatePriceAction(
        selectedService.id, 
        quantity, 
        promoCode, 
        dripFeedEnabled ? runs : undefined
      );
      if (res.success && res.data) {
        setPricing(res.data);
        setPricingError(null);
      } else if (res.error?.startsWith('VOUCHER_USE_BALANCE:')) {
        setPricing(null);
        setPricingError('voucher');
      } else {
        setPricing(null);
        setPricingError(null);
      }
      setIsCalculating(false);
    }, 300);

    return () => clearTimeout(handler);
  }, [selectedService, quantity, promoCode]);

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
      } catch (e: any) {
        setMassCalculation({
          totalRub: 0,
          totalCents: 0,
          validCount: 0,
          errors: [{ line: 0, text: "", error: e.message || "Неизвестная ошибка" }],
          validOrders: []
        });
      } finally {
        setIsMassCalculating(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [url, isMassMode]);

  // Form Validation
  const validate = useCallback(() => {
    let currentUrl = url;

    // Advanced Link Validation & Mutation
    const currentNetwork = catalog.find(n => n.id === networkId);
    const activePlatform = currentNetwork?.slug || platform || manualPlatform || '';
    if (selectedService && activePlatform) {
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
        if (err.path[0]) errors[err.path[0].toString()] = err.message;
      });
    }

    // Override generic URL error with strict targetType error if applicable
    if (selectedService && activePlatform) {
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

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return false;
    }
    
    setValidationErrors({});
    return true;
  }, [url, quantity, email, selectedService, customData, agreedToTerms, platform]);

  // Helper getters
  const mediaGroupMultiplier = mediaGroupUrl.trim().length > 5 ? 2 : 1;
  const totalPriceFormatted = pricing 
    ? formatCents(pricing.totalCents * mediaGroupMultiplier) 
    : formatCents(0); // REQUIRED BY PROTOCOL: Draw 0.00 RUB if empty

  const activeNetwork = catalog.find(n => n.id === networkId) || catalog[0] || null;
  let availableCategories = activeNetwork ? activeNetwork.categories : [];
  
  // Restore aggressive filtering to prevent users from ordering Post services (like Reactions) for a Profile link.
  // Apply suggestedCategories filter ONLY when the selected networkId matches the auto-detected platform to prevent empty panels when switching.
  const activePlatform = manualPlatform || platform;
  const isMatchingAutodetected = activeNetwork && activePlatform && activePlatform !== IntelligencePlatform.OTHER && activeNetwork.slug.toLowerCase().includes(activePlatform.toLowerCase());

  if (isMatchingAutodetected && suggestedCategories.length > 0) {
    const filteredCats = availableCategories.filter(c => matchesSuggestedCategory(c.name, suggestedCategories));
    if (filteredCats.length > 0) {
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
    
    // Drip-feed
    dripFeedEnabled, setDripFeedEnabled,
    runs, setRuns,
    dripInterval, setDripInterval,
    
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
