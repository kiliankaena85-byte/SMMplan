import React from "react";
import { 
  Heart, Eye, Users, MessageCircle, ThumbsUp, Share, RefreshCw, 
  TrendingUp, BarChart2, History, Bot, Link, UserPlus, 
  PlayCircle, Globe, ThumbsDown, Star, Bookmark, AlertTriangle, 
  Radio, Crown, RotateCcw, Box, Rocket
} from "lucide-react";
import { UniversalIcon } from "@/components/ui/UniversalIcon";

export interface CategoryIconProps {
  name?: string;
  icon?: string | null;
  className?: string;
  size?: number;
}

export const CategoryIcon = ({ name = "", icon, className, size = 20 }: CategoryIconProps) => {
  const norm = (name || "").toLowerCase();
  
  if (norm.includes('буст') || norm.includes('уровен') || norm.includes('boost') || norm.includes('busty')) {
    return <Rocket className={className} strokeWidth={1.5} size={size} />;
  }

  if (icon) {
    return <UniversalIcon icon={icon} name={name} className={className} size={size} />;
  }
  
  let IconCmp = Box;
  
  if (norm.includes('лайк') || norm.includes('нравится') || norm.includes('like')) IconCmp = Heart;
  else if (norm.includes('просмотр') || norm.includes('охват') || norm.includes('view')) IconCmp = Eye;
  else if (norm.includes('подписч') || norm.includes('участник') || norm.includes('sub') || norm.includes('follow')) IconCmp = Users;
  else if (norm.includes('вступление') || norm.includes('группы')) IconCmp = UserPlus;
  else if (norm.includes('коммент') || norm.includes('отзыв') || norm.includes('comment')) IconCmp = MessageCircle;
  else if (norm.includes('реакц') || norm.includes('эмодзи') || norm.includes('reaction')) IconCmp = ThumbsUp;
  else if (norm.includes('репост') || norm.includes('поделит') || norm.includes('share') || norm.includes('repost')) IconCmp = Share;
  else if (norm.includes('авто')) IconCmp = RefreshCw;
  else if (norm.includes('опрос') || norm.includes('голос') || norm.includes('poll') || norm.includes('vote')) IconCmp = BarChart2;
  else if (norm.includes('истори') || norm.includes('стори') || norm.includes('story')) IconCmp = History;
  else if (norm.includes('бот') || norm.includes('bot')) IconCmp = Bot;
  else if (norm.includes('реферал') || norm.includes('ref')) IconCmp = Link;
  else if (norm.includes('друзья') || norm.includes('friend')) IconCmp = UserPlus;
  else if (norm.includes('прослуш') || norm.includes('плейлист') || norm.includes('plays') || norm.includes('music')) IconCmp = PlayCircle;
  else if (norm.includes('трафик') || norm.includes('посещен') || norm.includes('traffic')) IconCmp = Globe;
  else if (norm.includes('дизлайк') || norm.includes('dislike')) IconCmp = ThumbsDown;
  else if (norm.includes('звезд') || norm.includes('star')) IconCmp = Star;
  else if (norm.includes('сохранен') || norm.includes('save') || norm.includes('bookmark')) IconCmp = Bookmark;
  else if (norm.includes('жалоб') || norm.includes('report')) IconCmp = AlertTriangle;
  else if (norm.includes('стрим') || norm.includes('эфир') || norm.includes('зрител') || norm.includes('stream') || norm.includes('live')) IconCmp = Radio;
  else if (norm.includes('премиум') || norm.includes('premium')) IconCmp = Crown;
  else if (norm.includes('докрут') || norm.includes('восстанов') || norm.includes('refill')) IconCmp = RotateCcw;
  else if (norm.includes('видео') || norm.includes('клип') || norm.includes('reels') || norm.includes('shorts') || norm.includes('video')) IconCmp = PlayCircle;

  return <IconCmp className={className} strokeWidth={1.5} size={size} />;
};

/**
 * Strips leading decorative emojis from category names
 * (to prevent duplicating the left-hand visual SVG icon)
 * while safely preserving inline reaction emojis (e.g. "Реакции (👍, ❤️, 🔥)"), Cyrillic text, numbers, and punctuation.
 */
export const cleanCategoryName = (rawName: string): string => {
  if (!rawName) return "";
  let stripped = rawName
    .replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200d\uFE0E\uFE0F\u2700-\u27BF\uE000-\uF8FF\s]+/gu, '')
    .replace(/\s*\[(?:Сервер|Server|Srv|API|Провайдер)[\s:]*\d+\]/gi, '')
    .replace(/\s*\((?:vexboost live|vexboost|api\s*\d+|srv\s*\d+|сервер\s*\d+)\)/gi, '')
    .replace(/\bvexboost live\b/gi, 'Онлайн-просмотры')
    .replace(/\bvexboost\b/gi, '')
    .replace(/\s*♻️/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  
  // If the string consisted solely of emojis (e.g. "👍"), fallback to trimmed original
  return stripped.length > 0 ? stripped : rawName.trim();
};

