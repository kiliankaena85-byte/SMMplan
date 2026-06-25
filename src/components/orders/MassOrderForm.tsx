'use client';

import React, { useState, useEffect } from 'react';
import { ActionForm } from '@/components/admin/action-form';
import { massOrderCalculateAction, massOrderCheckoutAction } from '@/actions/order/mass';
import { Zap, AlertCircle, Loader2, Wallet, CreditCard, Bitcoin, Settings2, LayoutList, Plus, Trash2 } from 'lucide-react';
import { useOrderEngine } from '@/hooks/useOrderEngine';
import { Table } from '@heroui/react';
import { SubmitButton } from '@/components/admin/submit-button';
import { NetworkSelector } from './sub/NetworkSelector';
import { CategorySelector } from './sub/CategorySelector';


interface MassOrderCalculation {
  globalError?: string;
  validCount?: number;
  totalRub?: number;
  errors?: { line: number; error: string; text: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validOrders?: any[];
}

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

interface TaskItem {
  id: string;
  link: string;
  categoryId: string;
  serviceId: string;
  numericId: string | number;
  quantity: string;
  serviceName: string;
}

export function MassOrderForm({ userEmail }: { userEmail?: string }) {
  const [mode, setMode] = useState<'wizard' | 'pro'>('wizard');
  const [email, setEmail] = useState(userEmail || '');
  const [gateway, setGateway] = useState<'yookassa' | 'balance' | 'cryptobot'>('yookassa');
  
  // Pro mode state
  const [proText, setProText] = useState('');
  
  // Wizard state
  const [draftLink, setDraftLink] = useState('');
  const [draftServiceId, setDraftServiceId] = useState('');
  const [draftNumericId, setDraftNumericId] = useState('');
  const [draftQuantity, setDraftQuantity] = useState('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  // Services loading state for the wizard
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [services, setServices] = useState<any[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  // We use useOrderEngine to fetch the unfilteredCatalog. 
  const engine = useOrderEngine([], userEmail);
  const { unfilteredCatalog, platform, manualPlatform, categoryId, setCategoryId, networkId } = engine;

  useEffect(() => {
    if (categoryId) {
      setIsLoadingServices(true);
      import('@/actions/order/catalog').then(m => m.getServicesByCategoryAction(categoryId))
        .then(svcs => {
          setServices(svcs);
          setIsLoadingServices(false);
        });
    } else {
      setServices([]);
    }
  }, [categoryId]);

  const selectedDraftService = services.find(s => s.id === draftServiceId);

  const handleAddTask = () => {
    if (!draftLink || !draftServiceId || !draftQuantity || !categoryId) return;
    setTasks([...tasks, {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
      link: draftLink,
      categoryId: categoryId,
      serviceId: draftServiceId,
      numericId: draftNumericId,
      quantity: draftQuantity,
      serviceName: selectedDraftService?.name || 'Услуга'
    }]);
    // Clear only link, so user can paste the next link instantly!
    setDraftLink('');
  };

  // Platform select handler
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePlatformSelect = (pId: string, pName: any) => {
    engine.setNetworkId(pId);
    engine.setManualPlatform(pName);
    const netObj = unfilteredCatalog.find(n => n.id === pId);
    if (netObj && netObj.categories.length > 0) {
      engine.setCategoryId(netObj.categories[0].id);
    }
  };

  const computedText = mode === 'wizard' 
    ? tasks.map(t => `${t.numericId} | ${t.link.trim()} | ${t.quantity}`).join('\n')
    : proText;

  const [calculation, setCalculation] = useState<MassOrderCalculation | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (!idempotencyKey) {
      setIdempotencyKey(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36));
    }
  }, [idempotencyKey]);

  // Debounce auto-calculate when computedText changes
  useEffect(() => {
    if (!computedText.trim()) {
      setCalculation(null);
      return;
    }

    setIsCalculating(true);
    const handler = setTimeout(async () => {
      try {
        const res = await massOrderCalculateAction({ text: computedText });
        if (res.success) {
          setCalculation(res.data);
        } else {
          setCalculation({ globalError: res.error });
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        setCalculation({ globalError: e.message });
      } finally {
        setIsCalculating(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [computedText]);

  const handleCheckout = async () => {
    const finalEmail = userEmail || email;
    const res = await massOrderCheckoutAction({ text: computedText, email: finalEmail || undefined, gateway, idempotencyKey });
    if (res.success && res.data?.paymentUrl) {
      setIdempotencyKey('');
      window.location.href = res.data.paymentUrl;
    }
    return res;
  };

  return (
    <div className="space-y-6">
      {/* ── Mode Toggle ── */}
      <div className="flex w-full sm:w-max gap-1 p-1 bg-muted/50 rounded-xl border border-border/50">
        <button
          type="button"
          onClick={() => setMode('wizard')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            mode === 'wizard' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <LayoutList className="w-4 h-4 shrink-0" />
          <span className="truncate">Пошаговый режим</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('pro')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            mode === 'pro' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Settings2 className="w-4 h-4 shrink-0" />
          <span className="truncate">Pro (Текст)</span>
        </button>
      </div>

      <div className="bg-card text-card-foreground border border-border/60 rounded-2xl shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
          <Zap className="w-24 h-24" />
        </div>
        
        {mode === 'wizard' && (
          <div className="space-y-6 animate-in fade-in duration-300 relative z-10">
            {(!unfilteredCatalog || unfilteredCatalog.length === 0) ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-muted/10 p-5 rounded-2xl border border-border/50 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-4">
                      <NetworkSelector
                        platform={platform}
                        manualPlatform={manualPlatform}
                        networkId={networkId}
                        unfilteredCatalog={unfilteredCatalog}
                        onSelect={handlePlatformSelect}
                      />

                      <CategorySelector
                        categoryId={categoryId}
                        setCategoryId={(val) => {
                          setCategoryId(val);
                          setDraftServiceId('');
                          setDraftNumericId('');
                        }}
                        availableCategories={engine.availableCategories}
                      />
                    </div>

                    {/* Link */}
                    <div className="sm:col-span-2 space-y-1.5 mt-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Ссылка</label>
                      <input 
                        type="text"
                        value={draftLink}
                        onChange={e => setDraftLink(e.target.value)}
                        placeholder="https://t.me/..."
                        className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>

                    {/* Service */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Услуга</label>
                      <div className="relative">
                        <select
                          value={draftServiceId}
                          onChange={e => {
                            const sId = e.target.value;
                            const s = services.find(x => x.id === sId);
                            setDraftServiceId(sId);
                            setDraftNumericId(s?.numericId || '');
                            if (s?.minQty) {
                              setDraftQuantity(s.minQty.toString());
                            }
                          }}
                          disabled={isLoadingServices || !categoryId}
                          className="w-full h-12 pl-4 pr-10 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 truncate appearance-none"
                        >
                          <option value="" disabled>-- Выберите услугу --</option>
                          {services.map(s => {
                            const isQuarantined = s.cooldownUntil && new Date(s.cooldownUntil) > new Date();
                            return (
                              <option key={s.id} value={s.id} disabled={!!isQuarantined}>
                                {s.name} ({formatPricePerUnit(s.pricePerUnitRub)} ₽) {isQuarantined ? '(Недоступна)' : ''}
                              </option>
                            );
                          })}
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                          {isLoadingServices ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m6 9 6 6 6-6"/></svg>}
                        </div>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Количество</label>
                      <input 
                        type="number"
                        value={draftQuantity}
                        onChange={e => setDraftQuantity(e.target.value)}
                        placeholder="Кол-во"
                        min={selectedDraftService?.minQty || 1}
                        max={selectedDraftService?.maxQty || 1000000}
                        className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all tabular-nums"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddTask}
                    disabled={!draftLink || !draftServiceId || !draftQuantity}
                    className="w-full mt-2 flex items-center justify-center gap-2 px-4 h-12 rounded-xl bg-foreground text-background font-bold hover:bg-foreground/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                    Добавить к заказу
                  </button>
                </div>

                {tasks.length > 0 ? (
                  <div className="space-y-3 pt-4 border-t border-border/50 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground">Список добавленных ссылок</h3>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] uppercase font-bold">{tasks.length} шт</span>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {tasks.map((task, idx) => (
                        <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-border bg-card shadow-sm hover:shadow hover:border-primary/30 transition-all group gap-3 sm:gap-0">
                          <div className="flex items-center gap-3 truncate">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              {idx + 1}
                            </div>
                            <div className="flex flex-col gap-0.5 truncate">
                              <span className="text-xs font-bold text-primary truncate" title={task.serviceName}>{task.serviceName}</span>
                              <span className="text-sm font-medium text-foreground truncate" title={task.link}>{task.link}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-11 sm:pl-4">
                            <span className="text-xs font-bold tabular-nums bg-muted/50 text-muted-foreground px-2.5 py-1 rounded-lg border border-border/50">{task.quantity} шт</span>
                            <button 
                              onClick={() => setTasks(tasks.filter(t => t.id !== task.id))} 
                              className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-md transition-all opacity-100 sm:opacity-0 group-hover:opacity-100"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-border/50">
                    <div className="border border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3 bg-card/30">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                        <LayoutList className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">Корзина пуста</h4>
                        <p className="text-xs text-muted-foreground max-w-[250px] mx-auto mt-1">
                          Выберите соцсеть, категорию, укажите ссылку и количество, затем нажмите «Добавить к заказу».
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {mode === 'pro' && (
          <div className="space-y-6 animate-in fade-in duration-300 relative z-10">
            <h2 className="text-xl font-bold mb-2">Формат массового заказа</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Введите заказы в формате: <code className="bg-muted px-1.5 py-0.5 rounded text-primary">ID_услуги | Ссылка | Количество</code> (каждый заказ с новой строки).
            </p>

            <textarea
              value={proText}
              onChange={(e) => setProText(e.target.value)}
              placeholder="101 | https://t.me/channel | 1000&#10;102 | https://t.me/post/1 | 500"
              className="w-full min-h-[200px] p-4 rounded-xl border border-border bg-background text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-y shadow-sm font-mono mb-4"
            />
          </div>
        )}
      </div>

      {calculation && computedText.trim() !== '' && (
        <div className="bg-card text-card-foreground border border-border/60 rounded-2xl shadow-sm p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {calculation.globalError ? (
            <div className="flex items-start gap-3 text-danger-600 bg-danger-50 p-4 rounded-xl">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{calculation.globalError}</div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-4">
                  <span className="text-muted-foreground font-medium">Валидных заказов:</span>
                  <span className="font-bold text-lg">{calculation.validCount ?? 0}</span>
                </div>
                
                {(calculation.validCount ?? 0) > 0 && calculation.validOrders && calculation.validOrders.length > 0 && (
                  <div className="my-2 border border-border/50 rounded-xl overflow-hidden shadow-sm bg-card">
                    <Table aria-label="Валидные заказы" className="w-full">
                      <Table.Header>
                        <Table.Column>#</Table.Column>
                        <Table.Column>Услуга (ID)</Table.Column>
                        <Table.Column>Ссылка</Table.Column>
                        <Table.Column>Кол-во</Table.Column>
                        <Table.Column>Стоимость</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {calculation.validOrders.map((order: any, idx: number) => (
                          <Table.Row key={idx} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                            <Table.Cell className="text-muted-foreground">{idx + 1}</Table.Cell>
                            <Table.Cell className="font-medium text-primary">{order.numericId}</Table.Cell>
                            <Table.Cell className="text-muted-foreground max-w-[150px] truncate"><span title={order.link}>{order.link}</span></Table.Cell>
                            <Table.Cell className="tabular-nums font-semibold">{order.quantity}</Table.Cell>
                            <Table.Cell className="tabular-nums font-bold">{order.priceRub ? order.priceRub.toFixed(2) : '0.00'} ₽</Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table>
                  </div>
                )}

                {(calculation.errors?.length ?? 0) > 0 && (
                  <div className="bg-warning-50 text-warning-700 border border-warning-200 p-4 rounded-xl text-sm max-h-[300px] overflow-y-auto">
                    <p className="font-bold mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Найдены ошибки:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {calculation.errors?.map((err, i) => (
                        <li key={i}>Строка {err.line > 0 ? err.line : '?'}: {err.error} <span className="opacity-50">({err.text})</span></li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-border/50 pb-4 pt-2">
                  <span className="text-foreground font-bold text-lg">К оплате:</span>
                  <span className="font-extrabold text-2xl tabular-nums tracking-tight">{(calculation.totalRub ?? 0).toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>

              {(calculation.validCount ?? 0) > 0 && (
                <ActionForm action={handleCheckout} className="space-y-6">
                  {!userEmail && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Ваш Email</label>
                      <input
                        type="email"
                        required
                        placeholder="address@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Способ оплаты</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className={`cursor-pointer flex items-center gap-3 p-4 rounded-xl border transition-all ${gateway === 'balance' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-background hover:bg-muted/50'}`}>
                        <input type="radio" name="gateway" value="balance" checked={gateway === 'balance'} onChange={() => setGateway('balance')} className="sr-only" />
                        <Wallet className={`w-5 h-5 ${gateway === 'balance' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-semibold ${gateway === 'balance' ? 'text-primary' : 'text-foreground'}`}>Баланс</span>
                      </label>

                      <label className={`cursor-pointer flex items-center gap-3 p-4 rounded-xl border transition-all ${gateway === 'yookassa' ? 'border-zinc-900 bg-zinc-900 text-primary-foreground ring-1 ring-zinc-900' : 'border-border bg-background hover:bg-muted/50'}`}>
                        <input type="radio" name="gateway" value="yookassa" checked={gateway === 'yookassa'} onChange={() => setGateway('yookassa')} className="sr-only" />
                        <CreditCard className={`w-5 h-5 ${gateway === 'yookassa' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-semibold ${gateway === 'yookassa' ? 'text-primary-foreground' : 'text-foreground'}`}>Картой / СБП</span>
                      </label>

                      <label className={`cursor-pointer flex items-center gap-3 p-4 rounded-xl border transition-all ${gateway === 'cryptobot' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600' : 'border-border bg-background hover:bg-muted/50'}`}>
                        <input type="radio" name="gateway" value="cryptobot" checked={gateway === 'cryptobot'} onChange={() => setGateway('cryptobot')} className="sr-only" />
                        <Bitcoin className={`w-5 h-5 ${gateway === 'cryptobot' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-semibold ${gateway === 'cryptobot' ? 'text-indigo-700' : 'text-foreground'}`}>CryptoBot</span>
                      </label>
                    </div>
                  </div>

                  {gateway !== 'balance' && calculation.totalRub !== undefined && calculation.totalRub > 0 && calculation.totalRub < 10 && (
                    <div className="p-4 rounded-2xl bg-warning/10 border border-warning/20 text-warning-text text-xs leading-relaxed space-y-2 animate-in fade-in duration-300">
                      <div className="font-bold flex items-center gap-1.5 text-warning-text">
                        <span>💡</span> Минимальный платеж эквайринга — 10 ₽
                      </div>
                      <div>
                        Платежные системы технически не принимают оплату картой менее 10 ₽. 
                        Мы выставим счет на <strong>10 ₽</strong>: 
                        из них <strong>{calculation.totalRub} ₽</strong> пойдет на этот заказ, а сдача <strong>{(10 - calculation.totalRub).toFixed(2)} ₽</strong> будет зачислена на ваш баланс для будущих тестов.
                      </div>
                    </div>
                  )}

                  <SubmitButton disabled={isCalculating} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-14 rounded-xl text-lg shadow-[0_8px_20px_rgb(0,0,0,0.1)] transition-all">
                    {isCalculating ? 'Рассчитываем...' : `Оплатить ${(calculation.totalRub ?? 0).toLocaleString('ru-RU')} ₽`}
                  </SubmitButton>
                </ActionForm>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
