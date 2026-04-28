import React from "react";
import { 
  IconHeart, IconEye, IconUsers, IconMessageCircle, IconThumbUp, IconShare, IconRefresh, 
  IconTrendingUp, IconChartBar, IconHistory, IconRobot, IconLink, IconUserPlus, 
  IconPlayerPlay, IconGlobe, IconThumbDown, IconStar, IconBookmark, IconAlertTriangle, 
  IconBroadcast, IconCrown, IconHistoryToggle, IconBox
} from "@tabler/icons-react";

export const CategoryIcon = ({ name, className, size = 20 }: { name: string, className?: string, size?: number }) => {
  const norm = (name || "").toLowerCase();
  
  let IconCmp = IconBox;
  
  if (norm.includes('лайк') || norm.includes('нравится')) IconCmp = IconHeart;
  else if (norm.includes('просмотр') || norm.includes('охват')) IconCmp = IconEye;
  else if (norm.includes('подписч') || norm.includes('участник')) IconCmp = IconUsers;
  else if (norm.includes('вступление') || norm.includes('группы')) IconCmp = IconUserPlus;
  else if (norm.includes('коммент') || norm.includes('отзыв')) IconCmp = IconMessageCircle;
  else if (norm.includes('реакц') || norm.includes('эмодзи')) IconCmp = IconThumbUp;
  else if (norm.includes('репост') || norm.includes('поделит')) IconCmp = IconShare;
  else if (norm.includes('авто')) IconCmp = IconRefresh;
  else if (norm.includes('буст') || norm.includes('уровен')) IconCmp = IconTrendingUp;
  else if (norm.includes('опрос') || norm.includes('голос')) IconCmp = IconChartBar;
  else if (norm.includes('истори') || norm.includes('стори')) IconCmp = IconHistory;
  else if (norm.includes('бот')) IconCmp = IconRobot;
  else if (norm.includes('реферал')) IconCmp = IconLink;
  else if (norm.includes('друзья')) IconCmp = IconUserPlus;
  else if (norm.includes('прослуш') || norm.includes('плейлист') || norm.includes('plays')) IconCmp = IconPlayerPlay;
  else if (norm.includes('трафик') || norm.includes('посещен')) IconCmp = IconGlobe;
  else if (norm.includes('дизлайк')) IconCmp = IconThumbDown;
  else if (norm.includes('звезд') || norm.includes('star')) IconCmp = IconStar;
  else if (norm.includes('сохранен')) IconCmp = IconBookmark;
  else if (norm.includes('жалоб') || norm.includes('report')) IconCmp = IconAlertTriangle;
  else if (norm.includes('стрим') || norm.includes('эфир') || norm.includes('зрител')) IconCmp = IconBroadcast;
  else if (norm.includes('премиум') || norm.includes('premium')) IconCmp = IconCrown;
  else if (norm.includes('докрут') || norm.includes('восстанов')) IconCmp = IconHistoryToggle;

  return <IconCmp className={className} stroke={1.5} size={size} />;
};

export const cleanCategoryName = (rawName: string) => {
  // Strip emojis from the old database values to keep strings clean
  if (!rawName) return "";
  return rawName.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
};
