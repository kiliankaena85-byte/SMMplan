'use client';

import { useState, useTransition } from 'react';
import { 
  approveQuarantinedService, 
  rejectQuarantinedService, 
  approveAllQuarantined,
  archiveZombieService,
  liftApiBlock
} from '@/actions/admin/providers/sync-action';
import { toast } from 'sonner';
import { Table } from '@/components/admin/hero-ui';

interface QuarantineItem {
  id: string;
  name: string;
  categoryName: string;
  networkSlug: string;
  providerName: string;
  currentRate: number;
  pendingRate: number | null;
  quarantineReason: string;
  quarantinedAt: string;
  externalId: string;
  cooldownUntil: string | null;
}

interface Props {
  initialPriceSpikes: QuarantineItem[];
  initialZombies: QuarantineItem[];
  initialApiErrors: QuarantineItem[];
}

const NETWORK_EMOJI: Record<string, string> = {
  instagram: '📸', telegram: '✈️', youtube: '▶️',
  tiktok: '🎵', vk: '🔵', twitter: '🐦', unknown: '🌐',
};

export function QuarantineClient({ initialPriceSpikes, initialZombies, initialApiErrors }: Props) {
  const [priceSpikes, setPriceSpikes] = useState(initialPriceSpikes);
  const [zombies, setZombies] = useState(initialZombies);
  const [apiErrors, setApiErrors] = useState(initialApiErrors);
  const [activeTab, setActiveTab] = useState<'price' | 'zombies' | 'api'>('price');
  
  const [isPending, startTransition] = useTransition();

  // Price Spikes Actions
  function removePriceSpike(id: string) { setPriceSpikes(prev => prev.filter(i => i.id !== id)); }
  function handleApprove(item: QuarantineItem) {
    startTransition(async () => {
      const result = await approveQuarantinedService(item.id);
      if (result.success) {
        toast.success(`✅ Принято: ${item.name}`);
        removePriceSpike(item.id);
      } else {
        toast.error(result.error ?? 'Ошибка');
      }
    });
  }
  function handleReject(item: QuarantineItem) {
    startTransition(async () => {
      const result = await rejectQuarantinedService(item.id);
      if (result.success) {
        toast.success(`🔄 Отклонено, цена сохранена: ${item.name}`);
        removePriceSpike(item.id);
      } else {
        toast.error('Ошибка');
      }
    });
  }
  function handleApproveAll() {
    startTransition(async () => {
      const result = await approveAllQuarantined();
      if (result.success) {
        toast.success(`✅ Принято ${result.count} услуг`);
        setPriceSpikes([]);
      } else {
        toast.error('Ошибка массового одобрения');
      }
    });
  }

  // Zombies Actions
  function handleArchiveZombie(item: QuarantineItem) {
    startTransition(async () => {
      const result = await archiveZombieService(item.id);
      if (result.success) {
        toast.success(`🧟 Архивировано: ${item.name}`);
        setZombies(prev => prev.filter(i => i.id !== item.id));
      } else {
        toast.error(result.error ?? 'Ошибка архивации');
      }
    });
  }

  // API Block Actions
  function handleLiftApiBlock(item: QuarantineItem) {
    startTransition(async () => {
      const result = await liftApiBlock(item.id);
      if (result.success) {
        toast.success(`🔓 Блокировка снята: ${item.name}`);
        setApiErrors(prev => prev.filter(i => i.id !== item.id));
      } else {
        toast.error(result.error ?? 'Ошибка снятия блокировки');
      }
    });
  }

  // Render Helpers
  function renderEmptyState(title: string, desc: string) {
    return (
      <div className="bg-card border border-border rounded-xl p-16 text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-foreground font-medium">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-border mb-6">
        <button 
          onClick={() => setActiveTab('price')} 
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === 'price' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'}`}>
          Ценовые скачки 
          {priceSpikes.length > 0 && <span className="ml-2 px-1.5 py-0.5 rounded-md bg-warning/20 text-warning text-xs">{priceSpikes.length}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('zombies')} 
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === 'zombies' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'}`}>
          Зомби-услуги 
          {zombies.length > 0 && <span className="ml-2 px-1.5 py-0.5 rounded-md bg-destructive/20 text-destructive text-xs">{zombies.length}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('api')} 
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === 'api' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'}`}>
          Сбои API 
          {apiErrors.length > 0 && <span className="ml-2 px-1.5 py-0.5 rounded-md bg-warning/20 text-warning text-xs">{apiErrors.length}</span>}
        </button>
      </div>

      {/* PRICE SPIKES TAB */}
      {activeTab === 'price' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{priceSpikes.length} услуг ожидают решения</p>
            {priceSpikes.length > 0 && (
              <button onClick={handleApproveAll} disabled={isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-success text-primary-foreground hover:bg-success/90 transition-all duration-200 disabled:opacity-50">
                ✅ Принять все
              </button>
            )}
          </div>
          {priceSpikes.length === 0 ? renderEmptyState('Карантин цен пуст', 'Все ценовые изменения в норме') : (
            <div className="bg-card border border-border rounded-xl overflow-hidden w-full">
              <Table aria-label="Ценовые скачки">
                <Table.ScrollContainer>
                  <Table.Content>
                    <Table.Header>
                      <Table.Column isRowHeader>УСЛУГА</Table.Column>
                      <Table.Column>ПРИЧИНА</Table.Column>
                      <Table.Column className="text-right">ТЕКУЩАЯ</Table.Column>
                      <Table.Column className="text-right">НОВАЯ</Table.Column>
                      <Table.Column className="text-right">ДЕЙСТВИЕ</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {priceSpikes.map(item => {
                        const emoji = NETWORK_EMOJI[item.networkSlug] ?? '🌐';
                        const priceDiff = item.pendingRate !== null ? ((item.pendingRate - item.currentRate) / item.currentRate * 100).toFixed(1) : '—';
                        const isRise = item.pendingRate !== null && item.pendingRate > item.currentRate;
                        return (
                          <Table.Row key={item.id}>
                            <Table.Cell>
                              <div className="flex items-start gap-2">
                                <span className="text-base">{emoji}</span>
                                <div>
                                  <div className="text-sm font-medium text-foreground">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">{item.categoryName} · {item.providerName}</div>
                                </div>
                              </div>
                            </Table.Cell>
                            <Table.Cell><span className="text-xs px-2 py-1 rounded-md bg-warning/10 text-warning border border-warning/20">{item.quarantineReason}</span></Table.Cell>
                            <Table.Cell className="text-right"><span className="text-sm font-mono text-muted-foreground">${item.currentRate.toFixed(4)}</span></Table.Cell>
                            <Table.Cell className="text-right">
                              <div className="flex flex-col items-end gap-0.5">
                                <span className={`text-sm font-mono font-semibold ${isRise ? 'text-destructive' : 'text-success'}`}>${item.pendingRate?.toFixed(4) ?? '—'}</span>
                                <span className={`text-xs ${isRise ? 'text-destructive' : 'text-success'}`}>{isRise ? '▲' : '▼'} {priceDiff}%</span>
                              </div>
                            </Table.Cell>
                            <Table.Cell className="text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <button onClick={() => handleApprove(item)} disabled={isPending} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-success/15 text-success border border-success/30 hover:bg-success/25 transition-all duration-200 disabled:opacity-50">✅ Принять</button>
                                <button onClick={() => handleReject(item)} disabled={isPending} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground border border-border hover:bg-muted-foreground/10 transition-all duration-200 disabled:opacity-50">✕ Отклонить</button>
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ZOMBIES TAB */}
      {activeTab === 'zombies' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <p className="text-sm text-muted-foreground">{zombies.length} зомби-услуг обнаружено (провайдер удалил их из API)</p>
          {zombies.length === 0 ? renderEmptyState('Зомби нет', 'Все услуги активно поддерживаются провайдерами') : (
            <div className="bg-card border border-border rounded-xl overflow-hidden w-full">
              <Table aria-label="Зомби услуги">
                <Table.ScrollContainer>
                  <Table.Content>
                    <Table.Header>
                      <Table.Column isRowHeader>УСЛУГА</Table.Column>
                      <Table.Column>ПРИЧИНА</Table.Column>
                      <Table.Column className="text-right">ДЕЙСТВИЕ</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {zombies.map(item => {
                        const emoji = NETWORK_EMOJI[item.networkSlug] ?? '🌐';
                        return (
                          <Table.Row key={item.id}>
                            <Table.Cell>
                              <div className="flex items-start gap-2">
                                <span className="text-base">{emoji}</span>
                                <div>
                                  <div className="text-sm font-medium text-foreground opacity-50">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">{item.categoryName} · {item.providerName}</div>
                                </div>
                              </div>
                            </Table.Cell>
                            <Table.Cell><span className="text-xs px-2 py-1 rounded-md bg-destructive/10 text-destructive border border-destructive/20">{item.quarantineReason}</span></Table.Cell>
                            <Table.Cell className="text-right">
                              <button onClick={() => handleArchiveZombie(item)} disabled={isPending} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground border border-border hover:bg-muted-foreground/10 transition-all duration-200 disabled:opacity-50">📦 Скрыть навсегда</button>
                            </Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* API ERRORS TAB */}
      {activeTab === 'api' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <p className="text-sm text-muted-foreground">{apiErrors.length} услуг заблокировано из-за сбоев API</p>
          {apiErrors.length === 0 ? renderEmptyState('Сбоев нет', 'Провайдеры работают в штатном режиме') : (
            <div className="bg-card border border-border rounded-xl overflow-hidden w-full">
              <Table aria-label="Сбои API">
                <Table.ScrollContainer>
                  <Table.Content>
                    <Table.Header>
                      <Table.Column isRowHeader>УСЛУГА</Table.Column>
                      <Table.Column>ПРИЧИНА</Table.Column>
                      <Table.Column>БЛОКИРОВКА ДО</Table.Column>
                      <Table.Column className="text-right">ДЕЙСТВИЕ</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {apiErrors.map(item => {
                        const emoji = NETWORK_EMOJI[item.networkSlug] ?? '🌐';
                        const untilDate = item.cooldownUntil ? new Date(item.cooldownUntil).toLocaleString('ru-RU') : '—';
                        return (
                          <Table.Row key={item.id}>
                            <Table.Cell>
                              <div className="flex items-start gap-2">
                                <span className="text-base">{emoji}</span>
                                <div>
                                  <div className="text-sm font-medium text-foreground">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">{item.categoryName} · {item.providerName}</div>
                                </div>
                              </div>
                            </Table.Cell>
                            <Table.Cell><span className="text-xs px-2 py-1 rounded-md bg-warning/10 text-warning border border-warning/20">{item.quarantineReason}</span></Table.Cell>
                            <Table.Cell><span className="text-sm font-mono text-muted-foreground">{untilDate}</span></Table.Cell>
                            <Table.Cell className="text-right">
                              <button onClick={() => handleLiftApiBlock(item)} disabled={isPending} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-success/15 text-success border border-success/30 hover:bg-success/25 transition-all duration-200 disabled:opacity-50">🔓 Снять блок</button>
                            </Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
