"use client";
import { useState, useEffect, useRef, useTransition } from 'react';
import { generateSmartReplyAction } from '@/actions/support/ticket';
import { Sparkles, Loader2, MessageSquare, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientDate } from '@/components/ui/client-date';

interface Message {
// ...
  id: string;
  sender: string;
  text: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  createdAt: string;
  isDeleted?: boolean;
  isEdited?: boolean;
  originalText?: string | null;
  replyTo?: { id: string, text: string, sender: string } | null;
  isHistorical?: boolean;
  historicalTicketId?: string;
  historicalSubject?: string;
  attachments?: Array<{
    id: string;
    url: string;
    type: string;
    mimeType: string;
    name: string;
    size?: number | null;
    createdAt: string;
  }>;
  orderId?: string | null;
  order?: {
    id: string;
    numericId: number;
    status: string;
    charge: number;
    createdAt: string;
    serviceName: string;
  } | null;
}

interface ChatWindowProps {
  ticketId: string;
  initialMessages: Message[];
  isStaff?: boolean;
  initialTemplates?: { id: string, label: string, text: string }[];
  // TODO: Bring back strict typing (e.g. Promise<void | ActionResponse>) once H5 (MessageAttachment) is stabilized.
  // Using Promise<any> as a temporary compromise to support direct Server Actions passing without wrappers.
  onSendMessage: (formData: FormData) => Promise<any>;
  editTicketMessage?: (formData: FormData) => Promise<any>;
  initialNextCursor?: string | null;
  isClosed?: boolean;
  initialOrders?: any[];
  onSelectOrder?: (order: any) => void;
}

const ImageZoomModal = ({ url, onClose }: { url: string; onClose: () => void }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setPosition({ x, y });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-foreground/95 flex items-center justify-center p-4 cursor-zoom-out backdrop-blur-sm" onClick={onClose}>
      <div 
        className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center overflow-hidden rounded-xl"
        onClick={(e) => {
          e.stopPropagation();
          setIsZoomed(!isZoomed);
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setIsZoomed(false)}
        style={{ cursor: isZoomed ? 'zoom-out' : 'zoom-in' }}
      >
        <img 
          src={`/api/media/${encodeURIComponent(url)}`} 
          alt="zoomed" 
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={
            isZoomed 
              ? { transform: 'scale(2.5)', transformOrigin: `${position.x}% ${position.y}%` }
              : { transform: 'scale(1)', transformOrigin: 'center center' }
          }
        />
      </div>
      <button className="absolute top-6 right-6 text-primary-foreground/50 text-4xl p-4 hover:text-primary-foreground transition-colors" aria-label="Закрыть">✕</button>
      {!isZoomed && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-foreground/50 text-primary-foreground/80 rounded-full text-sm font-medium backdrop-blur-md">
          Кликните для увеличения
        </div>
      )}
    </div>
  );
};

export default function ChatWindow({ ticketId, initialMessages, isStaff = false, initialTemplates = [], onSendMessage, editTicketMessage, initialNextCursor = null, isClosed = false, initialOrders = [], onSelectOrder }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrdersDropdown, setShowOrdersDropdown] = useState(false);
  const [isAiPending, startAiTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initialMessages prop to state (preserving temp optimistic messages)
  useEffect(() => {
    setMessages(prev => {
      const temps = prev.filter(m => m.id.startsWith('temp-'));
      return [...initialMessages, ...temps];
    });
  }, [initialMessages]);

  // U1.2 Fix: Track keyboard height via visualViewport API (iOS/Telegram WebView)
  const [kbOffset, setKbOffset] = useState(0);
  useEffect(() => {
    if (!window.visualViewport) return;
    const vp = window.visualViewport;
    const update = () => {
      const diff = window.innerHeight - vp.height;
      setKbOffset(diff > 0 ? diff : 0);
    };
    vp.addEventListener('resize', update);
    vp.addEventListener('scroll', update);
    update();
    return () => {
      vp.removeEventListener('resize', update);
      vp.removeEventListener('scroll', update);
    };
  }, []);

  const handleLoadOlder = async () => {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await fetch(`/api/support/messages?ticketId=${ticketId}&cursor=${nextCursor}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = data.messages.filter((m: Message) => !existingIds.has(m.id));
          return [...newMsgs, ...prev];
        });
      }
      setNextCursor(data.nextCursor);
    } catch {
      toast.error('Не удалось загрузить историю сообщений');
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleAiReply = () => {
    startAiTransition(async () => {
      const res = await generateSmartReplyAction(ticketId);
      if (res.success && res.reply) {
        setText(res.reply);
        toast.success('AI ответ сгенерирован');
      } else {
        toast.error('Ошибка AI: ' + res.error);
      }
    });
  };

  const lastCheckedRef = useRef<string>(
    initialMessages.length > 0 ? initialMessages[initialMessages.length - 1].createdAt : new Date(0).toISOString()
  );

  // SSE real-time message delivery (replaces 5s polling)
  // VQ1 Answer: Uses exponential backoff (1s → 2s → 4s → 8s → 16s cap) to prevent
  // Retry Storm on mobile network drops. Falls back to polling after 3 consecutive SSE failures.
  useEffect(() => {
    if (isClosed) return;

    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let failCount = 0;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    const MAX_FAILURES = 3;
    const MAX_BACKOFF_MS = 16000;

    const addNewMessages = (newMsgs: Message[]) => {
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const filtered = newMsgs.filter(m => !existingIds.has(m.id));
        if (filtered.length === 0) return prev;
        return [...prev, ...filtered];
      });
    };

    const startPollingFallback = () => {
      if (fallbackInterval) return;
      fallbackInterval = setInterval(async () => {
        if (document.hidden) return;
        try {
          const res = await fetch(`/api/support/messages?ticketId=${ticketId}&after=${encodeURIComponent(lastCheckedRef.current)}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            addNewMessages(data.messages);
            lastCheckedRef.current = data.messages[data.messages.length - 1].createdAt;
          }
        } catch { /* silent */ }
      }, 5000);
    };

    const connectSSE = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      try {
        eventSource = new EventSource(`/api/support/chat/stream?ticketId=${ticketId}`);

        eventSource.onopen = () => {
          failCount = 0; // Reset on successful connection
          // Stop fallback polling if SSE recovered
          if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = null;
          }
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'connected') return; // Initial handshake
            if (data.id && data.text !== undefined) {
              addNewMessages([data as Message]);
              lastCheckedRef.current = data.createdAt || new Date().toISOString();
            }
          } catch { /* malformed SSE data, ignore */ }
        };

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          failCount++;

          if (failCount >= MAX_FAILURES) {
            // Degrade gracefully to polling
            startPollingFallback();
            return;
          }

          // Exponential backoff: 1s, 2s, 4s, 8s, 16s cap
          const backoffMs = Math.min(1000 * Math.pow(2, failCount - 1), MAX_BACKOFF_MS);
          reconnectTimer = setTimeout(connectSSE, backoffMs);
        };
      } catch {
        // EventSource constructor failed (e.g. blocked by CSP)
        startPollingFallback();
      }
    };

    connectSSE();

    return () => {
      eventSource?.close();
      eventSource = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [ticketId, isClosed]);

  // Auto-scroll on new messages
  const isFirstRender = useRef(true);
  useEffect(() => {
    // U1.3 Fix: Delay scrollIntoView for iOS keyboard layout recalc
    const timer = setTimeout(() => {
      if (isFirstRender.current) {
        bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
        isFirstRender.current = false;
      } else {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !file) || sending) return;
    setSending(true);

    // Optimistic update (show ghost message immediately)
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      sender: isStaff ? (isInternal ? 'INTERNAL' : 'STAFF') : 'USER',
      text: text.trim(),
      mediaUrl: file ? 'uploading...' : undefined,
      mediaType: file ? (file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'document') : undefined,
      createdAt: new Date().toISOString(),
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, sender: replyingTo.sender } : null,
      orderId: selectedOrder?.id || null,
      order: selectedOrder ? {
        id: selectedOrder.id,
        numericId: selectedOrder.numericId,
        status: selectedOrder.status,
        charge: Number(selectedOrder.charge),
        createdAt: selectedOrder.createdAt,
        serviceName: selectedOrder.serviceName
      } : null
    };
    setMessages(prev => [...prev, optimisticMsg]);

    let mediaUrl: string | undefined = undefined;
    let mediaType: string | undefined = undefined;

    // Upload file first
    if (file) {
      const uploadForm = new FormData();
      uploadForm.set('file', file);
      uploadForm.set('ticketId', ticketId);

      try {
        const res = await fetch('/api/support/upload', {
          method: 'POST',
          body: uploadForm
        });
        if (res.ok) {
          const data = await res.json();
          mediaUrl = data.mediaUrl;
          mediaType = data.mediaType;
          
          // Update the optimistic message with the real media URL
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, mediaUrl, mediaType } : m));
        } else {
          toast.error('Ошибка загрузки файла');
          setMessages(prev => prev.filter(m => m.id !== tempId)); // Remove optimistic
          setSending(false);
          return;
        }
      } catch (e) {
        toast.error('Ошибка загрузки файла');
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setSending(false);
        return;
      }
    }

    const formData = new FormData();
    formData.set('ticketId', ticketId);
    formData.set('message', text.trim());
    if (mediaUrl) formData.set('mediaUrl', mediaUrl);
    if (mediaType) formData.set('mediaType', mediaType);

    if (isStaff && isInternal) {
      formData.set('isInternal', 'true');
    }

    if (replyingTo) formData.set('replyToId', replyingTo.id);
    if (selectedOrder) formData.set('orderId', selectedOrder.id);

    setText('');
    setFile(null);
    setReplyingTo(null);
    setSelectedOrder(null);

    try {
      await onSendMessage(formData);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
    setSending(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only set false if we are leaving the main container
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleEditSubmit = async (msgId: string) => {
    if (!editingText.trim() || !editTicketMessage) {
      return setEditingMessageId(null);
    }
    
    // Optimistic update
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: editingText.trim() } : m));
    setEditingMessageId(null);

    const fd = new FormData();
    fd.set('messageId', msgId);
    fd.set('newText', editingText);
    
    try {
      await editTicketMessage(fd);
    } catch { /* error silently failing in MVP */ }
  };

  return (
    <div 
      className="flex flex-col h-full relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-[100] bg-indigo-500/10 backdrop-blur-sm border-2 border-dashed border-indigo-400 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="bg-card/90 px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center">
            <div className="w-16 h-16 bg-indigo-100 text-primary rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </div>
            <p className="text-xl font-bold text-slate-800">Перетащите файл сюда</p>
            <p className="text-sm text-slate-500 mt-1">Изображение или PDF (до 5 МБ)</p>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50 relative">
        {nextCursor && (
          <div className="flex justify-center py-2 shrink-0">
            <button
              type="button"
              onClick={handleLoadOlder}
              disabled={loadingOlder}
              className="px-4 py-2 text-xs font-bold text-primary bg-primary/10 border border-primary/20 hover:bg-primary/25 rounded-xl transition-all duration-200 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {loadingOlder ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Загрузка...</span>
                </>
              ) : (
                <span>Загрузить предыдущие сообщения</span>
              )}
            </button>
          </div>
        )}
        <AnimatePresence initial={false}>
        {messages.map((msg, index) => {
          const showSeparator = index > 0 && messages[index - 1].isHistorical && !msg.isHistorical;
          const isExpired = Date.now() - new Date(msg.createdAt).getTime() > 48 * 60 * 60 * 1000;
          
          return (
            <motion.div 
              key={msg.id} 
              className="flex flex-col"
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {showSeparator && (
                <div className="flex items-center justify-center my-6 opacity-50">
                  <div className="h-px bg-slate-400 flex-1 max-w-[50px] mx-4"></div>
                  <span className="text-xs font-semibold uppercase text-slate-500 tracking-widest">--- Диалог завершен ---</span>
                  <div className="h-px bg-slate-400 flex-1 max-w-[50px] mx-4"></div>
                </div>
              )}
              {msg.isHistorical && (index === 0 || messages[index - 1].historicalTicketId !== msg.historicalTicketId) && (
                <div className="text-center text-[10px] uppercase font-bold text-slate-400 my-4 bg-slate-100 rounded-full px-3 py-1 w-max mx-auto border border-slate-200">
                  История: {msg.historicalSubject || 'Предыдущий тикет'}
                </div>
              )}
              <div className={`flex ${msg.sender === 'USER' ? 'justify-start' : 'justify-end'} mb-4`}>
                <div className={`group relative max-w-[75%] rounded-2xl p-4 shadow-sm backdrop-blur-sm ${
                  msg.isDeleted ? 'bg-default-100 border border-default-200 text-default-400 rounded-bl-sm opacity-80' :
                  msg.sender === 'USER'
                    ? 'bg-content1 border border-default-200 text-foreground rounded-bl-sm'
                    : msg.sender === 'INTERNAL'
                      ? 'bg-warning-50 text-warning-900 border border-warning-200 rounded-br-sm'
                      : 'bg-primary text-primary-foreground rounded-br-sm'
                }`}>
                  
                  {/* Actions hover */}
                  {!msg.isDeleted && msg.sender !== 'USER' && editingMessageId !== msg.id && editTicketMessage && (
                    <div className="absolute -left-20 top-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 flex gap-1 transition-opacity">
                      <button 
                        onClick={() => setReplyingTo(msg)}
                        className="p-2 text-slate-400 hover:text-primary rounded-full bg-card shadow-sm border border-slate-100"
                        title="Ответить"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                      </button>
                      {isExpired ? (
                        <div className="p-2 text-slate-300 rounded-full bg-card shadow-sm border border-slate-100 cursor-not-allowed" title="Заблокировано Telegram API (>48ч)">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.text); }}
                          className="p-2 text-slate-400 hover:text-amber-600 rounded-full bg-card shadow-sm border border-slate-100"
                          title="Редактировать"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        </button>
                      )}
                    </div>
                  )}
                  {!msg.isDeleted && msg.sender === 'USER' && (
                    <div className="absolute -right-10 top-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 flex transition-opacity">
                      <button 
                        onClick={() => setReplyingTo(msg)}
                        className="p-2 text-slate-400 hover:text-primary rounded-full bg-card shadow-sm border border-slate-100"
                        title="Ответить"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                      </button>
                    </div>
                  )}

                  <div className="text-[10px] font-semibold mb-1 opacity-60 flex justify-between">
                    <span>
                      {msg.sender === 'INTERNAL' ? '🔒 INTERNAL NOTE' : msg.sender}
                      {' • '}
                      <ClientDate date={msg.createdAt} format="time" />
                      {msg.isHistorical && ' (Архив)'}
                    </span>
                    {msg.isEdited && <span className="ml-2" title={msg.originalText || ''}>(изменено)</span>}
                  </div>
                  
                  {/* Reply Quote */}
                  {!msg.isDeleted && msg.replyTo && (
                    <div className={`mb-2 p-2 rounded-lg border-l-2 text-xs ${msg.sender === 'STAFF' ? 'bg-foreground/10 border-white/40 text-primary-foreground' : 'bg-default-100 border-primary/50 text-foreground'}`}>
                       <div className="font-bold opacity-70 mb-0.5">{msg.replyTo.sender}</div>
                       <div className="opacity-80 line-clamp-2">{msg.replyTo.text || 'Медиа сообщение'}</div>
                    </div>
                  )}

                  {/* Order Context Attachment Card */}
                  {!msg.isDeleted && msg.order && (
                    <div className={`mb-3 rounded-xl p-3 flex flex-col gap-2 max-w-sm border shadow-sm transition-all duration-200 hover:shadow-md ${
                      msg.sender === 'USER'
                        ? 'bg-indigo-500/5 border-indigo-500/10 text-foreground'
                        : msg.sender === 'INTERNAL'
                          ? 'bg-amber-500/10 border-amber-500/20 text-warning-900'
                          : 'bg-white/10 border-white/20 text-primary-foreground'
                    }`}>
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${
                          msg.sender === 'USER' ? 'bg-indigo-500/10 text-indigo-600' : msg.sender === 'INTERNAL' ? 'bg-amber-500/20 text-amber-700' : 'bg-white/20 text-white'
                        }`}>
                          📦
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-[11px] leading-none">
                              Заказ #{msg.order.numericId}
                            </span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              msg.order.status === 'COMPLETED' ? 'bg-success/15 text-success' :
                              msg.order.status === 'IN_PROGRESS' ? 'bg-primary/15 text-primary' :
                              msg.order.status === 'PENDING' ? 'bg-amber-500/15 text-amber-600' :
                              msg.order.status === 'AWAITING_PAYMENT' ? 'bg-warning-500/15 text-warning-600' :
                              'bg-default-200/50 text-default-600'
                            }`}>
                              {msg.order.status === 'COMPLETED' ? 'Выполнен' :
                               msg.order.status === 'IN_PROGRESS' ? 'Выполняется' :
                               msg.order.status === 'PENDING' ? 'В очереди' :
                               msg.order.status === 'AWAITING_PAYMENT' ? 'Ожидает оплаты' : msg.order.status}
                            </span>
                          </div>
                          <p className="text-[10px] opacity-80 mt-1 truncate leading-tight font-medium">
                            {msg.order.serviceName}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-dashed border-current/10 pt-2 mt-1">
                        <div className="text-[9px] font-bold opacity-75">
                          {(Number(msg.order.charge) / 100).toFixed(2)} ₽
                        </div>
                        
                        {isStaff && onSelectOrder ? (
                          <button 
                            type="button"
                            onClick={() => onSelectOrder(msg.order)}
                            className={`text-[10px] font-black px-4 py-2 min-h-[44px] rounded transition-colors flex items-center justify-center gap-0.5 shadow-sm border cursor-pointer ${
                              msg.sender === 'USER' 
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-700'
                                : msg.sender === 'INTERNAL'
                                  ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-700'
                                  : 'bg-white text-indigo-600 hover:bg-white/90 border-transparent'
                            }`}
                          >
                            Перейти к заказу ➔
                          </button>
                        ) : isStaff ? (
                          <a 
                            href={`/admin/orders?edit_order_id=${msg.order.id}`}
                            className={`text-[10px] font-black px-4 py-2 min-h-[44px] rounded transition-colors flex items-center justify-center gap-0.5 shadow-sm border ${
                              msg.sender === 'USER' 
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-700'
                                : msg.sender === 'INTERNAL'
                                  ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-700'
                                  : 'bg-white text-indigo-600 hover:bg-white/90 border-transparent'
                            }`}
                          >
                            Перейти к заказу ➔
                          </a>
                        ) : (
                          <a 
                            href={`/dashboard/orders/${msg.order.id}`}
                            className={`text-[10px] font-black px-4 py-2 min-h-[44px] rounded transition-colors flex items-center justify-center gap-0.5 shadow-sm border ${
                              msg.sender === 'USER' 
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-700'
                                : 'bg-white text-indigo-600 hover:bg-white/90 border-transparent'
                            }`}
                          >
                            Перейти к заказу ➔
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Media preview */}
                  {!msg.isDeleted && msg.mediaUrl === 'uploading...' && (
                    <div className="w-full h-32 bg-primary/10 animate-pulse rounded-xl mb-2 flex items-center justify-center border border-primary/20">
                       <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                  )}

                  {!msg.isDeleted && msg.mediaUrl !== 'uploading...' && (() => {
                    const filesToRender = 
                      msg.attachments && msg.attachments.length > 0
                        ? msg.attachments
                        : msg.mediaUrl
                          ? [{ id: msg.id, url: msg.mediaUrl, type: msg.mediaType || 'document', name: 'Вложение', mimeType: '', createdAt: msg.createdAt }]
                          : [];

                    if (filesToRender.length === 0) return null;

                    if (filesToRender.length === 1) {
                      const file = filesToRender[0];
                      if (file.type === 'image') {
                        return (
                          <div className="relative group/att mb-2 inline-block max-w-full">
                            <img 
                              src={`/api/media/${encodeURIComponent(file.url)}`} 
                              alt={file.name} 
                              onClick={() => setZoomedImage(file.url)} 
                              className="rounded-xl max-h-60 cursor-zoom-in border border-default-200 hover:opacity-90 transition-all duration-200 object-cover" 
                            />
                            <div className="absolute bottom-2 left-2 right-2 bg-background/90 backdrop-blur-sm text-foreground text-[10px] px-2 py-1 rounded-md opacity-0 group-hover/att:opacity-100 transition-opacity duration-200 truncate" title={file.name}>
                              {file.name}
                            </div>
                          </div>
                        );
                      }
                      if (file.type === 'video') {
                        return (
                          <div className="relative group/att mb-2 w-full max-w-[320px]">
                            <video src={`/api/media/${encodeURIComponent(file.url)}`} controls className="rounded-xl max-h-60 border border-default-200 w-full object-cover" />
                            <div className="text-[10px] text-muted-foreground mt-1 truncate" title={file.name}>
                              {file.name}
                            </div>
                          </div>
                        );
                      }
                      if (file.type === 'audio') {
                        return (
                          <div className="relative group/att mb-2 w-full max-w-[280px]">
                            <audio src={`/api/media/${encodeURIComponent(file.url)}`} controls className="w-full opacity-90 hover:opacity-100 transition-all" />
                            <div className="text-[10px] text-muted-foreground mt-1 truncate" title={file.name}>
                              {file.name}
                            </div>
                          </div>
                        );
                      }
                      // Document
                      return (
                        <div className="flex items-center gap-2 bg-foreground/5 p-2.5 rounded-xl border border-black/10 mb-2 max-w-sm">
                           <div className="text-2xl drop-shadow-sm shrink-0">📄</div>
                           <div className="text-sm font-semibold truncate flex-1 leading-tight text-foreground/90 min-w-0" title={file.name}>
                             {file.name}
                           </div>
                           <a 
                             href={`/api/media/${encodeURIComponent(file.url)}`} 
                             download={file.name} 
                             target="_blank" 
                             rel="noopener noreferrer" 
                             className="text-primary text-[10px] font-bold px-2.5 py-1.5 bg-background shadow-sm border border-default-200 rounded-md hover:bg-default-50 transition-colors shrink-0"
                           >
                             Скачать
                           </a>
                        </div>
                      );
                    }

                    // Multiple attachments (Grid)
                    return (
                      <div className="grid grid-cols-2 gap-2 mb-2 w-full max-w-[480px]">
                        {filesToRender.map((file) => {
                          if (file.type === 'image') {
                            return (
                              <div key={file.id} className="relative aspect-video rounded-xl overflow-hidden border border-default-200 group/att cursor-zoom-in" onClick={() => setZoomedImage(file.url)}>
                                <img 
                                  src={`/api/media/${encodeURIComponent(file.url)}`} 
                                  alt={file.name} 
                                  className="w-full h-full object-cover group-hover/att:scale-105 transition-transform duration-200" 
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-background/90 backdrop-blur-sm text-foreground text-[10px] px-2 py-1 opacity-0 group-hover/att:opacity-100 transition-opacity duration-200 truncate" title={file.name}>
                                  {file.name}
                                </div>
                              </div>
                            );
                          }
                          if (file.type === 'video') {
                            return (
                              <div key={file.id} className="relative aspect-video rounded-xl overflow-hidden border border-default-200 w-full group/att">
                                <video src={`/api/media/${encodeURIComponent(file.url)}`} controls className="w-full h-full object-cover" />
                                <div className="absolute inset-x-0 bottom-0 bg-background/90 backdrop-blur-sm text-foreground text-[10px] px-2 py-1 opacity-0 group-hover/att:opacity-100 transition-opacity duration-200 truncate" title={file.name}>
                                  {file.name}
                                </div>
                              </div>
                            );
                          }
                          if (file.type === 'audio') {
                            return (
                              <div key={file.id} className="bg-foreground/5 p-2 rounded-xl border border-black/10 flex flex-col justify-between h-full group/att min-w-0">
                                <audio src={`/api/media/${encodeURIComponent(file.url)}`} controls className="w-full opacity-90 hover:opacity-100 transition-all max-h-8 scale-90 origin-left" />
                                <div className="text-[9px] text-muted-foreground truncate mt-1 min-w-0" title={file.name}>
                                  {file.name}
                                </div>
                              </div>
                            );
                          }
                          // Document
                          return (
                            <div key={file.id} className="flex items-center gap-2 bg-foreground/5 p-2 rounded-xl border border-black/10 group/att min-w-0">
                              <div className="text-xl drop-shadow-sm shrink-0">📄</div>
                              <div className="text-[11px] font-semibold truncate flex-1 leading-tight text-foreground/90 min-w-0" title={file.name}>
                                {file.name}
                              </div>
                              <a 
                                href={`/api/media/${encodeURIComponent(file.url)}`} 
                                download={file.name} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-primary text-[9px] font-bold px-2.5 py-1 bg-background shadow-sm border border-default-200 rounded-md hover:bg-default-50 transition-colors shrink-0"
                              >
                                Скачать
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {msg.isDeleted ? (
                    <div className="italic text-sm">Удалено (Видно только стаффу)</div>
                  ) : editingMessageId === msg.id ? (
                    <div className="mt-2 animate-in fade-in zoom-in-95 duration-200">
                      <textarea value={editingText} onChange={e => setEditingText(e.target.value)} className="w-full text-sm text-slate-900 bg-card border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]" autoFocus />
                      <div className="flex gap-2 justify-end mt-2">
                         <button onClick={() => setEditingMessageId(null)} className="text-[11px] font-bold uppercase bg-card/50 text-slate-700 px-3 py-1.5 rounded border border-slate-300 hover:bg-card">Отмена</button>
                         <button onClick={() => handleEditSubmit(msg.id)} className="text-[11px] font-bold uppercase bg-primary text-primary-foreground px-3 py-1.5 rounded hover:bg-primary shadow-sm border border-indigo-700">Сохранить</button>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-[1.6]">{msg.text}</div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
        
        {messages.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full max-h-[400px]"
          >
            <div className="w-20 h-20 mb-6 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
              <MessageSquare className="w-10 h-10 text-primary opacity-80" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2 tracking-tight">Нет сообщений</h3>
            <p className="text-muted-foreground text-sm text-center max-w-sm mb-6">
              Напишите ваш вопрос ниже. Мы отвечаем быстро и по делу.
            </p>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      {isClosed ? (
        <div className="p-6 bg-muted/20 border-t border-border flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground select-none shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-muted-foreground/60"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <span>Тикет закрыт. Создайте новое обращение если нужна помощь.</span>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="p-4 bg-card border-t border-slate-200 transition-[bottom] duration-150"
          style={{
            paddingBottom: kbOffset > 0 ? '0.5rem' : 'max(1rem, env(safe-area-inset-bottom))',
          }}
        >
          
          {isStaff && (initialTemplates.length > 0 || true) && (
            <div className="flex overflow-x-auto lg:flex-wrap flex-nowrap scrollbar-hide snap-x snap-mandatory gap-2 py-1 px-4 lg:px-0 max-w-full -mx-4 lg:mx-0 mb-3 items-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase mr-1 flex items-center shrink-0">Помощник:</span>
              
              {/* AI Smart Reply Button */}
              <button
                type="button"
                onClick={handleAiReply}
                disabled={isAiPending}
                className="snap-start shrink-0 min-h-[44px] px-3 bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-700 rounded-md hover:bg-indigo-100 transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isAiPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                <span>AI Ответ</span>
              </button>

              {initialTemplates.map(t => (
                <button 
                  key={t.id} 
                  type="button" 
                  onClick={() => setText(t.text)}
                  className="snap-start shrink-0 min-h-[44px] px-3 border border-slate-200 text-[10px] font-bold bg-card text-slate-600 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-center"
                  title={t.text}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}


          <div className="flex flex-col gap-2 w-full">
            <AnimatePresence>
            {replyingTo && (
              <motion.div 
                key="reply-preview"
                initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                className="flex items-center justify-between bg-primary-50 border-l-4 border-primary px-3 py-2 rounded-lg mb-1"
              >
                <div>
                  <div className="text-[10px] font-bold text-primary-700 uppercase tracking-wider">Ответ для {replyingTo.sender}</div>
                  <div className="text-xs text-foreground/80 line-clamp-1">{replyingTo.text || 'Медиа сообщение'}</div>
                </div>
                <button type="button" onClick={() => setReplyingTo(null)} className="p-1 text-primary-400 hover:text-primary-700 font-bold ml-2 transition-colors">✕</button>
              </motion.div>
            )}
            {selectedOrder && (
              <motion.div 
                key="order-preview"
                initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                className="flex items-center justify-between bg-indigo-50 border-l-4 border-indigo-500 px-3 py-2 rounded-lg mb-1 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-indigo-700 font-bold text-xs shrink-0">📦 Заказ #{selectedOrder.numericId}</span>
                  <span className="text-xs text-foreground/80 line-clamp-1">— {selectedOrder.serviceName} ({selectedOrder.charge} ₽)</span>
                </div>
                <button type="button" onClick={() => setSelectedOrder(null)} className="p-1 text-indigo-400 hover:text-indigo-700 font-bold ml-2 transition-colors">✕</button>
              </motion.div>
            )}
            </AnimatePresence>
            <div className="flex gap-2 w-full">
            <input
               type="file"
               className="hidden"
               ref={fileInputRef}
               accept="image/jpeg,image/png,image/webp,application/pdf"
               onChange={(e) => {
                 if (e.target.files && e.target.files[0]) {
                   setFile(e.target.files[0]);
                 }
               }}
            />
            <button 
               type="button"
               onClick={() => fileInputRef.current?.click()}
               className="px-3 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-200 hover:text-slate-700 transition-colors flex items-center justify-center shrink-0"
               title="Прикрепить файл (скриншот или PDF чек)"
               aria-label="Прикрепить файл (скриншот или PDF чек)"
            >
               📎
            </button>

            {initialOrders && initialOrders.length > 0 && (
              <div className="relative shrink-0 flex">
                <button 
                   type="button"
                   onClick={() => setShowOrdersDropdown(!showOrdersDropdown)}
                   className={`px-3 border text-sm rounded-xl transition-all flex items-center justify-center gap-1 ${
                     showOrdersDropdown 
                       ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-inner' 
                       : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                   }`}
                   title="Прикрепить заказ"
                   aria-label="Прикрепить заказ"
                >
                   📦
                </button>

                <AnimatePresence>
                  {showOrdersDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-12 left-0 w-80 bg-content1 border border-default-200 rounded-2xl shadow-xl z-50 overflow-hidden py-2 backdrop-blur-md"
                    >
                      <div className="px-3 py-1.5 border-b border-default-100 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Выберите заказ для привязки:
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {initialOrders.map(order => (
                          <button
                            key={order.id}
                            type="button"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowOrdersDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-default-100 flex flex-col gap-0.5 border-b border-default-50/50 last:border-0 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-foreground">Заказ #{order.numericId}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                order.status === 'COMPLETED' ? 'bg-success/10 text-success' :
                                order.status === 'PROCESSING' || order.status === 'IN_PROGRESS' ? 'bg-primary/10 text-primary' :
                                order.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                                'bg-default-200 text-default-600'
                              }`}>
                                {order.status === 'COMPLETED' ? 'Выполнен' :
                                 order.status === 'PROCESSING' ? 'В работе' :
                                 order.status === 'IN_PROGRESS' ? 'Выполняется' :
                                 order.status === 'PENDING' ? 'В очереди' : order.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">{order.serviceName}</div>
                            <div className="text-[10px] text-muted-foreground flex justify-between mt-0.5">
                              <span>{new Date(order.createdAt).toLocaleDateString('ru-RU')}</span>
                              <span className="font-semibold text-foreground">{order.charge} ₽</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            <div className="flex-1 relative flex items-center border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent bg-card">
              {file && (
                <div className="absolute left-2 pl-1.5 pr-2 py-1 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded-md border border-indigo-200 flex items-center gap-1 z-10 max-w-[150px]">
                   <span className="truncate">{file.name}</span>
                   <button type="button" onClick={() => setFile(null)} className="opacity-60 hover:opacity-100 font-bold ml-1" aria-label="Удалить прикрепленный файл">✕</button>
                </div>
              )}
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={file ? "" : "Введите ваше сообщение..."}
                className={`w-full bg-transparent border-none px-4 py-2.5 text-sm focus:outline-none ${file ? 'pl-[170px]' : ''}`}
              />
            </div>

            <button
              type="submit"
              disabled={(!text.trim() && !file) || sending}
              aria-label="Отправить сообщение"
              className="min-w-[48px] min-h-[48px] p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0 flex items-center justify-center"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          {isStaff && (
            <label className="flex items-center gap-2 mt-3 text-xs text-amber-600 font-medium cursor-pointer w-max bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded border-amber-300 text-amber-600 focus:ring-amber-500" 
              />
              🔒 Скрытая заметка (невидна клиенту)
            </label>
          )}
          </div>
        </form>
      )}

      {/* Zoom Modal */}
      {zoomedImage && (
        <ImageZoomModal 
          url={zoomedImage} 
          onClose={() => setZoomedImage(null)} 
        />
      )}
    </div>
  );
}
