import React from 'react';

interface WidgetCardSkeletonProps {
  title?: string;
  rows?: number;
}

export function WidgetCardSkeleton({ title, rows = 5 }: WidgetCardSkeletonProps) {
  return (
    <div
      data-testid="widget-skeleton"
      className="bg-card text-card-foreground rounded-lg p-5 border border-border/70 shadow-sm flex flex-col justify-between space-y-4 animate-pulse min-h-[340px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-muted/60" />
          <div className="space-y-1.5">
            {title ? (
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">
                {title}
              </h4>
            ) : (
              <div className="h-3 w-36 bg-muted/60 rounded" />
            )}
            <div className="h-2 w-52 bg-muted/40 rounded" />
          </div>
        </div>
        <div className="h-3 w-16 bg-muted/40 rounded" />
      </div>

      {/* Content List Placeholder */}
      <div className="divide-y divide-border/40 space-y-2.5">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="pt-2.5 first:pt-0 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-6 h-6 rounded-full bg-muted/50 shrink-0" />
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="h-3 bg-muted/60 rounded w-2/5" />
                <div className="h-2 bg-muted/40 rounded w-3/5" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="h-3 w-16 bg-muted/60 rounded" />
              <div className="h-2 w-12 bg-muted/40 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WidgetPairSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
      <div className="lg:col-span-6">
        <WidgetCardSkeleton />
      </div>
      <div className="lg:col-span-6">
        <WidgetCardSkeleton />
      </div>
    </div>
  );
}
