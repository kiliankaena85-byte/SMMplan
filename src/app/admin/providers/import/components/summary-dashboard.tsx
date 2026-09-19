'use client';

import React from 'react';
import { Package, Sparkles, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SummaryDashboardProps {
  totalInCache: number;
  newServices: number;
  aiReady: number;
  needsAttention: number;
  alreadyImported: number;
  selectedCount: number;
  markup: string;
  onMarkupChange: (val: string) => void;
  onImport: () => void;
  onResync: () => void;
  importDisabled: boolean;
  syncing: boolean;
  importProgress: { current: number; total: number } | null;
  providerName: string;
  activeTab?: 'all' | 'ready' | 'attention' | 'selected';
  onTabChange?: (tab: 'all' | 'ready' | 'attention' | 'selected') => void;
}

function formatMarkupHint(markupStr: string): string {
  const p = parseFloat(markupStr);
  if (isNaN(p) || p < 0) return '×3.0';
  if (p === 0) return 'авто';
  const m = Math.round((1 + p / 100) * 100) / 100;
  return '×' + m.toFixed(2).replace(/.?0+$/, '');
}

interface TabCardProps {
  active: boolean; onClick?: () => void; title: string; icon: React.ReactNode;
  label: string; value: number; sub: string; colorClass: string; activeClass: string; inactiveClass: string;
}

function TabCard({ active, onClick, title, icon, label, value, sub, colorClass, activeClass, inactiveClass }: TabCardProps) {
  return (
    <div
      onClick={onClick}
      title={title}
      className={`rounded-xl p-3 border transition-all duration-150 cursor-pointer ${active ? activeClass : inactiveClass}`}
    >
      <div className={`flex items-center gap-1.5 ${colorClass} mb-1`}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-xl font-bold tabular-nums ${colorClass}`}>{value}</span>
        <span className="text-[10px] opacity-70">{sub}</span>
      </div>
    </div>
  );
}

export function SummaryDashboard({
  totalInCache,
  aiReady,
  needsAttention,
  alreadyImported,
  selectedCount,
  markup,
  onMarkupChange,
  onImport,
  onResync,
  importDisabled,
  syncing,
  importProgress,
  providerName,
  activeTab = 'all',
  onTabChange,
}: SummaryDashboardProps) {
  return (
    <div className="relative overflow-hidden bg-card/60 backdrop-blur-md border border-border/50 rounded-[20px] p-5 shadow-xs space-y-5 ring-1 ring-border/5">
      <div className="absolute inset-0 z-0 opacity-70 premium-dot-grid pointer-events-none" />
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{providerName}</h3>
            <p className="text-[11px] text-muted-foreground">
              {alreadyImported > 0 ? `${alreadyImported} услуг уже импортировано` : 'Каталог готов к импорту'}
            </p>
          </div>
        </div>
        <Button
          intent="outline"
          size="sm"
          onClick={onResync}
          disabled={syncing}
          className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer h-8 px-3"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Синхронизация...' : 'Обновить каталог'}
        </Button>
      </div>

      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <TabCard
          active={activeTab === 'all'}
          onClick={() => onTabChange?.('all')}
          title="Показать все услуги в текущем каталоге"
          icon={<Package className="w-3.5 h-3.5 text-primary" />}
          label="Все услуги"
          value={totalInCache}
          sub="в каталоге"
          colorClass="text-foreground"
          activeClass="bg-muted/80 ring-2 ring-primary/40 border-primary/50 shadow-xs"
          inactiveClass="bg-muted/30 border-border/60 hover:bg-muted/50"
        />
        <TabCard
          active={activeTab === 'ready'}
          onClick={() => onTabChange?.('ready')}
          title="Показать услуги с сопоставленной категорией на странице"
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          label="Готовы к импорту"
          value={aiReady}
          sub="на странице"
          colorClass="text-success"
          activeClass="bg-success/15 ring-2 ring-success/40 border-success/50 shadow-xs"
          inactiveClass="bg-success/5 border-success/20 hover:bg-success/10"
        />
        <TabCard
          active={activeTab === 'attention'}
          onClick={() => onTabChange?.('attention')}
          title="Показать услуги без категории на текущей странице"
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          label="Без категории"
          value={needsAttention}
          sub="на странице"
          colorClass="text-warning"
          activeClass="bg-warning/15 ring-2 ring-warning/40 border-warning/50 shadow-xs"
          inactiveClass="bg-warning/5 border-warning/20 hover:bg-warning/10"
        />
        <TabCard
          active={activeTab === 'selected'}
          onClick={() => onTabChange?.('selected')}
          title="Показать все выбранные услуги (со всех страниц)"
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="Выбрано"
          value={selectedCount}
          sub="всего к импорту"
          colorClass="text-primary"
          activeClass="bg-primary/15 ring-2 ring-primary/40 border-primary/50 shadow-xs"
          inactiveClass="bg-primary/5 border-primary/20 hover:bg-primary/10"
        />
      </div>

      <div className="relative z-10 flex flex-wrap items-end gap-4 pt-2 border-t border-border/50">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">
            Наценка (%)
          </label>
          <Input
            type="number"
            step="1"
            min="0"
            max="900"
            value={markup}
            onChange={(e) => onMarkupChange(e.target.value)}
            className="w-28 h-9 text-xs tabular-nums"
          />
          <p className="text-[10px] text-muted-foreground">
            {formatMarkupHint(markup)} · 0 = авто
          </p>
        </div>

        <Button
          intent="primary"
          onClick={onImport}
          disabled={importDisabled}
          className="h-9 px-5 font-semibold text-xs cursor-pointer"
        >
          {importProgress !== null ? (
            <>
              <span className="animate-spin text-xs">⏳</span>
              Импорт: {importProgress.current} / {importProgress.total}
            </>
          ) : (
            <>📥 Импортировать выбранные ({selectedCount})</>
          )}
        </Button>
      </div>
    </div>
  );
}
