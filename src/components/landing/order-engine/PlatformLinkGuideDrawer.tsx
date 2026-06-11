"use client";

import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Share2, Copy, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GuideStep {
  title: string;
  desc: string;
  imgPlaceholder: string;
}

interface PlatformGuide {
  name: string;
  icon: string;
  steps: GuideStep[];
}

const GUIDES: Record<string, PlatformGuide> = {
  telegram: {
    name: "Telegram",
    icon: "✈️",
    steps: [
      {
        title: "Ссылка на канал или группу",
        desc: "Откройте описание канала или группы, нажмите на имя пользователя (например, @durov) или ссылку формата t.me/joinchat/... для автоматического копирования.",
        imgPlaceholder: "Справа вверху нажмите на фото профиля ➔ В разделе «Информация» скопируйте имя пользователя."
      },
      {
        title: "Ссылка на конкретный пост",
        desc: "Нажмите на сообщение правой кнопкой мыши (на ПК) или просто один раз коротко тапните по тексту сообщения (на телефоне) ➔ Выберите пункт «Копировать ссылку» (Copy Link).",
        imgPlaceholder: "Тап по сообщению ➔ Появится контекстное меню ➔ Нажмите «Копировать ссылку»."
      },
      {
        title: "Ссылка на фото из альбома (медиагруппы)",
        desc: "Для накрутки просмотров на альбом (медиагруппу) вам понадобятся две ссылки:\n\n1. Ссылка на ПЕРВОЕ фото (можно скопировать как обычную ссылку на сам пост).\n2. Ссылка на ПОСЛЕДНЕЕ фото (откройте последнее фото на весь экран ➔ нажмите три точки ⋮ в углу ➔ «Копировать ссылку», либо зажмите фото пальцем и выберите «Копировать ссылку»).\n\nПолученные ссылки будут иметь вид:\n• Первое фото: t.me/durov/123\n• Последнее фото: t.me/durov/123?single (или t.me/durov/124)",
        imgPlaceholder: "1. Ссылка на пост (первое фото) | 2. Фото на весь экран ➔ три точки ⋮ ➔ Скопировать (последнее фото)"
      }
    ]
  },
  instagram: {
    name: "Instagram",
    icon: "📸",
    steps: [
      {
        title: "Ссылка на профиль",
        desc: "Откройте нужный профиль в приложении ➔ Нажмите на значок трех точек «•••» в правом верхнем углу экрана ➔ Выберите «Скопировать URL профиля» (Copy Profile URL).",
        imgPlaceholder: "Профиль ➔ Три точки в углу ➔ «Скопировать URL профиля»"
      },
      {
        title: "Ссылка на пост или Reels",
        desc: "Откройте публикацию ➔ Тапните по иконке самолетика (Поделиться) внизу под фото/видео ➔ В нижней панели выберите кнопку «Скопировать ссылку» (Copy Link).",
        imgPlaceholder: "Пост/Reels ➔ Самолетик (Поделиться) ➔ Кнопка «Скопировать ссылку»"
      }
    ]
  },
  vk: {
    name: "ВКонтакте",
    icon: "🔵",
    steps: [
      {
        title: "Ссылка на профиль или группу",
        desc: "Перейдите на страницу пользователя или сообщества ➔ В правом верхнем углу нажмите на три точки «•••» ➔ Выберите пункт «Скопировать ссылку» (или поделиться).",
        imgPlaceholder: "Группа ➔ Три точки ➔ «Скопировать ссылку»"
      },
      {
        title: "Ссылка на запись (стену)",
        desc: "Нажмите на дату или время публикации записи (например, «три часа назад» или «вчера») ➔ Страница откроется отдельно, скопируйте её URL из адресной строки браузера.",
        imgPlaceholder: "Нажмите на дату поста ➔ Скопируйте полный адрес из строки браузера"
      }
    ]
  },
  youtube: {
    name: "YouTube",
    icon: "🎥",
    steps: [
      {
        title: "Ссылка на видео или Shorts",
        desc: "Под проигрывателем видео нажмите кнопку «Поделиться» (Share) ➔ В открывшемся окне нажмите круглую кнопку «Копировать» (Copy).",
        imgPlaceholder: "Под видео ➔ Кнопка «Поделиться» ➔ «Копировать ссылку»"
      },
      {
        title: "Ссылка на канал",
        desc: "Перейдите на главную страницу канала ➔ В правом верхнем углу нажмите на три точки ➔ «Поделиться» ➔ «Копировать ссылку».",
        imgPlaceholder: "Канал ➔ Меню в углу ➔ «Поделиться» ➔ «Копировать»"
      }
    ]
  }
};

export function PlatformLinkGuideDrawer({
  isOpen,
  onClose,
  initialPlatform = "telegram",
  initialStep = 0
}: {
  isOpen: boolean;
  onClose: () => void;
  initialPlatform?: string;
  initialStep?: number;
}) {
  const [activeTab, setActiveTab] = useState<string>("telegram");
  const [activeStep, setActiveStep] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const lower = initialPlatform.toLowerCase();
      if (GUIDES[lower]) {
        setActiveTab(lower);
      } else {
        setActiveTab("telegram");
      }
      setActiveStep(initialStep);
      // Lock body scroll
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, initialPlatform]);

  if (!mounted || !isOpen) return null;

  const currentGuide = GUIDES[activeTab] || GUIDES.telegram;
  const currentStepData = currentGuide.steps[activeStep] || currentGuide.steps[0];

  const handleNext = () => {
    if (activeStep < currentGuide.steps.length - 1) {
      setActiveStep(prev => prev + 1);
    } else {
      setActiveStep(0);
    }
  };

  const handlePrev = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    } else {
      setActiveStep(currentGuide.steps.length - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[350] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-background/60 backdrop-blur-md transition-opacity cursor-pointer animate-in fade-in duration-300" 
      />

      {/* Main Panel */}
      <div className="relative w-full max-w-lg md:max-w-2xl bg-card border border-border/40 shadow-2xl rounded-t-[2rem] md:rounded-[2rem] p-5 md:p-8 z-10 flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-foreground tracking-tight">Как скопировать ссылку?</h3>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Интерактивный помощник SMMplan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-content2 hover:bg-content3 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 active:scale-90"
            aria-label="Закрыть инструкцию"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selection Tabs */}
        <div className="flex items-center gap-2 py-4 overflow-x-auto scrollbar-hide shrink-0 border-b border-border/10">
          {Object.entries(GUIDES).map(([key, value]) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveTab(key);
                  setActiveStep(0);
                }}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/15 scale-102"
                    : "bg-content2 hover:bg-content3 text-muted-foreground hover:text-foreground border border-border/20"
                }`}
              >
                <span>{value.icon}</span>
                <span>{value.name}</span>
              </button>
            );
          })}
        </div>

        {/* Body content: Steps & Illustrated Card */}
        <div className="flex-1 py-5 flex flex-col md:flex-row gap-6 min-h-0">
          
          {/* Left/Top: Text instructions */}
          <div className="flex-1 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                  Шаг {activeStep + 1} из {currentGuide.steps.length}
                </span>
                <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">
                  {currentGuide.name}
                </span>
              </div>
              <h4 className="text-base font-extrabold text-foreground leading-tight">
                {currentStepData.title}
              </h4>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed whitespace-pre-line">
                {currentStepData.desc}
              </p>
            </div>

            {/* Stepper Navigation buttons */}
            <div className="flex items-center gap-3 pt-4 shrink-0">
              <Button
                type="button"
                intent="outline"
                onClick={handlePrev}
                className="w-12 h-11 rounded-xl p-0 flex items-center justify-center border-border/50 hover:bg-content2 transition-colors active:scale-95"
                title="Предыдущий шаг"
              >
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </Button>
              
              <Button
                type="button"
                onClick={handleNext}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-black text-xs transition-all active:scale-95 shadow-md shadow-primary/10 flex items-center justify-center gap-1.5"
              >
                <span>Следующий способ</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Right/Bottom: Elegant Mock Visual Representation */}
          <div className="hidden md:flex w-[260px] bg-content2 border border-border/30 rounded-2xl p-4 flex-col justify-between min-h-[240px] shrink-0 relative overflow-hidden shadow-inner select-none">
            {/* Visual Header */}
            <div className="flex items-center gap-2 border-b border-border/20 pb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
              <div className="h-2 w-24 bg-border/40 rounded-full ml-2" />
            </div>

            {/* Visual Central Body */}
            <div className="flex-1 flex flex-col items-center justify-center p-3 text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mb-2.5 animate-[bounce_2s_infinite]">
                <Share2 className="w-5 h-5 text-primary" />
              </div>
              <p className="text-[11px] text-foreground font-bold leading-tight px-2">
                {currentStepData.imgPlaceholder}
              </p>
            </div>

            {/* Visual Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border/20 text-[9px] text-muted-foreground/60 font-mono">
              <span className="flex items-center gap-1">
                <Copy className="w-3 h-3" /> Copy
              </span>
              <span>smmplan.pro</span>
            </div>
            
            {/* Soft decorative background circles */}
            <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-primary/5 blur-xl pointer-events-none" />
          </div>

        </div>

        {/* Footer Support Info */}
        <div className="mt-2 pt-4 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[10px] text-muted-foreground font-medium text-center sm:text-left">
            Все еще не получается? Напишите нашему оператору в Telegram!
          </p>
          <a
            href="/api/support/telegram"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-brand-telegram/10 hover:bg-brand-telegram/15 border border-brand-telegram/20 rounded-full text-[10.5px] font-black text-brand-telegram transition-all duration-200 active:scale-95 flex items-center gap-1"
          >
            <span>💬 Поддержка Telegram</span>
          </a>
        </div>

      </div>
    </div>
  );
}
