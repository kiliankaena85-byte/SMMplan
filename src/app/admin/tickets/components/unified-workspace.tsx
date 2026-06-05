'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Headphones, 
  Search, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  User, 
  ExternalLink, 
  Mail, 
  Wallet, 
  Loader2, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  MessageSquare, 
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { formatBalance } from '@/lib/utils';
import { 
  adminReplyTicket, 
  editTicketMessage, 
  bulkRefillOrdersAction, 
  bulkRefundOrdersAction 
} from '@/actions/support/ticket';
import { cancelOrderAction, restartOrderAction } from '@/actions/admin/orders';
import ChatWindow from '@/components/support/ChatWindow';
import ClientProfileSidebar from '@/components/support/ClientProfileSidebar';
import TicketActionsDropdown from '@/components/support/TicketActionsDropdown';
import { Drawer } from '@heroui/react';
import { Button } from '@/components/ui/button';
import figmaStyles from '@/utils/figma-styles.json';
import { useTheme } from 'next-themes';


// Helper inline hook for responsive query matches
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

import { Undo2, RefreshCw } from 'lucide-react';

interface AttachedOrdersGridProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orders: any[];
  ticketId: string;
  isB2bClient: boolean;
}

function AttachedOrdersGrid({ orders, ticketId, isB2bClient }: AttachedOrdersGridProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const isDark = mounted ? (theme?.includes('dark') || theme === 'dark') : true;

  const cardBg = isDark
    ? figmaStyles.colors.miniAppCardBackground.dark
    : figmaStyles.colors.miniAppCardBackground.light;


  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(orders.map(o => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkRefill = () => {
    if (selectedIds.length === 0) return;
    startTransition(async () => {
      const res = await bulkRefillOrdersAction(ticketId, selectedIds);
      if (res.success) {
        toast.success(`Массовый перезапуск: обработано ${res.processedCount} заказов.`);
        if (res.errors.length > 0) {
          res.errors.forEach(err => toast.error(err));
        }
        setSelectedIds([]);
      } else {
        toast.error('Произошла непредвиденная ошибка');
      }
    });
  };

  const handleBulkRefund = () => {
    if (selectedIds.length === 0) return;
    startTransition(async () => {
      const res = await bulkRefundOrdersAction(ticketId, selectedIds);
      if (res.success) {
        toast.success(`Массовый частичный возврат: возвращено ${res.totalRefundedAmount} ₽ по ${res.processedCount} заказам.`);
        if (res.errors.length > 0) {
          res.errors.forEach(err => toast.error(err));
        }
        setSelectedIds([]);
      } else {
        toast.error('Произошла непредвиденная ошибка');
      }
    });
  };

  return (
    <div className="p-4 border-b border-border bg-card select-none">
      <div 
        className="bg-muted/10 border border-border/85 space-y-4"
        style={{
          borderRadius: figmaStyles.layout.borderRadiusCard,
          padding: figmaStyles.layout.paddingCard
        }}
      >
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-black text-foreground flex items-center gap-2">
              <span>📦 Прикрепленные заказы B2B ({orders.length})</span>
              {isB2bClient && (
                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-[9px] font-black uppercase select-none animate-pulse">
                  B2B Безлимит
                </span>
              )}
            </span>
            {selectedIds.length > 0 && (
              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full select-none">
                Выбрано: {selectedIds.length}
              </span>
            )}
            
            {orders.length > 0 && (
              <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer select-none min-h-[44px] px-1">
                <div className="flex items-center justify-center min-h-[44px] min-w-[44px]">
                  <input 
                    type="checkbox"
                    checked={selectedIds.length === orders.length && orders.length > 0}
                    onChange={handleSelectAll}
                    className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer min-h-[36px] min-w-[36px]"
                  />
                </div>
                <span>Выбрать все</span>
              </label>
            )}
          </div>
          
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                intent="primary"
                size="sm"
                onClick={handleBulkRefill}
                disabled={isPending}
                className="h-11 min-h-[44px] px-4 text-[11px] font-bold flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer transition-all duration-200"
                style={{
                  borderRadius: figmaStyles.layout.miniAppButtonRadius,
                  padding: figmaStyles.layout.miniAppButtonPadding
                }}
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Массовый докрут</span>
              </Button>
              <Button
                intent="destructive"
                size="sm"
                onClick={handleBulkRefund}
                disabled={isPending}
                className="h-11 min-h-[44px] px-4 text-[11px] font-bold flex items-center gap-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer transition-all duration-200"
                style={{
                  borderRadius: figmaStyles.layout.miniAppButtonRadius,
                  padding: figmaStyles.layout.miniAppButtonPadding
                }}
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                <span>Массовый возврат</span>
              </Button>
            </div>
          )}
        </div>

        {/* Card-based Premium Grid instead of Legacy Table */}
        <div className="max-h-[220px] overflow-y-auto custom-scrollbar p-0.5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {orders.map((o) => {
              const isSelected = selectedIds.includes(o.id);
              return (
                <div 
                  key={o.id}
                  onClick={() => handleSelectRow(o.id)}
                  className={`relative p-3.5 border rounded-xl cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'border-primary shadow-sm' 
                      : 'border-border hover:border-border/80'
                  }`}
                  style={{
                    backgroundColor: isSelected 
                      ? (isDark ? '#2b5278/20' : '#2481cc/10')
                      : cardBg
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox Area expanded to at least 44x44px touch target */}
                    <div 
                      className="flex items-center justify-center min-h-[44px] min-w-[44px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRow(o.id);
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        readOnly
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer min-h-[36px] min-w-[36px] pointer-events-none"
                      />
                    </div>

                    {/* Content Block */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span className="font-mono font-black text-xs text-foreground shrink-0">
                          #{o.numericId}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border shrink-0 ${
                          o.status === 'COMPLETED' ? 'bg-success/10 text-success border-emerald-500/20' :
                          o.status === 'IN_PROGRESS' ? 'bg-primary/10 text-primary border-primary/20' :
                          o.status === 'PENDING' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          'bg-muted text-foreground border-border'
                        }`}>
                          {o.status === 'COMPLETED' ? 'Выполнен' :
                           o.status === 'IN_PROGRESS' ? 'В работе' :
                           o.status === 'PENDING' ? 'В очереди' : o.status}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-foreground truncate mb-1" title={o.serviceName}>
                        {o.serviceName}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold gap-2">
                        <div>
                          Остаток: <span className="font-bold text-foreground">{o.remains} / {o.quantity}</span>
                        </div>
                        <div className="font-black text-foreground">
                          {(o.charge / 100).toFixed(2)} ₽
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface UnifiedTicketsWorkspaceProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tickets: any[];
  totalPages: number;
  currentPage: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeTicket: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templates: any[];
  supportLimitCents: number;
  supportSpentTodayCents?: number;
  currentStatus: string;
  currentSearch: string;
}

const formatTicketDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return '';
  }
};

const renderSourceBadge = (source: string) => {
  const s = source?.toUpperCase();
  if (s === 'TELEGRAM') {
    return (
      <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full border-2 border-card bg-background flex items-center justify-center shadow-xs" title="Telegram">
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-[#24A1DE] fill-current">
          <path d="M9.78 18.65c-.23 0-.38-.1-.47-.3L7.1 14.15l8.63-7.55c.1-.08.2-.08.26-.01.06.07.05.18-.03.26l-6.84 6.17-.02 4.69c.01.42.27.73.68.73.23 0 .42-.1.58-.26l2.19-2.1 4.22 3.12c.57.42 1.12.21 1.29-.48l3.15-14.85c.19-.79-.31-1.15-.99-.87L2.1 10.3c-.76.3-.75.73-.13.92l4.66 1.45 10.79-6.8c.51-.31.98-.14.6.2l-8.75 7.89-.34 4.29c-.04.26-.2.4-.45.4z" />
        </svg>
      </span>
    );
  }
  if (s === 'EMAIL') {
    return (
      <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full border-2 border-card bg-background flex items-center justify-center shadow-xs" title="Email">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-rose-500">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </span>
    );
  }
  if (s === 'VK') {
    return (
      <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full border-2 border-card bg-background flex items-center justify-center shadow-xs" title="VK">
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-[#0077FF] fill-current">
          <path d="M15.63 21.6c.15-.31.3-.61.4-.92.35-1.07.67-2.14 1-3.21.13-.42.34-.63.78-.65 1.16-.04 2.32-.01 3.48-.03.54-.01.9-.3.94-.78.06-.72-.11-1.39-.51-2.01-.84-1.28-1.75-2.52-2.61-3.79-.14-.2-.14-.37 0-.58.74-1.06 1.49-2.12 2.21-3.2.56-.84.81-1.76.43-2.75-.24-.63-.73-.91-1.42-.91-1.44.01-2.88 0-4.32.01-.4. 0-.66.19-.81.56-.6 1.46-1.26 2.89-1.95 4.31-.13.26-.29.38-.58.33-.29-.05-.44-.22-.44-.52 0-1.57-.01-3.14.01-4.71 0-.68-.31-1.06-.96-1.12-.55-.05-1.11-.02-1.66-.02-1.47 0-2.64.49-3.22 1.62-.09.18-.08.38.16.48.24.1.48.13.7.27.42.27.56.67.57 1.16.03 1.58.01 3.16.02 4.74 0 .34-.14.54-.42.61-.26.06-.45-.04-.61-.24-.87-1.1-1.63-2.29-2.39-3.48-.25-.39-.5-.78-.77-1.15-.22-.31-.5-.46-.89-.45-1.28.01-2.56 0-3.84.01-.48 0-.81.25-.86.69-.07.63.15 1.18.49 1.7.94 1.44 1.88 2.88 2.84 4.31.95 1.42 1.94 2.82 2.94 4.2.82 1.12 1.81 1.98 3.11 2.37.58.17 1.18.23 1.79.23 1.34-.01 2.68-.01 4.02-.01.44 0 .72-.2.8-.62z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full border-2 border-card bg-background flex items-center justify-center shadow-xs" title="Web">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-indigo-500">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    </span>
  );
};

export function UnifiedTicketsWorkspace({
  tickets,
  totalPages,
  currentPage,
  stats,
  activeTicket,
  templates,
  supportLimitCents,
  supportSpentTodayCents = 0,
  currentStatus,
  currentSearch
}: UnifiedTicketsWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [showProfile, setShowProfile] = useState(false);
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [searchVal, setSearchVal] = useState(currentSearch);
  const [isPending, startTransition] = useTransition();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const isDark = mounted ? (theme?.includes('dark') || theme === 'dark') : true;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const headerBg = isDark
    ? figmaStyles.colors.miniAppHeaderBackground.dark
    : figmaStyles.colors.miniAppHeaderBackground.light;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const headerTextColor = figmaStyles.colors.miniAppHeaderTextColor;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const inputBg = isDark
    ? figmaStyles.colors.miniAppInputBackground.dark
    : figmaStyles.colors.miniAppInputBackground.light;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const cardBg = isDark
    ? figmaStyles.colors.miniAppCardBackground.dark
    : figmaStyles.colors.miniAppCardBackground.light;


  // Sync selectedOrder when activeTicket changes
  useEffect(() => {
    if (activeTicket) {
      setSelectedOrder(activeTicket.order);
    } else {
      setSelectedOrder(null);
    }
  }, [activeTicket]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 1. Sync searchVal with prop update
  useEffect(() => {
    setSearchVal(currentSearch);
  }, [currentSearch]);

  // 2. Keyboard / visual viewport adjustments for mobile
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportChange = () => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
    };
  }, []);

  // 3. Navigation / filter helpers
  const handleSelectTicket = (ticketId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('ticketId', ticketId);
    router.push(`/admin/tickets?${params.toString()}`);
  };

  const handleClearActiveTicket = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('ticketId');
    router.push(`/admin/tickets?${params.toString()}`);
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    params.delete('page'); // Reset pagination on filter change
    router.push(`/admin/tickets?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchVal) {
      params.set('q', searchVal);
    } else {
      params.delete('q');
    }
    params.delete('page');
    router.push(`/admin/tickets?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/admin/tickets?${params.toString()}`);
  };

  // 4. Support bridge handler
  const handleProviderSupportBridge = (e: React.MouseEvent) => {
    e.stopPropagation();
    const order = selectedOrder;
    if (!order || !order.externalId) return;

    navigator.clipboard.writeText(order.externalId);
    toast.success(`Внешний ID ${order.externalId} скопирован в буфер обмена`);

    let providerUrl = 'https://smmprovider.com/tickets';
    if (order.provider?.apiUrl) {
      try {
        const url = new URL(order.provider.apiUrl);
        providerUrl = `${url.protocol}//${url.hostname}/tickets`;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        // use fallback
      }
    }
    window.open(providerUrl, '_blank');
  };

  // 5. Order Action Handlers
  const handleCancelOrder = () => {
    if (!selectedOrder) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('orderId', selectedOrder.id);
      const res = await cancelOrderAction(fd);
      if (res.success) {
        toast.success('Заказ отменен успешно');
        setIsOrderDrawerOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Ошибка отмены заказа');
      }
    });
  };

  const handleRestartOrder = () => {
    if (!selectedOrder) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('orderId', selectedOrder.id);
      const res = await restartOrderAction(fd);
      if (res.success) {
        toast.success('Заказ перезапущен успешно');
        setIsOrderDrawerOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Ошибка перезапуска заказа');
      }
    });
  };

  // 6. Open Order Drawer Helper
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleOpenOrderDrawer = (order: any) => {
    setSelectedOrder(order);
    setIsOrderDrawerOpen(true);
  };

  return (
    <div className="tickets-workspace flex flex-1 overflow-hidden h-[100dvh] max-h-[100dvh] bg-background text-foreground">
      {/* ── LEFT PANEL: Tickets List (Hide on mobile if ticket is active) ── */}
      {/* ── LEFT PANEL: Tickets List (Hide on mobile if ticket is active) ── */}
      {(!isMobile || !activeTicket) && (
        <div 
          className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border-r border-border flex flex-col h-full select-none bg-background/50"
        >
          {/* List Header */}
          <div className="p-4 border-b border-border space-y-3 bg-card text-card-foreground">
            <div className="flex items-center justify-between">
              <h1 className="font-black text-base flex items-center gap-2">
                <Headphones className="w-5 h-5 text-primary" />
                <span>Обращения</span>
              </h1>
              <div className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                {stats.open} открытых
              </div>
            </div>

            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Поиск по теме, почте, ID..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-border rounded-xl text-foreground outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all bg-muted"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/60" />
            </form>

            {/* Status Pills */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              {[
                { label: 'Все', value: 'ALL' },
                { label: 'Открытые', value: 'OPEN' },
                { label: 'Ожидают', value: 'PENDING' },
                { label: 'Закрытые', value: 'CLOSED' }
              ].map((pill) => {
                const isActive = currentStatus === pill.value;
                return (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => handleStatusFilter(pill.value)}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors whitespace-nowrap min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer ${
                      isActive 
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                        : 'bg-muted text-foreground hover:bg-muted-foreground/10'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards List container */}
          <div className="flex-grow overflow-y-auto flex flex-col gap-1 p-2 custom-scrollbar bg-background/50">
            {tickets.map((ticket) => {
              const isActive = activeTicket?.id === ticket.id;
              const lastMsg = ticket.messages?.[0]?.text || "Нет сообщений";
              const croppedMsg = lastMsg.length > 55 ? `${lastMsg.substring(0, 55)}...` : lastMsg;

              return (
                <div 
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket.id)}
                  className={`mx-1 my-0.5 p-3 rounded-xl cursor-pointer transition-all duration-200 flex flex-col select-none border-l-4 ${
                    isActive 
                      ? 'bg-secondary/40 text-secondary-foreground border-l-primary' 
                      : 'bg-card text-foreground border-l-transparent hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Premium Circular Avatar */}
                    <div className="relative w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-xs shrink-0 select-none">
                      {ticket.user.email.substring(0, 2).toUpperCase()}
                      {/* Social Network Icon Badge based on ticket source */}
                      {renderSourceBadge(ticket.source)}
                    </div>
                    
                    {/* Content Block */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-bold text-foreground truncate max-w-[100px] sm:max-w-[145px]" title={ticket.user.email}>
                            {ticket.user.email}
                          </span>
                          {ticket.user.b2bConfig?.isB2b && (
                            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-[8px] font-black uppercase shrink-0 select-none">
                              Priority B2B
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-medium text-muted-foreground shrink-0">
                          {formatTicketDate(ticket.updatedAt)}
                        </span>
                      </div>
                      
                      <span className="block text-xs font-bold text-foreground truncate mb-0.5" title={ticket.subject}>
                        {ticket.subject}
                      </span>
                      
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-[11px] text-muted-foreground truncate leading-normal flex-1">
                          {croppedMsg}
                        </p>
                        
                        {/* Circular Unread Badge */}
                        {ticket.status === 'OPEN' && (
                          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-black shrink-0 shadow-sm animate-pulse" title="Ожидает ответа оператора">
                            !
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {tickets.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Диалоги не найдены
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-border flex items-center justify-between shrink-0 bg-card select-none">
              <Button
                intent="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="h-8 min-h-[44px] min-w-[44px] touch-target-expand"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                {currentPage} / {totalPages}
              </span>
              <Button
                intent="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="h-8 min-h-[44px] min-w-[44px] touch-target-expand"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── RIGHT PANEL: Active Ticket Details (Hide on mobile if no ticket is active) ── */}
      {(!isMobile || activeTicket) && (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
          {activeTicket ? (
            <div className="flex flex-1 overflow-hidden h-full">
              {/* Main Chat Panel Container */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header block */}
                <div className="p-4 border-b border-border flex justify-between items-center shrink-0 bg-card text-card-foreground">
                  <div className="flex items-center gap-3 min-w-0">
                    {isMobile && (
                      <Button
                        intent="ghost"
                        size="sm"
                        onClick={handleClearActiveTicket}
                        className="mr-1 min-h-[44px] min-w-[44px] touch-target-expand rounded-full p-0 flex items-center justify-center cursor-pointer text-foreground hover:bg-muted"
                      >
                        <ChevronLeft className="w-5 h-5 text-foreground" />
                      </Button>
                    )}
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-xs border border-border text-foreground bg-muted">
                      {activeTicket.user.email.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-black text-xs leading-tight mb-1 truncate max-w-[130px] xs:max-w-[180px] sm:max-w-xs text-foreground" title={activeTicket.subject}>
                        {activeTicket.subject}
                      </h2>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-[10px] font-bold">
                        <span className="flex items-center gap-1 truncate max-w-[140px] sm:max-w-none text-muted-foreground" title={activeTicket.user.email}>
                          <Mail className="w-3 h-3 shrink-0 text-muted-foreground" /> <span className="truncate text-muted-foreground">{activeTicket.user.email}</span>
                        </span>
                        <span className="hidden sm:inline w-1 h-1 rounded-full bg-border shrink-0" />
                        <span className="text-foreground flex items-center gap-1 px-1.5 py-0.5 bg-muted border border-border rounded-md shrink-0 w-max">
                          <Wallet className="w-3 h-3 shrink-0 text-muted-foreground" /> {formatBalance(activeTicket.user.balance)}
                        </span>
                        {activeTicket.user.totalSpent !== undefined && (
                          <>
                            <span className="hidden sm:inline w-1 h-1 rounded-full bg-border shrink-0" />
                            <span className="text-foreground flex items-center gap-1 px-1.5 py-0.5 bg-muted border border-border rounded-md shrink-0 w-max" title="Общий объем покупок клиента (LTV)">
                              LTV: {formatBalance(Number(activeTicket.user.totalSpent))}
                            </span>
                          </>
                        )}
                        <span className="hidden sm:inline w-1 h-1 rounded-full bg-border shrink-0" />
                        <a
                          href={`/admin/orders?userId=${activeTicket.user.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground hover:bg-muted flex items-center gap-1 px-1.5 py-0.5 bg-muted border border-border rounded-md shrink-0 w-max transition-all duration-200"
                          title="Открыть все заказы клиента"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span>Все заказы</span>
                        </a>
                        {activeTicket.user.b2bConfig?.isB2b && (
                          <>
                            <span className="hidden sm:inline w-1 h-1 rounded-full bg-border shrink-0" />
                            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-[9px] font-black uppercase shrink-0 animate-pulse select-none" title="Приоритетный B2B клиент">
                              Priority B2B
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Center associated order widget */}
                  {activeTicket.order && (
                    <div className="hidden md:flex items-center justify-center flex-1 px-4">
                      <button
                        type="button"
                        onClick={() => handleOpenOrderDrawer(activeTicket.order)}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/30 transition-all duration-200 cursor-pointer shadow-sm text-xs font-bold"
                        title="Управление прикрепленным заказом"
                      >
                        <span className="flex items-center gap-1.5">
                          <span>📦 Связанный заказ #{activeTicket.order.numericId}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            activeTicket.order.status === 'COMPLETED' ? 'bg-success/15 text-success border-emerald-500/20' :
                            activeTicket.order.status === 'IN_PROGRESS' ? 'bg-primary/15 text-primary border-primary/20' :
                            activeTicket.order.status === 'PENDING' ? 'bg-amber-500/15 text-amber-600 border-amber-500/20' :
                            'bg-muted text-foreground border-border'
                          }`}>
                            {activeTicket.order.status === 'COMPLETED' ? 'Выполнен' :
                             activeTicket.order.status === 'IN_PROGRESS' ? 'В работе' :
                             activeTicket.order.status === 'PENDING' ? 'В очереди' : activeTicket.order.status}
                          </span>
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Header Actions */}
                  <div className="flex items-center gap-1">
                    <TicketActionsDropdown
                      ticketId={activeTicket.id}
                      currentStatus={activeTicket.status}
                      templates={templates}
                      supportLimitCents={supportLimitCents}
                    />
                    <Button
                      intent="ghost"
                      onClick={() => setShowProfile(!showProfile)}
                      className="min-h-[44px] min-w-[44px] touch-target-expand rounded-xl p-0 flex items-center justify-center cursor-pointer text-white hover:bg-white/10"
                      title="Профиль клиента"
                    >
                      <Info className="w-5 h-5 text-white" />
                    </Button>
                  </div>
                </div>

                {/* Attached Order Banner */}
                {activeTicket.order && (
                  <div className="p-3 border-b border-border bg-card shrink-0 select-none">
                    <div 
                      onClick={() => handleOpenOrderDrawer(activeTicket.order)}
                      className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm cursor-pointer hover:bg-primary/10 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0">
                          📦
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground">Заказ #{activeTicket.order.numericId}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              activeTicket.order.status === 'COMPLETED' ? 'bg-success/10 text-success' :
                              activeTicket.order.status === 'IN_PROGRESS' ? 'bg-primary/10 text-primary' :
                              activeTicket.order.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                              'bg-muted text-foreground'
                            }`}>
                              {activeTicket.order.status === 'COMPLETED' ? 'Выполнен' :
                               activeTicket.order.status === 'IN_PROGRESS' ? 'В работе' :
                               activeTicket.order.status === 'PENDING' ? 'В очереди' : activeTicket.order.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate max-w-sm sm:max-w-md">{activeTicket.order.serviceName}</p>
                        </div>
                      </div>
                      
                      {/* Desktop Order Actions */}
                      {!isMobile && (
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-[10px] text-muted-foreground text-right">
                            <div>Дата: {new Date(activeTicket.order.createdAt).toLocaleDateString('ru-RU')}</div>
                            <div className="font-bold text-foreground mt-0.5">{(Number(activeTicket.order.charge) / 100).toFixed(2)} ₽</div>
                          </div>
                          <div className="flex gap-2">
                            {['PENDING', 'AWAITING_PAYMENT', 'IN_PROGRESS', 'ERROR'].includes(activeTicket.order.status) && (
                              <Button
                                intent="destructive"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleCancelOrder(); }}
                                disabled={isPending}
                                className="min-h-[44px] touch-target-expand px-3 py-1 cursor-pointer bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                style={{
                                  borderRadius: figmaStyles.layout.miniAppButtonRadius,
                                  padding: figmaStyles.layout.miniAppButtonPadding
                                }}
                              >
                                Отменить
                              </Button>
                            )}
                            {['CANCELED', 'ERROR'].includes(activeTicket.order.status) && (
                              <Button
                                intent="primary"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleRestartOrder(); }}
                                disabled={isPending}
                                className="min-h-[44px] touch-target-expand px-3 py-1 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
                                style={{
                                  borderRadius: figmaStyles.layout.miniAppButtonRadius,
                                  padding: figmaStyles.layout.miniAppButtonPadding
                                }}
                              >
                                Перезапустить
                              </Button>
                            )}
                            {activeTicket.order.externalId && (
                              <Button
                                intent="outline"
                                size="sm"
                                onClick={handleProviderSupportBridge}
                                className="min-h-[44px] touch-target-expand px-3 py-1 flex items-center gap-1 cursor-pointer border-border text-foreground hover:bg-muted"
                                style={{
                                  borderRadius: figmaStyles.layout.miniAppButtonRadius,
                                  padding: figmaStyles.layout.miniAppButtonPadding
                                }}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>В тикеты</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* B2B Attached Orders Grid (Multiple parsed orders) */}
                {activeTicket.attachedOrders && activeTicket.attachedOrders.length > 0 && (
                  <AttachedOrdersGrid 
                    orders={activeTicket.attachedOrders}
                    ticketId={activeTicket.id}
                    isB2bClient={!!activeTicket.user.b2bConfig?.isB2b}
                  />
                )}

                {/* Chat window body */}
                <div ref={messagesContainerRef} className="flex-grow bg-muted/15 relative overflow-hidden flex flex-col">
                  <ChatWindow
                    ticketId={activeTicket.id}
                    initialMessages={activeTicket.messages}
                    isStaff={true}
                    initialTemplates={templates}
                    onSendMessage={adminReplyTicket}
                    editTicketMessage={editTicketMessage}
                    initialNextCursor={activeTicket.nextCursor}
                    onSelectOrder={handleOpenOrderDrawer}
                    clientEmail={activeTicket.user.email}
                  />
                </div>
              </div>

              {/* ── RIGHT PANEL: Collapsible Client Profile (Desktop side display) ── */}
              {!isMobile && showProfile && (
                <div className="w-[340px] shrink-0 border-l border-border h-full bg-card overflow-y-auto animate-in slide-in-from-right duration-300">
                  <ClientProfileSidebar 
                    ticketId={activeTicket.id}
                    supportLimitCents={supportLimitCents}
                    supportSpentTodayCents={supportSpentTodayCents}
                    onClose={() => setShowProfile(false)}
                    isMobile={false}
                    user={{
                      ...activeTicket.user,
                      balance: Number(activeTicket.user.balance),
                      totalSpent: Number(activeTicket.user.totalSpent),
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      orders: activeTicket.user.orders.map((o: any) => ({ ...o, charge: Number(o.charge) })),
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      payments: activeTicket.user.payments.map((p: any) => ({ ...p, amount: Number(p.amount) }))
                    }}
                  />
                </div>
              )}

              {/* ── RIGHT PANEL: Collapsible Client Profile (Mobile slide-over Drawer) ── */}
              {isMobile && (
                <Drawer isOpen={showProfile} onOpenChange={setShowProfile}>
                  <Drawer.Content placement="right" className="max-w-[340px] w-full h-full bg-card p-0">
                    {() => (
                      <Drawer.Body className="p-0 overflow-y-auto bg-card">
                        <ClientProfileSidebar 
                          ticketId={activeTicket.id}
                          supportLimitCents={supportLimitCents}
                          supportSpentTodayCents={supportSpentTodayCents}
                          onClose={() => setShowProfile(false)}
                          isMobile={true}
                          user={{
                            ...activeTicket.user,
                            balance: Number(activeTicket.user.balance),
                            totalSpent: Number(activeTicket.user.totalSpent),
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            orders: activeTicket.user.orders.map((o: any) => ({ ...o, charge: Number(o.charge) })),
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            payments: activeTicket.user.payments.map((p: any) => ({ ...p, amount: Number(p.amount) }))
                          }}
                        />
                      </Drawer.Body>
                    )}
                  </Drawer.Content>
                </Drawer>
              )}

              {/* ── ORDER DETAILS & ACTIONS DRAWER (Mobile and Desktop) ── */}
              {selectedOrder && (
                <Drawer isOpen={isOrderDrawerOpen} onOpenChange={setIsOrderDrawerOpen}>
                  <Drawer.Content placement={isMobile ? "bottom" : "right"} className={isMobile ? "max-h-[80dvh] rounded-t-3xl pb-[env(safe-area-inset-bottom)] bg-card" : "max-w-[400px] w-full h-full bg-card p-0"}>
                    {() => (
                      <>
                        {isMobile && (
                          <div className="w-full flex justify-center pt-3 pb-1 touch-none">
                            <div className="w-12 h-1.5 bg-muted rounded-full" />
                          </div>
                        )}
                        <Drawer.Header className="px-6 py-4 shrink-0 border-b border-border">
                          <h2 className="text-base font-black text-foreground">Заказ #{selectedOrder.numericId}</h2>
                          <div className="text-[10px] text-muted-foreground font-bold mt-0.5">
                            Создан: {new Date(selectedOrder.createdAt).toLocaleString('ru-RU')}
                          </div>
                        </Drawer.Header>
                        <Drawer.Body className="px-6 py-4 overflow-y-auto overscroll-contain space-y-4 bg-card">
                          <div className="bg-muted/30 border border-border p-4 rounded-2xl">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-[9px] uppercase font-bold text-muted-foreground mb-0.5">Статус</div>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                  selectedOrder.status === 'COMPLETED' ? 'bg-success/10 text-success border-emerald-500/20' :
                                  selectedOrder.status === 'IN_PROGRESS' ? 'bg-primary/10 text-primary border-primary/20' :
                                  'bg-muted text-foreground border-border'
                                }`}>
                                  {selectedOrder.status === 'COMPLETED' ? 'Выполнен' :
                                   selectedOrder.status === 'IN_PROGRESS' ? 'В работе' :
                                   selectedOrder.status === 'PENDING' ? 'В очереди' : selectedOrder.status}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-[9px] uppercase font-bold text-muted-foreground mb-0.5">Цена</div>
                                <div className="text-sm font-black text-foreground">
                                  {(Number(selectedOrder.charge) / 100).toFixed(2)} ₽
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Название услуги</span>
                            <div className="text-xs font-semibold text-foreground leading-normal">{selectedOrder.serviceName || selectedOrder.service?.name}</div>
                          </div>

                          {selectedOrder.link && (
                            <div>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Ссылка заказа</span>
                              <a 
                                href={selectedOrder.link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-xs font-bold text-primary flex items-center gap-1 hover:underline break-all"
                              >
                                {selectedOrder.link}
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              </a>
                            </div>
                          )}

                          {selectedOrder.externalId && (
                            <div>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Внешний ID (Провайдер)</span>
                              <code className="text-xs font-mono bg-muted px-2 py-1 rounded border border-border">{selectedOrder.externalId}</code>
                            </div>
                          )}

                          <div className="flex flex-col gap-2 pt-3">
                            {['PENDING', 'AWAITING_PAYMENT', 'IN_PROGRESS', 'ERROR'].includes(selectedOrder.status) && (
                              <Button
                                intent="destructive"
                                onClick={handleCancelOrder}
                                disabled={isPending}
                                className="w-full min-h-[44px] flex items-center justify-center text-xs font-bold cursor-pointer bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Отменить заказ'}
                              </Button>
                            )}
                            {['CANCELED', 'ERROR'].includes(selectedOrder.status) && (
                              <Button
                                intent="primary"
                                onClick={handleRestartOrder}
                                disabled={isPending}
                                className="w-full min-h-[44px] flex items-center justify-center text-xs font-bold cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
                              >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Перезапустить заказ'}
                              </Button>
                            )}
                            {selectedOrder.externalId && (
                              <Button
                                intent="outline"
                                onClick={handleProviderSupportBridge}
                                className="w-full min-h-[44px] flex items-center justify-center text-xs font-bold gap-1.5 cursor-pointer border-border text-foreground hover:bg-muted"
                              >
                                <ExternalLink className="w-4 h-4" />
                                <span>В тикеты провайдера</span>
                              </Button>
                            )}
                          </div>
                        </Drawer.Body>
                      </>
                    )}
                  </Drawer.Content>
                </Drawer>
              )}
            </div>
          ) : (
            // ── PREMIUM EMPTY STATE ──
            <div className="hidden lg:flex flex-col flex-grow items-center justify-center text-center p-8 bg-background select-none">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 animate-bounce">
                🎧
              </div>
              <h3 className="font-bold text-foreground text-sm">Выберите диалог</h3>
              <p className="text-muted-foreground text-xs max-w-xs mt-1 leading-normal">
                Выберите обращение в левом меню для просмотра подробностей и начала общения с пользователем.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
