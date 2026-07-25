import { useState, useCallback } from 'react';
import { getServicesByCategoryAction } from "@/actions/order/catalog";

export type Step = 'link' | 'network' | 'category' | 'service' | 'checkout';

export interface WizardState {
  step: Step;
  direction: number;
  link: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeNetwork: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeCategory: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  services: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedService: any | null;
  isLoadingServices: boolean;
  quantity: number | string;
  email: string;
  isRequirementsConfirmed: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useOrderWizard(initialCatalog: any[], initialEmail?: string) {
  const [state, setState] = useState<WizardState>({
    step: 'link',
    direction: 1,
    link: '',
    activeNetwork: null,
    activeCategory: null,
    services: [],
    selectedService: null,
    isLoadingServices: false,
    quantity: '',
    email: initialEmail || '',
    isRequirementsConfirmed: false,
  });

  const navigateTo = useCallback((newStep: Step) => {
    setState(prev => {
      const order = { 'link': 0, 'network': 1, 'category': 2, 'service': 3, 'checkout': 4 };
      return {
        ...prev,
        direction: order[newStep] > order[prev.step] ? 1 : -1,
        step: newStep
      };
    });
  }, []);

  const setLink = (link: string) => setState(prev => ({ ...prev, link }));
  const setEmail = (email: string) => setState(prev => ({ ...prev, email }));
  const setQuantity = (quantity: string | number) => setState(prev => ({ ...prev, quantity }));
  const setIsRequirementsConfirmed = (val: boolean) => setState(prev => ({ ...prev, isRequirementsConfirmed: val }));
  const resetLink = () => setState(prev => ({ ...prev, link: '', step: 'link' }));

  const handleAnalyzeLink = useCallback((url: string) => {
    if (!url) return;
    
    const lowerUrl = url.toLowerCase();
    let matchedNetwork = null;
    
    if (lowerUrl.includes("t.me") || lowerUrl.includes("telegram")) {
      matchedNetwork = initialCatalog.find(n => n.name.toLowerCase().includes("telegram"));
    } else if (lowerUrl.includes("instagram.com")) {
      matchedNetwork = initialCatalog.find(n => n.name.toLowerCase().includes("instagram"));
    } else if (lowerUrl.includes("vk.com")) {
      matchedNetwork = initialCatalog.find(n => n.name.toLowerCase().includes("vk"));
    }
    
    if (!matchedNetwork && initialCatalog.length > 0) matchedNetwork = initialCatalog[0];
      
    if (matchedNetwork) {
      setState(prev => ({
        ...prev,
        activeNetwork: matchedNetwork,
        activeCategory: null,
        services: [],
        selectedService: null,
        link: url
      }));
      navigateTo('category');
    }
  }, [initialCatalog, navigateTo]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectNetwork = useCallback((network: any) => {
    setState(prev => ({
      ...prev,
      activeNetwork: network,
      activeCategory: null,
      services: [],
      selectedService: null,
    }));
    navigateTo('category');
  }, [navigateTo]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectCategory = useCallback(async (cat: any) => {
    setState(prev => ({ ...prev, activeCategory: cat, isLoadingServices: true, services: [] }));
    navigateTo('service');
    try {
      const fetched = await getServicesByCategoryAction(cat.id);
      setState(prev => ({ ...prev, services: fetched || [], isLoadingServices: false }));
    } catch {
      setState(prev => ({ ...prev, isLoadingServices: false }));
    }
  }, [navigateTo]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectService = useCallback((srv: any) => {
    setState(prev => ({
      ...prev,
      selectedService: srv,
      quantity: srv.minQty || 100,
      isRequirementsConfirmed: false
    }));
    navigateTo('checkout');
  }, [navigateTo]);

  const goBack = useCallback(() => {
    setState(prev => {
      if (prev.step === 'checkout') return { ...prev, step: 'service', direction: -1 };
      if (prev.step === 'service') return { ...prev, step: 'category', direction: -1 };
      if (prev.step === 'category') return { ...prev, step: 'network', direction: -1 };
      if (prev.step === 'network') return { ...prev, step: 'link', direction: -1 };
      return prev;
    });
  }, []);

  return {
    state,
    navigateTo,
    goBack,
    setLink,
    setEmail,
    setQuantity,
    setIsRequirementsConfirmed,
    resetLink,
    handleAnalyzeLink,
    selectNetwork,
    selectCategory,
    selectService
  };
}
