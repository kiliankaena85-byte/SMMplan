import React from "react";
import { Link2, Mail, CheckSquare, Square, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { ROUTES } from "@/lib/routes";

interface BottomCheckoutProps {
  engine: OrderEngine;
  handleCheckout: () => void;
  isSubmitting: boolean;
}

export function BottomCheckout({ engine, handleCheckout, isSubmitting }: BottomCheckoutProps) {
  const {
    url, setUrl,
    email, setEmail,
    quantity, setQuantity,
    promoCode, setPromoCode,
    selectedService,
    agreedToTerms, setAgreedToTerms,
    isCalculating,
    totalPriceFormatted,
  } = engine;

  return (
    <div className="sm:hidden bg-content1 border-t border-border/50 p-6 flex flex-col gap-8 rounded-b-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
      {/* Link Input Row */}
      <div className="w-full">
         <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-2">Ссылка на соцсеть / профиль</label>
            <div className="relative">
              <Link2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
              <input 
                type="url" 
                value={url} 
                onChange={e => setUrl(e.target.value)} 
                placeholder="https://..."
                className="w-full h-16 pl-14 pr-6 rounded-full border-2 border-border/60 bg-content2 shadow-sm text-[15px] font-semibold text-foreground placeholder:text-muted-foreground/50 focus:bg-background focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10 outline-none transition-all"
              />
            </div>
         </div>
      </div>

      {/* Top row with inputs */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-2">Email для чека</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="you@example.com"
                className="w-full h-16 pl-14 pr-6 rounded-full border-2 border-border/60 bg-content2 shadow-sm text-[15px] font-semibold text-foreground placeholder:text-muted-foreground/50 focus:bg-background focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10 outline-none transition-all"
              />
            </div>
         </div>
         <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-2">Количество</label>
            <input 
              type="number" 
              value={quantity} 
              min={selectedService?.minQty || 10}
              max={selectedService?.maxQty}
              onFocus={(e) => e.target.select()}
              onChange={e => {
                let val = Number(e.target.value);
                if (selectedService?.maxQty && val > selectedService.maxQty) val = selectedService.maxQty;
                setQuantity(val);
              }} 
              className="w-full h-16 px-6 rounded-full border-2 border-border/60 bg-content2 shadow-sm text-xl font-black tabular-nums text-foreground focus:bg-background focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10 outline-none transition-all"
            />
         </div>
         <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-2">Промокод</label>
            <input 
              type="text" 
              value={promoCode} 
              onChange={e => setPromoCode(e.target.value.toUpperCase())} 
              placeholder="WINTER2026"
              className="w-full h-16 px-6 rounded-full border-2 border-border/60 bg-content2 shadow-sm text-[15px] font-mono tracking-wider uppercase text-foreground placeholder:text-muted-foreground/50 focus:bg-background focus:border-primary/50 focus:shadow-lg focus:shadow-primary/10 outline-none transition-all"
            />
         </div>
      </div>

      {/* Bottom row with price and button */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-border/50">
         {/* Legal Consent inline with checkout */}
         <div className="flex items-center gap-3 order-2 md:order-1">
           <button onClick={() => setAgreedToTerms(!agreedToTerms)} className="text-primary focus:outline-none shrink-0 rounded hover:scale-105 transition-transform">
               {agreedToTerms ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6 text-muted-foreground/30" />}
           </button>
           <p className="text-[12px] text-muted-foreground/80 font-medium leading-tight max-w-[250px]">
             Я принимаю условия <Link href={ROUTES.LEGAL.TERMS} className="underline text-foreground hover:text-primary transition-colors">Оферты</Link> и <Link href={ROUTES.LEGAL.PRIVACY} className="underline text-foreground hover:text-primary transition-colors">Политики</Link>
           </p>
         </div>

         <div className="flex items-center gap-8 w-full md:w-auto order-1 md:order-2 justify-between md:justify-end">
            <div className="text-right flex-shrink-0">
               <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Итого к оплате</p>
               <div className="flex items-center justify-end gap-2 min-h-[40px]">
                 {isCalculating ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                 ) : (
                    <p className="text-4xl md:text-5xl font-black text-foreground tabular-nums leading-none tracking-tight">{totalPriceFormatted.replace('₽', '')} <span className="text-2xl md:text-3xl text-primary">₽</span></p>
                 )}
               </div>
            </div>
            <Button 
               onClick={handleCheckout}
               disabled={isSubmitting}
               className={`min-w-[200px] h-16 rounded-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group ${
                  isSubmitting ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'
               }`}
            >
               {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                 <>Оплатить <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" /></>
               )}
            </Button>
         </div>
      </div>
      <div className="w-full flex justify-end mt-3 md:mt-2">
         <p className="text-[11px] text-muted-foreground/70 font-medium max-w-[250px] text-right leading-tight">Оплата картой (РФ) и СБП. Оплата криптовалютой доступна в Личном Кабинете.</p>
      </div>
    </div>
  );
}
