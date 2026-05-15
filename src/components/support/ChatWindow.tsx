"use client";
import { useState, useEffect, useRef, useTransition } from 'react';
import { generateSmartReplyAction } from '@/actions/support/ticket';
import { Sparkles, Loader2, MessageSquare, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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
}

interface ChatWindowProps {
  ticketId: string;
  initialMessages: Message[];
  isStaff?: boolean;
  initialTemplates?: { id: string, label: string, text: string }[];
  onSendMessage: (formData: FormData) => Promise<void>;
  editTicketMessage?: (formData: FormData) => Promise<void>;
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
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out backdrop-blur-sm" onClick={onClose}>
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
      <button className="absolute top-6 right-6 text-white/50 text-4xl p-4 hover:text-white transition-colors" aria-label="Закрыть">✕</button>
      {!isZoomed && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 text-white/80 rounded-full text-sm font-medium backdrop-blur-md">
          Кликните для увеличения
        </div>
      )}
    </div>
  );
};

export default function ChatWindow({ ticketId, initialMessages, isStaff = false, initialTemplates = [], onSendMessage, editTicketMessage }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isAiPending, startAiTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Polling for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden) return; // Prevent DDoS when tab is in background
      try {
        const res = await fetch(`/api/support/messages?ticketId=${ticketId}&after=${encodeURIComponent(lastCheckedRef.current)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMsgs = data.messages.filter((m: Message) => !existingIds.has(m.id));
            if (newMsgs.length === 0) return prev;
            return [...prev, ...newMsgs];
          });
          lastCheckedRef.current = data.messages[data.messages.length - 1].createdAt;
        }
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [ticketId]);

  // Auto-scroll on new messages
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      isFirstRender.current = false;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, sender: replyingTo.sender } : null
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

    setText('');
    setFile(null);
    setReplyingTo(null);

    try {
      await onSendMessage(formData);
    } catch { /* handled by server */ }
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
          <div className="bg-white/90 px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </div>
            <p className="text-xl font-bold text-slate-800">Перетащите файл сюда</p>
            <p className="text-sm text-slate-500 mt-1">Изображение или PDF (до 5 МБ)</p>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50 relative">
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
                    <div className="absolute -left-20 top-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                      <button 
                        onClick={() => setReplyingTo(msg)}
                        className="p-2 text-slate-400 hover:text-indigo-600 rounded-full bg-white shadow-sm border border-slate-100"
                        title="Ответить"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                      </button>
                      {isExpired ? (
                        <div className="p-2 text-slate-300 rounded-full bg-white shadow-sm border border-slate-100 cursor-not-allowed" title="Заблокировано Telegram API (>48ч)">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.text); }}
                          className="p-2 text-slate-400 hover:text-amber-600 rounded-full bg-white shadow-sm border border-slate-100"
                          title="Редактировать"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        </button>
                      )}
                    </div>
                  )}
                  {!msg.isDeleted && msg.sender === 'USER' && (
                    <div className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 flex transition-opacity">
                      <button 
                        onClick={() => setReplyingTo(msg)}
                        className="p-2 text-slate-400 hover:text-indigo-600 rounded-full bg-white shadow-sm border border-slate-100"
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
                      {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      {msg.isHistorical && ' (Архив)'}
                    </span>
                    {msg.isEdited && <span className="ml-2" title={msg.originalText || ''}>(изменено)</span>}
                  </div>
                  
                  {/* Reply Quote */}
                  {!msg.isDeleted && msg.replyTo && (
                    <div className={`mb-2 p-2 rounded-lg border-l-2 text-xs ${msg.sender === 'STAFF' ? 'bg-black/10 border-white/40 text-primary-foreground' : 'bg-default-100 border-primary/50 text-foreground'}`}>
                       <div className="font-bold opacity-70 mb-0.5">{msg.replyTo.sender}</div>
                       <div className="opacity-80 line-clamp-2">{msg.replyTo.text || 'Медиа сообщение'}</div>
                    </div>
                  )}

                  {/* Media preview */}
                  {!msg.isDeleted && msg.mediaUrl === 'uploading...' ? (
                    <div className="w-full h-32 bg-primary/10 animate-pulse rounded-xl mb-2 flex items-center justify-center border border-primary/20">
                       <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                  ) : !msg.isDeleted && msg.mediaUrl && msg.mediaType === 'image' && (
                    <img src={`/api/media/${encodeURIComponent(msg.mediaUrl)}`} alt="attachment" onClick={() => setZoomedImage(msg.mediaUrl as string)} className="rounded-xl max-h-60 mb-2 cursor-zoom-in border border-default-200 hover:opacity-90 transition-opacity object-cover" />
                  )}
                  {!msg.isDeleted && msg.mediaUrl && msg.mediaUrl !== 'uploading...' && msg.mediaType === 'video' && (
                    <video src={`/api/media/${encodeURIComponent(msg.mediaUrl)}`} controls className="rounded-xl max-h-60 mb-2 border border-default-200 w-full object-cover" />
                  )}
                  {!msg.isDeleted && msg.mediaUrl && msg.mediaUrl !== 'uploading...' && msg.mediaType === 'audio' && (
                    <audio src={`/api/media/${encodeURIComponent(msg.mediaUrl)}`} controls className="w-full mb-2 max-w-[250px] opacity-90 hover:opacity-100 transition-opacity" />
                  )}
                  {!msg.isDeleted && msg.mediaUrl && msg.mediaUrl !== 'uploading...' && msg.mediaType === 'document' && (
                    <div className="flex items-center gap-2 bg-black/5 p-2.5 rounded-xl border border-black/10 mb-2">
                       <div className="text-2xl drop-shadow-sm">📄</div>
                       <div className="text-sm font-semibold truncate flex-1 leading-tight text-foreground/90">Приложенный<br/>документ</div>
                       <a href={`/api/media/${encodeURIComponent(msg.mediaUrl)}`} target="_blank" className="text-primary text-[10px] font-bold px-2.5 py-1.5 bg-background shadow-sm border border-default-200 rounded-md hover:bg-default-50 transition-colors">Открыть</a>
                    </div>
                  )}

                  {msg.isDeleted ? (
                    <div className="italic text-sm">Удалено (Видно только стаффу)</div>
                  ) : editingMessageId === msg.id ? (
                    <div className="mt-2 animate-in fade-in zoom-in-95 duration-200">
                      <textarea value={editingText} onChange={e => setEditingText(e.target.value)} className="w-full text-sm text-slate-900 bg-white border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]" autoFocus />
                      <div className="flex gap-2 justify-end mt-2">
                         <button onClick={() => setEditingMessageId(null)} className="text-[11px] font-bold uppercase bg-white/50 text-slate-700 px-3 py-1.5 rounded border border-slate-300 hover:bg-white">Отмена</button>
                         <button onClick={() => handleEditSubmit(msg.id)} className="text-[11px] font-bold uppercase bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 shadow-sm border border-indigo-700">Сохранить</button>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm">{msg.text}</div>
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
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-200">
        
        {isStaff && (initialTemplates.length > 0 || true) && (
          <div className="flex flex-wrap gap-1.5 mb-3 items-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase mr-1 flex items-center shrink-0">Помощник:</span>
            
            {/* AI Smart Reply Button */}
            <button
              type="button"
              onClick={handleAiReply}
              disabled={isAiPending}
              className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-700 rounded-md hover:bg-indigo-100 transition-all flex items-center gap-1.5 shadow-sm"
            >
              {isAiPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              AI Ответ
            </button>

            {initialTemplates.map(t => (
              <button 
                key={t.id} 
                type="button" 
                onClick={() => setText(t.text)}
                className="px-2 py-1 border border-slate-200 text-[10px] font-bold bg-white text-slate-600 rounded-md hover:bg-slate-50 border hover:border-slate-300 transition-colors"
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
          
          <div className="flex-1 relative flex items-center border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent bg-white">
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
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
          >
            Отправить
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
