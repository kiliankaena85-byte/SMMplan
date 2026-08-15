'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { formatEtaSpeedBadge } from '@/utils/format-eta';
import { UniversalOrderForm } from '@/components/orders/UniversalOrderForm';
import { DashboardHeroLinkInput } from '@/components/orders/DashboardHeroLinkInput';
import { checkServiceRefill } from '@/utils/service-refill';

function SmmplanOrderWizardInner({
  userEmail = '',
  userBalanceCents = 0,
  initialReorderData,
}: {
  userEmail?: string;
  userBalanceCents?: number;
  initialReorderData?: { serviceId: string; categoryId: string; link: string; quantity: number } | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Drip-Feed & Custom Data & Requirement States
  const [isDripFeedEnabled, setIsDripFeedEnabled] = useState(false);
  const [dripRuns, setDripRuns] = useState(5);
  const [dripInterval, setDripInterval] = useState(60);
  const [customData, setCustomData] = useState("");
  const [isRequirementsConfirmed, setIsRequirementsConfirmed] = useState(false);

  // Validation & Submitting State
  const [errors, setErrors] = useState<{ link?: string; quantity?: string; customData?: string; requirement?: string; general?: string }>({});
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

  // Helper to sync params to URL
  const changeStep = (newStep: 1 | 2 | 3 | 4, srvId?: string, catId?: string, netId?: string) => {
    setStep(newStep);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (newStep === 1) {
        params.delete('step');
        params.delete('serviceId');
        params.delete('categoryId');
        params.delete('networkId');
      } else {
        params.set('step', String(newStep));
        const activeSrvId = srvId ?? selectedService?.id;
        const activeCatId = catId ?? selectedCategory?.id;
        const activeNetId = netId ?? selectedNetwork?.id;
        if (activeSrvId && newStep === 4) params.set('serviceId', activeSrvId); else params.delete('serviceId');
        if (activeCatId && newStep >= 3) params.set('categoryId', activeCatId); else params.delete('categoryId');
        if (activeNetId && newStep >= 2) params.set('networkId', activeNetId); else params.delete('networkId');
      }
      const q = params.toString();
      const newUrl = q ? `${window.location.pathname}?${q}` : window.location.pathname;
      router.replace(newUrl, { scroll: false });
    }
  };

  // Restore state from URL searchParams if present
  useEffect(() => {
    if (!isLoadingCatalog && networks.length > 0 && !initialReorderData) {
      const paramStep = searchParams.get('step');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const paramServiceId = searchParams.get('serviceId');
      const paramCategoryId = searchParams.get('categoryId');
      const paramNetworkId = searchParams.get('networkId');

      if (paramStep) {
        const parsedStep = parseInt(paramStep, 10);
        if (parsedStep >= 1 && parsedStep <= 4) {
          let foundNet = selectedNetwork;
          if (paramNetworkId) {
            foundNet = networks.find(n => n.id === paramNetworkId) || null;
          }
          if (!foundNet && paramCategoryId) {
            foundNet = networks.find(n => n.categories.some(c => c.id === paramCategoryId)) || null;
          }
          if (foundNet) {
            setSelectedNetwork(foundNet);
            if (paramCategoryId) {
              const foundCat = foundNet.categories.find(c => c.id === paramCategoryId) || null;
              if (foundCat) setSelectedCategory(foundCat);
            }
          }
          setStep(parsedStep as 1 | 2 | 3 | 4);
        }
      }
    }
  }, [isLoadingCatalog, networks, searchParams, initialReorderData]);

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
        const paramServiceId = searchParams.get('serviceId');
        const targetSrvId = initialReorderData?.serviceId || paramServiceId;
        if (targetSrvId) {
          const s = servs.find(srv => srv.id === targetSrvId);
          if (s) {
            setSelectedService(s);
            if (initialReorderData) {
              setQuantity(initialReorderData.quantity);
              setLink(initialReorderData.link);
            } else {
              setQuantity(s.minQty || 100);
            }
            if (searchParams.get('step') === '4' || initialReorderData) {
              setStep(4);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load services:', err);
      } finally {
        setIsLoadingServices(false);
      }
    }
    loadServices();
  }, [selectedCategory, initialReorderData, searchParams]);

  // Auto-fill minQty when service is selected (AGENTS.md Rule)
  const handleSelectService = (srv: PublicService) => {
    setSelectedService(srv);
    setQuantity(srv.minQty || 100);
    setIsDripFeedEnabled(false);
    setDripRuns(5);
    setDripInterval(60);
    setCustomData("");
    setIsRequirementsConfirmed(false);
    setErrors({});
    changeStep(4, srv.id, selectedCategory?.id, selectedNetwork?.id);
  };

  const totalQuantity = isDripFeedEnabled ? quantity * dripRuns : quantity;

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
        const res = await calculatePriceAction(selectedService!.id, totalQuantity, promoCode);
        if (!isCancelled && res.success && res.data) {
          setCalculatedPriceRub(res.data.totalCents / 100);
        } else if (!isCancelled) {
          setCalculatedPriceRub(selectedService!.pricePerUnitRub * totalQuantity);
        }
      } catch {
        if (!isCancelled) {
          setCalculatedPriceRub(selectedService!.pricePerUnitRub * totalQuantity);
        }
      } finally {
        if (!isCancelled) setIsCalculatingPrice(false);
      }
    }
    updatePrice();
    return () => {
      isCancelled = true;
    };
  }, [selectedService, quantity, totalQuantity, promoCode]);

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

    const newErrors: { link?: string; quantity?: string; customData?: string; requirement?: string; general?: string } = {};

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

    if (selectedService?.customDataType && selectedService.customDataType !== 'NONE') {
      if (!customData.trim()) {
        newErrors.customData = selectedService.customDataLabel || 'Пожалуйста, заполните пользовательские данные';
      }
    }

    const hasReq = selectedService?.clientRequirement || selectedService?.clientConfirmation || selectedService?.requireWarning;
    if (hasReq && !isRequirementsConfirmed) {
      newErrors.requirement = 'Пожалуйста, подтвердите чек-лист для старта заказа';
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
        quantity: totalQuantity,
        email: email.trim(),
        promoCodeStr: promoCode ? promoCode.trim() : undefined,
        runs: isDripFeedEnabled ? dripRuns : undefined,
        interval: isDripFeedEnabled ? dripInterval : undefined,
        customData: selectedService!.customDataType !== 'NONE' ? customData : undefined,
        isRequirementsConfirmed,
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

  // Auto-prepend https:// protocol on blur for client link input
  const normalizeUrl = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const handleBlurLink = () => {
    if (link) {
      setLink(normalizeUrl(link));
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-28 sm:pb-24 md:pb-0">
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
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
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
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
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
          {/* Shimmer Smart Link Input Bar (Landing Page Mirror) */}
          <DashboardHeroLinkInput
            link={link}
            setLink={setLink}
            networks={networks}
            selectedNetwork={selectedNetwork}
            setSelectedNetwork={(net) => {
              setSelectedNetwork(net);
              if (net) {
                changeStep(2, undefined, undefined, net.id);
              }
            }}
            selectedCategory={selectedCategory}
            selectedService={selectedService}
            step={step}
            onAdvanceStep={() => {
              if (selectedService) {
                changeStep(4);
              } else if (selectedCategory) {
                changeStep(3);
              } else if (selectedNetwork) {
                changeStep(2);
              } else {
                changeStep(1);
              }
            }}
          />

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
                  onClick={() => changeStep(s.num as 1 | 2 | 3 | 4)}
                  className={`flex items-center justify-center md:justify-start gap-2.5 p-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                      : isDone
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'text-muted-foreground hover:bg-muted/40 opacity-60'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                    isActive ? 'bg-white/20 text-foreground' : isDone ? 'bg-primary text-foreground' : 'bg-muted text-muted-foreground'
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
                          changeStep(2, undefined, undefined, net.id);
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
                    onClick={() => changeStep(1)}
                    className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground transition-all shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                  </button>

                  <div className="flex items-center gap-2 min-w-0">
                    {selectedNetwork && <SocialIcon slug={selectedNetwork.slug || selectedNetwork.name} className="w-6 h-6 shrink-0" />}
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-foreground truncate">Шаг 2: Категория ({selectedNetwork?.name})</h2>
                      <p className="text-muted-foreground text-xs">Выберите направление услуги</p>
                    </div>
                  </div>
                </div>

                <div className="relative w-full md:w-56">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground shrink-0" />
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
                        changeStep(3, undefined, cat.id, selectedNetwork?.id);
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/30 font-bold shadow-sm'
                          : 'border-border/60 bg-background/60 hover:bg-card hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          <Layers className="w-4 h-4 shrink-0" />
                        </div>
                        <span className="text-sm font-semibold text-foreground truncate">{cat.name}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
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
                    onClick={() => changeStep(2)}
                    className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground transition-all shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" />
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
                  {services.map((srv: PublicService, idx: number) => {
                    const isSelected = selectedService?.id === srv.id;
                    const { hasRefill, badgeLabel } = checkServiceRefill(srv);
                    const isFast = srv.name.toLowerCase().includes('быстр') || srv.name.toLowerCase().includes('мгновен');
                    const smartBadge = srv.badge || (
                      hasRefill
                        ? (badgeLabel || '🛡️ Refill')
                        : isFast
                        ? '⚡️ Топ скорость'
                        : idx === 0
                        ? '🔥 Выбор клиентов'
                        : null
                    );

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
                            {smartBadge && (
                              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 rounded-md shrink-0">
                                {smartBadge}
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
                          <div className="flex flex-col gap-1 text-muted-foreground">
                            <span className="text-primary font-bold text-[11px]">{formatEtaSpeedBadge(srv)}</span>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span>Мин: <strong>{srv.minQty}</strong></span>
                              <span>Макс: <strong>{srv.maxQty.toLocaleString('ru-RU')}</strong></span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-lg font-black text-primary">
                              {srv.pricePerUnitRub.toFixed(2)} ₽
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/40 rounded-2xl border border-border/50">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedNetwork && <SocialIcon slug={selectedNetwork.slug || selectedNetwork.name} className="w-8 h-8 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-muted-foreground block truncate">
                      {selectedNetwork?.name} / {selectedCategory?.name}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                      {selectedService.name}
                    </h3>
                    <span className="text-xs text-primary font-semibold block mt-0.5">
                      {formatEtaSpeedBadge(selectedService)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => changeStep(3)}
                  className="text-xs font-bold text-primary hover:underline px-3 py-1.5 rounded-lg bg-primary/10 self-start sm:self-auto shrink-0"
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <LinkIcon className="w-4 h-4 text-primary shrink-0" />
                    <span>Ссылка на объект продвижения</span>
                    <span className="text-destructive">*</span>
                  </label>
                  <span className="text-xs text-muted-foreground font-normal">
                    {getTargetTypeHint(selectedCategory?.name, selectedService.targetType).hint}
                  </span>
                </div>

                <input
                  type="text"
                  value={link}
                  onChange={e => {
                    setLink(e.target.value);
                    if (errors.link) setErrors(prev => ({ ...prev, link: undefined }));
                  }}
                  onBlur={handleBlurLink}
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

              {/* Custom Data Input Field */}
              {selectedService.customDataType && selectedService.customDataType !== 'NONE' && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                    {selectedService.customDataLabel || (selectedService.customDataType === 'TEXTAREA' ? 'Ваши комментарии / текст (по 1 строке)' : 'Параметры заказа')} <span className="text-destructive">*</span>
                  </label>
                  {selectedService.customDataType === 'TEXTAREA' ? (
                    <textarea
                      rows={3}
                      value={customData}
                      onChange={e => {
                        setCustomData(e.target.value);
                        if (errors.customData) setErrors(prev => ({ ...prev, customData: undefined }));
                      }}
                      placeholder="Введите каждый комментарий с новой строки..."
                      className={`w-full px-4 py-3 text-sm bg-background border rounded-2xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 transition-all ${
                        errors.customData ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/60 focus:ring-primary/30'
                      }`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={customData}
                      onChange={e => {
                        setCustomData(e.target.value);
                        if (errors.customData) setErrors(prev => ({ ...prev, customData: undefined }));
                      }}
                      placeholder="Введите вариант ответа / числовое значение..."
                      className={`w-full px-4 py-3 text-sm bg-background border rounded-2xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 transition-all ${
                        errors.customData ? 'border-destructive ring-2 ring-destructive/20' : 'border-border/60 focus:ring-primary/30'
                      }`}
                    />
                  )}
                  {errors.customData && (
                    <p className="text-xs font-semibold text-destructive mt-1 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      {errors.customData}
                    </p>
                  )}
                </div>
              )}

              {/* Drip-Feed Controls */}
              {selectedService.isDripFeedEnabled && (
                <div className="p-4 bg-muted/40 rounded-2xl border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Запускать частями (Drip-Feed)
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isDripFeedEnabled}
                        onChange={(e) => setIsDripFeedEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {isDripFeedEnabled && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/30">
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Количество запусков</label>
                        <input
                          type="number"
                          min={2}
                          max={100}
                          value={dripRuns}
                          onChange={(e) => setDripRuns(Math.max(2, parseInt(e.target.value) || 2))}
                          className="w-full px-3 py-2 bg-background border border-border/60 rounded-xl text-sm font-bold text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Интервал (мин)</label>
                        <input
                          type="number"
                          min={5}
                          max={1440}
                          value={dripInterval}
                          onChange={(e) => setDripInterval(Math.max(1, parseInt(e.target.value) || 5))}
                          className="w-full px-3 py-2 bg-background border border-border/60 rounded-xl text-sm font-bold text-foreground"
                        />
                      </div>
                      <p className="col-span-2 text-xs text-muted-foreground font-medium">
                        Заказ выполнится за {dripRuns} запусков по {quantity} шт. Всего: <strong className="text-foreground">{totalQuantity} шт.</strong>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Legal Requirement Checkbox (JIT Warning) */}
              {(selectedService.clientRequirement || selectedService.clientConfirmation || selectedService.requireWarning) && (
                <div className={`p-4 rounded-2xl border transition-all ${
                  isRequirementsConfirmed
                    ? 'bg-green-500/10 border-green-500/30'
                    : errors.requirement
                      ? 'bg-destructive/10 border-destructive/40 animate-shake'
                      : 'bg-amber-500/10 border-amber-500/30'
                }`}>
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                    <Sparkles className="w-4 h-4" /> Чек-лист для старта
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {selectedService.clientRequirement || selectedService.warningMessage || "Перед началом убедитесь, что объект доступен для всех."}
                  </p>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRequirementsConfirmed}
                      onChange={(e) => {
                        setIsRequirementsConfirmed(e.target.checked);
                        if (errors.requirement) setErrors(prev => ({ ...prev, requirement: undefined }));
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className={`text-xs font-bold ${isRequirementsConfirmed ? 'text-green-700 dark:text-green-400' : errors.requirement ? 'text-destructive' : 'text-foreground'}`}>
                      {selectedService.clientConfirmation || "Я всё проверил, можно запускать"}
                    </span>
                  </label>
                  {errors.requirement && (
                    <p className="text-xs font-bold text-destructive mt-2 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      {errors.requirement}
                    </p>
                  )}
                </div>
              )}

              {/* Quantity Input Field */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-primary shrink-0" />
                    <span>Количество</span>
                    <span className="text-destructive">*</span>
                  </label>

                  <span className="text-xs text-muted-foreground font-medium">
                    Лимиты: <strong>{selectedService.minQty}</strong> – <strong>{selectedService.maxQty.toLocaleString('ru-RU')}</strong> шт.
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
                    <CreditCard className="w-5 h-5 text-primary shrink-0" />
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

              {/* 🛡️ Risk Reversal & Security Note */}
              {(() => {
                const { hasRefill } = checkServiceRefill(selectedService);
                return (
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 flex items-start gap-3 text-xs text-muted-foreground leading-relaxed">
                    <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      {hasRefill ? (
                        <>
                          <span className="font-bold text-foreground">🛡️ Гарантия Refill активна:</span> на данную услугу действует защита от списаний с автоматической докруткой. Запуск без паролей.
                        </>
                      ) : (
                        <>
                          <span className="font-bold text-foreground">100% Безопасный запуск:</span> соблюдаем суточные лимиты соцсетей без ввода паролей. При сбое или отмене — возврат средств на баланс.
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

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
                      {isDripFeedEnabled
                        ? `(${quantity || 0} шт × ${dripRuns} запусков × ${selectedService.pricePerUnitRub.toFixed(2)} ₽)`
                        : `(${quantity || 0} шт × ${selectedService.pricePerUnitRub.toFixed(2)} ₽)`}
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

export function SmmplanOrderWizard(props: {
  userEmail?: string;
  userBalanceCents?: number;
  initialReorderData?: { serviceId: string; categoryId: string; link: string; quantity: number } | null;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Загрузка визарда заказа...</div>}>
      <SmmplanOrderWizardInner {...props} />
    </Suspense>
  );
}
