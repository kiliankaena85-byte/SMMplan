'use client';

import * as React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface MarketingTabsProps {
  promocodesContent: React.ReactNode;
  referralsContent: React.ReactNode;
}

export function MarketingTabs({ promocodesContent, referralsContent }: MarketingTabsProps) {
  return (
    <Tabs defaultValue="promocodes">
      <TabsList className="bg-muted/50 p-1 rounded-xl border border-border/60 shadow-xs flex w-full sm:w-fit max-w-full overflow-x-auto scrollbar-none flex-nowrap">
        <TabsTrigger value="promocodes" className="rounded-lg px-4 sm:px-5 py-2 sm:py-1.5 font-bold uppercase tracking-wider text-xs shrink-0 whitespace-nowrap">
          Промокоды
        </TabsTrigger>
        <TabsTrigger value="referrals" className="rounded-lg px-4 sm:px-5 py-2 sm:py-1.5 font-bold uppercase tracking-wider text-xs shrink-0 whitespace-nowrap">
          Партнерская программа
        </TabsTrigger>
      </TabsList>

      <TabsContent value="promocodes">
        <div className="pt-4">{promocodesContent}</div>
      </TabsContent>
      <TabsContent value="referrals">
        <div className="pt-4">{referralsContent}</div>
      </TabsContent>
    </Tabs>
  );
}
