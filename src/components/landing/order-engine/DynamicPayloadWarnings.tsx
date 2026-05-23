import React, { useState } from "react";
import { Zap, Info, HelpCircle } from "lucide-react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { VisualLinkGuideModal } from "./VisualLinkGuideModal";

interface DynamicPayloadWarningsProps {
  engine: OrderEngine;
}

export function DynamicPayloadWarnings({ engine }: DynamicPayloadWarningsProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
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
  // --- TELEGRAM MEDIA GROUP HINT (Views only) ---
  const activeNetwork = engine.catalog.find(n => n.id === engine.networkId);
  const activeCategory = activeNetwork?.categories.find(c => c.id === engine.categoryId);
  const isTelegramViews = activeNetwork?.slug?.toLowerCase() === 'telegram'
    && activeCategory?.name?.toLowerCase().includes('просмотр');

  const urlLower = engine.url.toLowerCase();
  const isPrivateTelegramPost = urlLower.includes('t.me/c/') || urlLower.includes('telegram.me/c/');
  const isVkPhotoOrVideo = urlLower.includes('vk.com/photo') || urlLower.includes('vk.com/video') || urlLower.includes('vk.ru/photo') || urlLower.includes('vk.ru/video') || urlLower.includes('vkvideo.ru/');

  if (!customFieldLabel && !isLiveStream && !isPrivateChannel && !isMismatch && !isTelegramViews && !isPrivateTelegramPost && !isVkPhotoOrVideo) return null;

  return (
    <div className="bg-background/50 p-6 md:px-8 flex flex-col gap-4">
      {isMismatch && (
         <div className="w-full bg-danger/10 border border-danger/20 text-danger rounded-xl p-4 flex items-start gap-3 shadow-sm">
           <Zap className="w-5 h-5 shrink-0 mt-0.5 text-danger" />
           <div className="text-sm">
             <p className="font-bold">Критическое несовпадение платформы!</p>
             <p className="mt-1 opacity-90">Вы вставили ссылку для <strong>{engine.platform}</strong>, но пытаетесь заказать услугу для <strong>{activeNetworkName}</strong>. Заказ заблокирован, пожалуйста, исправьте ссылку или выберите правильную соцсеть.</p>
           </div>
         </div>
      )}

      {isPrivateTelegramPost && (
         <div className="w-full bg-warning/10 border border-warning/20 text-warning rounded-xl p-4 flex items-start gap-3 shadow-sm">
           <Zap className="w-5 h-5 shrink-0 mt-0.5 text-warning" />
           <div className="text-sm">
             <p className="font-bold">Внимание: Внутренняя ссылка закрытого канала!</p>
             <p className="mt-1 opacity-90">Вы указали приватную ссылку на пост в закрытом канале. ИИ-воркеры не смогут выполнить накрутку. Пожалуйста, зайдите в настройки канала, измените тип канала на <strong>«Публичный»</strong> и используйте ссылку формата <code>t.me/имя_канала/номер</code>.</p>
           </div>
         </div>
      )}

      {isVkPhotoOrVideo && (
         <div className="w-full bg-warning/10 border border-warning/20 text-warning rounded-xl p-4 flex items-start gap-3 shadow-sm">
           <Info className="w-5 h-5 shrink-0 mt-0.5 text-warning" />
           <div className="text-sm">
             <p className="font-bold">Внимание: Ссылка на вложение (фото/видео) VK!</p>
             <p className="mt-1 opacity-90">Если вам требуются лайки или просмотры на <strong>всю запись на стене (пост)</strong>, пожалуйста, скопируйте ссылку на сам пост (формата <code>vk.com/wall...</code>) вместо конкретного медиафайла. Иначе накрутка пойдет исключительно на это фото/видео.</p>
           </div>
         </div>
      )}

      {isLiveStream && (
         <div className="w-full bg-danger/10 border border-danger/20 text-danger rounded-xl p-4 flex items-start gap-3">
           <Zap className="w-5 h-5 shrink-0 mt-0.5 text-danger" />
           <div className="text-sm">
             <p className="font-bold">Внимание: Заказ на Прямой Эфир!</p>
             <p className="mt-1 opacity-90">Услуга для запущенной трансляции. Если стрим прервется, гарантия сгорает!</p>
           </div>
         </div>
      )}

      {isTelegramViews && (
         <div className="w-full bg-primary/10 border border-primary/20 text-primary rounded-xl p-4 flex flex-col gap-3">
           <div className="flex items-start gap-3">
             <Info className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
             <div className="text-sm">
               <p className="font-bold">Пост содержит несколько фото или видео?</p>
               <p className="mt-1 opacity-90">Если в посте альбом, для корректной накрутки просмотров укажите ссылку на <strong>последнее</strong> фото/видео. Мы автоматически создадим 2 заказа.</p>
             </div>
           </div>
            <div className="ml-8 text-xs">
              <button 
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="font-semibold text-primary hover:opacity-85 flex items-center gap-1.5 transition-colors duration-200"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Как скопировать ссылку на конкретное фото?
              </button>
            </div>
           <div className="ml-8">
             <input 
               type="url" 
               value={engine.mediaGroupUrl} 
               onChange={e => engine.setMediaGroupUrl(e.target.value)} 
               placeholder="Ссылка на последнее медиа (необязательно)"
               className="w-full h-10 px-3 rounded-lg border border-primary/20 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
             />
             {engine.mediaGroupUrl.trim().length > 5 && (
               <p className="mt-1.5 text-xs text-primary font-medium">
                 ✓ Будет создано 2 заказа. Итоговая стоимость ×2.
               </p>
             )}
           </div>
         </div>
      )}

      {isPrivateChannel && (
         <div className="w-full bg-warning/10 border border-warning/20 text-warning rounded-xl p-4 flex items-start gap-3">
           <Zap className="w-5 h-5 shrink-0 mt-0.5 text-warning" />
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
      
      <VisualLinkGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
