"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { X, Smartphone, Monitor, Check, AlertTriangle, HelpCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface VisualLinkGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlatform?: string;
  initialContentType?: ContentType;
}

type Platform = "instagram" | "telegram" | "vk";
type ContentType = "profile" | "post" | "story" | "comment" | "photo";

export function VisualLinkGuideModal({ isOpen, onClose, initialPlatform, initialContentType }: VisualLinkGuideModalProps) {
  const [platform, setPlatform] = useState<Platform>("telegram");
  const [contentType, setContentType] = useState<ContentType>("profile");
  const [deviceTab, setDeviceTab] = useState<"mobile" | "desktop">("mobile");

  // Sync state with parent's detected platform context
  useEffect(() => {
    if (initialPlatform) {
      const lowered = initialPlatform.toLowerCase();
      if (lowered.includes("instagram") || lowered.includes("inst")) {
        setPlatform("instagram");
        setContentType(initialContentType || "profile");
      } else if (lowered.includes("telegram") || lowered.includes("tg")) {
        setPlatform("telegram");
        setContentType(initialContentType || "profile");
      } else if (lowered.includes("vk")) {
        setPlatform("vk");
        setContentType(initialContentType || "profile");
      }
    } else if (initialContentType) {
      setContentType(initialContentType);
    }
  }, [initialPlatform, initialContentType, isOpen]);

  if (!isOpen) return null;

  const platformsList: { id: Platform; label: string; icon: string }[] = [
    { id: "telegram", label: "Telegram", icon: "✈️" },
    { id: "instagram", label: "Instagram", icon: "📸" },
    { id: "vk", label: "ВКонтакте", icon: "💙" }
  ];

  const contentTypesList: { id: ContentType; label: string; platforms: Platform[] }[] = [
    { id: "profile", label: platform === "telegram" ? "Канал / Группа" : "Профиль / Сообщество", platforms: ["instagram", "telegram", "vk"] },
    { id: "post", label: platform === "telegram" ? "Пост" : "Пост / Reels", platforms: ["instagram", "telegram", "vk"] },
    { id: "photo", label: "Фотография / Альбом", platforms: ["telegram", "vk"] },
    { id: "story", label: "Stories / Истории", platforms: ["instagram", "vk"] },
    { id: "comment", label: "Комментарий (VK)", platforms: ["vk"] }
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="bg-card/95 dark:bg-card/75 backdrop-blur-xl border border-border/80 rounded-[32px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.3)] p-5 sm:p-8 w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border/40 pb-5 gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                Интерактивный гид по ссылкам
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
                Выберите соцсеть и тип контента, чтобы увидеть пошаговую инструкцию
              </p>
            </div>
            
            {/* Devices Selector & Close */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex p-0.5 bg-background/60 border border-border/50 rounded-xl shrink-0">
                <button
                  onClick={() => setDeviceTab("mobile")}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                    deviceTab === "mobile"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Телефон
                </button>
                <button
                  onClick={() => setDeviceTab("desktop")}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                    deviceTab === "desktop"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Компьютер
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-default-100 hover:bg-default-200 dark:bg-default-100/10 dark:hover:bg-default-100/20 flex items-center justify-center transition-all duration-200 active:scale-95 shrink-0"
              >
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </div>

          {/* Social Platform Tabs */}
          <div className="flex gap-2 sm:gap-3 overflow-x-auto py-4 border-b border-border/20 scrollbar-none select-none">
            {platformsList.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPlatform(p.id);
                  setContentType("profile");
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all duration-200 whitespace-nowrap active:scale-95 ${
                  platform === p.id
                    ? "bg-primary/10 border-primary text-foreground shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                    : "bg-transparent border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <span className="text-base">{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>

          {/* Content Type Tabs */}
          <div className="flex gap-2 overflow-x-auto py-3 select-none scrollbar-none">
            {contentTypesList
              .filter((c) => c.platforms.includes(platform))
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => setContentType(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                    contentType === c.id
                      ? "bg-foreground text-background"
                      : "bg-default-100 dark:bg-default-100/10 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
          </div>

          {/* Dynamic Instructions Grid */}
          <div className="py-4 sm:py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {renderSteps(platform, contentType, deviceTab)}
            </div>
          </div>

          {/* Warning and Tips Footer */}
          {renderFooterWarning(platform, contentType)}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Custom Stepper Builder
function renderSteps(platform: Platform, contentType: ContentType, device: "mobile" | "desktop") {
  const steps: { title: string; desc: string; svg: React.ReactNode }[] = [];

  if (platform === "instagram") {
    if (contentType === "profile") {
      steps.push(
        {
          title: "Зайдите на нужный профиль",
          desc: device === "mobile" 
            ? "Откройте страницу блогера или паблика в приложении Instagram." 
            : "Перейдите на страницу нужного пользователя в браузере.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" className="text-content2 stroke-border/40" fill="currentColor" strokeWidth="1" />
              <circle cx="85" cy="45" r="16" fill="currentColor" className="text-muted/30" />
              <rect x="110" y="38" width="60" height="8" rx="2.5" fill="currentColor" className="text-muted-foreground/30" />
              <rect x="110" y="52" width="40" height="6" rx="2" fill="currentColor" className="text-muted-foreground/15" />
            </svg>
          )
        },
        {
          title: device === "mobile" ? "Нажмите «Поделиться»" : "Скопируйте URL",
          desc: device === "mobile" 
            ? "Под описанием профиля нажмите большую кнопку **«Поделиться профилем»**." 
            : "Кликните по адресной строке в верхней части браузера.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" className="text-content2 stroke-border/40" strokeWidth="1" />
              {/* Share Profile button mock */}
              <rect x="62" y="80" width="55" height="18" rx="6" className="text-primary/10 stroke-primary" fill="currentColor" strokeWidth="1" />
              <text x="90" y="92" textAnchor="middle" className="fill-primary font-black text-[7px]">Поделиться</text>
              <g transform="translate(90, 95)">
                <circle cx="0" cy="0" r="8" className="fill-primary/20 animate-ping" />
                <circle cx="0" cy="0" r="3" className="fill-primary" />
              </g>
            </svg>
          )
        },
        {
          title: "«Копировать ссылку»",
          desc: device === "mobile" 
            ? "Во всплывающем меню выберите строчку **«Копировать ссылку»**." 
            : "Нажмите Ctrl+C, скопированная ссылка автоматически очистится от мусора в нашем поле ввода!",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" className="text-content2 stroke-border/40" strokeWidth="1" />
              <rect x="52" y="95" width="136" height="73" rx="12" fill="currentColor" className="text-card" />
              {/* Menu Item Copy */}
              <rect x="60" y="115" width="120" height="18" rx="5" className="text-primary/10 stroke-primary" fill="currentColor" strokeWidth="0.8" />
              <text x="68" y="127" className="fill-primary font-bold text-[8px]">Копировать ссылку</text>
              <g transform="translate(130, 124)">
                <circle cx="0" cy="0" r="8" className="fill-primary/20 animate-pulse" />
                <circle cx="0" cy="0" r="3" className="fill-primary" />
              </g>
            </svg>
          )
        }
      );
    } else if (contentType === "post") {
      steps.push(
        {
          title: "Откройте нужный пост/Reels",
          desc: "Перейдите к публикации, на которую хотите накрутить лайки или просмотры.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" className="text-content2 stroke-border/40" strokeWidth="1" />
              <rect x="58" y="25" width="124" height="90" rx="6" fill="currentColor" className="text-muted/20" />
            </svg>
          )
        },
        {
          title: "Нажмите меню «⋯» или «Поделиться»",
          desc: device === "mobile"
            ? "Тапните по иконке самолетика (Поделиться) под постом или три точки в углу."
            : "Нажмите три точки справа от имени автора поста.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" className="text-content2 stroke-border/40" strokeWidth="1" />
              {/* Glowing share aircraft icon */}
              <g transform="translate(110, 130)">
                <circle cx="0" cy="0" r="10" className="fill-primary/20 animate-pulse" />
                <path d="M -5,-5 L 5,-1 L -1,1 Z" fill="currentColor" className="text-primary" />
              </g>
            </svg>
          )
        },
        {
          title: "«Копировать ссылку»",
          desc: "Нажмите кнопку «Копировать ссылку» (Copy Link). Ссылка готова для вставки!",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <rect x="52" y="90" width="136" height="78" rx="12" fill="currentColor" className="text-card" />
              <rect x="60" y="112" width="120" height="20" rx="6" className="text-primary/10 stroke-primary" fill="currentColor" strokeWidth="1" />
              <text x="120" y="125" textAnchor="middle" className="fill-primary font-bold text-[8px]">Скопировать ссылку</text>
            </svg>
          )
        }
      );
    } else if (contentType === "story") {
      steps.push(
        {
          title: "Откройте нужную историю",
          desc: "Запустите просмотр Stories нужного аккаунта.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="#09090c" stroke="currentColor" className="text-border/40" strokeWidth="1" />
              <rect x="54" y="14" width="132" height="152" rx="12" fill="currentColor" className="text-muted/15" />
            </svg>
          )
        },
        {
          title: "Нажмите меню «⋯» или самолетик",
          desc: "В правом верхнем углу (на ПК) или правом нижнем (в телефоне) нажмите на иконку меню / поделиться.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="#09090c" stroke="currentColor" className="text-border/40" strokeWidth="1" />
              <g transform="translate(170, 30)">
                <circle cx="0" cy="0" r="10" className="fill-primary/20 animate-ping" />
                <circle cx="-4" cy="0" r="1.5" fill="#ffffff" />
                <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
                <circle cx="4" cy="0" r="1.5" fill="#ffffff" />
              </g>
            </svg>
          )
        },
        {
          title: "«Скопировать ссылку»",
          desc: "Выберите строчку «Скопировать ссылку». Помните, что история должна быть активной (с момента публикации прошло менее 24 часов).",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="#0b0b0f" stroke="currentColor" className="text-border/40" strokeWidth="1" />
              <rect x="52" y="100" width="136" height="68" rx="12" fill="currentColor" className="text-card" />
              <rect x="60" y="120" width="120" height="18" rx="5" className="text-primary/10 stroke-primary" fill="currentColor" strokeWidth="0.8" />
              <text x="68" y="132" className="fill-primary font-bold text-[8px]">Скопировать ссылку</text>
            </svg>
          )
        }
      );
    }
  } else if (platform === "telegram") {
    if (contentType === "profile") {
      steps.push(
        {
          title: "Откройте инфо о канале/группе",
          desc: device === "mobile" 
            ? "Тапните по названию или аватару канала/группы вверху экрана." 
            : "Нажмите на заголовок канала в верхней панели Telegram Desktop.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" className="text-content2 stroke-border/40" fill="currentColor" strokeWidth="1" />
              <rect x="65" y="22" width="110" height="18" rx="6" className="text-primary/10 stroke-primary" fill="currentColor" strokeWidth="1.5" />
              <text x="120" y="34" textAnchor="middle" className="fill-primary font-black text-[7px]">Durov's Channel</text>
              <g transform="translate(120, 31)">
                <circle cx="0" cy="0" r="8" className="fill-primary/20 animate-ping" />
              </g>
            </svg>
          )
        },
        {
          title: "Найдите ссылку",
          desc: "В блоке информации найдите строчку вида `t.me/имя_канала` (для публичных) или `t.me/+ссылка` (для закрытых каналов).",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <circle cx="120" cy="50" r="18" fill="currentColor" className="text-muted/30" />
              <rect x="80" y="85" width="80" height="12" rx="4" className="text-primary/10 stroke-primary" fill="currentColor" strokeWidth="0.5" />
              <text x="120" y="93" textAnchor="middle" className="fill-primary font-bold text-[7px]">t.me/durov</text>
            </svg>
          )
        },
        {
          title: "Скопируйте ссылку",
          desc: "Зажмите ссылку пальцем (или кликните правой кнопкой мыши на ПК) и выберите «Копировать» (Copy Link).",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <rect x="52" y="85" width="136" height="83" rx="12" fill="currentColor" className="text-card" />
              <rect x="60" y="110" width="120" height="20" rx="6" className="text-primary/10 stroke-primary" fill="currentColor" strokeWidth="1" />
              <text x="68" y="123" className="fill-primary font-bold text-[8px]">Копировать ссылку</text>
            </svg>
          )
        }
      );
    } else if (contentType === "post") {
      steps.push(
        {
          title: "Найдите нужный пост",
          desc: "Перейдите в канал и выберите конкретную запись.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <rect x="62" y="40" width="116" height="50" rx="8" fill="currentColor" className="text-card" />
            </svg>
          )
        },
        {
          title: "Нажмите на пост / стрелочку",
          desc: device === "mobile"
            ? "Быстро тапните по телу поста (или зажмите его) и нажмите на стрелочку «Поделиться»."
            : "Нажмите правой кнопкой мыши на пост или на значок стрелки рядом.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <rect x="62" y="40" width="116" height="50" rx="8" fill="currentColor" className="text-card" />
              <g transform="translate(155, 65)">
                <circle cx="0" cy="0" r="10" className="fill-primary/20 animate-ping" />
                <circle cx="0" cy="0" r="3" className="fill-primary" />
              </g>
            </svg>
          )
        },
        {
          title: "«Копировать ссылку»",
          desc: "Выберите пункт «Копировать ссылку» (Copy Link). Мы распознаем посты как из публичных, так и из закрытых каналов (при наличии инвайта).",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <rect x="52" y="90" width="136" height="78" rx="12" fill="currentColor" className="text-card" />
              <rect x="60" y="112" width="120" height="20" rx="6" className="text-primary/10 stroke-primary" fill="currentColor" strokeWidth="1" />
              <text x="120" y="125" textAnchor="middle" className="fill-primary font-bold text-[8px]">Копировать ссылку</text>
            </svg>
          )
        }
      );
    } else if (contentType === "photo") {
      steps.push(
        {
          title: "Ссылка на ПЕРВОЕ фото (пост)",
          desc: "Найдите альбом в канале. Скопируйте ссылку на первое фото (или сам пост) через меню «Поделиться» или правый клик. Это основная ссылка вида t.me/channel/100, вставьте её в верхнее поле заказа.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" className="text-content2 stroke-border/40" fill="currentColor" strokeWidth="1" />
              <rect x="62" y="32" width="56" height="52" rx="6" className="text-primary/20 stroke-primary" fill="currentColor" strokeWidth="1.5" />
              <text x="90" y="62" textAnchor="middle" className="fill-primary font-black text-[12px]">#1</text>
              <rect x="122" y="32" width="56" height="52" rx="6" fill="currentColor" className="text-muted/20" />
              <rect x="62" y="88" width="56" height="52" rx="6" fill="currentColor" className="text-muted/20" />
              <rect x="122" y="88" width="56" height="52" rx="6" fill="currentColor" className="text-muted/20" />
              <g transform="translate(90, 58)">
                <circle cx="0" cy="0" r="10" className="fill-primary/20 animate-ping" />
              </g>
            </svg>
          )
        },
        {
          title: "Откройте ПОСЛЕДНЕЕ фото",
          desc: "Тапните по последнему фото/видео в альбоме, чтобы развернуть его на весь экран (на телефоне), или наведите курсор на последнее фото (на ПК).",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <rect x="62" y="32" width="56" height="52" rx="6" fill="currentColor" className="text-muted/20" />
              <rect x="122" y="32" width="56" height="52" rx="6" fill="currentColor" className="text-muted/20" />
              <rect x="62" y="88" width="56" height="52" rx="6" fill="currentColor" className="text-muted/20" />
              <rect x="122" y="88" width="56" height="52" rx="6" className="text-primary/20 stroke-primary" fill="currentColor" strokeWidth="1.5" />
              <text x="150" y="118" textAnchor="middle" className="fill-primary font-black text-[12px]">#4</text>
              <g transform="translate(150, 114)">
                <circle cx="0" cy="0" r="10" className="fill-primary/20 animate-ping" />
              </g>
            </svg>
          )
        },
        {
          title: "Ссылка на последнее фото",
          desc: "Нажмите меню «⋯» или «Поделиться» и скопируйте ссылку. Она будет иметь ID последнего поста (напр., t.me/channel/103). Вставьте её во второе поле ввода! Система автоматически запустит просмотры на все фото в этом диапазоне (100-103).",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <rect x="58" y="32" width="124" height="42" rx="8" className="text-success/10 stroke-success" fill="currentColor" strokeWidth="1" />
              <text x="120" y="56" textAnchor="middle" className="fill-success font-black text-[7px]">Диапазон: 100 ➔ 103 (Всего 4)</text>
              <rect x="52" y="90" width="136" height="78" rx="12" fill="currentColor" className="text-card" />
              <rect x="60" y="112" width="120" height="20" rx="6" className="text-primary/10 stroke-primary" fill="currentColor" strokeWidth="1" />
              <text x="120" y="125" textAnchor="middle" className="fill-primary font-bold text-[7px]">Второе поле: Ссылка на последнее фото</text>
            </svg>
          )
        }
      );
    }
  } else if (platform === "vk") {
    if (contentType === "profile") {
      steps.push(
        {
          title: "Зайдите на стену профиля/группы",
          desc: "Откройте нужную личную страницу или паблик в VK.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <circle cx="75" cy="40" r="14" fill="currentColor" className="text-muted/30" />
            </svg>
          )
        },
        {
          title: "Нажмите меню «⋯» в углу экрана",
          desc: device === "mobile"
            ? "В правом верхнем углу страницы тапните по значку трех точек."
            : "В правой верхней колонке под аватаром сообщества или в шапке нажмите на меню управления.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <g transform="translate(170, 30)">
                <circle cx="0" cy="0" r="10" className="fill-primary/20 animate-ping" />
                <circle cx="-4" cy="0" r="1.5" fill="#ffffff" />
                <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
                <circle cx="4" cy="0" r="1.5" fill="#ffffff" />
              </g>
            </svg>
          )
        },
        {
          title: "«Скопировать ссылку»",
          desc: "В меню выберите пункт «Скопировать ссылку» (или «Поделиться -> Скопировать»).",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <rect x="52" y="90" width="136" height="78" rx="12" fill="currentColor" className="text-card" />
              <rect x="60" y="112" width="120" height="20" rx="6" className="text-primary/10 stroke-primary" fill="currentColor" strokeWidth="1" />
              <text x="68" y="125" className="fill-primary font-bold text-[8px]">Скопировать ссылку</text>
            </svg>
          )
        }
      );
    } else if (contentType === "post") {
      steps.push(
        {
          title: "Откройте запись на стене",
          desc: "**КРИТИЧНО**: Не копируйте ссылку на фото во вложении! Тапните по самому тексту или дате поста, чтобы открыть только эту запись на стене.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <rect x="60" y="30" width="120" height="70" rx="8" fill="currentColor" className="text-card" />
              {/* Highlight post text block */}
              <rect x="66" y="38" width="80" height="6" rx="2" fill="currentColor" className="text-primary/30" />
              <g transform="translate(100, 41)">
                <circle cx="0" cy="0" r="10" className="fill-primary/20 animate-ping" />
              </g>
            </svg>
          )
        },
        {
          title: "Нажмите меню «⋯» или «Поделиться»",
          desc: "В правом верхнем углу поста нажмите три точки (или кнопку Поделиться внизу).",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <rect x="60" y="30" width="120" height="70" rx="8" fill="currentColor" className="text-card" />
              <g transform="translate(165, 42)">
                <circle cx="0" cy="0" r="8" className="fill-primary/20 animate-pulse" />
                <circle cx="-3" cy="0" r="1" fill="#ffffff" />
                <circle cx="0" cy="0" r="1" fill="#ffffff" />
                <circle cx="3" cy="0" r="1" fill="#ffffff" />
              </g>
            </svg>
          )
        },
        {
          title: "«Скопировать ссылку»",
          desc: "Выберите пункт «Скопировать ссылку». Убедитесь, что ссылка имеет формат `vk.com/wall-XXXX_YYYY`.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <rect x="52" y="90" width="136" height="78" rx="12" fill="currentColor" className="text-card" />
              <rect x="60" y="112" width="120" height="20" rx="6" className="text-primary/10 stroke-primary" fill="currentColor" strokeWidth="1" />
              <text x="120" y="125" textAnchor="middle" className="fill-primary font-bold text-[8px]">Скопировать ссылку</text>
            </svg>
          )
        }
      );
    } else if (contentType === "story") {
      steps.push(
        {
          title: "Откройте нужную историю",
          desc: "Откройте историю нужного сообщества или человека в мобильном приложении VK.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="#0b0b10" stroke="currentColor" className="text-border/40" strokeWidth="1" />
              <rect x="54" y="14" width="132" height="152" rx="12" fill="currentColor" className="text-muted/15" />
            </svg>
          )
        },
        {
          title: "Нажмите стрелку «Поделиться»",
          desc: "В правом нижнем углу экрана нажмите на значок изогнутой стрелочки (Поделиться).",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="#0b0b10" stroke="currentColor" className="text-border/40" strokeWidth="1" />
              <g transform="translate(165, 145)">
                <circle cx="0" cy="0" r="10" className="fill-primary/20 animate-ping" />
                {/* curved VK share arrow shape */}
                <path d="M -4,2 L 2,-4 L 2,-1 C 5,-1 7,2 7,5 C 6,3 4,3 2,3 L 2,6 Z" fill="currentColor" className="text-primary" />
              </g>
            </svg>
          )
        },
        {
          title: "«Скопировать ссылку»",
          desc: "В меню экспорта выберите «Скопировать ссылку». Ссылка готова к заказу!",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="#0b0b10" stroke="currentColor" className="text-border/40" strokeWidth="1" />
              <rect x="52" y="90" width="136" height="78" rx="12" fill="currentColor" className="text-card" />
              <rect x="60" y="112" width="120" height="20" rx="6" className="text-primary/10 stroke-primary" fill="currentColor" strokeWidth="1" />
              <text x="68" y="125" className="fill-primary font-bold text-[8px]">Скопировать ссылку</text>
            </svg>
          )
        }
      );
    } else if (contentType === "comment") {
      steps.push(
        {
          title: "Найдите нужный комментарий",
          desc: "Перейдите к обсуждению под постом. Найдите комментарий, на который хотите накрутить лайки.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              {/* Comment Box silhouette */}
              <rect x="60" y="60" width="120" height="40" rx="6" fill="currentColor" className="text-card" />
              <circle cx="72" cy="74" r="6" fill="currentColor" className="text-muted/30" />
              <rect x="83" y="72" width="60" height="4" rx="1" fill="currentColor" className="text-muted-foreground/30" />
            </svg>
          )
        },
        {
          title: "Нажмите на дату/время публикации",
          desc: device === "mobile"
            ? "В приложении VK быстро тапните по самому телу комментария (или зажмите его) и выберите «Поделиться -> Скопировать ссылку»."
            : "В веб-версии наведите курсор на **время публикации** комментария (например, «3 часа назад») и нажмите правую кнопку мыши.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <rect x="60" y="60" width="120" height="40" rx="6" fill="currentColor" className="text-card" />
              {/* Timestamp glow area */}
              <rect x="83" y="80" width="40" height="4" rx="1.5" className="text-primary/20 stroke-primary" fill="currentColor" strokeWidth="0.5" />
              <g transform="translate(100, 82)">
                <circle cx="0" cy="0" r="8" className="fill-primary/20 animate-ping" />
              </g>
            </svg>
          )
        },
        {
          title: "«Скопировать адрес ссылки»",
          desc: "Выберите пункт «Скопировать адрес ссылки». Ссылка содержит параметр `?reply=...`. **Не удаляйте его**, он нужен системе для распознавания конкретного ответа!",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <rect x="52" y="90" width="136" height="78" rx="12" fill="currentColor" className="text-card" />
              <rect x="60" y="112" width="120" height="20" rx="6" className="text-primary/10 stroke-primary" fill="currentColor" strokeWidth="1" />
              <text x="120" y="125" textAnchor="middle" className="fill-primary font-bold text-[6px]">Скопировать адрес ссылки</text>
            </svg>
          )
        }
      );
    } else if (contentType === "photo") {
      steps.push(
        {
          title: "Откройте публикацию или альбом",
          desc: "Перейдите к посту на стене или откройте раздел альбомов сообщества, содержащий нужное изображение.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <rect x="60" y="30" width="55" height="50" rx="4" fill="currentColor" className="text-muted/20" />
              <rect x="125" y="30" width="55" height="50" rx="4" fill="currentColor" className="text-muted/20" />
              <rect x="60" y="90" width="55" height="50" rx="4" fill="currentColor" className="text-muted/20" />
              <rect x="125" y="90" width="55" height="50" rx="4" fill="currentColor" className="text-muted/20" />
            </svg>
          )
        },
        {
          title: "Разверните фото на весь экран",
          desc: "Кликните на изображение, чтобы открыть его в полноэкранном режиме просмотра (theater mode).",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="#09090c" stroke="currentColor" className="text-border/40" strokeWidth="1" />
              <rect x="54" y="24" width="132" height="132" fill="currentColor" className="text-muted/15" />
              <g transform="translate(120, 90)">
                <circle cx="0" cy="0" r="10" className="fill-primary/20 animate-pulse" />
                <circle cx="0" cy="0" r="3" className="fill-primary" />
              </g>
            </svg>
          )
        },
        {
          title: "Скопируйте ссылку на фото",
          desc: "На телефоне: нажмите «Поделиться» -> «Скопировать ссылку». На ПК: просто скопируйте URL из адресной строки браузера. Ссылка должна иметь вид vk.com/photo-XXXX_YYYY.",
          svg: (
            <svg viewBox="0 0 240 180" className="w-full h-full max-h-[130px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="10" width="140" height="160" rx="16" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-content2 stroke-border/40" />
              <rect x="60" y="25" width="120" height="12" rx="3" className="text-primary/10 stroke-primary" fill="currentColor" strokeWidth="0.5" />
              <text x="120" y="33" textAnchor="middle" className="fill-primary font-bold text-[6px]">vk.com/photo-123_456</text>
              <rect x="52" y="90" width="136" height="78" rx="12" fill="currentColor" className="text-card" />
              <rect x="60" y="112" width="120" height="20" rx="6" className="text-primary/10 stroke-primary" fill="currentColor" strokeWidth="1" />
              <text x="68" y="125" className="fill-primary font-bold text-[8px]">Скопировать ссылку</text>
            </svg>
          )
        }
      );
    }
  }

  return (
    <>
      {steps.map((s, idx) => (
        <div key={idx} className="flex flex-col gap-3 group">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black">
              {idx + 1}
            </span>
            <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
              {s.title}
            </h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pl-8">
            {s.desc}
          </p>
          
          <div className="aspect-[4/3] w-full rounded-2xl border border-border/60 bg-muted/30 dark:bg-muted/10 p-4 flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:border-primary/30 group-hover:shadow-[0_8px_30px_rgb(var(--primary-rgb)/0.03)]">
            {s.svg}
          </div>
        </div>
      ))}
    </>
  );
}

// Warning and tips footer block
function renderFooterWarning(platform: Platform, contentType: ContentType) {
  let warningText = "";
  let type = "info";

  if (platform === "vk") {
    if (contentType === "post") {
      warningText = "ВНИМАНИЕ: Если вы скопируете ссылку на изображение во вложении (например, vk.com/photo-XXX_YYY) вместо поста на стене, накрутка лайков на публикацию не сработает! Обязательно кликайте на сам текст записи.";
      type = "warning";
    } else if (contentType === "comment") {
      warningText = "ДЛЯ НАКРУТКИ НА ОТВЕТ: Ссылка обязана содержать параметр ?reply=XXXX в конце. Наша система автоматически распознает его и накрутит лайки именно на этот комментарий. Не стирайте этот параметр!";
      type = "success";
    } else if (contentType === "photo") {
      warningText = "ДЛЯ НАКРУТКИ НА ФОТО: Убедитесь, что фотография находится в открытом альбоме и её настройки приватности позволяют просматривать её всем пользователям.";
      type = "warning";
    }
  } else if (platform === "telegram") {
    if (contentType === "photo") {
      warningText = "ДЛЯ АЛЬБОМОВ: Указание ссылки на конкретное фото с параметром ?single позволяет накрутить просмотры именно на этот медиафайл. Убедитесь, что канал публичный.";
      type = "success";
    } else {
      warningText = "ДЛЯ ЗАКРЫТЫХ КАНАЛОВ: Накрутка подписчиков работает только при указании временной пригласительной ссылки вида t.me/+... Накрутка просмотров постов на закрытые каналы технически невозможна.";
      type = "warning";
    }
  } else if (platform === "instagram") {
    warningText = "УБЕДИТЕСЬ, что ваш профиль является открытым (публичным) на время выполнения заказа. Накрутка на приватные (закрытые) аккаунты или истории технически невозможна.";
    type = "warning";
  }

  if (!warningText) return null;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center border-t border-border/40 pt-5 mt-3 gap-4">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
          type === "warning" 
            ? "bg-warning-50 dark:bg-warning-950/30 border-warning-200 dark:border-warning-800/50 text-warning" 
            : type === "success"
            ? "bg-success-50 dark:bg-success-950/30 border-success-200 dark:border-success-800/50 text-success"
            : "bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-800/50 text-primary"
        }`}>
          {type === "warning" ? <AlertTriangle className="w-4.5 h-4.5" /> : <Check className="w-4.5 h-4.5" />}
        </div>
        <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
          {warningText}
        </p>
      </div>
      
      <button
        onClick={() => toast.success("Следование инструкциям гарантирует запуск заказа за 60 секунд!")}
        className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-foreground hover:bg-foreground/90 text-background font-bold text-sm shadow-md transition-all duration-200 active:scale-95 shrink-0 flex items-center justify-center gap-2"
      >
        Понятно
      </button>
    </div>
  );
}
