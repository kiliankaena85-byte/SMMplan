'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  Zap, 
  ShieldCheck, 
  CreditCard, 
  Wallet, 
  Sparkles, 
  Layers, 
  Link as LinkIcon, 
  Hash, 
  Info, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { getPublicCatalogAction, getServicesByCategoryAction, PublicNetwork, PublicCategory, PublicService } from '@/actions/order/catalog';
import { calculatePriceAction, checkoutAction } from '@/actions/order/checkout';
import { inferTargetTypeFromCategory } from '@/utils/target-type';
import { formatCents } from '@/lib/utils';
import { UniversalOrderForm } from '@/components/orders/UniversalOrderForm';

export function SmmplanOrderWizard({
  userEmail = '',
  userBalanceCents = 0,
  initialReorderData,
}: {
  userEmail?: string;
  userBalanceCents?: number;
  initialReorderData?: { serviceId: string; categoryId: string; link: string; quantity: number } | null;
}) {
  const [activeTab, setActiveTab] = useState<'wizard' | 'multi'>('wizard');
  const [networks, setNetworks] = useState<PublicNetwork[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // Wizard State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedNetwork, setSelectedNetwork] = useState<PublicNetwork | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PublicCategory | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);

  // Form Fields
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [email, setEmail] = useState(userEmail);
  const [promoCode, setPromoCode] = useState('');
  const [showPromo, setShowPromo] = useState(false);
  const [gateway, setGateway] = useState<'balance' | 'yookassa' | 'cryptobot'>('balance');

  // Validation & Submitting State
  const [errors, setErrors] = useState<{ link?: string; quantity?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  // Live Price Calculation
  const [calculatedPriceRub, setCalculatedPriceRub] = useState<number | null>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);

  // Search Filters
  const [searchNetwork, setSearchNetwork] = useState('');
  const [searchCategory, setSearchCategory] = useState('');

  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Load Public Catalog on Mount
  useEffect(() => {
    async function loadCatalog() {
      setIsLoadingCatalog(true);
      try {
        const res = await getPublicCatalogAction();
        if (res.success && res.data) {
          setNetworks(res.data);
          if (initialReorderData) {
            const net = res.data.find(n => n.categories.some(c => c.id === initialReorderData.categoryId));
            if (net) {
              setSelectedNetwork(net);
              const cat = net.categories.find(c => c.id === initialReorderData.categoryId);
              if (cat) {
                setSelectedCategory(cat);
                setStep(3);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load catalog:', err);
      } finally {
        setIsLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, [initialReorderData]);

  // Load Services when Category changes
  useEffect(() => {
    if (!selectedCategory) {
      setServices([]);
      return;
    }
    async function loadServices() {
      setIsLoadingServices(true);
      try {
        const servs = await getServicesByCategoryAction(selectedCategory!.id);
        setServices(servs);
        if (initialReorderData && initialReorderData.serviceId) {
          const s = servs.find(srv => srv.id === initialReorderData.serviceId);
          if (s) {
            setSelectedService(s);
            setQuantity(initialReorderData.quantity);
            setLink(initialReorderData.link);
            setStep(4);
          }
        }
      } catch (err) {
        console.error('Failed to load services:', err);
      } finally {
        setIsLoadingServices(false);
      }
    }
    loadServices();
  }, [selectedCategory, initialReorderData]);

  // Auto-fill minQty when service is selected (AGENTS.md Rule)
  const handleSelectService = (srv: PublicService) => {
    setSelectedService(srv);
    setQuantity(srv.minQty || 100);
    setErrors({});
    setStep(4);
  };

  // Recalculate price whenever service or quantity changes
  useEffect(() => {
    if (!selectedService || !quantity) {
      setCalculatedPriceRub(null);
      return;
    }
    let isCancelled = false;
    async function updatePrice() {
      setIsCalculatingPrice(true);
      try {
        const res = await calculatePriceAction(selectedService!.id, quantity, promoCode);
        if (!isCancelled && res.success && res.data) {
          setCalculatedPriceRub(res.data.totalCents / 100);
        } else if (!isCancelled) {
          setCalculatedPriceRub(selectedService!.pricePerUnitRub * quantity);
        }
      } catch (e) {
        if (!isCancelled) {
          setCalculatedPriceRub(selectedService!.pricePerUnitRub * quantity);
        }
      } finally {
        if (!isCancelled) setIsCalculatingPrice(false);
      }
    }
    updatePrice();
    return () => {
      isCancelled = true;
    };
  }, [selectedService, quantity, promoCode]);

  // Target Type Placeholder Generator
  const getTargetTypeHint = (catName?: string, srvTargetType?: string | null) => {
    const type = srvTargetType || (catName ? inferTargetTypeFromCategory(catName) : 'POST');
    switch (type) {
      case 'CHANNEL':
        return {
          placeholder: 'https://t.me/your_channel или @your_channel',
          hint: 'Укажите ссылку на публичный канал или профиль',
        };
      case 'STORY':
        return {
          placeholder: 'https://instagram.com/your_profile',
          hint: 'Укажите ссылку на профиль для накрутки историй',
        };
      case 'POST':
      default:
        return {
          placeholder: 'https://t.me/channel/123 или https://vk.com/wall-123_456',
          hint: 'Укажите прямую ссылку на конкретную публикацию/пост',
        };
    }
  };

  // Quick Quantity Increments
  const addQuantity = (delta: number) => {
    if (!selectedService) return;
    const nextVal = Math.min(selectedService.maxQty, Math.max(selectedService.minQty, (quantity || 0) + delta));
    setQuantity(nextVal);
  };

  // Form Submit Handler with Shake & Auto-Scroll (AGENTS.md Rule)
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: { link?: string; quantity?: string; general?: string } = {};

    if (!selectedService) {
      newErrors.general = 'Пожалуйста, выберите услугу';
    }

    if (!link || link.trim().length < 3) {
      newErrors.link = 'Введите корректную ссылку для выполнения заказа';
    } else if (link.includes(' ')) {
      newErrors.link = 'Ссылка не должна содержать пробелы';
    }

    if (!selectedService) {
      newErrors.general = 'Сначала выберите услугу';
    } else {
      if (!quantity || quantity < selectedService.minQty) {
        newErrors.quantity = `Минимальное количество для этой услуги: ${selectedService.minQty} шт.`;
      } else if (quantity > selectedService.maxQty) {
        newErrors.quantity = `Максимальное количество для этой услуги: ${selectedService.maxQty} шт.`;
      }
    }

    if (!email || !email.includes('@')) {
      newErrors.general = 'Укажите корректный email для чека и статуса заказа';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShakeKey(prev => prev + 1);
      setTimeout(() => {
        if (errorRef.current) {
          errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }

    // Submit Checkout Action
    setIsSubmitting(true);
    try {
      const res = await checkoutAction({
        serviceId: selectedService!.id,
        link: link.trim(),
        quantity,
        email: email.trim(),
        promoCodeStr: promoCode ? promoCode.trim() : undefined,
        gateway,
      });

      if (res.success && res.data) {
        if (res.data.paymentUrl) {
          window.location.href = res.data.paymentUrl;
        } else {
          window.location.href = `/dashboard/orders?success=1&orderId=${res.data.orderId || ''}`;
        }
      } else {
        const errorMsg = !res.success ? res.error : 'Ошибка при оформлении заказа. Попробуйте еще раз.';
        setErrors({ general: errorMsg });
        setShakeKey(prev => prev + 1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка при отправке';
      setErrors({ general: msg });
      setShakeKey(prev => prev + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredNetworks = networks.filter(n => 
    n.name.toLowerCase().includes(searchNetwork.toLowerCase())
  );

  const filteredCategories = selectedNetwork
    ? selectedNetwork.categories.filter(c => c.name.toLowerCase().includes(searchCategory.toLowerCase()))
    : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Top Header & Tab Switcher ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-5 rounded-3xl border border-border/60 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <span>Оформление заказа</span>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-primary/10 text-primary rounded-full">SMMplan</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Выберите услугу пошагово или вставьте несколько ссылок сразу
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-2xl border border-border/40 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('wizard')}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'wizard'
                ? 'bg-background text-foreground shadow-sm border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-4 h-4 text-primary" />
            Пошаговый выбор
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('multi')}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'multi'
                ? 'bg-background text-foreground shadow-sm border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            Быстрый ввод ссылок
          </button>
        </div>
      </div>

      {/* ── Multi-Link Mode Render ── */}
      {activeTab === 'multi' && (
        <div className="bg-card/70 backdrop-blur-xl p-6 rounded-3xl border border-border/60 shadow-sm animate-in fade-in duration-300">
          <UniversalOrderForm userBalanceCents={userBalanceCents} userEmail={userEmail} initialReorderData={initialReorderData} />
        </div>
      )}

      {/* ── Step-by-Step Wizard Mode Render ── */}
      {activeTab === 'wizard' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Progress Indicator */}
          <div className="grid grid-cols-4 gap-2 bg-card/40 p-2 rounded-2xl border border-border/40">
            {[
              { num: 1, label: 'Соцсеть' },
              { num: 2, label: 'Категория' },
              { num: 3, label: 'Услуга' },
              { num: 4, label: 'Оплата' },
            ].map(s => {
              const isActive = step === s.num;
              const isDone = step > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  disabled={s.num > step && (!selectedNetwork || (s.num === 3 && !selectedCategory) || (s.num === 4 && !selectedService))}
                  onClick={() => setStep(s.num as 1 | 2 | 3 | 4)}
                  className={`flex items-center justify-center md:justify-start gap-2.5 p-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                      : isDone
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'text-muted-foreground hover:bg-muted/40 opacity-60'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                    isActive ? 'bg-white/20 text-white' : isDone ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                  </span>
                  <span className="hidden md:inline truncate">{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── STEP 1: Select Network ── */}
          {step === 1 && (
            <div className="bg-card/70 backdrop-blur-xl p-6 rounded-3xl border border-border/60 shadow-sm space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Шаг 1: Выберите социальную сеть</h2>
                  <p className="text-muted-foreground text-sm mt-0.5">Выберите платформу для продвижения вашего аккаунта</p>
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchNetwork}
                    onChange={e => setSearchNetwork(e.target.value)}
                    placeholder="Поиск платформы..."
                    className="w-full pl-9 pr-4 py-2 text-sm bg-background/80 border border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
              </div>

              {isLoadingCatalog ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-sm font-medium">Загружаем список социальных сетей...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredNetworks.map(net => {
                    const isSelected = selectedNetwork?.id === net.id;
                    return (
                      <button
                        key={net.id}
                        type="button"
                        onClick={() => {
                          setSelectedNetwork(net);
                          setSelectedCategory(null);
                          setSelectedService(null);
                          setStep(2);
                        }}
                        className={`group p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col items-center text-center gap-3 relative overflow-hidden ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/30 shadow-md scale-[1.02]'
                            : 'border-border/60 bg-background/60 hover:bg-card hover:border-primary/40 hover:shadow-md'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-muted/50 p-2.5 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <SocialIcon slug={net.slug || net.name} className="w-full h-full object-contain" />
                        </div>

                        <div>
                          <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                            {net.name}
                          </h3>
                          <span className="text-xs text-muted-foreground mt-0.5 block">
                            {net.categories.length} категорий
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Select Category ── */}
          {step === 2 && (
            <div className="bg-card/70 backdrop-blur-xl p-6 rounded-3xl border border-border/60 shadow-sm space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    {selectedNetwork && <SocialIcon slug={selectedNetwork.slug || selectedNetwork.name} className="w-6 h-6" />}
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Шаг 2: Категория ({selectedNetwork?.name})</h2>
                      <p className="text-muted-foreground text-xs">Выберите направление услуги</p>
                    </div>
                  </div>
                </div>

                <div className="relative w-full md:w-56">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchCategory}
                    onChange={e => setSearchCategory(e.target.value)}
                    placeholder="Поиск..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-background/80 border border-border/60 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredCategories.map(cat => {
                  const isSelected = selectedCategory?.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setSelectedService(null);
                        setStep(3);
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/30 font-bold shadow-sm'
                          : 'border-border/60 bg-background/60 hover:bg-card hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                          <Layers className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">{cat.name}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 3: Select Service ── */}
          {step === 3 && (
            <div className="bg-card/70 backdrop-blur-xl p-6 rounded-3xl border border-border/60 shadow-sm space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div>
                    <h2 className="text-xl font-bold text-foreground">Шаг 3: Выберите тариф / услугу</h2>
                    <p className="text-muted-foreground text-xs">{selectedNetwork?.name} — {selectedCategory?.name}</p>
                  </div>
                </div>
              </div>

              {isLoadingServices ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-sm font-medium">Загружаем список услуг...</span>
                </div>
              ) : services.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  В выбранной категории пока нет доступных активных услуг.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services.map((srv: PublicService) => {
                    const isSelected = selectedService?.id === srv.id;
                    return (
                      <div
                        key={srv.id}
                        onClick={() => handleSelectService(srv)}
                        className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-4 relative overflow-hidden ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/30 shadow-md'
                            : 'border-border/60 bg-background/60 hover:bg-card hover:border-primary/40 hover:shadow-md'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-base text-foreground line-clamp-2">
                              {srv.name}
                            </h3>
                            {srv.badge && (
                              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary rounded-md shrink-0">
                                {srv.badge}
                              </span>
                            )}
                          </div>

                          {srv.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {srv.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs">
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span>Мин: <strong>{srv.minQty}</strong></span>
                            <span>Макс: <strong>{srv.maxQty.toLocaleString('ru-RU')}</strong></span>
                          </div>

                          <div className="text-right">
                            <span className="text-lg font-black text-primary">
                              {srv.pricePerUnitRub < 0.01 
                                ? srv.pricePerUnitRub.toFixed(4) 
                                : srv.pricePerUnitRub.toFixed(2)} ₽
                            </span>
                            <span className="text-[10px] text-muted-foreground block">/ шт</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Checkout & Options ── */}
          {step === 4 && selectedService && (
            <form
              ref={formRef}
              onSubmit={handleSubmitOrder}
              key={`shake-${shakeKey}`}
              className={`bg-card/70 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-border/60 shadow-md space-y-6 animate-in fade-in duration-300 ${
                shakeKey > 0 ? 'animate-shake' : ''
              }`}
            >
              {/* Selected Summary Banner */}
              <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border/50">
                <div className="flex items-center gap-3">
                  {selectedNetwork && <SocialIcon slug={selectedNetwork.slug || selectedNetwork.name} className="w-8 h-8" />}
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {selectedNetwork?.name} / {selectedCategory?.name}
                    </span>
                    <h3 className="text-base font-bold text-foreground truncate max-w-md">
                      {selectedService.name}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs font-bold text-primary hover:underline px-3 py-1.5 rounded-lg bg-primary/10"
                >
                  Изменить
                </button>
              </div>

              {/* General Error Banner (Above Submit zone per AGENTS.md) */}
              {errors.general && (
                <div ref={errorRef} className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm font-semibold flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{errors.general}</span>
                </div>
              )}

              {/* Link Input Field */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <LinkIcon className="w-4 h-4 text-primary" />
                    Ссылка на объект продвижения <span className="text-destructive">*</span>
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {getTargetTypeHint(selectedCategory?.name, selectedService.targetType).hint}
                  </span>
                </label>

                <input
                  type="text"
                  value={link}
                  onChange={e => {
                    setLink(e.target.value);
                    if (errors.link) setErrors(prev => ({ ...prev, link: undefined }));
                  }}
                  placeholder={getTargetTypeHint(selectedCategory?.name, selectedService.targetType).placeholder}
                  className={`w-full px-4 py-3 text-sm bg-background border rounded-2xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 transition-all ${
                    errors.link ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/60 focus:ring-primary/30'
                  }`}
                />

                {errors.link && (
                  <p className="text-xs font-semibold text-destructive mt-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    {errors.link}
                  </p>
                )}
              </div>

              {/* Quantity Input Field */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-primary" />
                    Количество <span className="text-destructive">*</span>
                  </label>

                  <span className="text-xs text-muted-foreground font-medium">
                    Мин: <strong>{selectedService.minQty}</strong> / Макс: <strong>{selectedService.maxQty.toLocaleString('ru-RU')}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={selectedService.minQty}
                    max={selectedService.maxQty}
                    value={quantity || ''}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      setQuantity(isNaN(val) ? 0 : val);
                      if (errors.quantity) setErrors(prev => ({ ...prev, quantity: undefined }));
                    }}
                    className={`w-full px-4 py-3 text-sm font-bold bg-background border rounded-2xl text-foreground focus:outline-none focus:ring-2 transition-all ${
                      errors.quantity ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/60 focus:ring-primary/30'
                    }`}
                  />

                  {/* Quick Quantity Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {[100, 500, 1000, 5000].map(add => (
                      <button
                        key={add}
                        type="button"
                        onClick={() => addQuantity(add)}
                        className="px-2.5 py-2.5 text-xs font-bold bg-muted/60 hover:bg-muted text-foreground border border-border/40 rounded-xl transition-all"
                      >
                        +{add}
                      </button>
                    ))}
                  </div>
                </div>

                {errors.quantity && (
                  <p className="text-xs font-semibold text-destructive mt-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    {errors.quantity}
                  </p>
                )}
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">
                  Ваш Email (для чека и статуса) <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 text-sm bg-background border border-border/60 rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Promo Code Toggle */}
              <div>
                {!showPromo ? (
                  <button
                    type="button"
                    onClick={() => setShowPromo(true)}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    + Есть промокод?
                  </button>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">Промокод</label>
                    <input
                      type="text"
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="ВВЕДИТЕ ПРОМОКОД"
                      className="w-full px-4 py-2 text-sm uppercase font-mono bg-background border border-border/60 rounded-xl text-foreground"
                    />
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3 pt-2">
                <label className="text-sm font-bold text-foreground block">
                  Способ оплаты
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Balance Option */}
                  <button
                    type="button"
                    onClick={() => setGateway('balance')}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      gateway === 'balance'
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm'
                        : 'border-border/60 bg-background/60 hover:bg-card'
                    }`}
                  >
                    <Wallet className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <span className="text-xs font-bold block text-foreground">С баланса</span>
                      <span className="text-[11px] text-muted-foreground block">
                        Доступно: {formatCents(userBalanceCents)} ₽
                      </span>
                    </div>
                  </button>

                  {/* YooKassa Option */}
                  <button
                    type="button"
                    onClick={() => setGateway('yookassa')}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      gateway === 'yookassa'
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm'
                        : 'border-border/60 bg-background/60 hover:bg-card'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-blue-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold block text-foreground">СБП / Карты</span>
                      <span className="text-[11px] text-muted-foreground block">ЮKassa (Мгновенно)</span>
                    </div>
                  </button>

                  {/* CryptoBot Option */}
                  <button
                    type="button"
                    onClick={() => setGateway('cryptobot')}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      gateway === 'cryptobot'
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm'
                        : 'border-border/60 bg-background/60 hover:bg-card'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold block text-foreground">CryptoBot</span>
                      <span className="text-[11px] text-muted-foreground block">USDT / Кратко</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Price Calculation Banner & Submit Button */}
              <div className="pt-4 border-t border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-muted-foreground font-medium block">Итого к оплате:</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-primary">
                      {isCalculatingPrice ? (
                        <Loader2 className="w-6 h-6 animate-spin inline text-primary" />
                      ) : (
                        `${(calculatedPriceRub || 0).toFixed(2)} ₽`
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      ({quantity || 0} шт × {selectedService.pricePerUnitRub.toFixed(4)} ₽)
                    </span>
                  </div>
                </div>

                {/* Submit Button (NEVER DISABLED per AGENTS.md) */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-8 py-4 bg-primary text-primary-foreground font-black text-base rounded-2xl shadow-lg shadow-primary/25 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Обработка заказа...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-current" />
                      <span>Оплатить и запустить заказ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
