'use client';

import React from 'react';
import Link from 'next/link';
import { RotateCw } from 'lucide-react';

interface RepeatOrderButtonProps {
  serviceId: string;
  categoryId: string;
  link: string | null;
  quantity: number;
  remains?: number | null;
  status?: string;
  className?: string;
}

export function RepeatOrderButton({ 
  serviceId, 
  categoryId, 
  link, 
  quantity, 
  remains, 
  status, 
  className = "" 
}: RepeatOrderButtonProps) {
  const params = new URLSearchParams();
  if (serviceId) params.set('reorderServiceId', serviceId);
  if (categoryId) params.set('reorderCategoryId', categoryId);
  if (link) params.set('reorderLink', link);

  // If order was PARTIAL and has positive remains, repeat specifically the недовыполненный остаток
  const targetQty = (status === 'PARTIAL' && typeof remains === 'number' && remains > 0)
    ? remains
    : quantity;

  if (targetQty) params.set('reorderQty', targetQty.toString());
  if (status === 'PARTIAL' && typeof remains === 'number' && remains > 0) {
    params.set('reorderPartial', 'true');
  }

  return (
    <Link
      href={`/dashboard/new-order?${params.toString()}`}
      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground bg-muted hover:bg-primary/10 hover:text-primary border border-border rounded-lg transition-colors ${className}`}
      title="Повторить заказ"
    >
      <RotateCw className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Повторить</span>
    </Link>
  );
}
