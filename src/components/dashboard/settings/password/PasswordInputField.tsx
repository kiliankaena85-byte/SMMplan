'use client';

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  onToggleShowPassword?: () => void;
}

export function PasswordInputField({
  id,
  label,
  value,
  onChange,
  placeholder = '••••••••',
  required = true,
  showPasswordToggle = false,
  showPassword = false,
  onToggleShowPassword,
}: PasswordInputFieldProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="block text-xs font-bold text-muted-foreground uppercase tracking-wider"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={showPasswordToggle && showPassword ? 'text' : 'password'}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full text-base sm:text-sm border border-border/80 rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-background/50 hover:bg-background/80 transition-all duration-200 min-h-[44px] ${
            showPasswordToggle ? 'pr-11' : ''
          }`}
        />
        {showPasswordToggle && onToggleShowPassword && (
          <button
            type="button"
            onClick={onToggleShowPassword}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
