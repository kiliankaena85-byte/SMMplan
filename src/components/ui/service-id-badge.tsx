'use client';

import React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

export interface ServiceIdBadgeProps {
  numericId?: number | null;
  showProviderId?: boolean;
  providerId?: string | number | null;
  href?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}

export function ServiceIdBadge({
  numericId,
  showProviderId = false,
  providerId,
  href,
  className = '',
  size = 'sm',
}: ServiceIdBadgeProps) {
  const hasNumeric = numericId !== undefined && numericId !== null;
  const hasProvider = providerId !== undefined && providerId !== null && String(providerId).trim() !== '';

  if (!hasNumeric && !hasProvider) {
    return null;
  }

  const idToCopy = hasNumeric ? String(numericId) : String(providerId);

  const copyId = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(idToCopy);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = idToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      toast.success(`ID услуги #${idToCopy} скопирован`);
    } catch {
      toast.error('Не удалось скопировать ID');
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyId();
  };

  const sizeClasses = {
    xs: 'text-[9px] px-1 py-0.2 rounded',
    sm: 'text-[10px] px-1.5 py-0.5 rounded-md',
    md: 'text-xs px-2 py-0.5 rounded-md',
  }[size];

  const commonClasses = `inline-flex items-center gap-1 font-mono font-bold transition-all duration-150 select-all cursor-pointer border border-border/60 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground active:scale-95 ${sizeClasses} ${className}`;

  const innerContent = (
    <>
      <span>#{hasNumeric ? numericId : providerId}</span>
      {hasNumeric && showProviderId && providerId && (
        <span className="opacity-70 text-[9px] font-normal">
          • ext: {providerId}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={handleClick}
        className={commonClasses}
        title={`Перейти в каталог: услуга #${numericId} (клик также скопирует ID)`}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <span
      onClick={handleClick}
      className={commonClasses}
      title="Нажмите, чтобы скопировать ID услуги"
    >
      {innerContent}
    </span>
  );
}
