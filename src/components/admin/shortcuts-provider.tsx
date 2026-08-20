'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShortcutsModal } from './shortcuts-modal';

export interface HotkeyConfig {
  id: string;
  keys: string[];
  label: string;
  path?: string;
  actionId?: string;
  category: 'Навигация' | 'Заказы' | 'Каталог' | 'Система';
}

export const DEFAULT_HOTKEYS: HotkeyConfig[] = [
  { id: 'go_orders', keys: ['g', 'o'], label: 'Перейти в Заказы', path: '/admin/orders', category: 'Навигация' },
  { id: 'go_providers', keys: ['g', 'p'], label: 'Перейти к Провайдерам', path: '/admin/providers', category: 'Навигация' },
  { id: 'go_tickets', keys: ['g', 't'], label: 'Перейти в Тикеты', path: '/admin/tickets', category: 'Навигация' },
  { id: 'go_staff', keys: ['g', 's'], label: 'Перейти к Сотрудникам', path: '/admin/staff', category: 'Навигация' },
  { id: 'go_clients', keys: ['g', 'c'], label: 'Перейти к Клиентам', path: '/admin/clients', category: 'Навигация' },
  { id: 'go_catalog', keys: ['g', 'k'], label: 'Перейти в Каталог', path: '/admin/catalog', category: 'Навигация' },
  { id: 'go_finance', keys: ['g', 'f'], label: 'Перейти в Биллинг', path: '/admin/finance', category: 'Навигация' },
  { id: 'go_settings', keys: ['g', 'e'], label: 'Перейти в Настройки', path: '/admin/settings', category: 'Навигация' },
  { id: 'open_search', keys: ['/'], label: 'Фокус в строку поиска таблицы', actionId: 'focus_search', category: 'Навигация' },
  { id: 'help_modal', keys: ['?'], label: 'Справка по горячим клавишам', actionId: 'toggle_help', category: 'Система' },
];

interface ShortcutsContextType {
  hotkeysEnabled: boolean;
  setHotkeysEnabled: (val: boolean) => void;
  hotkeys: HotkeyConfig[];
  updateHotkey: (id: string, newKeys: string[]) => void;
  resetHotkeys: () => void;
  isHelpOpen: boolean;
  setIsHelpOpen: (val: boolean) => void;
}

const ShortcutsContext = createContext<ShortcutsContextType | undefined>(undefined);

export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [hotkeysEnabled, setHotkeysEnabled] = useState(true);
  const [hotkeys, setHotkeys] = useState<HotkeyConfig[]>(DEFAULT_HOTKEYS);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [lastKey, setLastKey] = useState<{ key: string; time: number } | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const savedEnabled = localStorage.getItem('admin_hotkeys_enabled');
      if (savedEnabled !== null) {
        setHotkeysEnabled(savedEnabled === 'true');
      }
      const savedHotkeys = localStorage.getItem('admin_custom_hotkeys');
      if (savedHotkeys) {
        setHotkeys(JSON.parse(savedHotkeys));
      }
    } catch {}
  }, []);

  const saveHotkeys = (updated: HotkeyConfig[]) => {
    setHotkeys(updated);
    try {
      localStorage.setItem('admin_custom_hotkeys', JSON.stringify(updated));
    } catch {}
  };

  const updateHotkey = (id: string, newKeys: string[]) => {
    const updated = hotkeys.map((h) => (h.id === id ? { ...h, keys: newKeys } : h));
    saveHotkeys(updated);
  };

  const resetHotkeys = () => {
    saveHotkeys(DEFAULT_HOTKEYS);
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!hotkeysEnabled) return;

      // Ignore when typing inside form inputs
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isInput) return;

      const now = Date.now();
      
      // Normalize key using physical e.code (e.g., KeyG -> 'g') so Russian layout works 100% reliably
      const normalizedKey = e.code.startsWith('Key') 
        ? e.code.slice(3).toLowerCase() 
        : e.code === 'Slash' 
          ? '/' 
          : e.key.toLowerCase();

      // Check for single-key actions (Help '?' or Search '/')
      if (e.key === '?' || (e.shiftKey && e.code === 'Slash') || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
        return;
      }

      if (normalizedKey === '/' || e.code === 'Slash') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"][placeholder*="Поиск"]') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // Check two-key sequences (e.g., 'g' then 'o')
      if (lastKey && now - lastKey.time < 1200) {
        const sequence = [lastKey.key, normalizedKey];
        const match = hotkeys.find(
          (h) => h.keys.length === 2 && h.keys[0] === sequence[0] && h.keys[1] === sequence[1]
        );

        if (match && match.path) {
          e.preventDefault();
          router.push(match.path);
          setLastKey(null);
          return;
        }
      }

      // Record first key of potential sequence ('g' on QWERTY or 'п' on ЙЦУКЕН)
      if (normalizedKey === 'g') {
        setLastKey({ key: 'g', time: now });
      } else {
        setLastKey(null);
      }
    },
    [hotkeysEnabled, hotkeys, lastKey, router]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <ShortcutsContext.Provider
      value={{
        hotkeysEnabled,
        setHotkeysEnabled: (val) => {
          setHotkeysEnabled(val);
          try {
            localStorage.setItem('admin_hotkeys_enabled', String(val));
          } catch {}
        },
        hotkeys,
        updateHotkey,
        resetHotkeys,
        isHelpOpen,
        setIsHelpOpen,
      }}
    >
      {children}
      <ShortcutsModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </ShortcutsContext.Provider>
  );
}

export function useShortcuts() {
  const ctx = useContext(ShortcutsContext);
  if (!ctx) {
    throw new Error('useShortcuts must be used within ShortcutsProvider');
  }
  return ctx;
}
