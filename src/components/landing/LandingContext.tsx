import React, { createContext, useContext } from 'react';
import type { PublicNetwork, PublicCategory, PublicService } from '@/actions/order/catalog';

type LandingContextType = {
  url: string;
  setUrl: (v: string) => void;
  networkId: string;
  setNetworkId: (v: string) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  selectedService: PublicService | null;
  setSelectedService: (v: PublicService | null) => void;
  quantity: number | '';
  setQuantity: (v: number | '') => void;
  email: string;
  setEmail: (v: string) => void;
  catalog: PublicNetwork[];
  availableCategories: PublicCategory[];
  services: PublicService[];
  isLoading: boolean;
  isCalculating: boolean;
  pricing: any;
  totalPriceFormatted: string;
};

const LandingContext = createContext<LandingContextType | undefined>(undefined);

export function LandingProvider({ children, value }: { children: React.ReactNode, value: LandingContextType }) {
  return <LandingContext.Provider value={value}>{children}</LandingContext.Provider>;
}

export function useLanding() {
  const context = useContext(LandingContext);
  if (!context) throw new Error('useLanding must be used within a LandingProvider');
  return context;
}
