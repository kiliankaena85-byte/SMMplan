'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface FilterOption {
  id: string;
  label: string;
}

interface FilterDropdownProps {
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  icon?: React.ReactNode;
}

export function FilterDropdown({
  value,
  options,
  onChange,
  placeholder = 'Выбрать...',
  className = '',
  ariaLabel,
  icon,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedOption = options.find((o) => o.id === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className="relative inline-block text-left shrink-0" ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownStyle({
              position: 'fixed',
              top: rect.bottom + 4,
              left: rect.left,
              minWidth: Math.max(160, rect.width),
              maxWidth: 240,
              zIndex: 200,
            });
          }
          setIsOpen((prev) => !prev);
        }}
        className={`h-8 px-2.5 text-xs font-semibold bg-card/90 hover:bg-card text-foreground border border-border/70 hover:border-primary/40 rounded-xl flex items-center justify-between gap-1.5 transition-all cursor-pointer shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-primary/20 select-none ${className}`}
      >
        <span className="truncate flex items-center gap-1.5 text-foreground min-w-0">
          {icon}
          <span className="truncate min-w-0">{displayLabel}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {isOpen && mounted && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={dropdownStyle}
          className="max-h-[280px] overflow-y-auto overflow-x-hidden bg-card/95 backdrop-blur-md border border-border/80 rounded-xl shadow-xl py-1 text-xs focus:outline-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          {options.map((opt) => {
            const isSelected = opt.id === value;
            return (
              <button
                key={opt.id}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between gap-2 hover:bg-primary/10 transition-colors cursor-pointer text-xs font-medium ${
                  isSelected ? 'bg-primary/15 text-primary font-bold' : 'text-foreground'
                }`}
              >
                <span className="truncate min-w-0">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
