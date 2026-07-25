'use client';

import { useCatalogManagement } from '@/hooks/admin/use-catalog';
import { Search, Filter, Loader2, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
// import { SocialIcon } from '@/components/ui/social-icon';

import { LovableCatalogGrid } from './lovable-catalog-grid';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import * as React from 'react';

import type { CatalogServiceDTO } from '@/types/catalog.dto';

export function LovableCatalogBento({ 
  services,
  categories,
  providers,
  usdToRub,
  canEdit,
  canSeeRates,
  hasMore,
  nextCursor,
  search,
  categoryId,
  sortBy,
  sortOrder
}: { 
  services: CatalogServiceDTO[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providers: any[],
  usdToRub: number,
  canEdit: boolean,
  canSeeRates: boolean,
  hasMore: boolean,
  nextCursor?: string | null,
  search?: string | null,
  categoryId?: string | null,
  sortBy?: string | null,
  sortOrder?: string | null
}) {
  const { selectedIds: selectedArr, toggleOne } = useCatalogManagement({ initialServices: services });
  const selectedIds = new Set(selectedArr);

  const activeServices = services.filter(s => s.isActive);
  const inactiveServices = services.filter(s => !s.isActive);
  
  // Calculate some stats
  const totalServices = services.length;
  const avgMarkup = services.length > 0 
    ? services.reduce((acc, s) => acc + (s.markup || 0), 0) / services.length 
    : 0;

  // Find some high margin services
  const trending = [...services].sort((a, b) => (b.markup || 0) - (a.markup || 0)).slice(0, 5);

  const handleSelect = (id: string, isSelected: boolean) => {
    // Only toggle if state differs to avoid infinite loops, but toggleOne handles the toggling
    toggleOne(id);
  };
  
  // Calculate prices helper
  const calcDisplayPrice = (rate: number, markup: number) => {
    return rate * markup * usdToRub / 1000;
  };
  
  const calcDisplayCost = (rate: number) => {
    return rate * usdToRub / 1000;
  };

  return (
    <div className="h-full flex flex-col pt-4">
      {/* Sleek Header */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-foreground/90">Catalog <span className="font-semibold text-foreground">Overview</span></h1>
          <p className="text-sm text-muted-foreground/60 mt-1">Manage pricing, providers, and service availability.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
            className="flex items-center gap-2 px-4 py-2 bg-background/50 hover:bg-muted/80 border border-border/40 backdrop-blur-md rounded-2xl text-sm font-medium transition-all shadow-sm"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Cmd + K to Search Catalog</span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center bg-background/50 hover:bg-muted/80 border border-border/40 backdrop-blur-md rounded-2xl transition-all shadow-sm">
            <Filter className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="flex-1 overflow-y-auto pb-10 px-2 custom-scrollbar">
        <div className="grid grid-cols-12 gap-6 max-w-7xl mx-auto">
          
          {/* Main Stat Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-12 md:col-span-8 bg-gradient-to-br from-primary/10 via-background to-background border border-border/40 rounded-[32px] p-8 shadow-sm flex flex-col justify-between"
          >
            <div>
              <h2 className="text-xl font-medium text-foreground mb-1">Total Services</h2>
              <p className="text-sm text-muted-foreground">Across all networks and categories</p>
            </div>
            <div className="mt-8 flex items-end justify-between">
              <span className="text-7xl font-light tracking-tighter text-foreground">{totalServices}</span>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full text-emerald-500 text-sm font-semibold border border-emerald-500/20">
                <TrendingUp className="w-4 h-4" />
                <span>Active: {activeServices.length}</span>
              </div>
            </div>
          </motion.div>

          {/* Average Margin Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-12 md:col-span-4 bg-card border border-border/40 rounded-[32px] p-8 shadow-sm flex flex-col justify-between"
          >
             <div>
              <h2 className="text-xl font-medium text-foreground mb-1">Average Margin</h2>
              <p className="text-sm text-muted-foreground">Global profitability</p>
            </div>
            <div className="mt-8">
              <span className="text-5xl font-light tracking-tighter text-foreground">{avgMarkup.toFixed(1)}%</span>
            </div>
          </motion.div>

          {/* Trending / Top Margin Services */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-12 md:col-span-6 lg:col-span-4 bg-card border border-border/40 rounded-[32px] p-6 shadow-sm flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-foreground">Top Margin Services</h2>
              <button className="text-primary hover:text-primary/80 transition-colors">
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {trending.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between group p-2 rounded-xl hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {i + 1}
                    </div>
                    <span className="text-sm font-medium line-clamp-1 max-w-[150px]">{s.name}</span>
                  </div>
                  <span className="text-sm font-mono text-emerald-500">+{s.markup}%</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Inactive Services Alert */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-12 md:col-span-6 lg:col-span-8 bg-card border border-border/40 rounded-[32px] p-8 shadow-sm flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl" />
            <div>
              <h2 className="text-xl font-medium text-foreground mb-1">Inactive Services</h2>
              <p className="text-sm text-muted-foreground">Require attention or provider sync</p>
            </div>
            <div className="mt-8 flex items-end justify-between">
              <span className="text-6xl font-light tracking-tighter text-foreground">{inactiveServices.length}</span>
              <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 rounded-full text-rose-500 text-sm font-semibold border border-rose-500/20">
                <TrendingDown className="w-4 h-4" />
                <span>Review Needed</span>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Grid */}
        <div className="px-2 mt-8 max-w-7xl mx-auto">
          <LovableCatalogGrid
            services={services}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            canEdit={canEdit}
            canSeeRates={canSeeRates}
            categories={categories}
            providers={providers}
            usdToRub={usdToRub}
            calcDisplayPrice={calcDisplayPrice}
            calcDisplayCost={calcDisplayCost}
            displayCurrency="RUB"
            displayVolume="UNIT"
          />
          
          {/* Pagination / Load More */}
          {hasMore && (
             <div className="flex justify-center pt-8">
               <Link href={`/admin/catalog?cursor=${nextCursor}${categoryId ? `&category=${categoryId}` : ''}${search ? `&q=${search}` : ''}${sortBy ? `&sortBy=${sortBy}` : ''}${sortOrder ? `&sortOrder=${sortOrder}` : ''}`}>
                 <Button intent="outline" size="sm" className="bg-background border-border shadow-sm text-foreground hover:bg-muted/50 rounded-xl">
                   Load More Services...
                 </Button>
               </Link>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
