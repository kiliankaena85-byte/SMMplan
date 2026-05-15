import React from "react";
import { Link2, Mail, CheckSquare, Square, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OrderEngine } from "@/hooks/useOrderEngine";

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
    selectedService,
    agreedToTerms, setAgreedToTerms,
    isCalculating,
    totalPriceFormatted,
  } = engine;

  return (
    <div className="sm:hidden bg-slate-50 border-t border-slate-100 p-6 flex flex-col gap-8 rounded-b-[2.5rem]">
      {/* Link Input Row */}
      <div className="w-full">
         <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">Ссылка на соцсеть / профиль</label>
            <div className="relative">
              <Link2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="url" 
                value={url} 
                onChange={e => setUrl(e.target.value)} 
                placeholder="https://..."
                className="w-full h-16 pl-14 pr-6 rounded-full border-2 border-slate-200 bg-white shadow-sm text-[15px] font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-primary/50 focus:shadow-[0_8px_20px_-6px] focus:shadow-primary/15 outline-none transition-all"
              />
            </div>
         </div>
      </div>

      {/* Top row with inputs */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">Email для чека</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="you@example.com"
                className="w-full h-16 pl-14 pr-6 rounded-full border-2 border-slate-200 bg-white shadow-sm text-[15px] font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-primary/50 focus:shadow-[0_8px_20px_-6px] focus:shadow-primary/15 outline-none transition-all"
              />
            </div>
         </div>
         <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">Количество</label>
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
              className="w-full h-16 px-6 rounded-full border-2 border-slate-200 bg-white shadow-sm text-xl font-black tabular-nums text-slate-800 focus:bg-white focus:border-primary/50 focus:shadow-[0_8px_20px_-6px] focus:shadow-primary/15 outline-none transition-all"
            />
         </div>
      </div>

      {/* Bottom row with price and button */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-200">
         {/* Legal Consent inline with checkout */}
         <div className="flex items-center gap-3 order-2 md:order-1">
           <button onClick={() => setAgreedToTerms(!agreedToTerms)} className="text-primary focus:outline-none shrink-0 rounded hover:scale-105 transition-transform">
               {agreedToTerms ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6 text-slate-300" />}
           </button>
           <p className="text-[12px] text-slate-500 font-medium leading-tight max-w-[250px]">
             Я принимаю условия <Link href="/p/offer" className="underline text-slate-700 hover:text-primary transition-colors">Оферты</Link> и <Link href="/p/privacy" className="underline text-slate-700 hover:text-primary transition-colors">Политики конфиденциальности</Link>
           </p>
         </div>

         <div className="flex items-center gap-8 w-full md:w-auto order-1 md:order-2 justify-between md:justify-end">
            <div className="text-right flex-shrink-0">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Итого к оплате</p>
               <div className="flex items-center justify-end gap-2 min-h-[40px]">
                 {isCalculating ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                 ) : (
                    <p className="text-4xl md:text-5xl font-black text-slate-900 tabular-nums leading-none tracking-tight">{totalPriceFormatted.replace('₽', '')} <span className="text-2xl md:text-3xl text-primary">₽</span></p>
                 )}
               </div>
            </div>
            <Button 
               onClick={handleCheckout}
               disabled={isSubmitting}
               className={`min-w-[200px] h-16 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center gap-2 group ${
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
         <p className="text-[11px] text-slate-400 font-medium max-w-[250px] text-right leading-tight">Оплата картой (РФ) и СБП. Оплата криптовалютой доступна в Личном Кабинете.</p>
      </div>
    </div>
  );
}
