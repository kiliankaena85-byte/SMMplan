"use client";

import { useState, useEffect, useCallback } from "react";
import { analyzeUrl } from "@/actions/order/analyze-url";
import { getServicesByCategoryAction, PublicNetwork, PublicCategory, PublicService, getPublicCatalogAction } from "@/actions/order/catalog";
import { calculatePriceAction } from "@/actions/order/checkout";
import { PricingResult } from "@/services/marketing.service";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { formatCents } from "@/lib/utils";
import { orderFormSchema } from "@/validators/order.validators";
import { matchesSuggestedCategory } from "@/services/analyzer/category-matcher";

export function useOrderEngine(initialCatalog: PublicNetwork[] = [], initialEmail: string = "") {
  // Input states
  const [url, setUrl] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [email, setEmail] = useState(initialEmail);
  const [customData, setCustomData] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Drip-feed states
  const [dripFeedEnabled, setDripFeedEnabled] = useState(false);
  const [runs, setRuns] = useState(2);
  const [interval, setInterval] = useState(5);

  // Data states
  const [catalog, setCatalog] = useState<PublicNetwork[]>(initialCatalog);
  const [services, setServices] = useState<PublicService[]>([]);
  const [platform, setPlatform] = useState<IntelligencePlatform | null>(null);
  const [manualPlatform, setManualPlatform] = useState<IntelligencePlatform | null>(null);
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  
  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // 1. Initial Catalog Load (if not provided)
  useEffect(() => {
    if (catalog.length === 0) {
      getPublicCatalogAction().then(res => {
        if (res.success && res.data) setCatalog(res.data);
      });
    }
  }, [catalog.length]);

  // 2. Analyze URL (Debounced)
  useEffect(() => {
    if (!url || url.length < 5) {
      setPlatform(null);
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
          const matchedNet = catalog.find(n => n.slug.includes(activePlatformStr) || activePlatformStr.includes(n.slug));
          if (matchedNet) {
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
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(handler);
  }, [url, catalog]);

  // Handle cascaded selections (Network -> Category) manually
  useEffect(() => {
     if (networkId) {
        const net = catalog.find(n => n.id === networkId);
        if (net) {
           let catsForNet = net.categories;
           if (suggestedCategories.length > 0) {
              const f = catsForNet.filter(c => matchesSuggestedCategory(c.name, suggestedCategories));
              if (f.length > 0) catsForNet = f;
           }
           if (catsForNet.length > 0 && !catsForNet.some(c => c.id === categoryId)) {
              setCategoryId(catsForNet[0].id);
           }
        }
     }
  }, [networkId, catalog, categoryId, suggestedCategories]);

  // 3. Load Services when Category changes
  useEffect(() => {
    if (!categoryId) {
      setServices([]);
      setSelectedService(null);
      return;
    }

    const loadServices = async () => {
      setIsLoading(true);
      const svcs = await getServicesByCategoryAction(categoryId);
      setServices(svcs);
      
      // Auto-select first service if nothing selected
      if (svcs.length > 0 && (!selectedService || !svcs.some(s => s.id === selectedService.id))) {
        setSelectedService(svcs[0]);
      }
      setIsLoading(false);
    };

    loadServices();
  }, [categoryId, selectedService]);

  // 4. Update quantity limits when Service changes
  useEffect(() => {
    if (selectedService && quantity < selectedService.minQty) {
      setQuantity(selectedService.minQty);
    }
  }, [selectedService, quantity]);

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
        "", 
        dripFeedEnabled ? runs : undefined
      );
      if (res.success && res.data) {
        setPricing(res.data);
      }
      setIsCalculating(false);
    }, 300);

    return () => clearTimeout(handler);
  }, [selectedService, quantity]);

  // Form Validation
  const validate = useCallback(() => {
    const result = orderFormSchema.safeParse({
      link: url,
      quantity,
      email,
      serviceId: selectedService?.id || "",
      customData: customData ? customData : undefined,
      agreedToTerms
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) errors[err.path[0].toString()] = err.message;
      });
      setValidationErrors(errors);
      return false;
    }
    
    setValidationErrors({});
    return true;
  }, [url, quantity, email, selectedService, customData, agreedToTerms]);

  // Helper getters
  const totalPriceFormatted = pricing 
    ? formatCents(pricing.totalCents) 
    : formatCents(0); // REQUIRED BY PROTOCOL: Draw 0.00 RUB if empty

  const activeNetwork = catalog.find(n => n.id === networkId) || catalog[0] || null;
  let availableCategories = activeNetwork ? activeNetwork.categories : [];
  if (suggestedCategories.length > 0) {
     const filtered = availableCategories.filter(c => matchesSuggestedCategory(c.name, suggestedCategories));
     if (filtered.length > 0) availableCategories = filtered;
  }

  let displayCatalog = catalog;
  if (platform && platform !== IntelligencePlatform.OTHER) {
    const pStr = platform.toLowerCase();
    const filteredNets = catalog.filter(n => n.slug.includes(pStr) || pStr.includes(n.slug));
    if (filteredNets.length > 0) displayCatalog = filteredNets;
  }

  return {
    // State
    url, setUrl,
    networkId, setNetworkId,
    categoryId, setCategoryId,
    selectedService, setSelectedService,
    quantity, setQuantity,
    email, setEmail,
    customData, setCustomData,
    agreedToTerms, setAgreedToTerms,
    
    // Drip-feed
    dripFeedEnabled, setDripFeedEnabled,
    runs, setRuns,
    interval, setInterval,
    
    // Data
    catalog: displayCatalog,
    availableCategories,
    services,
    pricing,
    totalPriceFormatted,
    
    // Status
    isLoading,
    isCalculating,
    error,
    validationErrors,
    
    // Methods
    validate
  };
}
