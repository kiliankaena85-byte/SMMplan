'use client';

import React from 'react';
import { resolveServiceTargetType } from '@/utils/target-type-mapper';
import { formatPricePerUnit } from '@/utils/format-price';

export const platformMap: Record<string, { name: string; color: string; icon: string }> = {
  INSTAGRAM: { name: 'Instagram', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20', icon: '📸' },
  IN: { name: 'Instagram', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20', icon: '📸' },
  TELEGRAM: { name: 'Telegram', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20', icon: '✈️' },
  TG: { name: 'Telegram', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20', icon: '✈️' },
  VK: { name: 'ВКонтакте', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: '💙' },
  VKONTAKTE: { name: 'ВКонтакте', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: '💙' },
  YOUTUBE: { name: 'YouTube', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', icon: '▶️' },
  YT: { name: 'YouTube', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', icon: '▶️' },
  TIKTOK: { name: 'TikTok', color: 'bg-muted text-foreground border-border', icon: '🎵' },
  TT: { name: 'TikTok', color: 'bg-muted text-foreground border-border', icon: '🎵' },
  TWITTER: { name: 'Twitter (X)', color: 'bg-muted text-foreground border-border', icon: '𝕏' },
  X: { name: 'Twitter (X)', color: 'bg-muted text-foreground border-border', icon: '𝕏' },
};

export const getPlatformDisplay = (code: string) => {
  const map = platformMap[code.toUpperCase()];
  if (map) return map;
  return { name: code, color: 'bg-muted text-foreground border-border', icon: '🌐' };
};

const targetTypeBadges: Record<string, { label: string; color: string; icon: string }> = {
  POST: { label: 'Пост', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: '📝' },
  CHANNEL: { label: 'Канал', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: '📢' },
  PROFILE: { label: 'Профиль', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20', icon: '👤' },
  VIDEO: { label: 'Видео', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', icon: '🎬' },
  STORY: { label: 'Сториз', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', icon: '⏱️' },
  CHANNEL_POSTS: { label: 'Авто-посты', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', icon: '🤖' },
  POLL: { label: 'Опрос', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', icon: '📊' },
  COMMENTS: { label: 'Отзывы', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20', icon: '💬' },
  BOT: { label: 'Бот', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20', icon: '🤖' },
  CUSTOM: { label: 'Свой', color: 'bg-muted text-foreground border-border', icon: '⚙️' },
};

export function TargetTypeBadge({ name, targetType }: { name: string; targetType?: string | null }) {
  const resolved = resolveServiceTargetType({ name, targetType });
  const badge = targetTypeBadges[resolved] || targetTypeBadges.CUSTOM;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
      <span>{badge.icon}</span>
      <span>{badge.label}</span>
    </span>
  );
}

export function RetailPrice({
  procurement,
  markup,
  isAuto,
}: {
  procurement: number;
  markup: number;
  isAuto?: boolean;
}) {
  if (isAuto || markup === 0) {
    return (
      <span className="text-foreground font-bold text-xs truncate block w-full tabular-nums tracking-tight">
        авто
        <span className="text-[10px] text-muted-foreground font-sans ml-1 font-medium select-none tracking-normal">розн.</span>
      </span>
    );
  }
  const retail = procurement * (1 + markup / 100);
  return (
    <span className="text-foreground font-bold text-xs truncate block w-full tabular-nums tracking-tight">
      {formatPricePerUnit(retail)} ₽
      <span className="text-[10px] text-muted-foreground font-sans ml-1 font-medium select-none tracking-normal">розн.</span>
    </span>
  );
}
