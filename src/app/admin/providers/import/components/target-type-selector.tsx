'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TARGET_TYPE_OPTIONS, getTargetTypeMeta } from '../lib/target-type-config';

interface TargetTypeSelectorProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  compact?: boolean;
}

export function TargetTypeSelector({
  value,
  onChange,
  className = '',
  compact = true,
}: TargetTypeSelectorProps) {
  const currentMeta = getTargetTypeMeta(value);

  if (!compact) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {TARGET_TYPE_OPTIONS.map((opt) => {
          const isSelected = (value || 'POST').toUpperCase() === opt.type;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => onChange(opt.type)}
              className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs'
                  : 'border-border/70 bg-card hover:bg-muted/50 hover:border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>{opt.icon}</span>
                  <span>{opt.shortLabel}</span>
                </span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${opt.badgeBg} ${opt.badgeText} ${opt.badgeBorder}`}
                >
                  {opt.type}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {opt.description}
              </p>
              <div className="text-[10px] font-mono text-muted-foreground/80 bg-background/80 px-2 py-1 rounded border border-border/50 truncate">
                Пример: {opt.exampleUrl}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Select value={value || 'POST'} onValueChange={(val) => val && onChange(val)}>
      <SelectTrigger
        size="sm"
        className={`h-8 text-xs font-semibold bg-background rounded-lg border-border shadow-2xs ${className}`}
      >
        <SelectValue placeholder="Тип ссылки">
          <div className="flex items-center gap-1.5 truncate">
            <span>{currentMeta.icon}</span>
            <span className="truncate">{currentMeta.shortLabel}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72 w-[280px]">
        {TARGET_TYPE_OPTIONS.map((opt) => (
          <SelectItem key={opt.type} value={opt.type} className="text-xs py-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <span>{opt.icon}</span>
                  <span>{opt.shortLabel}</span>
                </span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${opt.badgeBg} ${opt.badgeText} ${opt.badgeBorder}`}
                >
                  {opt.type}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground line-clamp-1">
                {opt.exampleUrl}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
