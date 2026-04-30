'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import React from 'react';

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  confirmMessage?: string;
}

export function SubmitButton({ 
  children, 
  variant = 'default', 
  size = 'default',
  className = '', 
  confirmMessage,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button 
      type="submit" 
      intent={variant === 'default' ? 'primary' : variant as any}
      size={size as any}
      className={className} 
      disabled={pending || props.disabled}
      onClick={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          e.preventDefault();
        }
        props.onClick?.(e);
      }}
      {...props}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Выполняется...</span>
        </span>
      ) : (
        children
      )}
    </Button>
  );
}
