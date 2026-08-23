'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Layers } from 'lucide-react';

interface CatalogPaginationProps {
  totalCount: number;
  currentCount: number;
  hasMore: boolean;
  nextCursor?: string | null;
  selectedTenant?: string;
}

export function CatalogPagination({
  totalCount,
  currentCount,
  hasMore,
  nextCursor,
  selectedTenant = 'smmplan'
}: CatalogPaginationProps) {
  const searchParams = useSearchParams();

  // Construct URL with all active filters
  const buildNextPageUrl = () => {
    const params = new URLSearchParams();
    
    // 1. Tenant & Cursor
    params.set('tenant', selectedTenant);
    if (nextCursor) params.set('cursor', nextCursor);

    // 2. All filters from URL
    const q = searchParams.get('q');
    const category = searchParams.get('category');
    const platform = searchParams.get('platform');
    const providerId = searchParams.get('providerId');
    const isActive = searchParams.get('isActive');
    const providerStatus = searchParams.get('providerStatus');
    const hideDeleted = searchParams.get('hideDeleted');
    const externalId = searchParams.get('externalId');
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder');

    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (platform) params.set('platform', platform);
    if (providerId) params.set('providerId', providerId);
    if (isActive) params.set('isActive', isActive);
    if (hideDeleted) params.set('hideDeleted', hideDeleted);
    if (providerStatus) params.set('providerStatus', providerStatus);
    if (externalId) params.set('externalId', externalId);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);

    return `/admin/catalog?${params.toString()}`;
  };

  const percentLoaded = totalCount > 0 ? Math.min(100, Math.round((currentCount / totalCount) * 100)) : 100;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
      {/* Counter & Progress */}
      <div className="flex items-center gap-2 font-medium">
        <Layers className="w-3.5 h-3.5 text-primary" />
        <span>
          Показано <strong className="text-foreground">{currentCount}</strong> из <strong className="text-foreground">{totalCount}</strong> услуг ({percentLoaded}%)
        </span>
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div>
          <Link href={buildNextPageUrl()}>
            <Button
              intent="outline"
              size="sm"
              className="bg-background min-h-[36px] px-5 font-bold cursor-pointer hover:bg-muted transition-all active:scale-95 shadow-xs"
            >
              Загрузить ещё 50 услуг...
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
