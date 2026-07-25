'use client';

import React from 'react';
import { 
  Clock, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RotateCcw, 
  XOctagon, 
  Layers 
} from 'lucide-react';
import Link from 'next/link';

interface KanbanOrder {
  id: string;
  numericId: number;
  status: string;
  charge: number;
  quantity: number;
  remains: number | null;
  link: string;
  error: string | null;
  createdAt: string;
  service: {
    name: string;
    network: {
      slug: string;
    };
  };
}

export function LovableOrdersKanban({ orders }: { orders: KanbanOrder[] }) {
  
  // Categorize orders into kanban columns
  const queueOrders = orders.filter(o => 
    ['PENDING', 'PROVISIONING', 'AWAITING_PAYMENT'].includes(o.status)
  );
  
  const inProgressOrders = orders.filter(o => 
    ['IN_PROGRESS', 'PARTIAL'].includes(o.status)
  );
  
  const doneOrders = orders.filter(o => 
    ['COMPLETED', 'CANCELED', 'ERROR'].includes(o.status)
  );

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'COMPLETED': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'IN_PROGRESS': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'PENDING': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'AWAITING_PAYMENT': 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
      'PROVISIONING': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      'PARTIAL': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'CANCELED': 'bg-red-500/10 text-red-400 border-red-500/20',
      'ERROR': 'bg-rose-500/10 text-rose-450 border-rose-500/20',
    };
    return statusColors[status] || 'bg-muted text-muted-foreground';
  };

  const renderCard = (order: KanbanOrder) => {
    const remains = order.remains || 0;
    const total = order.quantity || 1;
    const completed = Math.max(0, total - remains);
    const progressPercent = Math.min(100, Math.round((completed / total) * 100));

    return (
      <div 
        key={order.id} 
        className="p-5 bg-card/75 backdrop-blur-md border border-border/30 rounded-[1.75rem] shadow-sm hover:border-primary/30 hover:shadow-lg transition-all duration-300 space-y-4 group"
      >
        <div className="flex justify-between items-start gap-2">
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-muted text-muted-foreground">
            #{order.numericId}
          </span>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getStatusBadge(order.status)}`}>
            {order.status}
          </span>
        </div>

        <div className="space-y-1.5">
          <h4 className="font-bold text-xs text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {order.service.name}
          </h4>
          <a 
            href={order.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-muted-foreground hover:text-foreground font-semibold inline-flex items-center gap-1 truncate max-w-full"
          >
            {order.link} <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        </div>

        {/* Progress representation */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] font-semibold text-muted-foreground">
            <span>Прогресс: {progressPercent}%</span>
            <span>{completed} / {total} шт</span>
          </div>
          <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden border border-border/10">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
        </div>

        <div className="pt-3 border-t border-border/10 flex justify-between items-center text-[10px] font-bold text-muted-foreground">
          <span>Сумма:</span>
          <span className="font-mono text-foreground">{order.charge.toFixed(2)} ₽</span>
        </div>

        {order.error && (
          <div className="p-2 bg-destructive/10 border border-destructive/20 text-destructive text-[9px] font-semibold rounded-xl flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{order.error}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Column 1: Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> В очереди ({queueOrders.length})
          </h3>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
        </div>
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1 pb-4 scrollbar-thin">
          {queueOrders.length === 0 ? (
            <div className="p-8 border border-dashed border-border/40 rounded-[2rem] text-center text-xs text-muted-foreground">
              Нет заказов в очереди
            </div>
          ) : (
            queueOrders.map(renderCard)
          )}
        </div>
      </div>

      {/* Column 2: In Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
            <Play className="w-4 h-4 text-blue-500" /> Выполняется ({inProgressOrders.length})
          </h3>
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
        </div>
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1 pb-4 scrollbar-thin">
          {inProgressOrders.length === 0 ? (
            <div className="p-8 border border-dashed border-border/40 rounded-[2rem] text-center text-xs text-muted-foreground">
              Нет выполняющихся заказов
            </div>
          ) : (
            inProgressOrders.map(renderCard)
          )}
        </div>
      </div>

      {/* Column 3: Done */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Завершено ({doneOrders.length})
          </h3>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        </div>
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1 pb-4 scrollbar-thin">
          {doneOrders.length === 0 ? (
            <div className="p-8 border border-dashed border-border/40 rounded-[2rem] text-center text-xs text-muted-foreground">
              История пуста
            </div>
          ) : (
            doneOrders.map(renderCard)
          )}
        </div>
      </div>

    </div>
  );
}
