'use client';

import React, { useState } from 'react';
import { 
  Clock, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink 
} from 'lucide-react';
import { getStatusBadgeClass, getStatusLabel } from '@/utils/status-helpers';
import { FluxOrder } from '@/types/flux';

export function FluxOrdersKanban({ orders }: { orders: FluxOrder[] }) {
  const [activeTab, setActiveTab] = useState<'queue' | 'in_progress' | 'done'>('queue');
  
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

  const renderCard = (order: FluxOrder) => {
    const remains = order.remains ?? order.quantity;
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
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getStatusBadgeClass(order.status)}`}>
            {getStatusLabel(order.status)}
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

  const renderColumnContent = (title: string, icon: React.ReactNode, dotColor: string, columnOrders: FluxOrder[], emptyText: string) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
          {icon} {title} ({columnOrders.length})
        </h3>
        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
      </div>
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 pb-4 scrollbar-thin">
        {columnOrders.length === 0 ? (
          <div className="p-8 border border-dashed border-border/40 rounded-[2rem] text-center text-xs text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          columnOrders.map(renderCard)
        )}
      </div>
    </div>
  );

  return (
    <div>
      {/* Mobile Tab Selector (block md:hidden) */}
      <div className="md:hidden flex items-center gap-1 p-1 bg-muted/50 rounded-2xl mb-6 border border-border/30">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'queue' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          В очереди ({queueOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('in_progress')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'in_progress' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          В работе ({inProgressOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('done')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'done' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Завершено ({doneOrders.length})
        </button>
      </div>

      {/* Mobile View: Single active column */}
      <div className="md:hidden">
        {activeTab === 'queue' && renderColumnContent("В очереди", <Clock className="w-4 h-4 text-amber-500" />, "bg-amber-500", queueOrders, "Нет заказов в очереди")}
        {activeTab === 'in_progress' && renderColumnContent("Выполняется", <Play className="w-4 h-4 text-blue-500" />, "bg-blue-500", inProgressOrders, "Нет выполняющихся заказов")}
        {activeTab === 'done' && renderColumnContent("Завершено", <CheckCircle2 className="w-4 h-4 text-emerald-500" />, "bg-emerald-500", doneOrders, "История пуста")}
      </div>

      {/* Desktop View: 3-column grid (hidden md:grid) */}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        {renderColumnContent("В очереди", <Clock className="w-4 h-4 text-amber-500" />, "bg-amber-500", queueOrders, "Нет заказов в очереди")}
        {renderColumnContent("Выполняется", <Play className="w-4 h-4 text-blue-500" />, "bg-blue-500", inProgressOrders, "Нет выполняющихся заказов")}
        {renderColumnContent("Завершено", <CheckCircle2 className="w-4 h-4 text-emerald-500" />, "bg-emerald-500", doneOrders, "История пуста")}
      </div>
    </div>
  );
}
