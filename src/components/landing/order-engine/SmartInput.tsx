"use client";

import { memo, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface SmartInputProps {
  url: string;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
  isValid: boolean;
  totalPrice: number;
  isLoading?: boolean;
}

export const SmartInput = memo(function SmartInput({
  url,
  onUrlChange,
  onSubmit,
  isValid,
  totalPrice,
  isLoading = false
}: SmartInputProps) {
  
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").trim();
    if (!pasted) return;
    
    // Auto-add https:// if missing but it looks like a domain
    const normalized = (!pasted.startsWith("http") && (pasted.includes('t.me') || pasted.includes('vk.com') || pasted.includes('instagram.com'))) 
      ? `https://${pasted}` 
      : pasted;
      
    onUrlChange(normalized);
    e.preventDefault();
  }, [onUrlChange]);
  
  return (
    <div className="relative h-20 md:h-24 rounded-full border border-border/50 bg-content2 shadow-lg focus-within:border-primary/40 focus-within:shadow-[0_12px_50px_-12px] focus-within:shadow-primary/20 transition-all duration-300">
      <input
        type="url"
        inputMode="url"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        onPaste={handlePaste}
        className="w-full h-full pl-6 pr-36 md:pr-48 rounded-full text-base outline-none bg-transparent"
        onBlur={() => trackEvent("url_entered", { isValid, urlLength: url.length })}
      />
      <button
        onClick={onSubmit}
        disabled={!isValid || isLoading}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-14 md:h-16 px-4 md:px-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm md:text-base hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-12 min-w-12 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <span>Начать {totalPrice > 0 ? `за ${totalPrice}₽` : ""}</span>
        )}
      </button>
    </div>
  );
});
