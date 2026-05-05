"use client";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface OrderSummaryBarProps {
  total: number;
  onSubmit: () => void;
  isValid: boolean;
  isLoading?: boolean;
}

export function OrderSummaryBar({ total, onSubmit, isValid, isLoading }: OrderSummaryBarProps) {
  const [bottomOffset, setBottomOffset] = useState(0);
  
  useEffect(() => {
    // Check if visualViewport is available
    if (typeof window === 'undefined' || !window.visualViewport) return;
    
    const vv = window.visualViewport;
    
    const handleResize = () => {
      // Calculate keyboard height approx
      const keyboardHeight = window.innerHeight - vv.height;
      setBottomOffset(keyboardHeight > 100 ? keyboardHeight : 0);
    };
    
    vv.addEventListener("resize", handleResize);
    // Initial check
    handleResize();
    
    return () => vv.removeEventListener("resize", handleResize);
  }, []);
  
  return (
    <div 
      className="fixed left-0 right-0 bg-white border-t border-slate-100 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-[90] md:hidden transition-all duration-200 ease-out"
      style={{ 
        bottom: bottomOffset,
        paddingBottom: `max(1rem, env(safe-area-inset-bottom))` 
      }}
    >
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div>
          <div className="text-xs text-slate-500 font-medium mb-0.5">Итого к оплате</div>
          <div className="text-xl font-extrabold tabular-nums text-slate-900 leading-none">{total}₽</div>
        </div>
        <button 
          onClick={() => {
            trackEvent("checkout_initiated", { total });
            onSubmit();
          }}
          disabled={!isValid || isLoading}
          className="h-12 px-8 rounded-full bg-sky-600 text-white font-semibold text-base hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 transition-colors min-h-12 min-w-12 flex items-center justify-center shadow-md shadow-sky-600/20"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Оплатить"}
        </button>
      </div>
    </div>
  );
}
