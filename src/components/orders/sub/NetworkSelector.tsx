'use client';

import React from 'react';
import { IntelligencePlatform } from '@/services/analyzer/link-rules';

interface NetworkSelectorProps {
  platform: any;
  manualPlatform: any;
  networkId: string | null;
  unfilteredCatalog: any[];
  onSelect: (id: string, name: any) => void;
}

export function NetworkSelector({
  platform,
  manualPlatform,
  networkId,
  unfilteredCatalog = [],
  onSelect
}: NetworkSelectorProps) {
  let availablePlatforms = (unfilteredCatalog || []).map(net => {
    let platformEnum = IntelligencePlatform.OTHER;
    const slugUpper = net.slug.toUpperCase();
    if (slugUpper.includes('TELEGRAM')) platformEnum = IntelligencePlatform.TELEGRAM;
    else if (slugUpper.includes('YOUTUBE')) platformEnum = IntelligencePlatform.YOUTUBE;
    else if (slugUpper.includes('INSTAGRAM')) platformEnum = IntelligencePlatform.INSTAGRAM;
    else if (slugUpper.includes('TIKTOK')) platformEnum = IntelligencePlatform.TIKTOK;
    else if (slugUpper.includes('VK')) platformEnum = IntelligencePlatform.VK;
    else if (slugUpper.includes('TWITCH')) platformEnum = IntelligencePlatform.TWITCH;
    else if (slugUpper.includes('TWITTER') || slugUpper === 'X') platformEnum = IntelligencePlatform.TWITTER;
    else if (slugUpper.includes('LIKEE')) platformEnum = IntelligencePlatform.LIKEE;
    
    return {
      id: net.id,
      name: platformEnum,
      labelName: net.name
    };
  }).filter(p => p.name !== IntelligencePlatform.OTHER);

  // --- PLATFORM RESTRICTION FILTER ---
  const activePlatform = platform || manualPlatform;
  if (activePlatform && activePlatform !== IntelligencePlatform.OTHER) {
    const matched = availablePlatforms.find(p => p.name === activePlatform);
    if (matched) {
      availablePlatforms = [matched];
    }
  }
  // -----------------------------------

  if (availablePlatforms.length === 0) return null;

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-500">
      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
        Выберите платформу
      </label>
      <div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        role="tablist"
        aria-label="Платформы"
      >
        {availablePlatforms.map(p => {
          const isAutoDetected = platform === p.name;
          const isSelected = networkId === p.id;
          
          let activeClass = 'bg-zinc-800 text-primary-foreground shadow-sm';
          const hoverClass = 'hover:bg-zinc-200 hover:text-zinc-900';
          if (isSelected) {
            if (p.name === IntelligencePlatform.TELEGRAM) {
              activeClass = 'bg-[#24a1de] text-primary-foreground shadow-sm';
            } else if (p.name === IntelligencePlatform.VK) {
              activeClass = 'bg-[#0077ff] text-primary-foreground shadow-sm';
            } else if (p.name === IntelligencePlatform.INSTAGRAM) {
              activeClass = 'bg-gradient-to-r from-[#8a3ab9] via-[#e95950] to-[#fccc63] text-primary-foreground shadow-sm';
            } else if (p.name === IntelligencePlatform.YOUTUBE) {
              activeClass = 'bg-[#ff0000] text-primary-foreground shadow-sm';
            } else if (p.name === IntelligencePlatform.TIKTOK) {
              activeClass = 'bg-zinc-900 text-primary-foreground shadow-sm border border-zinc-800';
            }
          }
          
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(20);
                onSelect(p.id, p.name);
              }}
              className={`h-[44px] px-4 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                isSelected ? activeClass : `bg-zinc-100 text-zinc-600 ${hoverClass}`
              }`}
            >
              {p.labelName || p.name}
              {isAutoDetected && (
                <span className="text-[9px] bg-sky-500 text-primary-foreground px-1.5 py-0.5 rounded-full normal-case font-semibold animate-pulse shrink-0">
                  ИИ
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
