'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  User, 
  Settings, 
  Keyboard, 
  Moon, 
  Sun, 
  ArrowLeft, 
  LogOut, 
  Volume2, 
  VolumeX, 
  ChevronDown, 
  ShieldCheck, 
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useShortcuts } from './shortcuts-provider';
import { toast } from 'sonner';
import { soundManager } from '@/utils/sound';

interface AdminProfileDropdownProps {
  userEmail: string;
  role: string;
  roleLabel: string;
  roleColor?: string;
}

export function AdminProfileDropdown({
  userEmail,
  role,
  roleLabel,
  roleColor,
}: AdminProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { setIsHelpOpen } = useShortcuts();

  // Workspace Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    try {
      const savedSound = localStorage.getItem('admin_sound_notifications');
      if (savedSound !== null) setSoundEnabled(savedSound === 'true');
      const savedCompact = localStorage.getItem('admin_compact_density');
      if (savedCompact !== null) setCompactMode(savedCompact === 'true');
    } catch {}
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('admin_sound_notifications', String(next));
      if (next) {
        soundManager.playNotificationChime();
        toast.success('Звуковые алерты включены (тестовый сигнал сыгран)');
      } else {
        toast.success('Звуковые алерты отключены');
      }
    } catch {}
  };

  const toggleCompact = () => {
    const next = !compactMode;
    setCompactMode(next);
    try {
      localStorage.setItem('admin_compact_density', String(next));
      toast.success(next ? 'Включен компактный режим таблиц' : 'Включен стандартный режим таблиц');
    } catch {}
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = userEmail.slice(0, 2).toUpperCase();
  const isDark = theme?.includes('dark') || theme === 'dark';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl border border-border/60 bg-card/80 hover:bg-muted/80 backdrop-blur-md transition-all duration-200 cursor-pointer shadow-xs group"
        aria-label="Профиль администратора и настройки"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary font-black text-xs flex items-center justify-center shadow-xs">
          {initials}
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-bold text-foreground leading-tight max-w-[120px] truncate">
            {userEmail.split('@')[0]}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {roleLabel}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-border/40">
          {/* User Header */}
          <div className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-foreground truncate" title={userEmail}>
                  {userEmail}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${roleColor || 'bg-primary/10 text-primary border-primary/20'}`}>
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="py-2 px-1 space-y-1">
            <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
              Рабочее место
            </div>

            {/* Hotkeys Modal Trigger */}
            <button
              onClick={() => {
                setIsOpen(false);
                setIsHelpOpen(true);
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-primary" />
                Горячие клавиши
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-muted border border-border rounded">
                ?
              </kbd>
            </button>

            {/* Sound Alerts Toggle */}
            <button
              onClick={toggleSound}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
                Звук уведомлений
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${soundEnabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                {soundEnabled ? 'Вкл' : 'Выкл'}
              </span>
            </button>

            {/* Density Toggle */}
            <button
              onClick={toggleCompact}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-sky-500" />
                Компактность таблиц
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${compactMode ? 'bg-sky-500/10 text-sky-600' : 'bg-muted text-muted-foreground'}`}>
                {compactMode ? 'Компакт' : 'Стандарт'}
              </span>
            </button>

            {/* Dark / Light Theme Toggle */}
            <button
              onClick={() => setTheme(isDark ? 'sky-light' : 'sky-dark')}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" />
                )}
                Тема оформления
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                {isDark ? 'Тёмная' : 'Светлая'}
              </span>
            </button>
          </div>

          {/* Navigation & Logout Links */}
          <div className="py-2 px-1 space-y-1">
            <Link
              href="/dashboard/new-order"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              В кабинет клиента
            </Link>

            <Link
              href="/admin/staff"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-primary" />
              Сотрудники и смены
            </Link>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                Выйти из системы
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
