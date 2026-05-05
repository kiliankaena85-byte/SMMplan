import { useState, useEffect } from 'react';
import { PublicService } from '@/actions/order/catalog';
import { calculatePriceAction } from '@/actions/order/checkout';
import { PricingResult } from '@/services/marketing.service';

export function useServicePricing(selectedService: PublicService | null, quantity: number) {
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedService || quantity <= 0) {
      setPricing(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchPrice = async () => {
      try {
        const result = await calculatePriceAction(selectedService.id, quantity);

        if (isMounted && result.success && result.data) {
          setPricing(result.data);
        }
      } catch (error) {
        console.error("Failed to calculate price:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Small debounce to avoid spamming the backend when dragging sliders or typing numbers fast
    const timer = setTimeout(fetchPrice, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedService?.id, quantity]);

  const total = pricing?.totalCents ? pricing.totalCents / 100 : 0;
  
  return {
    pricing,
    total,
    isLoading
  };
}
