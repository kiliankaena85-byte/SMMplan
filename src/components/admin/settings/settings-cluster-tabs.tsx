'use client';

import * as React from 'react';
import Link from 'next/link';
import { 
  Store, 
  CreditCard, 
  ShieldCheck, 
  Settings, 
  Database, 
  Link as LinkIcon, 
  Bot, 
  Server, 
  Users, 
  MessageSquare, 
  History 
} from 'lucide-react';

export type SettingsMasterCluster = 'showcase' | 'integrations' | 'security';

export interface SettingsSubTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export interface SettingsClusterConfig {
  id: SettingsMasterCluster;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  subTabs: SettingsSubTab[];
}

export const SETTINGS_CLUSTERS: SettingsClusterConfig[] = [
  {
    id: 'showcase',
    label: 'Магазин и Каталог',
    icon: Store,
    description: 'Брендинг, витрина, правила наценок и курс ЦБ РФ',
    subTabs: [
      { id: 'system', label: 'Бренд и Витрина', icon: Settings, description: 'Название, логотип, режим техработ, 152-ФЗ' },
      { id: 'catalog', label: 'Каталог и Цены', icon: Database, description: 'Наценки, курс ЦБ РФ, карантин цен' },
    ],
  },
  {
    id: 'integrations',
    label: 'Платежи и Каналы',
    icon: CreditCard,
    description: 'Эквайринг (ЮKassa/Robo/Crypto), Telegram и прокси',
    subTabs: [
      { id: 'integrations', label: 'Кассы и Шлюзы', icon: LinkIcon, description: 'ЮKassa, Robokassa, CryptoBot, Gemini AI, Email' },
      { id: 'telegram', label: 'Telegram Бот', icon: Bot, description: 'Токен, вебхуки, авто-ответчик, рассылки' },
      { id: 'proxy', label: 'Прокси провайдеров', icon: Server, description: 'SOCKS5/HTTP прокси и ротация' },
    ],
  },
  {
    id: 'security',
    label: 'Команда и Доступ',
    icon: ShieldCheck,
    description: 'Сотрудники, роли RBAC, шаблоны и журнал аудита',
    subTabs: [
      { id: 'team', label: 'Команда и RBAC', icon: Users, description: 'Сотрудники, роли, лимиты саппорта' },
      { id: 'templates', label: 'Шаблоны ответов', icon: MessageSquare, description: 'Быстрые ответы и шорткаты саппорта' },
      { id: 'audit', label: 'Журнал аудита', icon: History, description: 'Неизменяемый лог действий персонала' },
    ],
  },
];

/**
 * 🛡️ Helper: Resolves which master cluster and sub-tab should be active.
 * Guarantees 100% backwards compatibility with legacy `?tab=proxy`, `?tab=team`, etc.
 */
export function resolveSettingsNavigation(rawTab?: string | null): {
  activeCluster: SettingsMasterCluster;
  activeSubTab: string;
} {
  const tab = (rawTab || 'system').toLowerCase();

  for (const cluster of SETTINGS_CLUSTERS) {
    const matchingSubTab = cluster.subTabs.find(st => st.id === tab);
    if (matchingSubTab) {
      return {
        activeCluster: cluster.id,
        activeSubTab: matchingSubTab.id,
      };
    }
  }

  // Fallback defaults
  return {
    activeCluster: 'showcase',
    activeSubTab: 'system',
  };
}

interface SettingsClusterTabsProps {
  activeTab: string;
}

export function SettingsClusterTabs({ activeTab }: SettingsClusterTabsProps) {
  const { activeCluster, activeSubTab } = resolveSettingsNavigation(activeTab);

  const currentClusterConfig = SETTINGS_CLUSTERS.find(c => c.id === activeCluster) || SETTINGS_CLUSTERS[0];

  return (
    <div className="space-y-4">
      {/* ── LEVEL 1: Master Clusters (3 Segmented Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1.5 bg-muted/20 border border-border/80 rounded-2xl">
        {SETTINGS_CLUSTERS.map((cluster) => {
          const Icon = cluster.icon;
          const isSelected = cluster.id === activeCluster;
          // When clicking a master cluster, default to its first sub-tab
          const targetHref = `?tab=${cluster.subTabs[0].id}`;

          return (
            <Link
              key={cluster.id}
              href={targetHref}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-card text-foreground shadow-sm border border-border font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/40 border border-transparent'
              }`}
            >
              <div className={`p-2 rounded-lg border shrink-0 transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-muted/60 text-muted-foreground border-border/40'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs uppercase tracking-wider truncate">
                    {cluster.label}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                    isSelected
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-muted text-muted-foreground border-border/30'
                  }`}>
                    {cluster.subTabs.length}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground font-normal truncate mt-0.5">
                  {cluster.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── LEVEL 2: Sub-tabs within the Active Cluster ── */}
      <div className="flex items-center gap-1.5 border-b border-border/60 pb-2 overflow-x-auto no-scrollbar snap-x">
        {currentClusterConfig.subTabs.map((subTab) => {
          const SubIcon = subTab.icon;
          const isSubActive = subTab.id === activeSubTab;

          return (
            <Link
              key={subTab.id}
              href={`?tab=${subTab.id}`}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all shrink-0 snap-start cursor-pointer border ${
                isSubActive
                  ? 'bg-primary/10 text-primary border-primary/30 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 border-transparent'
              }`}
              title={subTab.description}
            >
              <SubIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{subTab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
