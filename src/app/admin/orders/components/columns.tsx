'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { cancelOrderAction } from '@/actions/admin/orders';
import { X, Edit2, Zap, Timer, Snail, Turtle } from 'lucide-react';
import { formatEta } from '@/utils/format-eta';


export type OrderColumn = {
  id: string;
  numericId: number;
  externalId: string | null;
  link: string;
  quantity: number;
  remains: number;
  status: string;
  charge: number;
  providerCost: number;
  createdAt: Date;
  isDripFeed: boolean;
  runs: number | null;
  interval: number | null;
  currentRun: number;
  error: string | null;
  user: { email: string };
  providerName: string | null;
  service: { 
    name: string;
    etaP50Seconds: number | null;
    etaP90Seconds: number | null;
    etaSampleCount: number | null;
    etaSpeedClass: string | null;
    etaUpdatedAt: string | null;
    category: {
      name: string;
      network: { name: string } | null;
    };
  };
};

// ── Speed Class Visual Config ──

const SPEED_CLASS_META: Record<string, { label: string; color: string; icon: React.ReactNode; window: string }> = {
  FAST:       { label: 'Быстрый',         color: 'text-emerald-600', icon: <Zap className="w-3 h-3" />,    window: '2ч' },
  MEDIUM:     { label: 'Средний',          color: 'text-sky-600',     icon: <Timer className="w-3 h-3" />,  window: '24ч' },
  SLOW:       { label: 'Медленный',        color: 'text-amber-600',   icon: <Turtle className="w-3 h-3" />, window: '72ч' },
  ULTRA_SLOW: { label: 'Очень медленный',  color: 'text-rose-600',    icon: <Snail className="w-3 h-3" />,  window: '7д' },
};

/** Format "time ago" from ISO date string */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}ч назад`;
  const days = Math.floor(hours / 24);
  return `${days}д назад`;
}

// ── Status Config ──

const STATUS_STYLES: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  AWAITING_PAYMENT: 'warning',
  PENDING: 'default',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  PARTIAL: 'warning',
  CANCELED: 'default',
  ERROR: 'danger',
};

const STATUS_LABELS: Record<string, string> = {
  ALL: 'Все',
  AWAITING_PAYMENT: 'Ожидает',
  PENDING: 'В очереди',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  PARTIAL: 'Частичный',
  CANCELED: 'Отменён',
  ERROR: 'Ошибка',
};

// ── Sub-Components ──

function RowActions({ order }: { order: OrderColumn }) {
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    if (!confirm(`Отменить заказ #${order.numericId}? При наличии остатка клиент получит возврат.`)) return;
    const fd = new FormData();
    fd.append('orderId', order.id);

    startTransition(async () => {
      try {
        await cancelOrderAction(fd);
        toast.success(`🚫 Заказ #${order.numericId} отменён`);
      } catch (e) {
        toast.error((e as Error).message ?? 'Ошибка');
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={`?edit_order_id=${order.id}`}
        className="inline-flex items-center justify-center p-1.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"
        title="Редактировать заказ"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </Link>
      <button
        onClick={handleCancel}
        disabled={isPending || ['COMPLETED', 'CANCELED'].includes(order.status)}
        className="inline-flex items-center justify-center p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 transition-colors disabled:opacity-40"
        title="Отменить заказ"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function EtaTooltipContent({ service }: { service: OrderColumn['service'] }) {
  const meta = SPEED_CLASS_META[service.etaSpeedClass ?? ''] ?? SPEED_CLASS_META.MEDIUM;
  
  return (
    <div className="p-2.5 space-y-2 min-w-[180px]">
      {/* Speed Class Header */}
      <div className="flex items-center gap-1.5">
        <span className={meta.color}>{meta.icon}</span>
        <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">окно {meta.window}</span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <span className="text-muted-foreground">Медиана (P50)</span>
        <span className="font-semibold text-foreground tabular-nums text-right">
          {formatEta(service.etaP50Seconds!)}
        </span>
        
        <span className="text-muted-foreground">Максимум (P90)</span>
        <span className="font-semibold text-foreground tabular-nums text-right">
          {service.etaP90Seconds ? formatEta(service.etaP90Seconds) : '—'}
        </span>
        
        <span className="text-muted-foreground">Выборка</span>
        <span className="font-medium text-foreground tabular-nums text-right">
          {service.etaSampleCount} заказов
        </span>
      </div>

      {/* Last updated */}
      {service.etaUpdatedAt && (
        <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
          Обновлено: {timeAgo(service.etaUpdatedAt)}
        </div>
      )}
    </div>
  );
}

// ── Column Definitions ──

export const columns = (canSeeRates: boolean = true): ColumnDef<OrderColumn>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        className="w-4 h-4 rounded border-border text-primary focus:ring-indigo-600"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="w-4 h-4 rounded border-border text-primary focus:ring-indigo-600"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(e.target.checked)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'numericId',
    header: 'ID',
    cell: ({ row }) => (
      <div className="flex flex-col text-xs leading-snug tabular-nums tracking-tight">
        <span className="font-bold text-foreground whitespace-nowrap">
          {row.original.numericId}
        </span>
        {row.original.externalId && canSeeRates && (
          <span className="text-muted-foreground font-normal whitespace-nowrap">
            ({row.original.externalId})
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'user.email',
    header: 'Клиент',
    cell: ({ row }) => {
      const email = row.original.user.email;
      return (
        <Link
          href={`/admin/clients?q=${encodeURIComponent(email)}`}
          className="text-sky-600 hover:text-sky-800 hover:underline text-xs"
        >
          {email}
        </Link>
      );
    },
  },
  {
    id: 'info',
    header: 'Информация',
    cell: ({ row }) => {
      const order = row.original;
      const dateStr = new Date(order.createdAt).toLocaleString('ru-RU', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
      }).replace(',', '');

      return (
        <div className="flex flex-col text-[13px] leading-relaxed text-foreground space-y-0.5 py-1">
          <div><span className="text-muted-foreground mr-1">Категория:</span>{order.service.category.network?.name || 'Без сети'}</div>
          <div><span className="text-muted-foreground mr-1">Активность:</span>{order.service.category.name}</div>
          <div><span className="text-muted-foreground mr-1">Сервис:</span>{order.service.name}</div>
          <div className="flex flex-wrap items-baseline">
            <span className="text-muted-foreground mr-1">Ссылка:</span>
            <a href={order.link} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800 hover:underline break-all transition-colors">
              {order.link}
            </a>
          </div>
          <div><span className="text-muted-foreground mr-1">Кол-во:</span>{order.quantity.toLocaleString('ru-RU')}</div>
          <div><span className="text-muted-foreground mr-1">Дата создания:</span>{dateStr}</div>
          
          <details className="mt-1.5 group">
            <summary className="text-sky-600 hover:text-sky-800 cursor-pointer text-xs select-none list-none inline-flex items-center transition-colors font-medium">
              <span className="group-open:hidden">Показать детали</span>
              <span className="hidden group-open:inline">Скрыть детали</span>
            </summary>
            <div className="mt-1.5 pt-1.5 border-t border-border/50 text-xs text-foreground space-y-1">
              <div><span className="text-muted-foreground mr-1">Провайдер:</span>{order.providerName || '—'}</div>
              {canSeeRates && (
                <>
                  <div><span className="text-muted-foreground mr-1">ID заказа у провайдера:</span>{order.externalId ? `#${order.externalId}` : '—'}</div>
                  <div><span className="text-muted-foreground mr-1">Себестоимость:</span>{(order.providerCost / 100).toFixed(2)} ₽</div>
                </>
              )}
              {order.error && (
                <div className="flex flex-col mt-1">
                  <span className="text-muted-foreground">Комментарий провайдера:</span>
                  <span className="text-destructive break-words font-mono mt-0.5">{order.error}</span>
                </div>
              )}
            </div>
          </details>
        </div>
      );
    },
  },
  {
    accessorKey: 'charge',
    header: 'Цена',
    cell: ({ row }) => (
      <div className="text-xs font-semibold whitespace-nowrap text-foreground tabular-nums">
        {(row.original.charge / 100).toFixed(2)} ₽
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Статус',
    cell: ({ row }) => {
      const order = row.original;
      const status = order.status;
      const style = STATUS_STYLES[status] || 'default';
      
      const classes: Record<string, string> = {
        success: 'bg-success/20 text-emerald-700 border-emerald-200',
        warning: 'bg-warning/20 text-amber-700 border-amber-200',
        danger: 'bg-destructive/20 text-rose-700 border-destructive/30',
        primary: 'bg-sky-100 text-sky-700 border-sky-200',
        default: 'bg-muted text-muted-foreground border-border',
      };

      return (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Badge className={`font-semibold text-[10px] uppercase ${classes[style] || classes.default}`}>
            {STATUS_LABELS[status] || status}
          </Badge>
          {order.isDripFeed && (
            <span className="text-[10px] text-purple-600 font-medium">
              Drip ({order.currentRun}/{order.runs})
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: 'eta',
    header: 'ETA',
    cell: ({ row }) => {
      const s = row.original.service;
      
      // No data state
      if (!s.etaP50Seconds || !s.etaSampleCount || s.etaSampleCount < 2) {
        return (
          <span
            className="text-xs text-muted-foreground whitespace-nowrap cursor-help"
            title="Недостаточно данных для расчёта ETA"
          >
            —
          </span>
        );
      }

      const meta = SPEED_CLASS_META[s.etaSpeedClass ?? ''] ?? SPEED_CLASS_META.MEDIUM;

      return (
        <div className="relative group/eta">
          {/* Main ETA display */}
          <div className="flex flex-col text-xs whitespace-nowrap cursor-help">
            <div className="flex items-center gap-1 font-medium">
              <span className={`transition-colors ${meta.color}`}>
                {meta.icon}
              </span>
              <span className="text-foreground group-hover/eta:text-primary transition-colors">
                ≈ {formatEta(s.etaP50Seconds)}
              </span>
            </div>
            {s.etaP90Seconds && (
              <span className="text-muted-foreground text-[10px]">
                до {formatEta(s.etaP90Seconds)}
              </span>
            )}
          </div>

          {/* Hover tooltip */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 z-50 invisible opacity-0 group-hover/eta:visible group-hover/eta:opacity-100 transition-all duration-200 pointer-events-none">
            <div className="bg-card border border-border rounded-lg shadow-xl p-2.5 min-w-[190px]">
              <EtaTooltipContent service={s} />
              {/* Arrow */}
              <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-card border-r border-b border-border rotate-[-45deg]" />
            </div>
          </div>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: 'Действия',
    cell: ({ row }) => <RowActions order={row.original} />
  },
];
