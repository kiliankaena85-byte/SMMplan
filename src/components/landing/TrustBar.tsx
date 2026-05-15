"use client";

import { motion } from "framer-motion";
import { Users, Timer, CheckCircle, Headphones } from "lucide-react";

export function TrustBar() {
  const stats = [
    { value: '2,000,000+', label: 'Заказов выполнено', icon: CheckCircle, color: 'text-emerald-500' },
    { value: '4 секунды', label: 'Среднее время старта', icon: Timer, color: 'text-amber-500' },
    { value: '99.9%', label: 'Успешных заказов', icon: Users, color: 'text-primary' },
    { value: '24/7', label: 'Живая поддержка', icon: Headphones, color: 'text-indigo-500' },
  ];

  // We duplicate the array to create a seamless infinite loop
  const marqueeItems = [...stats, ...stats, ...stats];

  return (
    <section aria-label="Статистика платформы" className="w-full py-12 bg-white border-y border-slate-100 overflow-hidden relative">
      <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
      
      <div className="flex w-full overflow-hidden">
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
              className="flex items-center gap-4 bg-slate-50 border border-slate-100/60 rounded-full px-6 py-3 shrink-0"
            >
              <div className={`p-2 rounded-full bg-white shadow-sm border border-slate-100 ${s.color}`}>
                <s.icon className="w-5 h-5 drop-shadow-sm" />
              </div>
              <div className="flex flex-col">
                <div className="text-xl font-bold tracking-tight text-slate-800">{s.value}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{s.label}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
