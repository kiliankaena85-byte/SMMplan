'use client';

import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Monitor, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight, 
  Copy, 
  Check, 
  AlertCircle,
  MoreHorizontal,
  MoreVertical,
  MousePointer,
  Share2,
  Image as ImageIcon
} from 'lucide-react';
import { LinkGuideService, PlatformDeviceGuide } from '@/services/catalog/link-guide.service';

interface TelegramLinkGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyLink?: (link: string) => void;
  tenantVariant?: 'classic' | 'neon' | 'custom';
}

export function TelegramLinkGuideModal({
  isOpen,
  onClose,
  onApplyLink,
  tenantVariant = 'classic'
}: TelegramLinkGuideModalProps) {
  const guideData = LinkGuideService.getTelegramPhotoViewsGuide();
  const [selectedDevice, setSelectedDevice] = useState<'ios' | 'android' | 'desktop'>('ios');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [testLink, setTestLink] = useState('');

  if (!isOpen) return null;

  const currentDeviceGuide: PlatformDeviceGuide = 
    guideData.devices.find(d => d.device === selectedDevice) || guideData.devices[0];

  const handleTestLinkValidation = () => {
    if (!testLink.trim()) return null;
    const lower = testLink.toLowerCase().trim();
    if (lower.includes('t.me/') || lower.includes('telegram.me/')) {
      const isSingle = lower.includes('?single');
      const parts = lower.split('/');
      const lastPart = parts[parts.length - 1]?.split('?')[0];
      const isPost = !isNaN(Number(lastPart));

      if (isPost) {
        return {
          valid: true,
          message: `Ссылка корректна! Сообщение #${lastPart} ${isSingle ? '(конкретное фото)' : ''}`
        };
      }
      return {
        valid: true,
        message: 'Ссылка на канал/публикацию распознана'
      };
    }
    return {
      valid: false,
      message: 'Укажите ссылку формата https://t.me/...'
    };
  };

  const validationResult = handleTestLinkValidation();
  const isNeon = tenantVariant === 'neon';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-4xl bg-card border rounded-3xl p-5 sm:p-7 max-h-[94vh] overflow-y-auto shadow-2xl space-y-6 relative transition-all ${
          isNeon 
            ? 'border-purple-500/30 shadow-purple-500/10' 
            : 'border-border shadow-primary/5'
        }`}
      >
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4 sticky top-0 bg-card z-20">
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-2xl shrink-0 ${
              isNeon ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30' : 'bg-primary/10 text-primary'
            }`}>
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                Интерактивный гид: как скопировать ссылку на фото
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Нажмите на шаги, чтобы увидеть интерактивную демонстрацию на экране Telegram
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── DEVICE SWITCHER TABS ── */}
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-secondary/50 border border-border/50">
          {guideData.devices.map(dev => {
            const isActive = selectedDevice === dev.device;
            return (
              <button
                key={dev.device}
                type="button"
                onClick={() => {
                  setSelectedDevice(dev.device);
                  setActiveStepIndex(0);
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer min-h-[44px] ${
                  isActive
                    ? isNeon
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20 scale-[1.02]'
                      : 'bg-primary text-primary-foreground shadow-sm scale-[1.02]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                }`}
              >
                <span className="text-base">{dev.icon}</span>
                <span className="hidden sm:inline">{dev.label}</span>
                <span className="sm:hidden">{dev.device.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        {/* ── MAIN INTERACTIVE AREA: PHONE VISUAL SIMULATOR + STEP CARDS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 📱 LEFT/TOP: GRAPHICAL TELEGRAM PHONE SIMULATOR (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-[290px] sm:max-w-[310px] rounded-[2.5rem] p-3.5 bg-neutral-900 border-4 border-neutral-700 shadow-2xl text-white font-sans relative overflow-hidden">
              
              {/* Dynamic Island / Notch */}
              <div className="flex justify-center mb-2">
                <div className="w-24 h-4 bg-black rounded-full flex items-center justify-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-neutral-800" />
                  <div className="w-2 h-2 rounded-full bg-blue-950" />
                </div>
              </div>

              {/* Telegram App Header */}
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-neutral-800 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-black text-white">
                    TG
                  </div>
                  <div>
                    <span className="font-bold text-[11px] block leading-tight">Канал / Блог</span>
                    <span className="text-[9px] text-neutral-400">12 400 подписчиков</span>
                  </div>
                </div>

                {selectedDevice === 'ios' ? (
                  <div className={`p-1 rounded-lg ${activeStepIndex === 1 ? 'bg-primary text-white animate-pulse ring-2 ring-primary' : 'text-neutral-400'}`}>
                    <MoreHorizontal className="w-4 h-4" />
                  </div>
                ) : selectedDevice === 'android' ? (
                  <div className={`p-1 rounded-lg ${activeStepIndex === 1 ? 'bg-primary text-white animate-pulse ring-2 ring-primary' : 'text-neutral-400'}`}>
                    <MoreVertical className="w-4 h-4" />
                  </div>
                ) : (
                  <MousePointer className="w-4 h-4 text-neutral-400" />
                )}
              </div>

              {/* Telegram Post Body with Simulated Photo */}
              <div className="py-3 px-1 space-y-2.5">
                <div className={`rounded-2xl p-2.5 bg-neutral-800/80 border transition-all ${
                  activeStepIndex === 0 ? 'border-primary ring-2 ring-primary/40' : 'border-neutral-700/60'
                }`}>
                  
                  {/* Photo Canvas Simulation */}
                  <div className="relative rounded-xl overflow-hidden bg-gradient-to-tr from-slate-800 via-blue-950 to-indigo-900 h-36 flex flex-col items-center justify-center p-3 text-center border border-neutral-700">
                    <ImageIcon className="w-8 h-8 text-blue-400/80 mb-1 animate-bounce" />
                    <span className="text-[11px] font-bold text-white leading-snug">
                      Фотография в публикации #150
                    </span>
                    <span className="text-[9px] text-neutral-300 mt-0.5">
                      (Тапните для открытия во весь экран)
                    </span>

                    {/* Cursor pointer highlight on Step 1 */}
                    {activeStepIndex === 0 && (
                      <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="px-3 py-1 rounded-full bg-primary text-white font-extrabold text-[10px] shadow-lg animate-pulse">
                          👆 Нажмите на фото
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-neutral-300 mt-2 leading-tight">
                    🔥 Новый пост с фотографиями из фотосессии. Оцените кадры!
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[9px] text-neutral-500 mt-1 font-mono">
                    <span>14:20</span>
                    <span>✓✓</span>
                  </div>
                </div>

                {/* Simulated Telegram Context Menu Popup on Step 2 and 3 */}
                {activeStepIndex >= 1 && (
                  <div className="rounded-2xl p-2 bg-neutral-800 border border-neutral-600 shadow-2xl space-y-1 animate-in zoom-in-95 duration-150">
                    <div className="text-[9px] font-bold text-neutral-400 px-2 py-0.5 uppercase tracking-wider">
                      Меню действий Telegram
                    </div>
                    
                    <div className="px-2.5 py-1.5 rounded-lg text-[10px] text-neutral-300 flex items-center justify-between opacity-60">
                      <span>Сохранить в галерею</span>
                    </div>

                    {/* THE TARGET COPY LINK BUTTON HIGHLIGHTED */}
                    <div className={`px-2.5 py-2 rounded-xl text-[11px] font-black flex items-center justify-between ${
                      activeStepIndex === 2 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 scale-102 ring-2 ring-white' 
                        : 'bg-primary text-white animate-pulse'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <Copy className="w-3.5 h-3.5" />
                        <span>Скопировать ссылку</span>
                      </div>
                      <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded font-mono">
                        {selectedDevice === 'ios' ? '?single' : 'URL'}
                      </span>
                    </div>

                    <div className="px-2.5 py-1.5 rounded-lg text-[10px] text-neutral-300 flex items-center justify-between opacity-60">
                      <span>Поделиться...</span>
                      <Share2 className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Home Indicator */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-28 h-1 bg-neutral-600 rounded-full" />
              </div>
            </div>

            <span className="text-[11px] text-muted-foreground font-medium mt-2 text-center">
              💡 Интерактивная визуализация меню Telegram для {currentDeviceGuide.label}
            </span>
          </div>

          {/* 📋 RIGHT: STEP CARDS & CONTROLS (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Шаги выполнения (кликните на шаг):
              </span>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-secondary text-foreground font-bold border border-border/40">
                {currentDeviceGuide.badge}
              </span>
            </div>

            <div className="space-y-3">
              {currentDeviceGuide.steps.map((step, idx) => {
                const isCurrent = activeStepIndex === idx;
                return (
                  <div 
                    key={step.stepNumber}
                    onClick={() => setActiveStepIndex(idx)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isCurrent
                        ? isNeon
                          ? 'bg-purple-500/10 border-purple-500 shadow-md shadow-purple-500/10 ring-1 ring-purple-500'
                          : 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary'
                        : 'bg-card border-border/70 hover:border-border hover:bg-secondary/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                          isCurrent
                            ? isNeon ? 'bg-purple-600 text-white' : 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-muted-foreground'
                        }`}>
                          {step.stepNumber}
                        </span>
                        <div className="space-y-1">
                          <h4 className="text-xs sm:text-sm font-black text-foreground">
                            {step.title}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {step.instruction}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold font-mono px-2 py-1 rounded-lg bg-secondary text-muted-foreground shrink-0 hidden sm:inline">
                        {step.buttonHighlight}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Album note box */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
              isNeon 
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-200' 
                : 'bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-200'
            }`}>
              <span className="text-lg shrink-0">💡</span>
              <div className="space-y-1">
                <span className="font-bold block">Как заказать просмотры на альбом (карусель фото):</span>
                <p className="leading-relaxed opacity-90">
                  {currentDeviceGuide.mediaGroupAlbumNote}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── INTERACTIVE LINK TEST FIELD ── */}
        <div className="p-4 sm:p-5 rounded-2xl bg-secondary/40 border border-border/60 space-y-3">
          <label className="text-xs font-bold text-foreground block flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Проверьте вашу ссылку прямо здесь:</span>
          </label>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Вставьте ссылку, например: https://t.me/durov/150"
              value={testLink}
              onChange={e => setTestLink(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border focus:border-primary focus:outline-none text-foreground font-mono text-xs"
            />
            {onApplyLink && testLink && validationResult?.valid && (
              <button
                type="button"
                onClick={() => {
                  onApplyLink(testLink);
                  onClose();
                }}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 ${
                  isNeon
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                    : 'bg-primary text-primary-foreground shadow-sm'
                }`}
              >
                Применить в заказ
              </button>
            )}
          </div>

          {validationResult && (
            <div className={`flex items-center gap-2 text-xs font-bold ${
              validationResult.valid ? 'text-emerald-500' : 'text-danger'
            }`}>
              {validationResult.valid ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{validationResult.message}</span>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="pt-3 border-t border-border flex items-center justify-between sticky bottom-0 bg-card z-20">
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
            Все ссылки проверяются перед запуском заказа
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer min-h-[40px] ${
              isNeon
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
          >
            Понятно, закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
