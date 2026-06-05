'use client';

import { Card, Button, Chip } from '@heroui/react';

interface ComparisonHubProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  comparisonData: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSwap: (route: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routes: any[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ProviderComparisonHub({ comparisonData, service, onSwap, routes }: ComparisonHubProps) {
  const formatDuration = (sec: number) => {
    if (!sec || sec === 0) return '—';
    if (sec < 60) return `${sec} сек`;
    const mins = Math.floor(sec / 60);
    if (mins < 60) return `${mins} мин ${sec % 60} сек`;
    const hrs = Math.floor(mins / 60);
    return `${hrs} ч ${mins % 60} мин`;
  };

  const getSlaIndicator = (sla: number) => {
    if (sla > 95) return { icon: '🟢', text: 'Высокий SLA', className: 'text-success' };
    if (sla >= 80) return { icon: '🟡', text: 'Средний SLA', className: 'text-warning' };
    return { icon: '🔴', text: 'Низкий SLA', className: 'text-danger' };
  };

  if (!comparisonData || comparisonData.length === 0) {
    return (
      <div className="p-6 rounded-[var(--radius)] flex flex-col items-center justify-center border border-border bg-card text-center">
        <p className="text-muted-foreground font-medium">Сравнительные данные провайдеров отсутствуют.</p>
        <p className="text-xs text-muted-foreground mt-1">Добавьте хотя бы один маршрут для сравнения.</p>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-[var(--radius)] space-y-4 bg-background">
      <div className="flex justify-between items-center px-1">
        <div>
          <h3 className="text-base font-bold text-foreground uppercase tracking-wider">Матрица сравнения провайдеров</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Сравнение цен за единицу услуги, SLA за последние 7 дней и лимитов</p>
        </div>
        <Chip size="sm" variant="soft" className="font-semibold text-xs border border-border bg-card text-muted-foreground">
          {comparisonData.length} МАРШРУТА
        </Chip>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {comparisonData.map((item) => {
          const slaInfo = getSlaIndicator(item.sla);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const targetRoute = routes.find((r: any) => r.id === item.routeId);

          return (
            <Card
              key={item.routeId}
              className={`relative flex flex-col justify-between p-5 bg-card transition-all duration-200 select-none overflow-visible rounded-[var(--radius)] border ${
                item.isPrimary ? 'border-primary border-2 shadow-[0_4px_16px_rgba(51,144,236,0.15)]' : 'border-border'
              }`}
            >
              {item.isPrimary && (
                <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded text-[10px] font-bold text-primary-foreground uppercase tracking-wider bg-primary">
                  АКТИВНЫЙ (PRIMARY)
                </div>
              )}

              <div className="space-y-4">
                {/* Header info */}
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-foreground text-base leading-tight">{item.providerName}</h4>
                    <p className="text-[11px] font-mono text-muted-foreground mt-0.5">Внешний ID: {item.providerServiceId}</p>
                  </div>
                  <div>
                    {item.isActive ? (
                      <span className="px-2 py-0.5 text-[10px] rounded font-semibold bg-success/10 text-success border border-success/20">
                        Активен
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] rounded font-semibold bg-danger/10 text-danger border border-danger/20">
                        Отключен
                      </span>
                    )}
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 gap-3 text-xs border-t border-border pt-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Закупка (1 шт)</p>
                    <p className="font-bold text-foreground truncate">
                      {item.procurementCostPerUnitRub !== null ? `${item.procurementCostPerUnitRub.toFixed(4)} ₽` : '—'}
                    </p>
                    <p className="text-[9px] text-muted-foreground font-mono truncate">
                      {item.procurementCostPerUnitUsd !== null ? `$${item.procurementCostPerUnitUsd.toFixed(5)}` : '—'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Чистая Маржа / Наценка</p>
                    <p className={`font-bold ${item.marginPerUnitRub && item.marginPerUnitRub > 0 ? 'text-success' : 'text-danger'}`}>
                      {item.marginPerUnitRub !== null ? `${item.marginPerUnitRub > 0 ? '+' : ''}${item.marginPerUnitRub.toFixed(4)} ₽` : '—'}
                    </p>
                    <p className="text-[9px] text-muted-foreground font-mono">
                      {item.markupPercent !== null ? `${item.markupPercent.toFixed(1)}%` : '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">7-Day SLA</p>
                    <div className={`flex items-center gap-1 font-bold ${slaInfo.className}`}>
                      <span>{slaInfo.icon}</span>
                      <span>{item.sla.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Среднее ETA</p>
                    <p className="font-bold text-foreground truncate">
                      {formatDuration(item.avgEtaSeconds)}
                    </p>
                  </div>

                  <div className="col-span-2 border-t border-dashed border-border pt-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground font-semibold">ЛИМИТЫ (MIN / MAX):</span>
                      <span className="font-bold text-foreground">
                        {item.providerMinQty !== null ? item.providerMinQty.toLocaleString() : '—'} / {item.providerMaxQty !== null ? item.providerMaxQty.toLocaleString() : '—'} шт
                      </span>
                    </div>
                    {item.limitsMismatch && (
                      <div className="bg-danger/10 text-danger border border-danger/20 rounded-md p-2 text-[10px] font-bold flex items-center gap-1.5 mt-2 transition-all duration-200">
                        <span>⚠️</span>
                        <span>Несовместимость лимитов провайдера и услуги</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border">
                <Button
                  onPress={() => targetRoute && onSwap(targetRoute)}
                  isDisabled={item.isPrimary || !item.isActive}
                  className={`w-full font-bold transition-all duration-200 rounded-[var(--radius)] flex items-center justify-center h-11 ${
                    item.isPrimary 
                      ? 'bg-default-200 text-default-400' 
                      : !item.isActive 
                        ? 'bg-default-100 text-default-400' 
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {item.isPrimary ? 'Основной маршрут' : 'Сделать основным'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
