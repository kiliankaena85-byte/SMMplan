'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Command, 
  Keyboard, 
  X, 
  RotateCcw, 
  XCircle, 
  CheckCircle, 
  Search, 
  Filter, 
  Layers, 
  Moon, 
  ArrowLeftRight 
} from 'lucide-react';

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Навигация' | 'Заказы' | 'Каталог' | 'Система';
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['⌘', 'K'], description: 'Открыть командную палитру (Command Menu)', category: 'Навигация' },
  { keys: ['?'], description: 'Открыть эту справку по горячим клавишам', category: 'Навигация' },
  { keys: ['Esc'], description: 'Закрыть модальное окно / шторку заказа', category: 'Навигация' },
  { keys: ['Alt', 'R'], description: 'Перезапустить ошибочный заказ', category: 'Заказы' },
  { keys: ['Alt', 'C'], description: 'Отменить заказ с возвратом средств', category: 'Заказы' },
  { keys: ['Alt', 'M'], description: 'Ручной перезапуск (Failover)', category: 'Заказы' },
  { keys: ['Shift', 'Клик'], description: 'Выбрать диапазон строк в таблице', category: 'Каталог' },
  { keys: ['/', 'S'], description: 'Фокус в строку поиска каталога', category: 'Каталог' },
];

export function ShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore when typing inside form inputs
    const target = e.target as HTMLElement | null;
    const isInput = target && (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.tagName === 'SELECT' || 
      target.isContentEditable
    );

    if (isInput) return;

    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const categories = ['Навигация', 'Заказы', 'Каталог'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm transition-opacity" 
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl p-6 overflow-hidden ring-1 ring-border/10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight text-foreground">
                Горячие клавиши (Shortcuts)
              </h3>
              <p className="text-xs text-muted-foreground font-medium">
                Быстрое управление админ-панелью с клавиатуры
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Закрыть справку"
            className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List by Categories */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {categories.map((cat) => {
            const items = SHORTCUTS.filter((s) => s.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/80 px-1">
                  {cat}
                </span>
                <div className="bg-muted/30 border border-border/40 rounded-xl divide-y divide-border/30 overflow-hidden">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                      <span className="text-foreground font-medium">{item.description}</span>
                      <div className="flex items-center gap-1 shrink-0 ml-3">
                        {item.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className="px-2 py-1 text-[11px] font-mono font-bold bg-background border border-border/60 rounded-md text-foreground shadow-sm tabular-nums"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Нажмите <kbd className="px-1.5 py-0.5 font-mono bg-background border border-border rounded text-[10px]">Esc</kbd> чтобы закрыть</span>
          <span className="font-semibold text-primary">SMMplan Pro Ergonomics</span>
        </div>
      </div>
    </div>
  );
}
