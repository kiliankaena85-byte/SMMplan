import React, { useState } from "react";
import { Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderEngine } from "@/hooks/useOrderEngine";

interface HeroInputProps {
  engine: OrderEngine;
  handleCheckout: () => void;
  linkHasError: boolean;
  setLinkHasError: (val: boolean) => void;
}

export function HeroInput({ engine, handleCheckout, linkHasError, setLinkHasError }: HeroInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { url, setUrl, isLoading, isCalculating } = engine;

  return (
    <div className="w-full max-w-4xl mx-auto relative z-20 mb-10 mt-4">
      <div className={`relative flex items-center w-full bg-white rounded-full p-2 sm:p-3 border-2 transition-all shadow-[0_8px_30px_-10px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.08)] h-20 md:h-24 ${
        linkHasError 
          ? 'border-red-400 focus-within:border-red-500 focus-within:shadow-[0_12px_50px_-12px_rgba(248,113,113,0.3)]'
          : 'border-slate-100 focus-within:border-primary/40 focus-within:shadow-[0_12px_50px_-12px] focus-within:shadow-primary/20'
      }`}>
        <div className="pl-6 sm:pl-8 pr-3 flex-shrink-0">
             {isLoading 
               ? <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary animate-spin" />
               : <Link2 className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 group-focus-within:text-primary transition-colors" />
             }
        </div>
        <input
          id="landing-url"
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (linkHasError) setLinkHasError(false);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setTimeout(() => setIsFocused(false), 200);
            const val = e.target.value.trim();
            if (val && !/^https?:\/\//i.test(val) && val.includes('.') && !val.includes(' ')) {
              setUrl(`https://${val}`);
            } else {
              setUrl(val);
            }
          }}
          placeholder="Вставьте ссылку на профиль или пост..."
          className="flex-1 bg-transparent border-none outline-none text-lg sm:text-2xl font-semibold text-slate-800 placeholder:text-slate-400 px-2 sm:px-4 h-full w-full"
        />
        <Button 
          onClick={handleCheckout}
          disabled={isCalculating}
          className="h-full rounded-full px-8 md:px-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg md:text-xl shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95"
        >
          {isCalculating ? <Loader2 className="w-6 h-6 animate-spin" /> : "Начать"}
        </Button>
      </div>
    </div>
  );
}
