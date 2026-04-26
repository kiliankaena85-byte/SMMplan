"use client";

import React from "react";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { AlertCircle, ChevronRight } from "lucide-react";

interface PlatformSelectorFallbackProps {
  onSelect: (platform: IntelligencePlatform) => void;
  availablePlatforms: { id: string; name: IntelligencePlatform; icon?: React.ReactNode }[];
}

export function PlatformSelectorFallback({ onSelect, availablePlatforms }: PlatformSelectorFallbackProps) {
  return (
    <>
      {/* Desktop Inline Fallback (hidden on mobile) */}
      <div className="hidden md:block bg-white border-2 border-amber-500/20 shadow-lg shadow-amber-500/5 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <AlertCircle className="w-24 h-24 text-amber-500" />
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Не удалось определить платформу автоматически
            </h3>
            <p className="text-sm text-zinc-500 font-medium mt-1">
              Ссылка имеет нестандартный формат. Пожалуйста, выберите нужную платформу вручную, чтобы мы смогли показать подходящие услуги.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-3">
            {availablePlatforms.map((pt) => (
              <button
                key={pt.id}
                onClick={() => onSelect(pt.name)}
                className="flex flex-col items-center justify-center p-4 bg-zinc-50 border border-zinc-200 hover:border-amber-400 hover:bg-amber-50 rounded-xl transition-all group"
              >
                <span className="font-bold text-sm text-zinc-800 group-hover:text-amber-900">
                  {pt.name}
                </span>
                <ChevronRight className="w-4 h-4 mt-2 text-zinc-300 group-hover:text-amber-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet (Zero-Scroll Friendly, visible <= md) */}
      <div className="md:hidden fixed inset-0 z-[100] bg-black/60 flex items-end">
         <div className="bg-white w-full rounded-t-3xl p-6 pb-12 animate-in slide-in-from-bottom border-t border-amber-500/20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-6"></div>
            
            <h3 className="text-xl font-black text-zinc-900 flex items-center justify-center gap-2 mb-2">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              Выберите соцсеть
            </h3>
            <p className="text-sm text-center text-zinc-500 font-medium mb-8">
              Системе не удалось распознать платформу по ссылке.
            </p>

            <div className="grid grid-cols-2 gap-3" data-testid="platform-fallback">
              {availablePlatforms.map((pt) => (
                <button
                  key={pt.id}
                  onClick={() => onSelect(pt.name)}
                  data-testid={`btn-${pt.name.toLowerCase()}`}
                  className="flex flex-col items-center justify-center p-5 bg-white border border-zinc-200 active:border-amber-400 active:bg-amber-50 rounded-2xl shadow-sm transition-all"
                >
                  <span className="font-bold text-base text-zinc-800">
                    {pt.name}
                  </span>
                </button>
              ))}
            </div>
         </div>
      </div>
    </>
  );
}
