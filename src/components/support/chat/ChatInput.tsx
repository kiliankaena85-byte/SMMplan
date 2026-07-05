// audit-disable STR-002
import { useEffect, useRef, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Send } from 'lucide-react';
import { toast } from 'sonner';
import { generateSmartReplyAction } from '@/actions/support/ticket';

import { Message } from './useChatMessages';
import { ChatTemplateManager } from './ChatTemplateManager';
import { incrementTemplateUsage } from '@/actions/support/template';

interface ChatInputProps {
  ticketId: string;
  isClosed: boolean;
  isStaff: boolean;
  clientEmail?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialOrders: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialTemplates: any[];
  messages: Message[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSendMessage: (formData: FormData) => Promise<any>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  replyingTo: Message | null;
  setReplyingTo: (msg: Message | null) => void;
}

export function ChatInput({
  ticketId,
  isClosed,
  isStaff,
  clientEmail,
  initialOrders,
  initialTemplates,
  onSendMessage,
  setMessages,
  replyingTo,
  setReplyingTo,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [templatesList, setTemplatesList] = useState(initialTemplates);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showOrdersDropdown, setShowOrdersDropdown] = useState(false);
  const [isAiPending, startAiTransition] = useTransition();

  const [suggestedArticle, setSuggestedArticle] = useState<{ title: string; slug: string } | null>(null);


  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [activeTemplateIndex, setActiveTemplateIndex] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [kbOffset, setKbOffset] = useState(0);

  // Expose file setter to parent drag logic via an effect or pass a ref if needed,
  // but to keep it simple we can just handle drag&drop at ChatWindow level and pass the file prop,
  // or handle drop directly. For now, since ChatWindow handles drag, we need a way to set file.
  // Actually, wait, let's keep it simple: drag&drop sets file inside ChatWindow, so `file` and `setFile`
  // should probably be in ChatWindow, but we can just add a global window event listener here instead!
  useEffect(() => {
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        setFile(e.dataTransfer.files[0]);
      }
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);
    return () => {
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, []);

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

  useEffect(() => {
    if (isStaff) return;
    if (text.trim().length < 5) {
      setSuggestedArticle(null);
      return;
    }

    const timer = setTimeout(() => {
      const lower = text.toLowerCase();
      if (lower.includes("спис") || lower.includes("пропал") || lower.includes("упал") || lower.includes("улет")) {
        setSuggestedArticle({
          title: "Как алгоритмы Telegram выявляют ботов и почему списываются подписчики в 2026 году",
          slug: "how-telegram-detects-bots"
        });
      } else if (lower.includes("завис") || lower.includes("ошибк") || lower.includes("статус") || lower.includes("отмен")) {
        setSuggestedArticle({
          title: "Лимиты подписок и лайков в Instagram: Безопасные лимиты для продвижения",
          slug: "instagram-limits"
        });
      } else if (lower.includes("прокси") || lower.includes("proxy") || lower.includes("ip rep")) {
        setSuggestedArticle({
          title: "IPv4, IPv6 и мобильные прокси: Как выбор прокси влияет на живучесть аккаунтов",
          slug: "proxy-reputation"
        });
      } else if (lower.includes("рекоменд") || lower.includes("просмотр") || lower.includes("лайк") || lower.includes("реакц")) {
        setSuggestedArticle({
          title: "Как раскрутить Telegram-канал с нуля до 10 000 подписчиков без огромных бюджетов",
          slug: "telegram-grow-zero"
        });
      } else {
        setSuggestedArticle(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [text, isStaff]);



  useEffect(() => {
    setTemplatesList(prev => {
      if (prev.length === initialTemplates.length &&
          prev.every((t, i) => t.id === initialTemplates[i]?.id && t.text === initialTemplates[i]?.text && t.label === initialTemplates[i]?.label)) {
        return prev;
      }
      return initialTemplates;
    });
  }, [initialTemplates]);

  const parseSmartTemplate = (templateText: string) => {
    let result = templateText;
    const userNameVal = clientEmail ? clientEmail.split('@')[0] : 'Клиент';
    result = result.replace(/{user_name}/g, userNameVal);
    result = result.replace(/{ticket_id}/g, ticketId);
    
    if (selectedOrder) {
      result = result.replace(/{order_id}/g, selectedOrder.numericId.toString());
      result = result.replace(/{service_name}/g, selectedOrder.serviceName);
      
      let statusRu = selectedOrder.status;
      if (selectedOrder.status === 'COMPLETED') statusRu = 'Выполнен';
      else if (selectedOrder.status === 'PROCESSING') statusRu = 'В работе';
      else if (selectedOrder.status === 'IN_PROGRESS') statusRu = 'Выполняется';
      else if (selectedOrder.status === 'PENDING') statusRu = 'В очереди';
      result = result.replace(/{order_status}/g, statusRu);
    } else {
      result = result.replace(/{order_id}/g, 'указанному заказу');
      result = result.replace(/{service_name}/g, 'выбранной услуге');
      result = result.replace(/{order_status}/g, 'обрабатывается');
    }
    result = result.replace(/{current_date}/g, new Date().toLocaleDateString('ru-RU'));
    return result;
  };

  const handleSelectTemplate = (t: { id: string; label: string; text: string }) => {
    const parsedText = parseSmartTemplate(t.text);
    const words = text.split(/\s+/);
    const lastWordIdx = words.findIndex((w, idx) => idx === words.length - 1 && w.startsWith('/'));
    
    if (lastWordIdx !== -1) {
      words[lastWordIdx] = parsedText;
      const newText = words.join(' ');
      setText(newText);
    } else {
      setText(parsedText);
    }
    
    setShowTemplatesDropdown(false);
    incrementTemplateUsage(t.id).catch(console.error);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
      }
    }, 50);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }

    if (isStaff) {
      const words = val.split(/\s+/);
      const lastWord = words[words.length - 1];
      
      if (lastWord && lastWord.startsWith('/')) {
        const prefix = lastWord.slice(1).toLowerCase();
        const filtered = templatesList.filter((t: { shortcut?: string }) => t.shortcut && t.shortcut.toLowerCase().startsWith(prefix));
        
        if (filtered.length > 0) {
          setFilteredTemplates(filtered);
          setShowTemplatesDropdown(true);
          setActiveTemplateIndex(0);
        } else {
          setShowTemplatesDropdown(false);
        }
      } else {
        setShowTemplatesDropdown(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showTemplatesDropdown && filteredTemplates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveTemplateIndex((prev) => (prev + 1) % filteredTemplates.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveTemplateIndex((prev) => (prev - 1 + filteredTemplates.length) % filteredTemplates.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectTemplate(filteredTemplates[activeTemplateIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowTemplatesDropdown(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !file) || sending) return;
    setSending(true);

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
          
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, mediaUrl, mediaType } : m));
        } else {
          toast.error('Ошибка загрузки файла');
          setMessages(prev => prev.filter(m => m.id !== tempId));
          setSending(false);
          return;
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await onSendMessage(formData);
      setTimeout(() => {
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }, 10000);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
    setSending(false);
  };

  if (isClosed) {
    return (
      <div className="p-6 bg-muted/20 border-t border-border flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground select-none shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-muted-foreground/60"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        <span>Тикет закрыт. Создайте новое обращение если нужна помощь.</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 border-t border-border transition-[bottom] duration-150 bg-card text-card-foreground relative shrink-0"
      style={{
        paddingBottom: kbOffset > 0 ? '0.5rem' : 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <AnimatePresence>
        {showTemplatesDropdown && filteredTemplates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-3 mb-2 w-[calc(100%-1.5rem)] md:w-80 bg-card border border-border rounded-xl shadow-xl z-[90] overflow-hidden py-1.5"
          >
            <div className="px-3 py-1 border-b border-divider text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              Быстрые шаблоны
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredTemplates.map((t, idx) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTemplate(t)}
                  className={`w-full text-left px-3 py-2 flex flex-col transition-colors ${
                    idx === activeTemplateIndex ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-default-50 text-foreground'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-xs font-bold">{t.label}</span>
                    {t.shortcut && <span className="text-[9px] font-mono bg-default-100 text-muted-foreground px-1 py-0.5 rounded">/{t.shortcut}</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate w-full mt-0.5">{t.text}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isStaff && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 mb-2">
          <div className="flex items-center gap-1.5">
            <ChatTemplateManager 
              templatesList={templatesList}
              setTemplatesList={setTemplatesList}
              onSelectTemplate={handleSelectTemplate}
              onOpenStateChange={(isOpen) => {
                if (isOpen) setShowOrdersDropdown(false);
              }}
            />

            <button
              type="button"
              onClick={handleAiReply}
              disabled={isAiPending}
              className="flex items-center justify-center gap-1 px-3 h-11 text-xs font-semibold bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all rounded-xl disabled:opacity-50 cursor-pointer"
              title="Автоматический ответ ИИ"
              aria-label="Автоматический ответ ИИ"
            >
              {isAiPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>AI Ответ</span>
            </button>
          </div>

          <label 
            aria-label="Внутренняя скрытая заметка"
            className="flex items-center gap-2 text-xs text-warning-text font-semibold cursor-pointer bg-warning/5 hover:bg-warning/15 px-3 h-11 rounded-xl border border-warning/20 transition-colors shrink-0"
          >
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded border-warning/35 text-warning focus:ring-warning w-4 h-4 cursor-pointer" 
              aria-label="Включить скрытую заметку"
            />
            <span>🔒 Заметка</span>
          </label>
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
              className="flex items-center justify-between bg-primary/10 border-l-4 border-primary px-3 py-1.5 rounded-lg mb-1"
            >
              <div>
                <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Ответ для {replyingTo.sender}</div>
                <div className="text-xs text-foreground/80 line-clamp-1">{replyingTo.text || 'Медиа сообщение'}</div>
              </div>
              <button type="button" onClick={() => setReplyingTo(null)} className="w-11 h-11 flex items-center justify-center text-primary/70 hover:text-primary font-bold ml-2 transition-colors cursor-pointer" aria-label="Отменить ответ">✕</button>
            </motion.div>
          )}
          {selectedOrder && (
            <motion.div 
              key="order-preview"
              initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
              animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              className="flex items-center justify-between bg-primary/10 border-l-4 border-primary px-3 py-1.5 rounded-lg mb-1 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold text-xs shrink-0">📦 Заказ #{selectedOrder.numericId}</span>
                <span className="text-xs text-foreground/80 line-clamp-1">— {selectedOrder.serviceName} ({selectedOrder.charge} ₽)</span>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)} className="h-11 w-11 flex items-center justify-center p-1 text-primary/70 hover:text-primary font-bold ml-2 transition-colors" aria-label="Удалить привязку заказа">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isStaff && suggestedArticle && (
            <motion.div
              key="nlp-article-suggestion"
              initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
              animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              className="bg-primary/10 border-l-4 border-primary px-3 py-2 rounded-xl mb-1 flex items-center justify-between shadow-xs select-none"
            >
              <div className="flex items-start gap-2 min-w-0">
                <span className="text-sm">💡</span>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    Часто помогает при этой проблеме:
                  </div>
                  <a
                    href={`/knowledge/${suggestedArticle.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-foreground hover:text-primary transition-colors hover:underline line-clamp-1 mt-0.5"
                  >
                    {suggestedArticle.title}
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSuggestedArticle(null)}
                className="p-1 text-muted-foreground hover:text-foreground font-bold ml-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
                aria-label="Закрыть подсказку"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>



        <div className="flex gap-1.5 w-full items-end">
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
              className="p-2.5 bg-default-50 border border-border text-muted-foreground hover:bg-default-100 hover:text-foreground transition-colors flex items-center justify-center shrink-0 w-11 h-11 rounded-xl"
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
                  className={`p-2.5 border text-sm transition-all flex items-center justify-center gap-1 w-11 h-11 rounded-xl ${
                    showOrdersDropdown 
                      ? 'bg-primary/10 border-primary/30 text-primary shadow-inner' 
                      : 'bg-default-50 border-border text-muted-foreground hover:bg-default-100 hover:text-foreground'
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
                    className="absolute bottom-12 left-0 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden py-2"
                  >
                    <div className="px-3 py-1.5 border-b border-divider text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Выберите заказ для привязки:
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {initialOrders.map((order: { id: string; numericId: number; status: string; serviceName: string; charge: number }) => (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrdersDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-default-50 flex flex-col gap-0.5 border-b border-divider last:border-0 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-foreground">Заказ #{order.numericId}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              order.status === 'COMPLETED' ? 'bg-success/15 text-success-text' :
                              order.status === 'IN_PROGRESS' ? 'bg-primary/15 text-primary' :
                              order.status === 'PENDING' ? 'bg-warning/15 text-warning-text' :
                              'bg-default-200/50 text-muted-foreground'
                            }`}>
                              {order.status === 'COMPLETED' ? 'Выполнен' :
                               order.status === 'IN_PROGRESS' ? 'В процессе' :
                               order.status === 'PENDING' ? 'Ожидание' : order.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate w-full">{order.serviceName}</span>
                          <span className="text-[10px] font-medium text-foreground opacity-80">{order.charge} ₽</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="flex-1 bg-default-50 border border-border rounded-2xl flex items-end pl-1 pr-1.5 py-1 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm">
            {file && (
              <div className="relative group shrink-0 ml-2 mb-1 mt-1">
                <div className="w-12 h-12 rounded-lg bg-default-200 flex items-center justify-center overflow-hidden border border-border">
                  {file.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">📄</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setFile(null); }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-foreground text-background rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  aria-label="Удалить файл"
                >
                  ✕
                </button>
              </div>
            )}
            
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={isStaff ? "Введите ответ или выберите шаблон (напишите /)..." : "Опишите вашу проблему..."}
              className="flex-1 min-w-0 bg-transparent px-3 py-2.5 max-h-40 min-h-[44px] resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground/70"
              rows={1}
            />
            
            <button
              type="submit"
              disabled={(!text.trim() && !file) || sending}
              className="w-10 h-10 shrink-0 bg-primary text-primary-foreground rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shadow-sm mb-0.5 ml-1"
              aria-label="Отправить сообщение"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
