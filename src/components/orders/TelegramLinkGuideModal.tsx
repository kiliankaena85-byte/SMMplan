'use client';

import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Monitor, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight, 
  ExternalLink, 
  Copy, 
  Check, 
  AlertCircle 
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
  const [testLink, setTestLink] = useState('');
  const [copied, setCopied] = useState(false);

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

  // Tenant styling presets
  const isNeon = tenantVariant === 'neon';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-2xl bg-card border rounded-3xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto shadow-2xl space-y-6 relative transition-all ${
          isNeon 
            ? 'border-purple-500/30 shadow-purple-500/10' 
            : 'border-border shadow-primary/5'
        }`}
      >
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-2xl shrink-0 ${
              isNeon ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30' : 'bg-primary/10 text-primary'
            }`}>
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                Как скопировать ссылку на фото / альбом
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Пошаговая инструкция для Telegram с гарантией начисления просмотров
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
                onClick={() => setSelectedDevice(dev.device)}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer min-h-[44px] ${
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

        {/* ── STEPS DISPLAY ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Инструкция для: <strong className="text-foreground">{currentDeviceGuide.label}</strong>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/40">
              {currentDeviceGuide.badge}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {currentDeviceGuide.steps.map(step => (
              <div 
                key={step.stepNumber}
                className={`p-4 rounded-2xl border bg-card/60 flex flex-col justify-between space-y-3 transition-all ${
                  isNeon ? 'border-purple-500/20 hover:border-purple-500/40' : 'border-border/60 hover:border-primary/40'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      isNeon ? 'bg-purple-500/20 text-purple-400' : 'bg-primary/10 text-primary'
                    }`}>
                      {step.stepNumber}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground font-mono">
                      {step.buttonHighlight}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-foreground leading-snug">
                    {step.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {step.instruction}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/40 text-[10px] font-mono text-muted-foreground truncate">
                  Пример: {step.sampleUrl}
                </div>
              </div>
            ))}
          </div>

          {/* ── MEDIAGROUP ALBUM SPECIAL NOTE ── */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
            isNeon 
              ? 'bg-purple-500/10 border-purple-500/30 text-purple-200' 
              : 'bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-200'
          }`}>
            <span className="text-base shrink-0">💡</span>
            <div className="space-y-1">
              <span className="font-bold block">Как заказать просмотры на альбом (карусель):</span>
              <p className="leading-relaxed opacity-90">
                {currentDeviceGuide.mediaGroupAlbumNote}
              </p>
            </div>
          </div>
        </div>

        {/* ── INTERACTIVE LINK TEST FIELD ── */}
        <div className="p-4 rounded-2xl bg-secondary/40 border border-border/60 space-y-3">
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
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                Применить
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
        <div className="pt-2 border-t border-border flex items-center justify-end sticky bottom-0 bg-card">
          <button
            type="button"
            onClick={onClose}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer min-h-[40px] ${
              isNeon
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
          >
            Понятно, продолжить
          </button>
        </div>
      </div>
    </div>
  );
}
