import React from 'react';

export interface WidgetCardSkeletonProps {
  title?: string;
  rows?: number;
  className?: string;
}

/**
 * Reusable animated widget card skeleton for admin dashboard Suspense boundaries.
 */
export function WidgetCardSkeleton({ title, rows = 4, className = '' }: WidgetCardSkeletonProps) {
  return (
    <div
      data-testid="widget-skeleton"
      className={`bg-card rounded-lg border border-border/70 p-5 space-y-3 shadow-sm animate-pulse ${className}`}
    >
      {title ? (
        <div className="flex justify-between items-center border-b border-border/50 pb-3">
          <span className="font-bold text-xs uppercase tracking-wider text-foreground">
            {title}
          </span>
          <div className="h-4 w-16 bg-muted rounded-md" />
        </div>
      ) : (
        <div className="h-5 w-48 bg-muted rounded-md" />
      )}
      <div className="space-y-2 pt-2">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="h-10 w-full bg-muted/60 rounded-md" />
        ))}
      </div>
    </div>
  );
}

/**
 * Reusable 2-column widget pair skeleton matching dashboard grid layout.
 */
export function WidgetPairSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`grid gap-5 grid-cols-1 lg:grid-cols-2 ${className}`}>
      <WidgetCardSkeleton />
      <WidgetCardSkeleton />
    </div>
  );
}
