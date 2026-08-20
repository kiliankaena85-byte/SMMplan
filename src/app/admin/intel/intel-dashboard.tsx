'use client';

import React, { useState } from 'react';
import type {
  ServiceCompetitorComparison,
  CompetitorProfile,
} from '@/services/admin/market-intelligence.service';
import { addCustomCompetitorAction } from '@/actions/admin/market-intelligence';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ShieldCheck, TrendingUp, Search, Plus, ExternalLink, RefreshCw } from 'lucide-react';
import { formatPricePerUnit } from '@/utils/format-price';

interface IntelDashboardProps {
  initialComparisons: ServiceCompetitorComparison[];
  initialCompetitors: CompetitorProfile[];
  executiveSummary: string;
}

export function IntelDashboard({
  initialComparisons,
  initialCompetitors,
  executiveSummary,
}: IntelDashboardProps) {
  const [comparisons] = useState<ServiceCompetitorComparison[]>(initialComparisons);
  const [competitors, setCompetitors] = useState<CompetitorProfile[]>(initialCompetitors);
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('ALL');

  // Modal for adding custom competitor
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompUrl, setNewCompUrl] = useState('');
  const [newCompTgSubPrice, setNewCompTgSubPrice] = useState('0.75');
  const [newCompVkSubPrice, setNewCompVkSubPrice] = useState('0.85');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredComparisons = comparisons.filter((c) => {
    const matchesSearch = c.serviceName.toLowerCase().includes(search.toLowerCase());
    if (filterPlatform === 'ALL') return matchesSearch;
    if (filterPlatform === 'TG') return matchesSearch && c.serviceName.toLowerCase().includes('telegram');
    if (filterPlatform === 'VK') return matchesSearch && c.serviceName.toLowerCase().includes('vk');
    if (filterPlatform === 'IG') return matchesSearch && c.serviceName.toLowerCase().includes('instagram');
    if (filterPlatform === 'YT') return matchesSearch && c.serviceName.toLowerCase().includes('youtube');
    return matchesSearch;
  });

  // Highlight direct competitor (PrimeLike)
  const primeLike = competitors.find((c) => c.slug === 'primelike' || c.isPrimaryDirectCompetitor);

  async function handleAddCompetitor(e: React.FormEvent) {
    e.preventDefault();
    if (!newCompName.trim() || !newCompUrl.trim()) {
      toast.error('Укажите название и URL конкурента');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addCustomCompetitorAction({
        name: newCompName.trim(),
        url: newCompUrl.trim(),
        pricingMatrix: {
          tg_subscribers_standard: parseFloat(newCompTgSubPrice) || 0.75,
          vk_subscribers_hq: parseFloat(newCompVkSubPrice) || 0.85,
        },
      });

      if (res.success && res.competitor) {
        toast.success(`Конкурент ${res.competitor.name} успешно добавлен в радар!`);
        setCompetitors((prev) => [...prev, res.competitor!]);
        setIsAddOpen(false);
        setNewCompName('');
        setNewCompUrl('');
      } else {
        toast.error(res.error || 'Ошибка добавления');
      }
    } catch {
      toast.error('Произошла ошибка при сохранении');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: AI Executive Summary */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-card border border-primary/20 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center text-2xl font-bold shadow-sm shrink-0">
              🛰️
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">AI Executive Summary: Радар рынка</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-semibold border border-success/20">
                  Прямой фокус: PrimeLike
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                {executiveSummary}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Button
              intent="primary"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Добавить конкурента
            </Button>
          </div>
        </div>
      </div>

      {/* Competitors Profile Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {competitors.map((comp) => {
          const isDirect = comp.slug === 'primelike' || comp.isPrimaryDirectCompetitor;
          return (
            <div
              key={comp.id}
              className={`p-4 rounded-2xl border transition-all duration-200 ${
                isDirect
                  ? 'bg-primary/5 border-primary/30 shadow-sm ring-1 ring-primary/20'
                  : 'bg-card border-border/80 hover:border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  {comp.name}
                  {isDirect && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                      Прямой
                    </span>
                  )}
                </span>
                <a
                  href={comp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary p-1 rounded-lg hover:bg-muted"
                  title="Открыть сайт"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-[11px]">Статус мониторинга:</span>
                <span className="text-success font-semibold flex items-center gap-1 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Активен
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск по услугам..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-muted/50 border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
        </div>

        {/* Platform filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {[
            { key: 'ALL', label: 'Все' },
            { key: 'TG', label: 'Telegram' },
            { key: 'VK', label: 'ВКонтакте' },
            { key: 'IG', label: 'Instagram' },
            { key: 'YT', label: 'YouTube' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterPlatform(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                filterPlatform === tab.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comparisons Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Услуга каталога</th>
                <th className="py-3 px-3">Наша цена</th>
                <th className="py-3 px-3">PrimeLike</th>
                <th className="py-3 px-3">Дельта к PrimeLike</th>
                <th className="py-3 px-3">Средняя по рынку</th>
                <th className="py-3 px-3">Статус лидерства</th>
                <th className="py-3 px-4">Возможность оптимизации</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredComparisons.map((item) => (
                <tr key={item.serviceName} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground max-w-xs">
                    {item.serviceName}
                  </td>
                  <td className="py-3 px-3 font-bold text-primary whitespace-nowrap">
                    {formatPricePerUnit(item.ourPriceRub)} ₽
                  </td>
                  <td className="py-3 px-3 font-semibold text-foreground whitespace-nowrap">
                    {item.primeLikePriceRub !== null ? `${formatPricePerUnit(item.primeLikePriceRub)} ₽` : '—'}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {item.primeLikeDeltaPercent !== null ? (
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                          item.primeLikeDeltaPercent < 0
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {item.primeLikeDeltaPercent < 0
                          ? `${item.primeLikeDeltaPercent}% (Выгоднее)`
                          : `+${item.primeLikeDeltaPercent}%`}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                    {formatPricePerUnit(item.marketAverageRub)} ₽
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20">
                      Лидер по цене
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground leading-relaxed text-[11px]">
                    {item.profitOptimizationAdvice.narrative}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Competitor Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-base">Добавить конкурента в радар</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCompetitor} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Название сервиса</label>
                <input
                  type="text"
                  placeholder="Например: SmmCode"
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  required
                  className="w-full p-2.5 text-xs rounded-xl bg-muted/40 border border-border text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">URL сайта</label>
                <input
                  type="url"
                  placeholder="https://smmcode.ru"
                  value={newCompUrl}
                  onChange={(e) => setNewCompUrl(e.target.value)}
                  required
                  className="w-full p-2.5 text-xs rounded-xl bg-muted/40 border border-border text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Цена TG Подписчики (₽)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCompTgSubPrice}
                    onChange={(e) => setNewCompTgSubPrice(e.target.value)}
                    className="w-full p-2 text-xs rounded-xl bg-muted/40 border border-border text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Цена VK Подписчики (₽)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCompVkSubPrice}
                    onChange={(e) => setNewCompVkSubPrice(e.target.value)}
                    className="w-full p-2 text-xs rounded-xl bg-muted/40 border border-border text-foreground"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  intent="outline"
                  size="sm"
                  onClick={() => setIsAddOpen(false)}
                >
                  Отмена
                </Button>
                <Button type="submit" intent="primary" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
