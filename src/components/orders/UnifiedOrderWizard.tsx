'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Copy, CheckCircle2, Trash2, ArrowRight, Wand2, Plus } from 'lucide-react';
import { useMultiOrderEngine } from '@/hooks/useMultiOrderEngine';
import { formatCents } from '@/lib/utils';
import { PublicCategory } from '@/actions/order/catalog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SocialIcon } from '@/components/ui/SocialIcon';
import { formatPricePerUnit } from '@/utils/format-price';

export function UnifiedOrderWizard({ 
  userBalanceCents = 0, 
  userEmail = "", 
  initialReorderData
}: { 
  userBalanceCents?: number; 
  userEmail?: string; 
  initialReorderData?: { serviceId: string; categoryId: string; link: string; quantity: number } | null;
}) {
  const engine = useMultiOrderEngine();
  const [inputText, setInputText] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gateway, setGateway] = useState<'yookassa' | 'cryptobot' | 'balance'>('yookassa');
  const [formEmail, setFormEmail] = useState(userEmail || "");

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
        idempotencyKey: `wizard-order-${formEmail}-${validTasks.map(t => `${t.serviceId}_${t.quantity}`).join('-')}`,
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
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : String(e)) || "Ошибка при оплате");
    } finally {
      setIsLoading(false);
    }
  };

  if (engine.catalog.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-32">
      
      {/* Input Stage */}
      {engine.tasks.length === 0 ? (
        <section className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">1. Куда накручиваем?</h2>
          
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-amber-500/10 rounded-3xl blur opacity-30 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative bg-background border border-border/60 rounded-2xl p-4 shadow-inner">
               <textarea
                  id="order-wizard-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                     if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (inputText.trim()) handleAddClick();
                     }
                  }}
                  placeholder="Вставьте ссылку на пост или профиль. Для массового заказа вставьте сразу несколько ссылок, каждую с новой строки..."
                  className="w-full min-h-[120px] bg-transparent outline-none resize-y text-foreground text-sm font-medium placeholder:text-muted-foreground/60 focus:ring-0"
               />
               <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                     <Wand2 className="w-3.5 h-3.5 text-primary" />
                     Система автоматически распознает все ссылки из текста
                  </div>
                  <button 
                     onClick={handleAddClick}
                     disabled={!inputText.trim()}
                     className="h-9 px-5 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-sm rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 cursor-pointer shadow-sm"
                  >
                     Продолжить <ArrowRight className="w-4 h-4 inline-block ml-1" />
                  </button>
               </div>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm text-muted-foreground mb-4 text-center font-medium">Или выберите соцсеть вручную:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {engine.catalog.map(net => (
                <button
                  key={net.id}
                  onClick={() => engine.addEmptyTask(net.id)}
                  className="px-4 py-2 bg-background border border-border rounded-xl hover:border-primary hover:text-primary transition-all flex items-center gap-2 hover:shadow-sm"
                >
                  {net.icon && <img src={net.icon} alt={net.name} className="w-4 h-4" />}
                  <span className="text-sm font-semibold">{net.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <div className="flex items-center justify-between bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
           <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                 Добавлено позиций: <span className="text-foreground">{engine.tasks.length}</span>
              </span>
           </div>
           <div className="flex items-center gap-2">
              <input 
                 value={inputText}
                 onChange={e => setInputText(e.target.value)}
                 onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       if (inputText.trim()) handleAddClick();
                    }
                 }}
                 placeholder="Вставить еще ссылки..."
                 className="h-9 px-3 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary w-48"
              />
              <button 
                 onClick={handleAddClick}
                 disabled={!inputText.trim()}
                 className="h-9 w-9 flex items-center justify-center bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
              >
                 <Plus className="w-4 h-4" />
              </button>
           </div>
        </div>
      )}

      {/* Configuration Stage: Cards */}
      {engine.tasks.length > 0 && (
        <section className="space-y-4">
          {engine.tasks.map((task, index) => {
            const net = engine.catalog.find(n => 
               n.slug.toLowerCase().includes(task.platform.toLowerCase()) || 
               n.categories.some(c => c.id === task.categoryId)
            );
            
            return (
              <div 
                key={task.id} 
                className="bg-card border border-border/60 rounded-3xl p-5 shadow-sm hover:border-primary/40 transition-all animate-in slide-in-from-top-4 fade-in"
                style={{ animationDelay: `${index * 50}ms`, animationDuration: '400ms' }}
              >
                 <div className="flex flex-col md:flex-row gap-5">
                    {/* Left: Link & Context */}
                    <div className="w-full md:w-1/3 space-y-3">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <SocialIcon slug={task.platform} size={16} />
                             </div>
                             <span className="text-sm font-bold">
                                {net ? net.name : task.platform === 'OTHER' ? 'Прочее' : task.platform}
                             </span>
                          </div>
                          <button 
                             onClick={() => engine.removeTask(task.id)}
                             className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                             title="Удалить"
                          >
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                       
                       <div>
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Ссылка</label>
                          <input 
                             value={task.url}
                             onChange={(e) => engine.updateTask(task.id, { url: e.target.value, cleanTitle: e.target.value })}
                             placeholder="https://..."
                             className="w-full h-10 px-3 text-sm bg-background border border-border/80 rounded-xl outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"
                          />
                       </div>

                       {task.status === 'configured' && engine.tasks.filter(t => t.platform === task.platform && t.status === 'new').length > 0 && (
                          <button 
                             onClick={() => engine.applyToAllSamePlatform(task.id)}
                             className="w-full h-8 text-[11px] font-bold bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors flex items-center justify-center gap-1.5"
                          >
                             <Copy className="w-3 h-3" /> Применить ко всем {task.platform}
                          </button>
                       )}
                    </div>

                    {/* Right: Configuration */}
                    <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border border-border/40">
                       <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Категория</label>
                          <Select 
                             value={task.categoryId}
                             onValueChange={(val) => {
                                if (!val) return;
                                engine.updateTask(task.id, { 
                                   categoryId: val, 
                                   serviceId: "", 
                                   status: 'new',
                                   priceCents: 0,
                                   availableServices: [],
                                   isLoadingServices: true 
                                });
                             }}
                          >
                             <SelectTrigger className="w-full h-10 bg-background border border-border/80 hover:border-primary hover:bg-muted/5 rounded-xl text-sm font-semibold focus:ring-1 focus:ring-primary/50">
                                <SelectValue placeholder="Выберите категорию">
                                   {(value: string) => {
                                      if (!value || !net) return null;
                                      return net.categories.find(c => c.id === value)?.name ?? value;
                                   }}
                                </SelectValue>
                             </SelectTrigger>
                             <SelectContent>
                                {net?.categories.map((c: PublicCategory) => (
                                   <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                             </SelectContent>
                          </Select>
                       </div>

                       <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Услуга</label>
                          {task.isLoadingServices ? (
                             <div className="h-10 flex items-center justify-center bg-background rounded-xl border border-border/80">
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                             </div>
                          ) : (
                             <Select
                                value={task.serviceId}
                                onValueChange={(val) => {
                                   if (!val) return;
                                   const svc = task.availableServices.find(s => s.id === val);
                                   if (svc) {
                                      engine.setTaskConfig(task.id, svc.id, Math.max(task.quantity, svc.minQty), svc.pricePerUnitRub);
                                   }
                                }}
                             >
                                <SelectTrigger className="w-full h-10 bg-background border border-border/80 hover:border-primary hover:bg-muted/5 rounded-xl text-sm font-semibold focus:ring-1 focus:ring-primary/50">
                                   <SelectValue placeholder="Выберите услугу">
                                      {(value: string) => {
                                         if (!value) return "Выберите услугу";
                                         const s = task.availableServices.find(srv => srv.id === value);
                                         if (!s) return value;
                                         return `${s.name} (${formatPricePerUnit(s.pricePerUnitRub)} ₽/шт)`;
                                      }}
                                   </SelectValue>
                                </SelectTrigger>
                                 <SelectContent>
                                    {task.availableServices.map(s => (
                                       <SelectItem key={s.id} value={s.id}>
                                          {s.name} ({formatPricePerUnit(s.pricePerUnitRub)} ₽/шт)
                                       </SelectItem>
                                    ))}
                                 </SelectContent>
                             </Select>
                          )}
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Количество</label>
                          <input
                             type="number"
                             min={task.availableServices.find(s => s.id === task.serviceId)?.minQty || 10}
                             max={task.availableServices.find(s => s.id === task.serviceId)?.maxQty || 1000000}
                             value={task.quantity || ''}
                             onChange={(e) => {
                                const svc = task.availableServices.find(s => s.id === task.serviceId);
                                if (!svc) return;
                                const val = parseInt(e.target.value) || 0;
                                engine.setTaskConfig(task.id, svc.id, val, svc.pricePerUnitRub);
                             }}
                             disabled={!task.serviceId}
                             className="w-full h-10 px-3 bg-background border border-border/80 hover:border-primary rounded-xl text-sm font-black text-foreground outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
                          />
                          {task.serviceId && (
                             <p className="text-[10px] text-muted-foreground text-center">
                                Мин: {task.availableServices.find(s => s.id === task.serviceId)?.minQty} | Макс: {task.availableServices.find(s => s.id === task.serviceId)?.maxQty}
                             </p>
                          )}
                       </div>

                       <div className="space-y-1.5 flex flex-col justify-end">
                          <div className="h-10 bg-primary/5 rounded-xl border border-primary/20 flex flex-col justify-center items-center px-4">
                             <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider leading-none">Стоимость</span>
                             <span className="text-sm font-black text-primary leading-tight">
                                {task.priceCents > 0 ? (task.priceCents / 100).toFixed(2) : "0.00"} ₽
                             </span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Checkout Stage */}
      {engine.tasks.length > 0 && engine.stats.configuredTasks > 0 && (
        <section className="bg-card border border-border/60 rounded-3xl p-6 shadow-xl sticky bottom-4 z-50 animate-in slide-in-from-bottom-8 fade-in">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
             
             {/* Left: Summary Stats */}
             <div className="flex-1 w-full space-y-2">
                <div className="flex items-center gap-2">
                   <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                   </div>
                   <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Итого к оплате</h3>
                      <div className="text-3xl font-black text-foreground">
                         {(engine.stats.totalCents / 100).toFixed(2)} ₽
                      </div>
                   </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground px-12">
                   <span>Позиций: <b className="text-foreground">{engine.stats.configuredTasks}</b></span>
                   <span>Из них готово: <b className={engine.stats.isReadyToPay ? "text-green-500" : "text-amber-500"}>{engine.stats.configuredTasks} / {engine.stats.totalTasks}</b></span>
                </div>
             </div>

             {/* Right: Payment Logic */}
             <div className="flex-1 w-full space-y-3">
                {!userEmail && (
                  <input 
                    type="email" 
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="Ваш Email (для чека)"
                    className="w-full bg-background border border-border/80 rounded-xl p-3 h-10 text-sm focus:ring-1 focus:ring-primary/50 outline-none"
                  />
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGateway('yookassa')}
                    className={`h-10 text-[11px] font-bold uppercase tracking-wider rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                      gateway === 'yookassa' 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'bg-background border-border hover:border-primary/50 text-muted-foreground'
                    }`}
                  >
                    Банковская карта
                  </button>
                  <button
                    type="button"
                    onClick={() => setGateway('cryptobot')}
                    className={`h-10 text-[11px] font-bold uppercase tracking-wider rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                      gateway === 'cryptobot' 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'bg-background border-border hover:border-primary/50 text-muted-foreground'
                    }`}
                  >
                    CryptoBot
                  </button>
                  {userEmail && (
                    <button
                      type="button"
                      onClick={() => setGateway('balance')}
                      className={`h-10 md:col-span-1 col-span-2 text-[11px] font-bold uppercase tracking-wider rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                        gateway === 'balance' 
                          ? 'bg-primary/10 border-primary text-primary' 
                          : 'bg-background border-border hover:border-primary/50 text-muted-foreground'
                      }`}
                    >
                      С баланса
                    </button>
                  )}
                </div>
                
                {error && (
                   <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-semibold text-center animate-in fade-in">
                      {error}
                   </div>
                )}

                <button
                  onClick={(e) => {
                    if (!engine.stats.isReadyToPay || isLoading || (gateway === 'balance' && userBalanceCents < engine.stats.totalCents)) {
                      e.preventDefault();
                      if (!engine.stats.isReadyToPay) {
                        setError("Пожалуйста, укажите верные ссылки и параметры для всех добавлений.");
                      } else if (gateway === 'balance' && userBalanceCents < engine.stats.totalCents) {
                        setError(`Недостаточно средств на балансе. Требуется ${formatCents(engine.stats.totalCents)} ₽, у вас ${formatCents(userBalanceCents)} ₽.`);
                      }
                      const errElem = document.querySelector('[data-error-container]');
                      errElem?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      return;
                    }
                    setError(null);
                    handleCheckout();
                  }}
                  className="w-full h-12 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : !engine.stats.isReadyToPay ? (
                    "Заполните все услуги"
                  ) : (
                    <>
                      Оплатить заказ <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
             </div>

          </div>
        </section>
      )}

    </div>
  );
}
