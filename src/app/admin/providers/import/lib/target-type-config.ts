/**
 * Target Type Configuration & UI Presentation Engine
 * Provides human-friendly Russian descriptions, icons, and real-world example URLs
 * for each TargetTypeEnum in SMMpanel 1.0.
 */

export interface TargetTypeMeta {
  type: string;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  exampleUrl: string;
  description: string;
}

export const TARGET_TYPE_OPTIONS: TargetTypeMeta[] = [
  {
    type: 'CHANNEL',
    label: '📢 Канал / Группа / Сообщество',
    shortLabel: 'Канал/Группа',
    icon: '📢',
    color: 'text-emerald-500',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
    badgeBorder: 'border-emerald-500/20',
    exampleUrl: 'https://t.me/durov или @durov',
    description: 'Ссылка на публичный или приватный канал, группу, паблик (подписчики, участники).',
  },
  {
    type: 'POST',
    label: '📝 Пост / Публикация / Запись',
    shortLabel: 'Пост',
    icon: '📝',
    color: 'text-blue-500',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-600 dark:text-blue-400',
    badgeBorder: 'border-blue-500/20',
    exampleUrl: 'https://t.me/durov/123 или https://vk.com/wall-1_123',
    description: 'Ссылка на конкретную публикацию, запись на стене (лайки, репосты, просмотры поста).',
  },
  {
    type: 'PROFILE',
    label: '👤 Профиль / Аккаунт',
    shortLabel: 'Профиль',
    icon: '👤',
    color: 'text-cyan-500',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-600 dark:text-cyan-400',
    badgeBorder: 'border-cyan-500/20',
    exampleUrl: 'https://instagram.com/username или https://tiktok.com/@username',
    description: 'Ссылка на страницу или профиль пользователя (подписчики, фолловеры).',
  },
  {
    type: 'VIDEO',
    label: '🎬 Видео / Reels / Shorts / Клип',
    shortLabel: 'Видео/Reels',
    icon: '🎬',
    color: 'text-rose-500',
    badgeBg: 'bg-rose-500/10',
    badgeText: 'text-rose-600 dark:text-rose-400',
    badgeBorder: 'border-rose-500/20',
    exampleUrl: 'https://youtube.com/watch?v=... или https://instagram.com/reel/...',
    description: 'Ссылка на видеоролик, Shorts, Reels, клип, стрим (просмотры видео, лайки видео).',
  },
  {
    type: 'STORY',
    label: '⏱️ Сториз / История',
    shortLabel: 'Сториз',
    icon: '⏱️',
    color: 'text-purple-500',
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-600 dark:text-purple-400',
    badgeBorder: 'border-purple-500/20',
    exampleUrl: 'https://instagram.com/stories/username/1234567890/',
    description: 'Ссылка на активную историю/сториз (просмотры сториз, реакции).',
  },
  {
    type: 'POLL',
    label: '📊 Опрос / Голосование',
    shortLabel: 'Опрос',
    icon: '📊',
    color: 'text-amber-500',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-600 dark:text-amber-400',
    badgeBorder: 'border-amber-500/20',
    exampleUrl: 'https://t.me/channel/123?vote=1 (номер варианта ответа)',
    description: 'Ссылка на пост с опросом с указанием номера варианта для накрутки голосов.',
  },
  {
    type: 'COMMENTS',
    label: '💬 Комментарии / Отзывы',
    shortLabel: 'Комментарии',
    icon: '💬',
    color: 'text-teal-500',
    badgeBg: 'bg-teal-500/10',
    badgeText: 'text-teal-600 dark:text-teal-400',
    badgeBorder: 'border-teal-500/20',
    exampleUrl: 'Ссылка на пост + поле ввода текстов комментариев',
    description: 'Ссылка на пост или видео, где требуется ввести список текстов комментариев.',
  },
  {
    type: 'BOT',
    label: '🤖 Telegram Бот / Рефералка',
    shortLabel: 'Бот',
    icon: '🤖',
    color: 'text-indigo-500',
    badgeBg: 'bg-indigo-500/10',
    badgeText: 'text-indigo-600 dark:text-indigo-400',
    badgeBorder: 'border-indigo-500/20',
    exampleUrl: 'https://t.me/my_bot?start=ref123',
    description: 'Ссылка на Telegram-бота для автоматического запуска (/start или реферальный код).',
  },
  {
    type: 'CHANNEL_POSTS',
    label: '🔄 Авто-просмотры (Будущие посты)',
    shortLabel: 'Авто-посты',
    icon: '🔄',
    color: 'text-violet-500',
    badgeBg: 'bg-violet-500/10',
    badgeText: 'text-violet-600 dark:text-violet-400',
    badgeBorder: 'border-violet-500/20',
    exampleUrl: 'https://t.me/durov (на следующие N постов)',
    description: 'Подписка на канал для автоматического распределения просмотров/реакций на новые посты.',
  },
  {
    type: 'CUSTOM',
    label: '⚙️ Произвольная ссылка',
    shortLabel: 'Своя ссылка',
    icon: '⚙️',
    color: 'text-slate-500',
    badgeBg: 'bg-muted',
    badgeText: 'text-foreground',
    badgeBorder: 'border-border',
    exampleUrl: 'https://example.com/link',
    description: 'Любой другой формат ссылки без строгой валидации.',
  },
];

export function getTargetTypeMeta(type: string | null | undefined): TargetTypeMeta {
  const clean = (type || 'POST').toUpperCase();
  const match = TARGET_TYPE_OPTIONS.find(o => o.type === clean);
  return match || TARGET_TYPE_OPTIONS[TARGET_TYPE_OPTIONS.length - 1];
}
