"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Copy, CheckCircle2, ChevronDown, ChevronUp, Trash2, ArrowRight, Wand2 } from 'lucide-react';
import { useMultiOrderEngine } from '@/hooks/useMultiOrderEngine';
import { IntelligencePlatform } from '@/services/analyzer/link-rules';
import { formatCents } from '@/lib/utils';
import { PublicCategory } from '@/actions/order/catalog';

function formatPricePerUnit(price: number): string {
  if (price === 0) return '0.00';
  let formatted: string;
  if (price < 0.01) {
    formatted = price.toFixed(6);
  } else if (price < 0.1) {
    formatted = price.toFixed(4);
  } else {
    formatted = price.toFixed(2);
  }
  
  if (formatted.includes('.')) {
    while (formatted.endsWith('0') && formatted.split('.')[1].length > 2) {
      formatted = formatted.slice(0, -1);
    }
  }
  return formatted;
}

export function UniversalOrderForm({ 
  userBalanceCents = 0, 
  userEmail = "", 
  initialText = "", 
  onEmpty,
  initialReorderData
}: { 
  userBalanceCents?: number; 
  userEmail?: string; 
  initialText?: string; 
  onEmpty?: () => void;
  initialReorderData?: { serviceId: string; categoryId: string; link: string; quantity: number } | null;
}) {
  const engine = useMultiOrderEngine();
  const [inputText, setInputText] = useState(initialText);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gateway, setGateway] = useState<'yookassa' | 'cryptobot' | 'balance'>('yookassa');
  const [formEmail, setFormEmail] = useState(userEmail || "");

  // Auto-expand the first "new" task if none is expanded
  useEffect(() => {
    if (engine.tasks.length > 0 && !expandedTaskId) {
      const firstNew = engine.tasks.find(t => t.status === 'new');
      if (firstNew) {
        setExpandedTaskId(firstNew.id);
      }
    }
  }, [engine.tasks, expandedTaskId]);

  const prevTasksLengthRef = useRef(engine.tasks.length);
  useEffect(() => {
    // If tasks transition from >0 to 0, call onEmpty
    if (prevTasksLengthRef.current > 0 && engine.tasks.length === 0) {
      if (onEmpty) onEmpty();
    }
    prevTasksLengthRef.current = engine.tasks.length;
  }, [engine.tasks.length, onEmpty]);

  useEffect(() => {
    if (initialText) {
      engine.addLinks(initialText);
      setInputText("");
    }
  }, [engine, initialText]);

  const hasLoadedReorder = useRef(false);
  useEffect(() => {
    if (initialReorderData && !hasLoadedReorder.current) {
      hasLoadedReorder.current = true;
      engine.loadReorderTask(initialReorderData);
    }
  }, [engine, initialReorderData]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (text.includes('http') || text.includes('t.me') || text.includes('vk.com')) {
      e.preventDefault();
      engine.addLinks(text);
      setInputText("");
    }
  };

  const handleAddClick = () => {
    engine.addLinks(inputText);
    setInputText("");
  };

  const handleCheckout = async () => {
    if (!engine.stats.isReadyToPay) return;
    setIsLoading(true);
    setError(null);
    try {
      const { structuredMassOrderCheckoutAction } = await import('@/actions/order/mass');
      const validTasks = engine.tasks.filter(t => t.status === 'configured' && t.serviceId);
      
      const res = await structuredMassOrderCheckoutAction({
        orders: validTasks.map(t => ({
          serviceId: t.serviceId!,
          link: t.url,
          quantity: t.quantity
        })),
        email: formEmail,
        gateway,
        idempotencyKey: Math.random().toString(36).substring(7),
        expectedTotalRub: engine.stats.totalCents / 100
      });

      if (!res || !res.success) {
        throw new Error(!res ? "Ошибка при создании заказа" : res.error);
      }

      if (res.data.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      } else {
        window.location.href = `/dashboard?paymentId=${res.data.paymentId}`;
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e.message || "Ошибка при оплате");
    } finally {
      setIsLoading(false);
    }
  };

  if (engine.catalog.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border border-border bg-card/50 rounded-3xl p-8 text-center space-y-4 animate-pulse">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-black text-foreground uppercase tracking-wider">Синхронизация каталога</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Получаем актуальные тарифы и синхронизируем цены...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Smart Dropzone */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-primary/20 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
        <div className="relative bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col gap-3">
           <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputText.trim()) handleAddClick();
                 }
              }}
              placeholder="Вставьте ссылку или сразу несколько (до 50 шт)"
              className="w-full min-h-[80px] bg-transparent resize-none outline-none text-foreground text-sm font-medium placeholder:text-muted-foreground/60"
           />
           <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                 <Wand2 className="w-3.5 h-3.5 text-primary" />
                 Система автоматически распознает все ссылки из вашего текста
              </div>
              <button 
                 onClick={handleAddClick}
                 disabled={!inputText.trim()}
                 className="h-9 px-4 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                 + Добавить
              </button>
           </div>
        </div>
      </div>

      {/* Accordion Tasks */}
      <div className="space-y-3">
        {engine.tasks.map((task, index) => {
           const isExpanded = expandedTaskId === task.id;
           const isConfigured = task.status === 'configured';
           
           // Derived platform logic for display
           let platformName = task.platform.toString();
           const net = engine.catalog.find(n => n.slug.toLowerCase().includes(task.platform.toLowerCase()));
           if (net) platformName = net.name;

           return (
             <div key={task.id} className={`rounded-xl border transition-all duration-300 ${isExpanded ? 'border-primary ring-1 ring-primary/30 shadow-md bg-card' : isConfigured ? 'border-border/50 bg-background opacity-80' : 'border-border bg-card'}`}>
                
                {/* Header */}
                <div 
                   onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                   className="p-4 flex items-center justify-between cursor-pointer"
                >
                   <div className="flex items-center gap-3 overflow-hidden">
                      {isConfigured ? (
                         <div className="w-6 h-6 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0">
                           <CheckCircle2 className="w-4 h-4" />
                         </div>
                      ) : (
                         <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                           {index + 1}
                         </div>
                      )}
                      <div className="truncate">
                         <div className="font-semibold text-sm text-foreground truncate">{task.cleanTitle}</div>
                         <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                            {isConfigured ? (
                               <span className="text-success">Настроено • {formatCents(task.priceCents)} ₽</span>
                            ) : (
                               <span>{platformName} • Ожидает настройки</span>
                            )}
                         </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-3 shrink-0">
                      <button 
                         onClick={(e) => { e.stopPropagation(); engine.removeTask(task.id); }}
                         className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                   </div>
                </div>

                {/* Body */}
                {isExpanded && (
                   <div className="px-4 pb-4 animate-in slide-in-from-top-2">
                      <div className="pt-4 border-t border-border/50 space-y-4">
                         {/* Platform & Category Selectors */}
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                               <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Платформа</label>
                               <select 
                                  value={net ? net.id : ""}
                                  onChange={(e) => {
                                     const selectedNet = engine.catalog.find(n => n.id === e.target.value);
                                     if (selectedNet) {
                                        let catId = selectedNet.categories[0]?.id || "";
                                        // Try to preserve category if changing to same platform type, though ID changes
                                        engine.updateTask(task.id, { 
                                           platform: (selectedNet.name.toUpperCase().includes("TELEGRAM") ? IntelligencePlatform.TELEGRAM : 
                                                     selectedNet.name.toUpperCase().includes("VK") ? IntelligencePlatform.VK : 
                                                     selectedNet.name.toUpperCase().includes("INSTAGRAM") ? IntelligencePlatform.INSTAGRAM : 
                                                     IntelligencePlatform.OTHER) as any, // Simple fallback mapping
                                           categoryId: catId, 
                                           serviceId: "", 
                                           status: 'new',
                                           isLoadingServices: !!catId
                                        });
                                     }
                                  }}
                                  className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 appearance-none"
                               >
                                  <option value="" disabled>Выберите платформу</option>
                                  {engine.catalog.map(n => (
                                     <option key={n.id} value={n.id}>{n.name}</option>
                                  ))}
                               </select>
                            </div>
                            
                            {net && (
                               <div className="space-y-1.5">
                                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Категория</label>
                                  <select 
                                     value={task.categoryId}
                                     onChange={(e) => {
                                        engine.updateTask(task.id, { 
                                           categoryId: e.target.value, 
                                           serviceId: "", 
                                           status: 'new',
                                           isLoadingServices: true 
                                        });
                                     }}
                                     className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 appearance-none"
                                  >
                                     <option value="" disabled>Выберите категорию</option>
                                     {net.categories.map((c: PublicCategory) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                     ))}
                                  </select>
                               </div>
                            )}
                         </div>

                         {/* Service Selector */}
                         <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Услуга</label>
                            {task.isLoadingServices ? (
                               <div className="h-11 flex items-center justify-center bg-muted/30 rounded-xl border border-border/50">
                                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                               </div>
                            ) : (
                               <select
                                  value={task.serviceId}
                                  onChange={(e) => {
                                     const svc = task.availableServices.find(s => s.id === e.target.value);
                                     if (svc) {
                                        engine.setTaskConfig(task.id, svc.id, Math.max(task.quantity, svc.minQty), svc.pricePerUnitRub);
                                     }
                                  }}
                                  className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 appearance-none"
                               >
                                  <option value="" disabled>-- Выберите услуга --</option>
                                  {task.availableServices.map(s => (
                                     <option key={s.id} value={s.id}>
                                        {s.name} ({formatPricePerUnit(s.pricePerUnitRub)} ₽/шт)
                                     </option>
                                  ))}
                               </select>
                            )}
                         </div>

                         {/* Quantity Input */}
                         <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Количество</label>
                            <input
                               type="number"
                               min={task.availableServices.find(s => s.id === task.serviceId)?.minQty || 10}
                               value={task.quantity || ''}
                               onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  const svc = task.availableServices.find(s => s.id === task.serviceId);
                                  engine.setTaskConfig(task.id, task.serviceId, val, svc?.pricePerUnitRub || 0);
                               }}
                               className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                            />
                         </div>

                         {/* Actions */}
                         <div className="pt-2 flex flex-col gap-2">
                            {task.serviceId && engine.tasks.filter(t => t.id !== task.id && t.platform === task.platform && t.status === 'new').length > 0 && (
                               <button
                                  onClick={() => {
                                     engine.applyToAllSamePlatform(task.id);
                                     setExpandedTaskId(null); // Collapse after mass applying
                                  }}
                                  className="h-11 w-full bg-secondary/50 text-secondary-foreground font-bold text-xs rounded-xl hover:bg-secondary transition-colors flex items-center justify-center gap-2"
                               >
                                  <Copy className="w-4 h-4" />
                                  Применить ко всем ссылкам {platformName}
                               </button>
                            )}
                            <button
                               onClick={() => {
                                  // Auto-expand next unconfigured
                                  const nextUnconfigured = engine.tasks.find(t => t.id !== task.id && t.status === 'new');
                                  setExpandedTaskId(nextUnconfigured ? nextUnconfigured.id : null);
                               }}
                               disabled={!task.serviceId || task.quantity <= 0}
                               className="h-11 w-full bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                            >
                               Готово
                            </button>
                         </div>
                      </div>
                   </div>
                )}
             </div>
           );
        })}
      </div>

      {/* Sticky Checkout Footer */}
      {engine.stats.totalTasks > 0 && (
         <div className="fixed bottom-0 left-0 w-full bg-background/80 backdrop-blur-xl border-t border-border p-4 z-50 md:sticky md:bottom-4 md:rounded-2xl md:border md:shadow-2xl space-y-4">
            
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Email and Gateway settings (only shown when ready to pay) */}
            {engine.stats.isReadyToPay && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="space-y-1.5">
                     <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Email (для чека и статуса)</label>
                     <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="Ваш email"
                        className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                     />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Способ оплаты</label>
                     <select
                        value={gateway}
                        onChange={(e) => setGateway(e.target.value as any)}
                        className="w-full h-11 px-3 bg-background border border-border rounded-xl text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 appearance-none"
                     >
                        <option value="yookassa">Банковская карта (РФ) / СБП</option>
                        <option value="cryptobot">Криптовалюта (CryptoBot)</option>
                        {userBalanceCents >= engine.stats.totalCents && (
                          <option value="balance">Баланс ({formatCents(userBalanceCents)} ₽)</option>
                        )}
                     </select>
                  </div>
               </div>
            )}

            <div className="max-w-2xl mx-auto flex items-center justify-between gap-4 border-t border-border/50 pt-2 md:pt-0 md:border-none mt-2 md:mt-0">
               <div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                     Настроено {engine.stats.configuredTasks} из {engine.stats.totalTasks}
                  </div>
                  <div className="text-xl font-black tabular-nums text-foreground">
                     {formatCents(engine.stats.totalCents)} ₽
                  </div>
               </div>
               
               <button
                  disabled={!engine.stats.isReadyToPay || isLoading || !formEmail}
                  onClick={handleCheckout}
                  className={`h-12 px-6 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${
                     engine.stats.isReadyToPay && !isLoading && formEmail
                     ? 'bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95' 
                     : 'bg-muted text-muted-foreground cursor-not-allowed opacity-70'
                  }`}
               >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Оплатить'} <ArrowRight className="w-4 h-4" />
               </button>
            </div>
         </div>
      )}
    </div>
  );
}
