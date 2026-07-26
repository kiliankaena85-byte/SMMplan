'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useTransition, useState } from 'react';
import { toast } from 'sonner';
import { cancelOrderAction } from '@/actions/admin/orders';
import { X, Edit2, Zap, Timer, Snail, Turtle, ArrowUpDown } from 'lucide-react';
import { formatEta } from '@/utils/format-eta';
import { ConfirmModal } from '@/components/ui/confirm-modal';


export type OrderColumn = {
  id: string;
  numericId: number;
  externalId: string | null;
  link: string;
  quantity: number;
  remains: number;
  status: string;
  charge: string;
  providerCost: string;
  createdAt: Date;
  updatedAt: Date;
  isDripFeed: boolean;
  dripExternalIds: string[];
  runs: number | null;
  interval: number | null;
  currentRun: number;
  error: string | null;
  user: { email: string };
  providerName: string | null;
  providerTicketUrl?: string | null;
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

export const SPEED_CLASS_META: Record<string, { label: string; color: string; icon: React.ReactNode; window: string }> = {
  FAST:       { label: 'Быстрый',         color: 'text-emerald-600 dark:text-emerald-400', icon: <Zap className="w-3 h-3" />,    window: '2ч' },
  MEDIUM:     { label: 'Средний',          color: 'text-sky-600 dark:text-sky-400',     icon: <Timer className="w-3 h-3" />,  window: '24ч' },
  SLOW:       { label: 'Медленный',        color: 'text-amber-600 dark:text-amber-400',   icon: <Turtle className="w-3 h-3" />, window: '72ч' },
  ULTRA_SLOW: { label: 'Очень медленный',  color: 'text-rose-600 dark:text-rose-400',    icon: <Snail className="w-3 h-3" />,  window: '7д' },
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

export const STATUS_STYLES: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
  AWAITING_PAYMENT: 'warning',
  PENDING: 'default',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  PARTIAL: 'warning',
  CANCELED: 'default',
  ERROR: 'danger',
};

export const STATUS_LABELS: Record<string, string> = {
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

export function RowActions({ order }: { order: OrderColumn }) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function executeCancel() {
    setConfirmOpen(false);
    const fd = new FormData();
    fd.append('orderId', order.id);

    startTransition(async () => {
      try {
        const res = await cancelOrderAction(fd);
        if (res && res.success) {
          toast.success(`🚫 Заказ #${order.numericId} отменён`);
        } else {
          toast.error(res?.error || 'Ошибка отмены заказа');
        }
      } catch (e) {
        toast.error((e as Error).message ?? 'Ошибка');
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={`?edit_order_id=${order.id}`}
        className="inline-flex items-center justify-center p-1.5 bg-sky-50 text-sky-600 rounded hover:bg-sky-100 transition-colors"
        title="Открыть панель деталей"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </Link>
      <button
        onClick={() => setConfirmOpen(true)}
        disabled={isPending || ['COMPLETED', 'CANCELED', 'PARTIAL', 'IN_PROGRESS', 'ERROR'].includes(order.status)}
        className="inline-flex items-center justify-center p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 transition-colors disabled:opacity-40"
        title="Отменить заказ"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeCancel}
        title="Отмена заказа"
        isDanger={true}
        confirmText="Отменить заказ"
      >
        Вы действительно хотите отменить заказ <strong>#{order.numericId}</strong>? При наличии остатка клиент получит возврат.
      </ConfirmModal>
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
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono tracking-tight">
        <span className="text-muted-foreground font-sans tracking-normal">Медиана (P50)</span>
        <span className="font-semibold text-foreground tabular-nums text-right">
          {formatEta(service.etaP50Seconds!)}
        </span>
        
        <span className="text-muted-foreground font-sans tracking-normal">Максимум (P90)</span>
        <span className="font-semibold text-foreground tabular-nums text-right">
          {service.etaP90Seconds ? formatEta(service.etaP90Seconds) : '—'}
        </span>
        
        <span className="text-muted-foreground font-sans tracking-normal">Выборка</span>
        <span className="font-medium text-foreground tabular-nums text-right">
          {service.etaSampleCount} <span className="font-sans tracking-normal">зак.</span>
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
        className="w-4 h-4 rounded border-border text-primary focus:ring-indigo-600 cursor-pointer"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="w-4 h-4 rounded border-border text-primary focus:ring-indigo-600 cursor-pointer"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(e.target.checked)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'user_email',
    accessorFn: (row) => row.user.email,
    header: 'Email',
    enableHiding: false,
  },
  {
    accessorKey: 'numericId',
    id: 'order',
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="flex items-center gap-1 hover:text-foreground transition-colors font-bold text-foreground text-xs"
      >
        ЗАКАЗ
        <ArrowUpDown className="w-3 h-3 ml-1" />
      </button>
    ),
    cell: ({ row }) => {
      const order = row.original;
      const email = order.user.email;
      const dateStr = new Date(order.createdAt).toLocaleString('ru-RU', { 
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
      return (
        <div className="flex flex-col text-xs leading-normal py-1 space-y-0.5 min-w-[125px]">
          <span className="font-bold text-foreground tabular-nums text-xs">
            #{order.numericId}
          </span>
          <Link
            href={`/admin/clients?q=${encodeURIComponent(email)}`}
            className="text-sky-600 hover:text-sky-800 hover:underline text-xs font-semibold truncate max-w-[150px]"
            title={email}
            onClick={(e) => e.stopPropagation()}
          >
            {email}
          </Link>
          <span className="text-[10px] text-muted-foreground tabular-nums select-none">
            {dateStr}
          </span>
        </div>
      );
    },
  },
  {
    id: 'info',
    header: 'УСЛУГА И ССЫЛКА',
    cell: ({ row }) => {
      const order = row.original;
      return (
        <div className="flex flex-col text-xs leading-relaxed text-foreground py-1 max-w-[320px] sm:max-w-[360px] md:max-w-[400px] whitespace-normal break-words space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-muted font-bold text-foreground text-[10px] uppercase select-none tracking-wide">
              {order.service.category.network?.name || '—'}
            </span>
            <span className="font-semibold text-muted-foreground text-[11px]">
              {order.service.category.name}
            </span>
          </div>
          <div className="font-bold text-foreground leading-snug">
            {order.service.name}
          </div>
          <div className="flex items-start gap-1">
            <span className="text-muted-foreground shrink-0 select-none">Ссылка:</span>{' '}
            <a
              href={order.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 hover:underline break-all font-mono text-[11px]"
              onClick={(e) => e.stopPropagation()}
            >
              {order.link}
            </a>
          </div>
          <details className="mt-1.5 group">
            <summary className="text-sky-600 hover:text-sky-800 cursor-pointer text-[10px] select-none list-none inline-flex items-center transition-colors font-semibold">
              <span className="group-open:hidden">Показать детали</span>
              <span className="hidden group-open:inline">Скрыть детали</span>
            </summary>
            <div className="mt-1 pt-1 border-t border-border/80 text-xs text-foreground space-y-1">
              <div className="flex justify-between gap-2 items-center">
                <span className="text-muted-foreground select-none">Провайдер:</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  {order.providerName || '—'}
                  {order.providerTicketUrl && (
                    <a
                      href={order.providerTicketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-1.5 py-0.5 rounded transition-all active:scale-95"
                      onClick={(e) => e.stopPropagation()}
                      title="Открыть поддержку провайдера"
                    >
                      Поддержка ↗
                    </a>
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground select-none">Цена за 1 шт:</span>
                <span className="font-mono text-foreground tabular-nums">
                  {(order.quantity > 0 ? (Number(BigInt(order.charge)) / 100) / order.quantity : 0).toFixed(4)} ₽
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground select-none">Цена за 1к:</span>
                <span className="font-mono text-foreground tabular-nums">
                  {(order.quantity > 0 ? ((Number(BigInt(order.charge)) / 100) / order.quantity) * 1000 : 0).toFixed(2)} ₽
                </span>
              </div>
              {canSeeRates && (
                <>
                  <div className="flex justify-between gap-2 items-center">
                    <span className="text-muted-foreground select-none">ID у провайдера:</span>
                    <span className="font-mono text-foreground flex items-center gap-1.5">
                      {order.externalId || '—'}
                      {order.externalId && order.providerTicketUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof window !== 'undefined' && navigator.clipboard) {
                              navigator.clipboard.writeText(order.externalId!);
                              toast.success(`Внешний ID (${order.externalId}) скопирован в буфер обмена!`);
                            }
                            window.open(order.providerTicketUrl!, '_blank', 'noopener,noreferrer');
                          }}
                          className="inline-flex items-center gap-1 text-[10px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-1.5 py-0.5 rounded transition-all active:scale-95 cursor-pointer"
                          title="Скопировать ID и открыть тикет у провайдера"
                        >
                          Тикет ↗
                        </button>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground select-none">Себестоимость:</span>
                    <span className="tabular-nums tracking-tight font-semibold text-foreground font-mono">
                      {(Number(BigInt(order.providerCost)) / 100).toFixed(2)} ₽
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground select-none">Себестоимость за 1 шт:</span>
                    <span className="font-mono text-foreground tabular-nums">
                      {(order.quantity > 0 ? (Number(BigInt(order.providerCost)) / 100) / order.quantity : 0).toFixed(4)} ₽
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground select-none">Себестоимость за 1к:</span>
                    <span className="font-mono text-foreground tabular-nums">
                      {(order.quantity > 0 ? ((Number(BigInt(order.providerCost)) / 100) / order.quantity) * 1000 : 0).toFixed(2)} ₽
                    </span>
                  </div>
                </>
              )}
              {order.error && (
                <div className="flex flex-col mt-1 bg-destructive/5 border border-destructive/20 rounded p-1.5">
                  <span className="text-[9px] uppercase font-bold text-destructive select-none">Ошибка провайдера:</span>
                  <span className="text-destructive break-words font-mono mt-0.5 leading-tight text-[10px]">{order.error}</span>
                </div>
              )}
              {order.isDripFeed && order.dripExternalIds && order.dripExternalIds.length > 0 && (
                <div className="flex flex-col mt-1">
                  <span className="text-muted-foreground font-semibold text-[10px] select-none">Drip запуски:</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {order.dripExternalIds.map((id, idx) => (
                      <span key={idx} className="bg-purple-100/60 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 px-1 py-0.5 rounded text-[9px] font-mono">
                        #{id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        </div>
      );
    },
  },
  {
    accessorKey: 'quantity',
    id: 'quantity',
    header: () => (
      <div className="text-right font-bold text-foreground text-xs">
        КОЛ-ВО
      </div>
    ),
    cell: ({ row }) => {
      const quantity = row.original.quantity;
      return (
        <div className="text-right font-mono tabular-nums text-xs font-semibold py-1">
          {quantity.toLocaleString('ru-RU')}
        </div>
      );
    }
  },
  {
    accessorKey: 'remains',
    id: 'remains',
    header: () => (
      <div className="text-right font-bold text-foreground text-xs">
        ОСТАТОК
      </div>
    ),
    cell: ({ row }) => {
      const remains = row.original.remains;
      return (
        <div className={`text-right font-mono tabular-nums text-xs font-semibold py-1 ${remains > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
          {remains.toLocaleString('ru-RU')}
        </div>
      );
    }
  },
  {
    accessorKey: 'charge',
    header: ({ column }) => (
      <div className="flex justify-end">
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1 hover:text-foreground transition-colors font-bold text-foreground text-xs"
        >
          СТОИМОСТЬ
          <ArrowUpDown className="w-3 h-3 ml-1" />
        </button>
      </div>
    ),
    cell: ({ row }) => {
      const order = row.original;
      const chargeBig = BigInt(order.charge || '0');
      const costBig = BigInt(order.providerCost || '0');
      const marginBig = chargeBig - costBig;
      const chargeNum = Number(chargeBig) / 100;
      const costNum = Number(costBig) / 100;
      const marginNum = Number(marginBig) / 100;
      const marginPercent = chargeBig > 0n ? Math.round((Number(marginBig) / Number(chargeBig)) * 100) : 0;
      const isPositive = marginBig >= 0n;

      return (
        <div className="flex flex-col items-end text-xs leading-normal py-1 font-semibold text-right min-w-[90px] font-mono">
          <div className="font-bold text-foreground tabular-nums tracking-tight text-sm">{chargeNum.toFixed(2)} <span className="font-sans text-xs">₽</span></div>
          {canSeeRates && (
            <div className="text-muted-foreground text-[10px] mt-0.5 font-normal select-none tabular-nums tracking-tight">
              Закупка: {costNum.toFixed(2)} <span className="font-sans">₽</span>
            </div>
          )}
          {canSeeRates && (
            <div className={`text-[10px] font-bold mt-0.5 select-none tabular-nums tracking-tight ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              Маржа: {marginPercent}% ({marginNum.toFixed(2)} <span className="font-sans">₽</span>)
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="flex items-center gap-1 hover:text-foreground transition-colors font-bold text-foreground text-xs"
      >
        СТАТУС
        <ArrowUpDown className="w-3 h-3 ml-1" />
      </button>
    ),
    cell: ({ row }) => {
      const order = row.original;
      const status = order.status;
      const style = STATUS_STYLES[status] || 'default';
      
      const classes: Record<string, string> = {
        success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        primary: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
        default: 'bg-muted text-muted-foreground border-border/80',
      };
 
      const s = order.service;
      const showEta = s.etaP50Seconds && s.etaSampleCount && s.etaSampleCount >= 2;
      const meta = showEta ? (SPEED_CLASS_META[s.etaSpeedClass ?? ''] ?? SPEED_CLASS_META.MEDIUM) : null;
 
      return (
        <div className="flex flex-col gap-1 py-1 whitespace-nowrap min-w-[110px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className={`font-black text-[10px] uppercase border px-2 py-0.5 rounded-md ${classes[style] || classes.default}`}>
              {STATUS_LABELS[status] || status}
            </Badge>
            {order.isDripFeed && (
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-md">
                Drip ({order.currentRun}/{order.runs})
              </span>
            )}
          </div>
          
          {showEta && meta && (
            <div className="relative group/eta">
              <div className="flex items-center gap-1 font-semibold text-[11px] cursor-help">
                <span className={meta.color}>
                  {meta.icon}
                </span>
                <span className="text-muted-foreground group-hover/eta:text-primary transition-colors">
                  ≈ {formatEta(s.etaP50Seconds!)}
                </span>
              </div>
 
              {/* Tooltip */}
              <div className="absolute right-0 top-full mt-1.5 z-50 invisible opacity-0 group-hover/eta:visible group-hover/eta:opacity-100 transition-all duration-200 pointer-events-none">
                <div className="bg-card border border-border/80 rounded-lg shadow-xl p-2.5 min-w-[190px]">
                  <EtaTooltipContent service={s} />
                  {/* Arrow */}
                  <div className="absolute bottom-full right-4 w-3 h-3 bg-card border-t border-l border-border/80 rotate-[45deg] translate-y-1.5" />
                </div>
              </div>
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: 'ДЕЙСТВИЯ',
    cell: ({ row }) => <RowActions order={row.original} />
  },
];
