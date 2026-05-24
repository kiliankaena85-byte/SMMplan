'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Headphones, 
  Search, 
  User, 
  ExternalLink, 
  Mail, 
  Wallet, 
  Loader2, 
  MessageSquare, 
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { formatBalance } from '@/lib/utils';
import { adminReplyTicket, editTicketMessage } from '@/actions/support/ticket';
import { cancelOrderAction, restartOrderAction } from '@/actions/admin/orders';
import ChatWindow from '@/components/support/ChatWindow';
import ClientProfileSidebar from '@/components/support/ClientProfileSidebar';
import TicketActionsDropdown from '@/components/support/TicketActionsDropdown';
import { Drawer, DrawerContent, DrawerBody, DrawerHeader } from '@heroui/react';
import { Button } from '@/components/ui/button';

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

interface UnifiedTicketsWorkspaceProps {
  tickets: any[];
  totalPages: number;
  currentPage: number;
  stats: any;
  activeTicket: any | null;
  templates: any[];
  supportLimitCents: number;
  supportSpentTodayCents?: number;
  currentStatus: string;
  currentSearch: string;
}

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
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [searchVal, setSearchVal] = useState(currentSearch);
  const [isPending, startTransition] = useTransition();

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
  const handleOpenOrderDrawer = (order: any) => {
    setSelectedOrder(order);
    setIsOrderDrawerOpen(true);
  };

  return (
    <div className="flex flex-1 overflow-hidden h-[100dvh] max-h-[100dvh] bg-warm-bg text-warm-text">
      {/* ── LEFT PANEL: Tickets List (Hide on mobile if ticket is active) ── */}
      {(!isMobile || !activeTicket) && (
        <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border-r border-warm-border flex flex-col h-full bg-warm-card select-none">
          {/* List Header */}
          <div className="p-4 border-b border-warm-border space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="font-black text-base text-warm-text flex items-center gap-2">
                <Headphones className="w-5 h-5 text-warm-accent" />
                <span>Обращения</span>
              </h1>
              <div className="text-xs font-bold text-muted-foreground bg-warm-zinc px-2.5 py-0.5 rounded-full">
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
                className="w-full pl-9 pr-4 py-2 text-xs border border-warm-border rounded-xl bg-warm-bg text-warm-text outline-none focus:ring-1 focus:ring-warm-accent focus:border-transparent transition-all"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
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
                        ? 'bg-warm-accent text-white hover:bg-warm-accent-hover' 
                        : 'bg-warm-zinc text-warm-text hover:bg-warm-border'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards List container */}
          <div className="flex-grow overflow-y-auto divide-y divide-warm-border custom-scrollbar">
            {tickets.map((ticket) => {
              const isActive = activeTicket?.id === ticket.id;
              const lastMsg = ticket.messages?.[0]?.text || "Нет сообщений";
              const croppedMsg = lastMsg.length > 55 ? `${lastMsg.substring(0, 55)}...` : lastMsg;
              const statusColor = 
                ticket.status === 'OPEN' ? 'bg-destructive animate-pulse' : 
                ticket.status === 'PENDING' ? 'bg-warning' : 'bg-success';

              return (
                <div 
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket.id)}
                  className={`p-4 cursor-pointer transition-all duration-200 ${
                    isActive ? 'bg-warm-accent/10 border-l-4 border-l-warm-accent' : 'hover:bg-warm-zinc/50 bg-warm-card'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative w-9 h-9 rounded-xl bg-warm-zinc flex items-center justify-center font-bold text-warm-text text-xs shrink-0 select-none">
                      {ticket.user.email.substring(0, 2).toUpperCase()}
                      <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${statusColor} border-2 border-warm-card`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="text-[11px] font-bold text-warm-text truncate max-w-[130px]" title={ticket.user.email}>
                          {ticket.user.email}
                        </span>
                        <span className="text-[9px] text-muted-foreground shrink-0">
                          {new Date(ticket.updatedAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      <span className="block text-xs font-bold text-warm-text truncate mb-1" title={ticket.subject}>
                        {ticket.subject}
                      </span>
                      <p className="text-[11px] text-muted-foreground truncate leading-normal">
                        {croppedMsg}
                      </p>
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
            <div className="p-3 border-t border-warm-border flex items-center justify-between shrink-0 bg-warm-card select-none">
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
        <div className="flex-1 flex flex-col h-full bg-warm-bg overflow-hidden">
          {activeTicket ? (
            <div className="flex flex-1 overflow-hidden h-full">
              {/* Main Chat Panel Container */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header block */}
                <div className="p-4 border-b border-warm-border bg-warm-card flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    {isMobile && (
                      <Button
                        intent="ghost"
                        size="sm"
                        onClick={handleClearActiveTicket}
                        className="mr-1 min-h-[44px] min-w-[44px] touch-target-expand rounded-full p-0 flex items-center justify-center cursor-pointer"
                      >
                        <ChevronLeft className="w-5 h-5 text-warm-text" />
                      </Button>
                    )}
                    <div className="w-10 h-10 rounded-2xl bg-warm-accent/10 text-warm-accent flex items-center justify-center shrink-0 font-black text-xs border border-warm-accent/20">
                      {activeTicket.user.email.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-black text-xs text-warm-text leading-tight mb-1 truncate max-w-[200px] sm:max-w-xs" title={activeTicket.subject}>
                        {activeTicket.subject}
                      </h2>
                      <div className="flex items-center gap-2 text-[10px] font-bold">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {activeTicket.user.email}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-warm-border shrink-0" />
                        <span className="text-warm-accent flex items-center gap-1 px-1.5 py-0.5 bg-warm-accent/10 rounded-md shrink-0">
                          <Wallet className="w-3 h-3" /> {formatBalance(activeTicket.user.balance)}
                        </span>
                      </div>
                    </div>
                  </div>

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
                      className="min-h-[44px] min-w-[44px] touch-target-expand rounded-xl p-0 flex items-center justify-center cursor-pointer"
                      title="Профиль клиента"
                    >
                      <Info className="w-5 h-5 text-muted-foreground hover:text-warm-accent" />
                    </Button>
                  </div>
                </div>

                {/* Attached Order Banner */}
                {activeTicket.order && (
                  <div className="p-3 border-b border-warm-border bg-warm-card shrink-0 select-none">
                    <div 
                      onClick={() => handleOpenOrderDrawer(activeTicket.order)}
                      className="bg-warm-accent/5 border border-warm-accent/10 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm cursor-pointer hover:bg-warm-accent/10 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-warm-accent/10 text-warm-accent flex items-center justify-center font-bold text-base shrink-0">
                          📦
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-warm-text">Заказ #{activeTicket.order.numericId}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              activeTicket.order.status === 'COMPLETED' ? 'bg-success/10 text-success' :
                              activeTicket.order.status === 'IN_PROGRESS' ? 'bg-warm-accent/10 text-warm-accent' :
                              activeTicket.order.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                              'bg-warm-zinc text-warm-text'
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
                            <div className="font-bold text-warm-text mt-0.5">{(Number(activeTicket.order.charge) / 100).toFixed(2)} ₽</div>
                          </div>
                          <div className="flex gap-2">
                            {['PENDING', 'AWAITING_PAYMENT', 'IN_PROGRESS', 'ERROR'].includes(activeTicket.order.status) && (
                              <Button
                                intent="destructive"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleCancelOrder(); }}
                                disabled={isPending}
                                className="min-h-[44px] touch-target-expand px-3 py-1 cursor-pointer bg-rose-600 hover:bg-rose-700"
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
                                className="min-h-[44px] touch-target-expand px-3 py-1 cursor-pointer bg-warm-accent hover:bg-warm-accent-hover text-white"
                              >
                                Перезапустить
                              </Button>
                            )}
                            {activeTicket.order.externalId && (
                              <Button
                                intent="outline"
                                size="sm"
                                onClick={handleProviderSupportBridge}
                                className="min-h-[44px] touch-target-expand px-3 py-1 flex items-center gap-1 cursor-pointer border-warm-border text-warm-text hover:bg-warm-zinc"
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

                {/* Chat window body */}
                <div ref={messagesContainerRef} className="flex-grow bg-warm-zinc/30 relative overflow-hidden flex flex-col">
                  <ChatWindow
                    ticketId={activeTicket.id}
                    initialMessages={activeTicket.messages}
                    isStaff={true}
                    initialTemplates={templates}
                    onSendMessage={adminReplyTicket}
                    editTicketMessage={editTicketMessage}
                    initialNextCursor={activeTicket.nextCursor}
                    onSelectOrder={handleOpenOrderDrawer}
                  />
                </div>
              </div>

              {/* ── RIGHT PANEL: Collapsible Client Profile (Desktop side display) ── */}
              {!isMobile && showProfile && (
                <div className="w-[340px] shrink-0 border-l border-warm-border h-full bg-warm-card overflow-y-auto animate-in slide-in-from-right duration-300">
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
                      orders: activeTicket.user.orders.map((o: any) => ({ ...o, charge: Number(o.charge) })),
                      payments: activeTicket.user.payments.map((p: any) => ({ ...p, amount: Number(p.amount) }))
                    }}
                  />
                </div>
              )}

              {/* ── RIGHT PANEL: Collapsible Client Profile (Mobile slide-over Drawer) ── */}
              {isMobile && (
                <Drawer isOpen={showProfile} onOpenChange={setShowProfile}>
                  <DrawerContent placement="right" className="max-w-[340px] w-full h-full bg-warm-card p-0">
                    {() => (
                      <DrawerBody className="p-0 overflow-y-auto bg-warm-card">
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
                            orders: activeTicket.user.orders.map((o: any) => ({ ...o, charge: Number(o.charge) })),
                            payments: activeTicket.user.payments.map((p: any) => ({ ...p, amount: Number(p.amount) }))
                          }}
                        />
                      </DrawerBody>
                    )}
                  </DrawerContent>
                </Drawer>
              )}

              {/* ── ORDER DETAILS & ACTIONS DRAWER (Mobile and Desktop) ── */}
              {selectedOrder && (
                <Drawer isOpen={isOrderDrawerOpen} onOpenChange={setIsOrderDrawerOpen}>
                  <DrawerContent placement={isMobile ? "bottom" : "right"} className={isMobile ? "max-h-[80dvh] rounded-t-3xl pb-[env(safe-area-inset-bottom)] bg-warm-card" : "max-w-[400px] w-full h-full bg-warm-card p-0"}>
                    {() => (
                      <>
                        {isMobile && (
                          <div className="w-full flex justify-center pt-3 pb-1 touch-none">
                            <div className="w-12 h-1.5 bg-warm-zinc rounded-full" />
                          </div>
                        )}
                        <DrawerHeader className="px-6 py-4 shrink-0 border-b border-warm-border">
                          <h2 className="text-base font-black text-warm-text">Заказ #{selectedOrder.numericId}</h2>
                          <div className="text-[10px] text-muted-foreground font-bold mt-0.5">
                            Создан: {new Date(selectedOrder.createdAt).toLocaleString('ru-RU')}
                          </div>
                        </DrawerHeader>
                        <DrawerBody className="px-6 py-4 overflow-y-auto overscroll-contain space-y-4 bg-warm-card">
                          <div className="bg-warm-zinc/35 border border-warm-border p-4 rounded-2xl">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-[9px] uppercase font-bold text-muted-foreground mb-0.5">Статус</div>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                  selectedOrder.status === 'COMPLETED' ? 'bg-success/10 text-success border-emerald-500/20' :
                                  selectedOrder.status === 'IN_PROGRESS' ? 'bg-warm-accent/10 text-warm-accent border-warm-accent/20' :
                                  'bg-warm-zinc text-warm-text border-warm-border'
                                }`}>
                                  {selectedOrder.status === 'COMPLETED' ? 'Выполнен' :
                                   selectedOrder.status === 'IN_PROGRESS' ? 'В работе' :
                                   selectedOrder.status === 'PENDING' ? 'В очереди' : selectedOrder.status}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-[9px] uppercase font-bold text-muted-foreground mb-0.5">Цена</div>
                                <div className="text-sm font-black text-warm-text">
                                  {(Number(selectedOrder.charge) / 100).toFixed(2)} ₽
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Название услуги</span>
                            <div className="text-xs font-semibold text-warm-text leading-normal">{selectedOrder.serviceName || selectedOrder.service?.name}</div>
                          </div>

                          {selectedOrder.link && (
                            <div>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Ссылка заказа</span>
                              <a 
                                href={selectedOrder.link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-xs font-bold text-warm-accent flex items-center gap-1 hover:underline break-all"
                              >
                                {selectedOrder.link}
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              </a>
                            </div>
                          )}

                          {selectedOrder.externalId && (
                            <div>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Внешний ID (Провайдер)</span>
                              <code className="text-xs font-mono bg-warm-zinc px-2 py-1 rounded border border-warm-border">{selectedOrder.externalId}</code>
                            </div>
                          )}

                          <div className="flex flex-col gap-2 pt-3">
                            {['PENDING', 'AWAITING_PAYMENT', 'IN_PROGRESS', 'ERROR'].includes(selectedOrder.status) && (
                              <Button
                                intent="destructive"
                                onClick={handleCancelOrder}
                                disabled={isPending}
                                className="w-full min-h-[44px] flex items-center justify-center text-xs font-bold cursor-pointer bg-rose-600 hover:bg-rose-700"
                              >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Отменить заказ'}
                              </Button>
                            )}
                            {['CANCELED', 'ERROR'].includes(selectedOrder.status) && (
                              <Button
                                intent="primary"
                                onClick={handleRestartOrder}
                                disabled={isPending}
                                className="w-full min-h-[44px] flex items-center justify-center text-xs font-bold cursor-pointer bg-warm-accent hover:bg-warm-accent-hover text-white"
                              >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Перезапустить заказ'}
                              </Button>
                            )}
                            {selectedOrder.externalId && (
                              <Button
                                intent="outline"
                                onClick={handleProviderSupportBridge}
                                className="w-full min-h-[44px] flex items-center justify-center text-xs font-bold gap-1.5 cursor-pointer border-warm-border text-warm-text hover:bg-warm-zinc"
                              >
                                <ExternalLink className="w-4 h-4" />
                                <span>В тикеты провайдера</span>
                              </Button>
                            )}
                          </div>
                        </DrawerBody>
                      </>
                    )}
                  </DrawerContent>
                </Drawer>
              )}
            </div>
          ) : (
            // ── PREMIUM EMPTY STATE ──
            <div className="hidden lg:flex flex-col flex-grow items-center justify-center text-center p-8 bg-warm-bg select-none">
              <div className="w-16 h-16 rounded-full bg-warm-accent/10 text-warm-accent flex items-center justify-center mb-4 animate-bounce">
                🎧
              </div>
              <h3 className="font-bold text-warm-text text-sm">Выберите диалог</h3>
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
