import React, { useState } from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Zap, Info, HelpCircle, CheckCircle2, Unlock } from "lucide-react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { PlatformLinkGuideDrawer } from "./PlatformLinkGuideDrawer";
import { getLinkValidator } from "@/validators/link-mutators";
import { inferTargetTypeFromCategory } from "@/utils/target-type";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DynamicPayloadWarningsProps {
  engine: OrderEngine;
}

export function DynamicPayloadWarnings({ engine }: DynamicPayloadWarningsProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState<number>(0);
  const { selectedService, customData, setCustomData } = engine;

  const sName = selectedService?.name.toLowerCase() || "";
  const cType = selectedService?.customDataType;
  const isCustomComments = cType === 'TEXTAREA' || sName.includes('свои') || sName.includes('свой текст');
  const isKeywords = cType === 'TEXT' || sName.includes('ключево');
  const isPoll = cType === 'NUMBER' || (sName.includes('опрос') && !sName.includes('просмотр')) || sName.includes('голосование');
  const isLiveStream = sName.includes('зрител') || sName.includes('эфир') || sName.includes('трансляц');
  const isPrivateChannel = sName.includes('закрыт');
  const customFieldLabel = selectedService?.customDataLabel?.trim() || (
    isCustomComments ? 'Ваши комментарии (по одному в строке)' 
    : isKeywords ? 'Ключевые слова (через запятую)' 
    : isPoll ? 'Номер варианта ответа' 
    : null
  );

  // --- WAVE 4.2 CROSS-PLATFORM MISMATCH PROTECTION ---
  let isMismatch = false;
  let activeNetworkName = "";
  if (!engine.isLinkOverridden && engine.platform && engine.networkId) {
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

  // --- STRICT ZOD VALIDATION CHECK FOR DYNAMIC OVERRIDE ---
  const activePlatform = engine.platform || engine.manualPlatform;
  const activeNetwork = engine.catalog.find(n => n.id === engine.networkId);
  const selectedPlatformSlug = activeNetwork?.slug?.toUpperCase() || "";
  
  const validationPlatform = (activePlatform && activePlatform !== IntelligencePlatform.OTHER)
    ? activePlatform
    : selectedPlatformSlug;

  let validationMessage: string | null = null;
  
  if (engine.url.trim().length > 3 && selectedService && validationPlatform) {
    const activeCatForVal = engine.catalog.flatMap(n => n.categories).find(c => c.id === selectedService.categoryId);
    const targetType = selectedService.targetType === 'POST'
      ? inferTargetTypeFromCategory(activeCatForVal?.name)
      : (selectedService.targetType || inferTargetTypeFromCategory(activeCatForVal?.name));
    
    try {
      const validator = getLinkValidator(validationPlatform, targetType);
      const linkResult = validator.safeParse(engine.url);
      if (!linkResult.success) {
        validationMessage = linkResult.error.errors[0].message;
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // safe fallback
    }
  }
  // --- TELEGRAM MEDIA GROUP HINT (Views only, excluding auto-views and future views) ---
  const activeCategory = activeNetwork?.categories.find(c => c.id === engine.categoryId);
  const isTelegramViews = activeNetwork?.slug?.toLowerCase() === 'telegram'
    && activeCategory?.name?.toLowerCase().includes('просмотр')
    && !activeCategory?.name?.toLowerCase().includes('авто')
    && !activeCategory?.name?.toLowerCase().includes('auto')
    && !activeCategory?.name?.toLowerCase().includes('будущ')
    && selectedService?.targetType !== 'CHANNEL';

  const urlLower = engine.url.toLowerCase();
  const isPrivateTelegramPost = urlLower.includes('t.me/c/') || urlLower.includes('telegram.me/c/');
  const isVkPhotoOrVideo = urlLower.includes('vk.com/photo') || urlLower.includes('vk.com/video') || urlLower.includes('vk.ru/photo') || urlLower.includes('vk.ru/video') || urlLower.includes('vkvideo.ru/');

  // --- SMART CATEGORY SWAPPER LOGIC ---
  const isPostUrl = urlLower.includes('/p/') || 
                    urlLower.includes('/reel/') || 
                    urlLower.includes('/tv/') ||
                    urlLower.includes('wall') || 
                    urlLower.includes('watch?v=') || 
                    urlLower.includes('youtu.be/') || 
                    urlLower.includes('/shorts/') || 
                    (urlLower.includes('t.me/') && !urlLower.includes('t.me/c/') && /\/t\.me\/[\w-]+\/\d+/i.test(urlLower));

  const isChannelUrl = urlLower.length > 5 && !isPostUrl && (
    urlLower.includes('t.me/') || 
    (urlLower.includes('vk.com/') && !urlLower.includes('vk.com/wall') && !urlLower.includes('vk.com/video') && !urlLower.includes('vk.com/clip') && !urlLower.includes('vk.com/photo')) || 
    (urlLower.includes('instagram.com/') && !urlLower.includes('/p/') && !urlLower.includes('/reel/')) || 
    (urlLower.includes('youtube.com/') && !urlLower.includes('watch?v=') && !urlLower.includes('/shorts/'))
  );

  const isChannelCategory = activeCategory?.name?.toLowerCase().match(/(подписчик|фолловер|участник|канал|групп|буст|профиль|друзья)/i);
  const isPostCategory = activeCategory?.name?.toLowerCase().match(/(лайк|просмотр|реакц|репост|коммент|зрител|эфир|видео|клип)/i);

  let swapSuggestion: { text: string; categoryId: string; categoryName: string } | null = null;

  if (isPostUrl && isChannelCategory) {
    const targetCat = activeNetwork?.categories.find(c => c.name.toLowerCase().match(/(лайк|просмотр|реакц|репост|коммент)/i));
    if (targetCat) {
      swapSuggestion = {
        text: "Вы вставили ссылку на публикацию (пост), но выбрали категорию накрутки подписчиков. Хотите переключить на лайки или просмотры?",
        categoryId: targetCat.id,
        categoryName: targetCat.name
      };
    }
  } else if (isChannelUrl && isPostCategory) {
    const targetCat = activeNetwork?.categories.find(c => c.name.toLowerCase().match(/(подписчик|фолловер|участник|канал|групп|буст|профиль|друзья)/i));
    if (targetCat) {
      swapSuggestion = {
        text: "Вы вставили ссылку на профиль/канал, но выбрали категорию накрутки лайков или просмотров. Хотите переключить на подписчиков?",
        categoryId: targetCat.id,
        categoryName: targetCat.name
      };
    }
  }

  const hasDbWarnings = !!((selectedService?.requireWarning && selectedService?.warningMessage) || (activeCategory?.requireWarning && activeCategory?.warningMessage));
  const hasActiveWarnings = !!(isMismatch || isPrivateTelegramPost || isVkPhotoOrVideo || isLiveStream || isTelegramViews || isPrivateChannel || validationMessage || hasDbWarnings);

  if (!validationMessage && !engine.isLinkOverridden && !customFieldLabel && !isLiveStream && !isPrivateChannel && !isMismatch && !isTelegramViews && !isPrivateTelegramPost && !isVkPhotoOrVideo && !hasDbWarnings) return null;

  return (
    <div className="bg-background/50 p-6 md:px-8 flex flex-col gap-4">
      {activeCategory?.requireWarning && activeCategory?.warningMessage && (
         <div className="w-full bg-warning/10 border border-warning/20 text-warning rounded-xl p-4 flex items-start gap-3 shadow-sm animate-in fade-in zoom-in-95 duration-200">
           <Info className="w-5 h-5 shrink-0 mt-0.5 text-warning animate-pulse" />
           <div className="text-sm">
             <p className="font-bold">Внимание: Информация о категории</p>
             <p className="mt-1 opacity-90 leading-relaxed">{activeCategory.warningMessage}</p>
           </div>
         </div>
      )}

      {selectedService?.requireWarning && selectedService?.warningMessage && (
         <div className="w-full bg-warning/10 border border-warning/20 text-warning rounded-xl p-4 flex items-start gap-3 shadow-sm animate-in fade-in zoom-in-95 duration-200">
           <Info className="w-5 h-5 shrink-0 mt-0.5 text-warning animate-pulse" />
           <div className="text-sm">
             <p className="font-bold">Внимание: Специфика услуги</p>
             <p className="mt-1 opacity-90 leading-relaxed">{selectedService.warningMessage}</p>
           </div>
         </div>
      )}
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
             <p className="mt-1 opacity-90">Вы указали приватную ссылку на post в закрытом канале. ИИ-воркеры не смогут выполнить накрутку. Пожалуйста, зайдите в настройки канала, измените тип канала на <strong>«Публичный»</strong> и используйте ссылку формата <code>t.me/имя_канала/номер</code>.</p>
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
         <div className="w-full bg-primary/10 border border-primary/20 text-primary rounded-xl p-4 flex flex-col gap-3 shadow-sm">
           <div className="flex items-start gap-3">
             <Info className="w-5 h-5 shrink-0 mt-0.5 text-primary animate-pulse" />
             <div className="text-sm">
               <p className="font-bold">Внимание: Альбом или медиагруппа в посте!</p>
               <p className="mt-1 opacity-90 leading-relaxed">
                 Если ваш post в Telegram содержит несколько медиафайлов (фото или видео), то просмотры на общем посте не будут отображаться, если вы укажете простую ссылку. 
                 Для корректной накрутки необходимо указать ссылку на <strong>последнее</strong> фото/видео из этого альбома. Мы автоматически создадим 2 заказа (на первый и последний пост) для того, чтобы просмотры стали видны.
               </p>
             </div>
           </div>
            <div className="ml-8 text-xs">
              <button 
                type="button"
                onClick={() => {
                  setGuideStep(2);
                  setIsGuideOpen(true);
                }}
                className="font-semibold text-primary hover:opacity-85 flex items-center gap-1.5 transition-colors duration-200 cursor-pointer"
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
      
      {validationMessage && (
        <div className="w-full bg-warning/10 border border-warning/20 text-warning rounded-xl p-4 flex flex-col gap-3 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 shrink-0 mt-0.5 text-warning animate-pulse" />
            <div className="text-sm">
              <p className="font-bold">Наш валидатор не распознал этот формат ссылки</p>
              <p className="mt-1 opacity-90">
                Авто-проверка: <span className="underline">{validationMessage}</span>. 
                Если вы скопировали ссылку верно и уверены в ней на 100%, вы можете оформить заказ в обход проверки.
              </p>
            </div>
          </div>

          {swapSuggestion && (
            <div className="bg-warning/5 border border-warning/20/40 rounded-xl p-3.5 flex flex-col gap-2.5 ml-8 mt-1 border-dashed">
              <p className="text-xs font-semibold text-warning/90 leading-relaxed">
                💡 <strong>ИИ-Помощник:</strong> {swapSuggestion.text}
              </p>
              <div>
                <Button
                  size="sm"
                  type="button"
                  onClick={() => {
                    engine.setCategoryId(swapSuggestion!.categoryId);
                    engine.setSelectedService(null);
                    toast.success(`Категория переключена на «${swapSuggestion!.categoryName}»!`);
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-lg text-xs py-1.5 px-3.5 h-8.5 active:scale-95 transition-all shadow-sm shadow-primary/10"
                >
                  Переключить на «{swapSuggestion.categoryName}»
                </Button>
              </div>
            </div>
          )}

          <div className="ml-8 flex items-center gap-2">
            {engine.isLinkOverridden ? (
              <div className="flex items-center gap-1.5 text-success font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Обход валидатора успешно активирован!
              </div>
            ) : (
              <Button
                size="sm"
                type="button"
                onClick={() => {
                  engine.setIsLinkOverridden(true);
                  toast.success("Режим обхода активирован. Теперь вы можете продолжить оформление.");
                }}
                className="bg-warning/20 text-warning hover:bg-warning/30 border border-warning/30 font-bold rounded-lg text-xs py-1 px-3 h-8 active:scale-95 transition-all"
              >
                Я уверен, что ссылка верная
              </Button>
            )}
          </div>
        </div>
      )}

      {hasActiveWarnings && (
        <div className={`w-full mt-1 p-3.5 bg-warning/5 border rounded-xl flex items-start gap-3 shadow-sm border-dashed transition-all duration-300 ${
          engine.warningHasError 
            ? "border-destructive ring-2 ring-destructive/20 animate-pulse bg-destructive/5" 
            : "border-warning/30"
        }`}>
          <input
            id="warning-confirm-checkbox"
            type="checkbox"
            checked={engine.isWarningConfirmed || false}
            onChange={(e) => {
              engine.setIsWarningConfirmed(e.target.checked);
              if (e.target.checked) {
                engine.setWarningHasError(false);
              }
            }}
            className={`mt-0.5 w-4.5 h-4.5 rounded text-primary cursor-pointer shrink-0 transition-all duration-200 ${
              engine.warningHasError ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
            }`}
          />
          <label htmlFor="warning-confirm-checkbox" className="text-xs font-bold text-foreground cursor-pointer select-none leading-relaxed">
            Я подтверждаю, что ознакомлен с предупреждением об особенностях накрутки и указал ссылку верно в соответствии с требованиями
          </label>
        </div>
      )}

      {engine.isLinkOverridden && !validationMessage && (
        <div className="w-full bg-success/10 border border-success/20 text-success rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-success" />
          <div className="text-sm">
            <p className="font-bold">✓ Обход проверки включен</p>
            <p className="mt-1 opacity-95">Вы оформляете заказ в обход стандартного валидатора ссылок. Пожалуйста, убедитесь, что ссылка полностью рабочая.</p>
          </div>
        </div>
      )}
      
      <PlatformLinkGuideDrawer 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
        initialPlatform="telegram"
        initialStep={guideStep}
      />
    </div>
  );
}
