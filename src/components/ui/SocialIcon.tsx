"use client";

import React from "react";
import { 
  FaTelegramPlane, 
  FaVk, 
  FaInstagram, 
  FaYoutube, 
  FaTiktok, 
  FaTwitch, 
  FaDiscord,
  FaGlobe,
  FaFacebookF,
  FaOdnoklassniki,
  FaViber,
  FaWhatsapp,
  FaSnapchatGhost,
  FaRedditAlien,
  FaLinkedinIn,
  FaLine,
  FaPlay,
  FaYandex
} from "react-icons/fa";
import { 
  SiPinterest, 
  SiX, 
  SiSpotify, 
  SiSoundcloud,
  SiWechat
} from "react-icons/si";

interface SocialIconProps {
  slug: string;
  className?: string;
  size?: number | string;
  colored?: boolean;
}

export function SocialIcon({ slug, className = "", size = 24, colored = true }: SocialIconProps) {
  const norm = slug.toLowerCase();
  
  const iconProps = (hex: string) => ({
    className,
    size,
    color: colored ? hex : undefined
  });

  if (norm.includes('telegram') || norm.includes('tg')) return <FaTelegramPlane {...iconProps('#2AABEE')} />;
  if (norm.includes('vk') || norm.includes('vkontakte')) return <FaVk {...iconProps('#0077FF')} />;
  if (norm.includes('instagram') || norm.includes('ig')) return <FaInstagram {...iconProps('#E1306C')} />;
  if (norm.includes('youtube') || norm.includes('yt')) return <FaYoutube {...iconProps('#FF0000')} />;
  if (norm.includes('tiktok') || norm.includes('tt')) return <FaTiktok {...iconProps('#000000')} />;
  if (norm.includes('twitch')) return <FaTwitch {...iconProps('#9146FF')} />;
  if (norm.includes('discord')) return <FaDiscord {...iconProps('#5865F2')} />;
  if (norm.includes('pinterest')) return <SiPinterest {...iconProps('#E60023')} />;
  if (norm.includes('twitter') || norm.includes('x')) return <SiX {...iconProps('#000000')} />;
  if (norm.includes('facebook') || norm.includes('fb')) return <FaFacebookF {...iconProps('#1877F2')} />;
  if (norm.includes('spotify')) return <SiSpotify {...iconProps('#1DB954')} />;
  if (norm.includes('soundcloud')) return <SiSoundcloud {...iconProps('#FF3300')} />;
  if (norm.includes('odnoklassniki') || norm.includes('ok')) return <FaOdnoklassniki {...iconProps('#F58220')} />;
  
  // Additional popular networks
  if (norm.includes('whatsapp') || norm.includes('wa')) return <FaWhatsapp {...iconProps('#25D366')} />;
  if (norm.includes('viber')) return <FaViber {...iconProps('#7360F2')} />;
  if (norm.includes('snapchat') || norm.includes('sc')) return <FaSnapchatGhost {...iconProps('#FFFC00')} />;
  if (norm.includes('reddit')) return <FaRedditAlien {...iconProps('#FF4500')} />;
  if (norm.includes('linkedin')) return <FaLinkedinIn {...iconProps('#0A66C2')} />;
  if (norm.includes('line')) return <FaLine {...iconProps('#00C300')} />;
  if (norm.includes('wechat')) return <SiWechat {...iconProps('#07C160')} />;
  if (norm.includes('yandex')) return <FaYandex {...iconProps('#FC3F1D')} />;
  if (norm.includes('rutube')) return <FaPlay {...iconProps('#00A6DF')} />;
  
  // Dzen doesn't have an official si font yet, we'll use yandex or a generic styled letter, Globe is safest
  // Likee / Kwai don't have widespread font support outside custom SVGs, they will safely fallback to the Globe icon

  return <FaGlobe {...iconProps('#64748b')} />;
}
