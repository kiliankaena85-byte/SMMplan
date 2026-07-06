"use client";

import { motion } from "framer-motion";
import { Users, Timer, CheckCircle, Headphones } from "lucide-react";

export function LovableTrustBar() {
  const stats = [
    { value: '2,000,000+', label: 'Заказов выполнено', icon: CheckCircle, color: 'text-success' },
    { value: '4 секунды', label: 'Среднее время старта', icon: Timer, color: 'text-warning' },
    { value: '99.9%', label: 'Успешных заказов', icon: Users, color: 'text-primary' },
    { value: '09:00 - 21:00 МСК', label: 'Живая поддержка', icon: Headphones, color: 'text-secondary' },
  ];

  // We duplicate the array to create a seamless infinite loop
  const marqueeItems = [...stats, ...stats, ...stats];

  return (
    <section aria-label="Статистика платформы" className="w-full py-12 bg-transparent overflow-hidden relative">
      <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-background to-transparent z-10 pointer-events-none hidden md:block" />
      <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-background to-transparent z-10 pointer-events-none hidden md:block" />
      
      {/* Mobile Grid Layout (< md) */}
      <div className="grid grid-cols-2 gap-3.5 px-4 w-full max-w-lg sm:max-w-2xl mx-auto md:hidden">
        {stats.map((s, idx) => (
          <div
            key={`${s.label}-${idx}`}
            className="flex items-center gap-2 md:gap-4 bg-white dark:bg-content1 rounded-3xl p-3 md:p-4 w-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300"
          >
            <div className={`p-2.5 rounded-2xl bg-default-50 shrink-0 ${s.color}`}>
               <s.icon className="w-5 h-5 drop-shadow-sm" />
            </div>
            <div className="flex flex-col min-w-0">
               <div className="text-sm md:text-base font-bold tracking-tight text-foreground tabular-nums">{s.value}</div>
               <div className="text-[10px] md:text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-normal leading-tight">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Marquee (>= md) */}
      <div className="hidden md:flex w-full overflow-hidden">
        <motion.div
          animate={{ x: [0, -1920] }} // Assuming roughly 1920px width of the single set. Motion will loop it.
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 40,
          }}
          className="flex gap-4 sm:gap-8 px-4 sm:px-8 shrink-0 items-center whitespace-nowrap"
        >
          {marqueeItems.map((s, idx) => (
            <div
              key={`${s.label}-${idx}`}
              className="flex items-center gap-4 bg-white dark:bg-content1 rounded-full px-8 py-4 shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300"
            >
              <div className={`p-2.5 rounded-full bg-default-50 ${s.color}`}>
                <s.icon className="w-5 h-5 drop-shadow-sm" />
              </div>
              <div className="flex flex-col">
                <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">{s.value}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
