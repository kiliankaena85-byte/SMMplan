const fs = require('fs');

const file = 'd:/SMM_plan_2/src/components/landing/SmartLinkLanding.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  '               <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] min-h-[400px] border-b border-border/50">',
  '               {/* SECTION 2: COLUMNS (Categories & Services & Desktop Checkout) — HARD BOUNDARY */}\n               <div className="flex flex-col lg:flex-row min-h-[400px] border-b border-border/50 relative items-start">'
);

c = c.replace(
  '                 <div className="hidden md:flex lg:flex-col flex-row flex-wrap lg:flex-nowrap lg:border-r border-slate-100 p-4 lg:p-6 gap-3 bg-slate-50/50 shrink-0 lg:w-[320px] items-center lg:items-stretch lg:max-h-[700px] lg:overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [mask-image:linear-gradient(to_bottom,black_calc(100%-40px),transparent_100%)] lg:pb-12">',
  '                 <div className="hidden md:flex lg:flex-col flex-row flex-wrap lg:flex-nowrap lg:border-r border-slate-100 p-4 lg:p-6 gap-3 bg-slate-50/50 shrink-0 lg:w-[320px] items-center lg:items-stretch lg:max-h-[700px] lg:overflow-y-auto lg:sticky lg:top-4 lg:z-10 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [mask-image:linear-gradient(to_bottom,black_calc(100%-40px),transparent_100%)] lg:pb-12 z-10 w-full">'
);

c = c.replace(
  '                 <div className="flex-1 bg-slate-50 relative">',
  '                 <div className="flex-1 min-w-0 bg-slate-50 relative pb-4 lg:pb-0">'
);

c = c.replace(
  '            className="fixed bottom-0 left-0 right-0 z-[200] hidden sm:block"',
  '            className="fixed bottom-0 left-0 right-0 z-[200] hidden sm:block lg:hidden"'
);

const rightPanelHtml = `
{/* 2.3 Right Column: Desktop Command Center (Checkout Panel) */}
        <AnimatePresence>
          {selectedService && (
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="hidden lg:flex flex-col w-[380px] shrink-0 sticky top-4 bg-white/80 backdrop-blur-3xl border-l border-slate-200/60 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] rounded-l-3xl overflow-hidden h-[calc(100vh-2rem)] max-h-[850px] z-20"
            >
              <div className="p-6 border-b border-slate-100 bg-white">
                <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest mb-1 shadow-sky-500/10">Оформление заказа</p>
                <p className="text-[15px] font-bold text-slate-800 leading-snug line-clamp-2">{selectedService.name}</p>
                
                <div className="flex items-center gap-2 mt-4 text-xs font-medium text-slate-500 bg-slate-50 rounded-lg p-2 border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span>Цена за 1000 шт: {((selectedService.pricePer1kRub / 1000) < 0.1 ? (selectedService.pricePer1kRub / 1000).toFixed(4) : (selectedService.pricePer1kRub / 1000).toFixed(2)).replace('.', ',')} ₽</span>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                 {/* Desktop email input */}
                 <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Email для чека</label>
                    <div className="relative">
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <input 
                         type="email" 
                         value={email} 
                         onChange={e => setEmail(e.target.value)} 
                         placeholder="you@example.com"
                         className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all shadow-inner"
                       />
                    </div>
                 </div>

                 {/* Desktop quantity input */}
                 <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Количество</label>
                    <input 
                      type="number" 
                      value={quantity} 
                      min={selectedService.minQty || 10}
                      onChange={e => setQuantity(Number(e.target.value))} 
                      className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xl font-black tabular-nums text-slate-800 focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all shadow-inner"
                    />
                 </div>

                 <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-start gap-3 cursor-pointer select-none group mt-4">
                      <button 
                        onClick={() => setAgreedToTerms(!agreedToTerms)} 
                        className="text-sky-500 mt-0.5 focus:outline-none shrink-0 rounded hover:scale-105 transition-transform"
                      >
                        {agreedToTerms 
                          ? <CheckSquare className="w-5 h-5" /> 
                          : <Square className="w-5 h-5 text-slate-300 group-hover:text-slate-400" />
                        }
                      </button>
                      <span className="text-xs text-slate-500 font-medium leading-relaxed" onClick={(e) => { e.preventDefault(); setAgreedToTerms(!agreedToTerms); }}>
                        Я согласен с условиями <Link href="/p/offer" className="underline hover:text-sky-600 transition-colors" onClick={(e) => e.stopPropagation()}>публичной оферты</Link>
                      </span>
                    </label>
                 </div>
              </div>

              <div className="bg-slate-900 border-t border-slate-800 p-6 flex flex-col gap-4">
                <div className="flex items-end justify-between">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Итого к оплате</p>
                  {isCalculating ? (
                    <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
                  ) : (
                    <p className="text-4xl font-black text-white tabular-nums leading-none tracking-tight">
                      {totalPriceFormatted.replace('₽', '')} <span className="text-2xl text-sky-500">₽</span>
                    </p>
                  )}
                </div>

                <Button 
                  onClick={handleCheckout}
                  disabled={!selectedService || !url || quantity < (selectedService?.minQty || 1) || isSubmitting || !agreedToTerms || (
                    (selectedService.name.toLowerCase().includes('опрос') || 
                     selectedService.name.toLowerCase().includes('свои') || 
                     selectedService.name.toLowerCase().includes('свой текст') || 
                     selectedService.name.toLowerCase().includes('ключево')) && !customData.trim()
                  )}
                  className={\`w-full h-14 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-base shadow-[0_10px_30px_-10px_rgba(14,165,233,0.5)] transition-all flex items-center justify-center gap-2 group \${
                    agreedToTerms && selectedService ? 'hover:scale-[1.02] active:scale-95' : 'opacity-50 grayscale hover:bg-sky-500'
                  }\`}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>Оплатить <ChevronRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" /></>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        </div>
        
      {/* ══════════ DESKTOP STICKY CHECKOUT BAR (Финтех-бар) ══════════ */}
`;

// Insert the new right panel immediately after the 3 closing divs
const targetMarker = '</div>\n        </div>\n        \n\n      {/* ══════════ DESKTOP STICKY CHECKOUT BAR';

if (c.indexOf(targetMarker) !== -1) {
  // Replace the first match of 3 closing divs followed by the comment
  c = c.replace(targetMarker, rightPanelHtml.trim() + '\\n');
  fs.writeFileSync(file, c);
  console.log("Successfully patched layout!");
} else {
  // Let's print out what is actually there using regex
  const match = c.match(/<\\/div>\\s*<\\/div>\\s*<\\/div>\\s*\\{\\/\\* ══════════ DESKTOP STICKY CHECKOUT BAR/);
  if (match) {
    c = c.replace(match[0], '{/* Replace Match */}\\n<\\/div>\\n<\\/div>\\n' + rightPanelHtml.trim());
    // Wait, replacing via regex might consume too much, let me just replace exactly:
    const exact = match[0];
    c = c.replace(exact, rightPanelHtml.trim());
    fs.writeFileSync(file, c);
    console.log("Successfully patched layout with Regex Match!");
  } else {
    console.log("Still failed to find closing tags.");
  }
}
