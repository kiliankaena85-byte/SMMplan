'use client';

import * as React from 'react';
import { Wrench, MessageSquare, Mail } from 'lucide-react';

interface MaintenanceScreenProps {
  siteName?: string;
  supportTelegram?: string;
  supportEmail?: string;
}

export function MaintenanceScreen({
  siteName = 'SMMplan',
  supportTelegram = 'smmplan_support_bot',
  supportEmail = 'support@smmplan.pro',
}: MaintenanceScreenProps) {
  
  // Format telegram link (convert raw handle to full url if needed)
  const telegramUrl = supportTelegram.startsWith('http')
    ? supportTelegram
    : `https://t.me/${supportTelegram.replace('@', '')}`;

  return (
    <div className="dark min-h-screen w-full bg-background text-foreground flex items-center justify-center p-6 relative overflow-hidden select-none">
      
      {/* ── Soft Ambient Glow Orbs ── */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-primary/10 blur-[80px] sm:blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-10 left-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] rounded-full bg-info/5 blur-[100px] pointer-events-none z-0" />

      {/* ── Card Container ── */}
      <div className="relative z-10 w-full max-w-md bg-card/30 backdrop-blur-xl border border-border/10 p-8 sm:p-10 rounded-[24px] shadow-2xl flex flex-col items-center text-center transition-all duration-300 hover:border-border/20">
        
        {/* Logo / Header */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-sm shadow-lg shadow-primary/30 animate-pulse">
            {siteName.charAt(0).toUpperCase()}
          </div>
          <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
            {siteName}
          </span>
        </div>

        {/* Animated Icon */}
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 ring-4 ring-primary/5 animate-bounce">
          <Wrench className="w-8 h-8" />
        </div>

        {/* Heading */}
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider mb-3 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground">
          Технические работы
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-8">
          Мы обновляем платформу, чтобы сделать продвижение ещё быстрее и стабильнее. Скоро вернемся в строй!
        </p>

        {/* Action Buttons & Links */}
        <div className="w-full space-y-3">
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/95 text-primary-foreground text-xs sm:text-sm font-bold uppercase tracking-widest rounded-xl transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            <MessageSquare className="w-4 h-4" />
            Поддержка Telegram
          </a>

          <a
            href={`mailto:${supportEmail}`}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-6 py-3 bg-muted/40 hover:bg-muted/60 text-foreground text-xs sm:text-sm font-bold uppercase tracking-widest rounded-xl border border-border/10 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Mail className="w-4 h-4" />
            Написать на почту
          </a>
        </div>

        {/* Footer legal mention */}
        <div className="mt-8 pt-6 border-t border-border/5 w-full flex flex-col items-center gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
            © {new Date().getFullYear()} {siteName}
          </span>
          <span className="text-[9px] text-muted-foreground/50">
            Все права защищены • ст. 438 ГК РФ
          </span>
        </div>
      </div>
    </div>
  );
}
