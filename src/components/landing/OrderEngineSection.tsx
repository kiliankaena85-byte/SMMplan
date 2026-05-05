"use client";

import { useMemo, useCallback, useState } from "react";
import { PublicNetwork } from "@/actions/order/catalog";
import { useLandingOrderEngine } from "@/hooks/useLandingOrderEngine";
import { SmartInput } from "./order-engine/SmartInput";
import { PlatformSelector } from "./order-engine/PlatformSelector";
import { CategorySidebar } from "./order-engine/CategorySidebar";
import { ServiceGrid } from "./order-engine/ServiceGrid";
import { MobileServiceDropdown } from "./order-engine/MobileServiceDropdown";
import { DynamicPayloads } from "./order-engine/DynamicPayloads";
import { OrderSummaryBar } from "./order-engine/OrderSummaryBar";
import { useRouter } from "next/navigation";
import { checkoutAction } from "@/actions/order/checkout";
import { toast } from "sonner";

export function OrderEngineSection({ initialCatalog }: { initialCatalog: PublicNetwork[] }) {
  const router = useRouter();
  const engine = useLandingOrderEngine(initialCatalog);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);

  // Derived data with useMemo
  const availableCategories = useMemo(() => {
    return engine.catalog.find(n => n.id === engine.networkId)?.categories || [];
  }, [engine.catalog, engine.networkId]);

  const canSubmit = Boolean(engine.isValid && engine.selectedService && engine.total > 0);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isCheckingOut) return;
    setIsCheckingOut(true);

    try {
      const res = await checkoutAction({
        link: engine.url,
        quantity: engine.quantity,
        email: engine.email || "guest@smmplan.ru", // Guest checkout fallback
        serviceId: engine.selectedService!.id,
        customData: engine.customData,
        gateway: "YOOKASSA",
      });

      if (res.success && res.data?.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      } else {
        // @ts-ignore - handling generic server action response
        toast.error(res.message || res.error || "Ошибка при создании заказа");
      }
    } catch (e) {
      toast.error("Произошла ошибка при обработке заказа");
    } finally {
      setIsCheckingOut(false);
    }
  }, [canSubmit, isCheckingOut, engine]);

  // Mobile specific handler to open dropdown
  const handleMobileCategorySelect = useCallback((catId: string) => {
    engine.setCategoryId(catId);
    if (window.innerWidth < 768) {
      setIsMobileDropdownOpen(true);
    }
  }, [engine]);

  return (
    <div className="w-full max-w-5xl mx-auto relative z-10 -mt-10 md:-mt-16 px-4 pb-20">
      <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-4 md:p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.08)] border border-white/50">
        
        {/* Step 1: Input */}
        <SmartInput
          url={engine.url}
          onUrlChange={engine.setUrl}
          onSubmit={handleSubmit}
          isValid={canSubmit}
          totalPrice={engine.total > 0 ? engine.total : (engine.selectedService ? (engine.selectedService.pricePer1kRub * engine.quantity / 1000) : 0)}
          isLoading={isCheckingOut}
        />
        
        {/* Error / Validation msg */}
        {engine.url && engine.error && (
          <div className="mt-3 ml-6 text-sm text-red-500 animate-in fade-in">{engine.error}</div>
        )}

        {/* Form Body */}
        <div className="mt-8 md:mt-12 space-y-8">
          <PlatformSelector 
            catalog={engine.catalog} 
            selectedNetworkId={engine.networkId} 
            onSelect={engine.setNetworkId} 
          />
          
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            <CategorySidebar 
              categories={availableCategories} 
              selectedCategoryId={engine.categoryId} 
              onSelect={handleMobileCategorySelect} 
            />
            
            <div className="flex-1 hidden md:block">
              <ServiceGrid 
                services={engine.services}
                selectedServiceId={engine.selectedService?.id || null}
                onSelect={(id) => {
                  const s = engine.services.find((x: any) => x.id === id);
                  if (s) engine.setSelectedService(s);
                }}
                platformId={engine.networkId}
              />
              
              <DynamicPayloads 
                service={engine.selectedService} 
                customData={engine.customData} 
                onCustomDataChange={engine.setCustomData} 
              />
            </div>
          </div>
        </div>
      </div>

      <MobileServiceDropdown 
        isOpen={isMobileDropdownOpen}
        onClose={() => setIsMobileDropdownOpen(false)}
        services={engine.services}
        selectedServiceId={engine.selectedService?.id || null}
        onSelect={(id) => {
          const s = engine.services.find((x: any) => x.id === id);
          if (s) engine.setSelectedService(s);
        }}
        platformId={engine.networkId}
      />

      <OrderSummaryBar 
        total={engine.total > 0 ? engine.total : (engine.selectedService ? (engine.selectedService.pricePer1kRub * engine.quantity / 1000) : 0)}
        isValid={canSubmit}
        onSubmit={handleSubmit}
        isLoading={isCheckingOut}
      />
    </div>
  );
}
