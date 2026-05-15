import React from "react";
import { Zap } from "lucide-react";
import { OrderEngine } from "@/hooks/useOrderEngine";

interface DynamicPayloadWarningsProps {
  engine: OrderEngine;
}

export function DynamicPayloadWarnings({ engine }: DynamicPayloadWarningsProps) {
  const { selectedService, customData, setCustomData } = engine;

  const sName = selectedService?.name.toLowerCase() || "";
  const isCustomComments = sName.includes('свои') || sName.includes('свой текст');
  const isKeywords = sName.includes('ключево');
  const isPoll = sName.includes('опрос') || sName.includes('голосование');
  const isLiveStream = sName.includes('зрител') || sName.includes('эфир') || sName.includes('трансляц');
  const isPrivateChannel = sName.includes('закрыт');
  const customFieldLabel = isCustomComments ? 'Ваши комментарии (по одному в строке)' 
    : isKeywords ? 'Ключевые слова (через запятую)' 
    : isPoll ? 'Номер варианта ответа' 
    : null;

  // --- WAVE 4.2 CROSS-PLATFORM MISMATCH PROTECTION ---
  let isMismatch = false;
  let activeNetworkName = "";
  if (engine.platform && engine.networkId) {
    const activeNetwork = engine.catalog.find(n => n.id === engine.networkId);
    if (activeNetwork) {
      const detectedPlatform = engine.platform.toLowerCase();
      const selectedPlatform = activeNetwork.slug.toLowerCase();
      if (!selectedPlatform.includes(detectedPlatform) && !detectedPlatform.includes(selectedPlatform)) {
        isMismatch = true;
        activeNetworkName = activeNetwork.name;
      }
    }
  }

  if (!customFieldLabel && !isLiveStream && !isPrivateChannel && !isMismatch) return null;

  return (
    <div className="bg-background/50 p-6 md:px-8 flex flex-col gap-4">
      {isMismatch && (
         <div className="w-full bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 flex items-start gap-3 shadow-sm">
           <Zap className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
           <div className="text-sm">
             <p className="font-bold">Критическое несовпадение платформы!</p>
             <p className="mt-1 opacity-90">Вы вставили ссылку для <strong>{engine.platform}</strong>, но пытаетесь заказать услугу для <strong>{activeNetworkName}</strong>. Заказ заблокирован, пожалуйста, исправьте ссылку или выберите правильную соцсеть.</p>
           </div>
         </div>
      )}

      {isLiveStream && (
         <div className="w-full bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 flex items-start gap-3">
           <Zap className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
           <div className="text-sm">
             <p className="font-bold">Внимание: Заказ на Прямой Эфир!</p>
             <p className="mt-1 opacity-90">Услуга для запущенной трансляции. Если стрим прервется, гарантия сгорает!</p>
           </div>
         </div>
      )}

      {isPrivateChannel && (
         <div className="w-full bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4 flex items-start gap-3">
           <Zap className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
           <div className="text-sm">
             <p className="font-bold">Требуется приватная ссылка</p>
             <p className="mt-1 opacity-90">Используйте ссылку-приглашение (напр. t.me/+AbcDeF). Иначе заказ будет отменен.</p>
           </div>
         </div>
      )}

      {customFieldLabel && (
        <div className="w-full space-y-2 mt-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">{customFieldLabel}</label>
          {isCustomComments ? (
            <textarea 
              value={customData} 
              onChange={e => setCustomData(e.target.value)} 
              placeholder="Каждая строка - новый комментарий..."
              className="w-full min-h-[100px] p-4 rounded-xl border border-border bg-card text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-y shadow-sm"
            />
          ) : (
            <input 
              type="text" 
              value={customData} 
              onChange={e => setCustomData(e.target.value)} 
              placeholder={isPoll ? "Например: 2" : "Слова через запятую..."}
              className="w-full h-12 px-4 rounded-xl border border-border bg-card text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
            />
          )}
        </div>
      )}
    </div>
  );
}
