const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src', 'components', 'landing', 'SmartLinkLanding.tsx');
let code = fs.readFileSync(targetPath, 'utf8');

// 1. Remove Select import since it's causing the SelectItem error and we are switching to native select for Mobile
code = code.replace(/import \{ Select, Input as HeroInput, Button as HeroButton \} from "\@heroui\/react";/, 
                    'import { Input as HeroInput, Button as HeroButton } from "@heroui/react";');

// 2. Wrap Glass Card conditionally (Zero-Scroll)
const vitrinaStart = '<div className="w-full border border-white/80 overflow-hidden shadow-inner will-change-transform'; // Need generic match or replace the container directly
// Let's use a more robust regex to find the AnimatePresence spot.
// It happens after the Title & Input block. The marker is {/* Витрина интерфейса (Expandable) */}
const vitrinaOld = `<div className="w-full bg-white/50 border border-white/80 rounded-3xl overflow-hidden shadow-inner">
            {/* НЕТ АНИМАЦИИ СКРЫТИЯ (ПРОСИЛИ ПОКАЗАТЬ КАК МОКАП ДАЖЕ ДО ФОКУСА ИЛИ АКТИВИРОВАТЬ СРАЗУ)
                Мы будем показывать интерфейс всегда, чтобы работал как красивая витрина */}
            <div className="w-full flex flex-col will-change-transform">`;

const vitrinaNew = `<AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0, height: 0, filter: 'blur(10px)', y: -20 }}
                animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)', y: 0 }}
                exit={{ opacity: 0, height: 0, filter: 'blur(10px)', y: -20 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full bg-card/60 backdrop-blur-xl border border-border/80 rounded-3xl overflow-hidden shadow-inner will-change-transform"
              >
                <div className="w-full flex flex-col">`;

code = code.replace(vitrinaOld, vitrinaNew);

const vitrinaCloseOld = `                  </div>
                </div>
              </div>
            </div>
          </div>`;

const vitrinaCloseNew = `                  </div>
                </div>
              </div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>`;

code = code.replace(vitrinaCloseOld, vitrinaCloseNew);

// 3. Fix the Mobile Select (HeroUI Select -> Native select)
const mobileSelectOldRegex = /<div className="md:hidden flex flex-col gap-3 p-4 bg-slate-50\/50 border-b border-slate-200\/50">[\s\S]*?(?:<\/Select>[\s]*)}[\s]*<\/div>/;
const mobileSelectNew = `<div className="md:hidden flex flex-col gap-3 p-4 bg-muted border-b border-border">
                <select
                  aria-label="Выберите платформу"
                  value={networkId || ""}
                  onChange={(e) => setNetworkId(e.target.value)}
                  className="w-full h-14 px-4 bg-background border border-border shadow-sm font-bold text-foreground rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none outline-none"
                >
                  <option value="" disabled>Платформа...</option>
                  {catalog.map(n => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
                
                {networkId && availableCategories.length > 0 && (
                  <select
                    aria-label="Выберите категорию"
                    value={categoryId || ""}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full h-14 px-4 bg-primary/5 border border-primary/20 shadow-sm font-bold text-primary rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none outline-none mt-1"
                  >
                    <option value="" disabled>Категория...</option>
                    {availableCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>`;

code = code.replace(mobileSelectOldRegex, mobileSelectNew);

// 4. Fixed Bottom Sheet for mobile checkout
const bottomCheckoutOld = `<div className="bg-white border-t border-slate-200/50 p-6 md:p-8 flex flex-col items-end gap-6">`;
const bottomCheckoutNew = `<div className="fixed bottom-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-xl border-t border-border p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] pb-safe md:static md:bg-background md:border-t md:border-border md:p-6 lg:p-8 flex flex-col items-end gap-4 md:gap-6 md:shadow-none md:pb-6">`;
code = code.replace(bottomCheckoutOld, bottomCheckoutNew);

// 5. Semantic Tokens Replacement
code = code.replace(
  '<main className="flex-1 w-full max-w-6xl mx-auto px-4 py-20 flex flex-col items-center relative z-10">',
  '<main className="flex-1 w-full max-w-6xl mx-auto px-4 py-20 pb-40 flex flex-col items-center relative z-10">'
);
code = code.replace(/bg-slate-50/g, 'bg-background');
code = code.replace(/text-slate-900/g, 'text-foreground');
code = code.replace(/text-slate-800/g, 'text-foreground');
code = code.replace(/bg-slate-900/g, 'bg-foreground');
code = code.replace(/bg-white\/70/g, 'bg-card/70');
code = code.replace(/bg-white\/50/g, 'bg-card/50');
code = code.replace(/bg-white\/40/g, 'bg-card/40');
code = code.replace(/bg-white/g, 'bg-card');
code = code.replace(/bg-sky-500/g, 'bg-primary');
code = code.replace(/text-sky-500/g, 'text-primary');
code = code.replace(/text-slate-500/g, 'text-muted-foreground');
code = code.replace(/border-slate-200/g, 'border-border');
code = code.replace(/border-slate-100/g, 'border-border');
code = code.replace(/border-slate-300/g, 'border-border');
code = code.replace(/shadow-slate-200/g, 'shadow-border');
code = code.replace(/bg-sky-100/g, 'bg-primary/10');
code = code.replace(/text-sky-700/g, 'text-primary');
code = code.replace(/border-sky-300/g, 'border-primary/50');
code = code.replace(/hover:border-sky-500/g, 'hover:border-primary');

// Ripple effect swap for active service card
// We try a generic regex to catch the isSelected ? 'border-sky-500 ...' clause
code = code.replace(
  /isSelected \? 'border-sky-500 shadow-lg shadow-sky-500\/10 z-10' : 'border-slate-100 hover:border-slate-300'/g,
  "isSelected ? 'border-primary shadow-lg shadow-primary/10 bg-primary/5 scale-[1.02] z-10' : 'border-border hover:border-primary/60 hover:shadow-md hover:z-10'"
);

fs.writeFileSync(targetPath, code);
console.log('UI Rewrite Completed successfully!');
