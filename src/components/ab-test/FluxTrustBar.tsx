"use client";

import React from "react";
import { motion } from "framer-motion";
import { Users, Timer, CheckCircle, Headphones } from "lucide-react";

export function FluxTrustBar() {
  const stats = [
    { value: '2,000,000+', label: 'Заказов выполнено', icon: CheckCircle, color: 'text-emerald-500' },
    { value: '4 секунды', label: 'Среднее время старта', icon: Timer, color: 'text-amber-500' },
    { value: '99.9%', label: 'Успешных заказов', icon: Users, color: 'text-purple-500' },
    { value: '09:00 - 21:00 МСК', label: 'Живая поддержка', icon: Headphones, color: 'text-pink-500' },
  ];

  // Quadruple items for perfectly seamless infinite continuous loop
  const marqueeItems = [...stats, ...stats, ...stats, ...stats];

  return (
    <section aria-label="Статистика платформы" className="w-full py-6 md:py-10 bg-transparent overflow-hidden relative">
      {/* Subtle edge fades only on larger screens to prevent covering text on mobile */}
      <div className="absolute left-0 top-0 w-8 md:w-32 h-full bg-gradient-to-r from-background to-transparent z-10 pointer-events-none hidden sm:block" />
      <div className="absolute right-0 top-0 w-8 md:w-32 h-full bg-gradient-to-l from-background to-transparent z-10 pointer-events-none hidden sm:block" />

      {/* GPU Accelerated Seamless Continuous Marquee */}
      <div className="flex w-full overflow-hidden">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            repeat: Infinity,
            repeatType: "loop",
            ease: "linear",
            duration: 25,
          }}
          className="flex gap-3 sm:gap-6 px-2 sm:px-4 shrink-0 items-center whitespace-nowrap will-change-transform"
        >
          {marqueeItems.map((s, idx) => (
            <div
              key={`${s.label}-${idx}`}
              className="flex items-center gap-3 bg-white/95 dark:bg-[#121726]/95 border border-purple-500/20 backdrop-blur-xl rounded-full px-5 sm:px-8 py-2.5 sm:py-3.5 shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)] hover:border-purple-500/40 transition-all duration-300 group"
            >
              <div className={`p-2 rounded-full bg-neutral-100 dark:bg-neutral-800/80 shrink-0 ${s.color} group-hover:scale-110 transition-transform`}>
                <s.icon className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm" />
              </div>
              <div className="flex flex-col">
                <div className="text-sm sm:text-lg font-black tracking-tight text-neutral-900 dark:text-white tabular-nums">
                  {s.value}
                </div>
                <div className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
