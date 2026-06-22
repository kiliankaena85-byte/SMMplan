'use client';

import React from 'react';
import { Search, Loader2 } from 'lucide-react';
import { PlatformSelectorFallback } from '@/components/orders/PlatformSelectorFallback';

interface LinkInputFieldProps {
  url: string;
  setUrl: (val: string) => void;
  isLoading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  platform: any;
  networkId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  manualPlatform: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setManualPlatform: (val: any) => void;
  validationErrors: { link?: string };
  urlMutatedTrigger: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  availablePlatforms: any[];
  onBlur?: () => void;
  isLinkOverridden?: boolean;
  setIsLinkOverridden?: (val: boolean) => void;
}

const inputCls =
  'w-full rounded-xl border border-border bg-background text-foreground ' +
  'text-sm outline-none placeholder:text-muted-foreground ' +
  'focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200';

export function LinkInputField({
  url,
  setUrl,
  isLoading,
  platform,
  networkId,
  manualPlatform,
  setManualPlatform,
  validationErrors,
  urlMutatedTrigger,
  availablePlatforms,
  onBlur,
  isLinkOverridden,
  setIsLinkOverridden
}: LinkInputFieldProps) {
  const urlInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      {/* URL input */}
      <div className="relative">
        {isLoading
          ? <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
          : <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        }
        <input
          id="order-url"
          ref={urlInputRef}
          value={url}
          onChange={e => setUrl(e.target.value)}
          onBlur={onBlur}
          placeholder="Вставьте ссылку, например t.me/channel или instagram.com/username"
          aria-label="Ссылка на страницу для продвижения"
          inputMode="url"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          className={`${inputCls} h-14 pl-12 pr-12 text-base transition-all duration-300 ${
            urlMutatedTrigger
              ? 'border-amber-500 ring-4 ring-amber-500/20 bg-amber-50/5 dark:bg-amber-950/10'
              : ''
          }`}
        />
        {url && (
          <button
            type="button"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(10);
              setUrl('');
              urlInputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            aria-label="Очистить ссылку"
          >
            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-muted-foreground hover:text-foreground transition-all duration-200">
              <span className="text-[10px] font-black leading-none">✕</span>
            </div>
          </button>
        )}
      </div>
      {validationErrors.link && (
        <div className="mt-2 px-1 animate-in slide-in-from-top-1 space-y-2">
          <p className="text-sm text-destructive font-semibold">
            {validationErrors.link}
          </p>
          {setIsLinkOverridden && (
            <label className="flex items-center gap-2 cursor-pointer w-max group mt-2">
              <input 
                type="checkbox" 
                checked={!!isLinkOverridden} 
                onChange={(e) => setIsLinkOverridden(e.target.checked)} 
                className="w-4 h-4 rounded border-border accent-destructive transition-all"
              />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Я уверен, что ссылка правильная (игнорировать предупреждение)
              </span>
            </label>
          )}
        </div>
      )}

      {/* Platform selection manual fallback */}
      {url.length >= 5 && !isLoading && (!platform || !networkId) && !manualPlatform && (
        <div className="mt-4 animate-in fade-in duration-300">
          <PlatformSelectorFallback
            onSelect={setManualPlatform}
            availablePlatforms={availablePlatforms}
          />
        </div>
      )}
    </div>
  );
}
