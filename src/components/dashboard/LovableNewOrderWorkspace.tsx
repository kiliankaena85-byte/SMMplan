'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertCircle, 
  Gauge, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Coins,
  ChevronLeft
} from 'lucide-react';
import { 
  getPublicCatalogAction, 
  getServicesByCategoryAction, 
  PublicNetwork, 
  PublicCategory, 
  PublicService 
} from '@/actions/order/catalog';
import { checkoutAction } from '@/actions/order/checkout';
import { formatEtaSpeedBadge } from '@/utils/format-eta';
import { detectPlatformLite } from '@/utils/link-extractor';
import { IntelligencePlatform } from '@/services/analyzer/link-rules';
import { inferTargetTypeFromCategory } from '@/utils/target-type';
import { mutateLink, getLinkValidator } from '@/validators/link-mutators';
import { WizardStepIndicator } from './order-wizard/WizardStepIndicator';
import { WizardNetworkStep } from './order-wizard/WizardNetworkStep';
import { WizardCategoryStep } from './order-wizard/WizardCategoryStep';
import { WizardServiceStep } from './order-wizard/WizardServiceStep';
import { formatRub } from '@/lib/money';
import { validateDripFeedDuration, DRIP_FEED_MAX_ERROR_MESSAGE } from '@/hooks/useOrderWizard';

export const MAX_DRIP_FEED_MINUTES = 43200; // 30 days = 43200 minutes max drip-feed limit

export function LovableNewOrderWorkspace({
  userBalanceCents = 0,
  userEmail = "",
  initialReorderData = null
}: {
  userBalanceCents?: number;
  userEmail?: string;
  initialReorderData?: { serviceId: string; categoryId: string; link: string; quantity: number } | null;
}) {
  const [catalog, setCatalog] = useState<PublicNetwork[]>([]);
  const [link, setLink] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState<IntelligencePlatform>(IntelligencePlatform.OTHER);
  
  // Wizard Steps (1: Platform/Link, 2: Category, 3: Service, 4: Checkout)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  
  // Selection States
  const [selectedNetwork, setSelectedNetwork] = useState<PublicNetwork | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PublicCategory | null>(null);
  const [selectedService, setSelectedService] = useState<PublicService | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  
  const [quantity, setQuantity] = useState(100);
  const [email, setEmail] = useState(userEmail);
  const [gateway, setGateway] = useState<'yookassa' | 'cryptobot' | 'balance'>('yookassa');
  
  // Drip-Feed & Custom Data & Requirement states
  const [isDripFeedEnabled, setIsDripFeedEnabled] = useState(false);
  const [dripRuns, setDripRuns] = useState(5);
  const [dripInterval, setDripInterval] = useState(60);
  const [customData, setCustomData] = useState("");
  const [isRequirementsConfirmed, setIsRequirementsConfirmed] = useState(false);

  // Validation / Error states
  const [isPending, setIsPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationTimestamp, setValidationTimestamp] = useState(0);
  const [success, setSuccess] = useState(false);

  // Refs for auto-scroll on validation error
  const linkRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const customDataRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const requirementRef = useRef<HTMLDivElement>(null);

  // Load catalog
  useEffect(() => {
    getPublicCatalogAction().then(res => {
      if (res.success && res.data) {
        setCatalog(res.data);
      }
    });
  }, []);

  // Preload reorder data
  useEffect(() => {
    if (initialReorderData && catalog.length > 0) {
      const { serviceId, categoryId, link: initialLink, quantity: initialQty } = initialReorderData;
      setLink(initialLink);
      setQuantity(initialQty);

      const network = catalog.find(net => net.categories.some(cat => cat.id === categoryId));
      if (network) {
        setSelectedNetwork(network);
        const category = network.categories.find(cat => cat.id === categoryId);
        if (category) {
          setSelectedCategory(category);
          setIsLoadingServices(true);
          getServicesByCategoryAction(categoryId).then(res => {
            const srvList = res || [];
            setServices(srvList);
            const service = srvList.find(s => s.id === serviceId);
            if (service) {
              setSelectedService(service);
            }
            setIsLoadingServices(false);
          });
        }
      }
      setCurrentStep(4);
    }
  }, [initialReorderData, catalog]);

  // Detect platform on link change
  useEffect(() => {
    if (!link) {
      setDetectedPlatform(IntelligencePlatform.OTHER);
      return;
    }
    const plat = detectPlatformLite(link);
    setDetectedPlatform(plat);

    // Auto-select network based on link detection
    if (plat !== IntelligencePlatform.OTHER) {
      const matchedNet = catalog.find(n => n.slug.toLowerCase().includes(plat.toLowerCase()));
      if (matchedNet) {
        setSelectedNetwork(matchedNet);
        // Clear child states if network changes
        if (selectedNetwork?.id !== matchedNet.id) {
          setSelectedCategory(null);
          setSelectedService(null);
          setServices([]);
        }
      }
    }
  }, [link, catalog, selectedNetwork]);

  // Load services when category changes
  useEffect(() => {
    if (!selectedCategory) {
      setServices([]);
      setSelectedService(null);
      return;
    }
    setIsLoadingServices(true);
    getServicesByCategoryAction(selectedCategory.id).then(res => {
      const srvList = res || [];
      setServices(srvList);
      if (srvList.length > 0) {
        setSelectedService(srvList[0]);
        setQuantity(srvList[0].minQty || 100);
      } else {
        setSelectedService(null);
      }
      setIsLoadingServices(false);
    });
  }, [selectedCategory]);

  const handleNetworkSelect = (net: PublicNetwork) => {
    setSelectedNetwork(net);
    setSelectedCategory(null);
    setSelectedService(null);
    setServices([]);
    
    // Auto-advance to Step 2
    setCurrentStep(2);
  };

  const handleCategorySelect = (cat: PublicCategory) => {
    setSelectedCategory(cat);
    
    // Auto-advance to Step 3
    setCurrentStep(3);
  };

  const handleServiceSelect = (srv: PublicService) => {
    setSelectedService(srv);
    setQuantity(srv.minQty || 100);
    setIsDripFeedEnabled(false);
    setDripRuns(5);
    setDripInterval(60);
    setCustomData("");
    setIsRequirementsConfirmed(false);
    
    // Auto-advance to Step 4
    setCurrentStep(4);
  };

  // Prices
  const pricePerUnit = selectedService ? (selectedService.pricePerUnitRub || 0) : 0;
  const effectiveQuantity = isDripFeedEnabled ? quantity * dripRuns : quantity;
  const totalPrice = (pricePerUnit * effectiveQuantity).toFixed(2);

  // Zod & Custom Validations
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Link validation
    if (!link) {
      newErrors.link = "Укажите ссылку для продвижения";
    } else if (selectedService && selectedNetwork) {
      try {
        const catName = selectedCategory?.name || '';
        const targetType = selectedService.targetType === 'POST' ? 'POST' : (selectedService.targetType || inferTargetTypeFromCategory(catName));
        const normalizedLink = mutateLink(link, selectedNetwork.slug, targetType);
        const validator = getLinkValidator(selectedNetwork.slug, targetType);
        const parsed = validator.safeParse(normalizedLink);
        
        if (!parsed.success) {
          newErrors.link = parsed.error.errors[0].message;
        }
      } catch {
        // Fallback standard URL match if validator is missing
        if (!link.startsWith('http://') && !link.startsWith('https://')) {
          newErrors.link = "Ссылка должна начинаться с https://";
        }
      }
    }

    // 2. Quantity validation
    if (selectedService) {
      if (quantity < selectedService.minQty) {
        newErrors.quantity = `Минимальный заказ: ${selectedService.minQty} шт.`;
      } else if (quantity > selectedService.maxQty) {
        newErrors.quantity = `Максимальный заказ: ${selectedService.maxQty} шт.`;
      }
    }

    // 3. Custom Data validation
    if (selectedService?.customDataType && selectedService.customDataType !== 'NONE') {
      if (!customData.trim()) {
        newErrors.customData = selectedService.customDataLabel || "Пожалуйста, заполните пользовательские данные";
      }
    }

    // 4. Requirement confirmation check (JIT)
    const hasReq = selectedService?.clientRequirement || selectedService?.clientConfirmation || selectedService?.requireWarning;
    if (hasReq && !isRequirementsConfirmed) {
      newErrors.requirement = "Необходимо подтвердить выполнение условий для старта услуги";
    }

    // 5. Email validation
    if (!email) {
      newErrors.email = "Укажите Email адрес";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Введите корректный адрес электронной почты";
    }

    // 6. Drip-feed duration validation (max 30 days = 43200 minutes)
    if (isDripFeedEnabled && (dripRuns * dripInterval > 43200 || !validateDripFeedDuration(dripRuns, dripInterval))) {
      newErrors.drip = DRIP_FEED_MAX_ERROR_MESSAGE;
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      // Re-trigger shake animations using timestamp
      setValidationTimestamp(Date.now());
      
      // Auto scroll to first error field
      setTimeout(() => {
        if (newErrors.link && linkRef.current) {
          linkRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          linkRef.current.focus();
        } else if (newErrors.customData && customDataRef.current) {
          customDataRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          customDataRef.current.focus();
        } else if (newErrors.quantity && qtyRef.current) {
          qtyRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          qtyRef.current.focus();
        } else if (newErrors.requirement && requirementRef.current) {
          requirementRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (newErrors.email && emailRef.current) {
          emailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          emailRef.current.focus();
        }
      }, 50);

      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Always validate first, intercept submit if not valid
    if (!validateForm()) {
      return;
    }

    if (!selectedService || !link) return;
    
    setIsPending(true);
    setErrors({});
    setSuccess(false);

    try {
      const res = await checkoutAction({
        serviceId: selectedService.id,
        link: link.trim(),
        quantity: effectiveQuantity,
        email: email,
        gateway: gateway,
        runs: isDripFeedEnabled ? dripRuns : undefined,
        interval: isDripFeedEnabled ? dripInterval : undefined,
        customData: selectedService.customDataType !== 'NONE' ? customData : undefined,
        isRequirementsConfirmed: isRequirementsConfirmed
      });

      if (res && res.success) {
        if (res.data?.paymentUrl) {
          window.location.href = res.data.paymentUrl;
        } else {
          setSuccess(true);
          setLink('');
          setCurrentStep(1);
        }
      } else {
        setErrors({ general: res?.error || "Произошла ошибка при оформлении заказа" });
        setValidationTimestamp(Date.now());
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Не удалось создать заказ";
      setErrors({ general: errMsg });
      setValidationTimestamp(Date.now());
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-8 items-start">
      
      {/* LEFT COLUMN: 4-STEP WIZARD (7 COLS) */}
      <div className="col-span-12 lg:col-span-7 space-y-6">
        
        {success ? (
          <div className="bg-card border border-success/20 rounded-[2rem] p-8 text-center space-y-4 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Заказ успешно оформлен!</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Запуск произойдет в течение нескольких минут. Вы можете отслеживать статус заказа в разделе активности на главной.
            </p>
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-2xl transition-all"
            >
              Создать новый заказ
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Step Navigation Tabs indicator */}
            <WizardStepIndicator
              currentStep={currentStep}
              onStepClick={(step) => setCurrentStep(step)}
              selectedNetworkName={selectedNetwork?.name}
              selectedCategoryName={selectedCategory?.name}
              selectedServiceName={selectedService?.name}
            />

            {/* STEP 1: Platform & Target Link */}
            {currentStep === 1 && (
              <WizardNetworkStep
                catalog={catalog}
                selectedNetwork={selectedNetwork}
                onSelectNetwork={handleNetworkSelect}
                link={link}
                onLinkChange={setLink}
                detectedPlatform={detectedPlatform}
                linkRef={linkRef}
                error={errors.link}
                validationTimestamp={validationTimestamp}
              />
            )}

            {/* STEP 2: Category Selection */}
            {currentStep === 2 && selectedNetwork && (
              <WizardCategoryStep
                categories={selectedNetwork.categories}
                selectedCategory={selectedCategory}
                onSelectCategory={handleCategorySelect}
                onBack={() => setCurrentStep(1)}
                networkName={selectedNetwork.name}
              />
            )}

            {/* STEP 3: Service Selection */}
            {currentStep === 3 && selectedCategory && (
              <WizardServiceStep
                services={services}
                isLoadingServices={isLoadingServices}
                selectedService={selectedService}
                onSelectService={handleServiceSelect}
                onBack={() => setCurrentStep(2)}
                categoryName={selectedCategory.name}
              />
            )}

            {/* STEP 4: Checkout configuration */}
            {currentStep === 4 && selectedService && (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Quantity config */}
                <div 
                  key={`step4-qty-${validationTimestamp}`}
                  className={`bg-card border border-border/30 rounded-[2rem] p-6 space-y-4 transition-all duration-300 ${errors.quantity ? 'animate-shake border-destructive/40 shadow-[0_0_20px_rgba(244,63,94,0.05)]' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-foreground">Количество</h3>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      Минимум: {selectedService.minQty} - Максимум: {selectedService.maxQty} шт
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-background/50 p-4 rounded-2xl border border-border/20">
                      <span className="text-xs font-bold text-muted-foreground">Заказать:</span>
                      <input
                        ref={qtyRef}
                        type="number"
                        min={selectedService.minQty || 10}
                        max={selectedService.maxQty || 100000}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                        className={`w-32 text-right font-mono font-extrabold text-lg bg-transparent border-none p-0 focus:ring-0 ${errors.quantity ? 'text-destructive' : 'text-foreground'}`}
                      />
                    </div>
                    
                    {errors.quantity && (
                      <p className="text-xs font-bold text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.quantity}
                      </p>
                    )}

                    <input
                      type="range"
                      min={selectedService.minQty || 10}
                      max={Math.min(10000, selectedService.maxQty || 100000)}
                      step={10}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value))}
                      className="w-full accent-primary bg-muted rounded-lg h-2 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Custom Data Config */}
                {selectedService.customDataType && selectedService.customDataType !== 'NONE' && (
                  <div 
                    key={`step4-customData-${validationTimestamp}`}
                    className={`bg-card border border-border/30 rounded-[2rem] p-6 space-y-3 transition-all duration-300 ${errors.customData ? 'animate-shake border-destructive/40 shadow-[0_0_20px_rgba(244,63,94,0.05)]' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-sm text-foreground">
                        {selectedService.customDataLabel || (selectedService.customDataType === 'TEXTAREA' ? 'Ваши комментарии / текст (по 1 строке)' : 'Параметры заказа')}
                      </h3>
                    </div>
                    {selectedService.customDataType === 'TEXTAREA' ? (
                      <textarea
                        ref={customDataRef as React.RefObject<HTMLTextAreaElement>}
                        rows={3}
                        value={customData}
                        onChange={(e) => setCustomData(e.target.value)}
                        placeholder="Введите каждый комментарий с новой строки..."
                        className={`w-full bg-background border border-border/40 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.customData ? 'border-destructive/60' : ''}`}
                      />
                    ) : (
                      <input
                        ref={customDataRef as React.RefObject<HTMLInputElement>}
                        type="text"
                        value={customData}
                        onChange={(e) => setCustomData(e.target.value)}
                        placeholder="Введите вариант ответа / числовое значение..."
                        className={`w-full bg-background border border-border/40 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.customData ? 'border-destructive/60' : ''}`}
                      />
                    )}
                    {errors.customData && (
                      <p className="text-xs font-bold text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.customData}
                      </p>
                    )}
                  </div>
                )}

                {/* Drip-Feed Config */}
                {selectedService.isDripFeedEnabled && (
                  <div className="bg-card border border-border/30 rounded-[2rem] p-6 space-y-4 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h3 className="font-extrabold text-sm text-foreground">Запускать частями (Drip-Feed)</h3>
                      </div>
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
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/10">
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Количество запусков (runs)</label>
                          <input
                            type="number"
                            min={2}
                            max={100}
                            value={dripRuns}
                            onChange={(e) => setDripRuns(Math.max(2, parseInt(e.target.value) || 2))}
                            className="w-full bg-background border border-border/40 rounded-xl p-2.5 text-sm font-bold outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Интервал (мин)</label>
                          <input
                            type="number"
                            min={5}
                            max={1440}
                            value={dripInterval}
                            onChange={(e) => setDripInterval(Math.max(1, parseInt(e.target.value) || 5))}
                            className="w-full bg-background border border-border/40 rounded-xl p-2.5 text-sm font-bold outline-none"
                          />
                        </div>
                        <p className="col-span-2 text-[11px] text-muted-foreground font-semibold">
                          Всего запусков: {dripRuns} по {quantity} шт. Итоговый объём: <strong className="text-foreground">{effectiveQuantity} шт.</strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Requirement Checkbox (JIT Warning) */}
                {(selectedService.clientRequirement || selectedService.clientConfirmation || selectedService.requireWarning) && (
                  <div 
                    ref={requirementRef}
                    key={`step4-req-${validationTimestamp}`}
                    className={`bg-card border rounded-[2rem] p-6 space-y-3 transition-all duration-300 ${
                      isRequirementsConfirmed 
                        ? 'border-green-500/30 bg-green-500/5' 
                        : errors.requirement 
                          ? 'animate-shake border-destructive/40 shadow-[0_0_20px_rgba(244,63,94,0.05)] bg-destructive/5' 
                          : 'border-amber-500/30 bg-amber-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-amber-500 font-extrabold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" /> Чек-лист для старта
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedService.clientRequirement || selectedService.warningMessage || "Перед запуском убедитесь, что ваш объект продвижения доступен."}
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer group pt-1">
                      <div className="relative flex items-center justify-center mt-0.5">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={isRequirementsConfirmed}
                          onChange={(e) => setIsRequirementsConfirmed(e.target.checked)}
                        />
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isRequirementsConfirmed ? 'bg-green-500 border-green-500 text-foreground' : errors.requirement ? 'border-destructive bg-destructive/10' : 'border-muted-foreground/30 bg-background group-hover:border-primary/50'}`}>
                          <svg className={`w-3.5 h-3.5 pointer-events-none transition-transform duration-200 ${isRequirementsConfirmed ? 'scale-100' : 'scale-0'}`} viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 5L5 9L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      <span className={`text-xs font-bold transition-colors ${isRequirementsConfirmed ? 'text-green-600' : errors.requirement ? 'text-destructive' : 'text-foreground'}`}>
                        {selectedService.clientConfirmation || "Я всё проверил, можно запускать"}
                      </span>
                    </label>
                    {errors.requirement && (
                      <p className="text-xs font-bold text-destructive flex items-center gap-1 pt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.requirement}
                      </p>
                    )}
                  </div>
                )}

                {/* Email and Gateway config */}
                <div 
                  key={`step4-checkout-${validationTimestamp}`}
                  className={`bg-card border border-border/30 rounded-[2rem] p-6 space-y-4 transition-all duration-300 ${errors.email ? 'animate-shake border-destructive/40 shadow-[0_0_20px_rgba(244,63,94,0.05)]' : ''}`}
                >
                  <h3 className="font-extrabold text-sm text-foreground">Детали оплаты</h3>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {['yookassa', 'cryptobot', 'balance'].map((gatewayOpt) => {
                      const isActive = gateway === gatewayOpt;
                      return (
                        <button
                          key={gatewayOpt}
                          type="button"
                          onClick={() => setGateway(gatewayOpt as 'yookassa' | 'cryptobot' | 'balance')}
                          className={`py-2 text-center rounded-xl border text-xs font-bold transition-all ${
                            isActive ? 'bg-primary/10 border-primary text-foreground shadow-sm' : 'bg-background/40 border-border/30 text-muted-foreground hover:border-primary/20'
                          }`}
                        >
                          {gatewayOpt === 'yookassa' ? 'YooKassa' : gatewayOpt === 'cryptobot' ? 'CryptoBot' : 'Баланс'}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <input
                      ref={emailRef}
                      type="email"
                      placeholder="Ваш Email для отправки чеков"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full focus:ring-0 focus:outline-none ${errors.email ? 'border-destructive/60' : ''}`}
                      required
                    />
                    {errors.email && (
                      <p className="text-xs font-bold text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.email}
                      </p>
                    )}
                  </div>

                  {errors.general && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold rounded-2xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errors.general}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between border-t border-border/10">
                    <span className="text-xs font-bold text-muted-foreground">Итого к оплате:</span>
                    <span className="text-xl font-black text-foreground font-mono">{totalPrice} ₽</span>
                  </div>
                </div>

                <div className="flex justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-5 py-4 border border-border/40 text-muted-foreground hover:text-foreground font-bold rounded-2xl flex items-center gap-1 hover:bg-background transition-all shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4" /> Назад
                  </button>
                  
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-2xl hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    {isPending ? 'Оформление заказа...' : 'Оплатить заказ'}
                  </button>
                </div>
              </form>
            )}

          </div>
        )}

      </div>

      {/* RIGHT COLUMN: PREVIEW SCREEN (5 COLS) */}
      <div className="col-span-12 lg:col-span-5 lg:sticky lg:top-24">
        <div className="bg-card/85 backdrop-blur-3xl border border-border/30 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-primary/20 transition-all duration-300 min-h-[480px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-extrabold text-sm text-foreground">Анализ цели</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Preview Engine</span>
            </div>

            {/* Target Card Visual representation */}
            <div className="p-6 bg-background/50 border border-border/20 rounded-3xl flex flex-col items-center text-center space-y-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-2 right-2 flex gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                <div className="w-2 h-2 rounded-full bg-green-500 absolute" />
              </div>

              {/* Avatar placeholder with visual design */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary text-3xl font-black shadow-inner">
                {selectedNetwork ? selectedNetwork.name.substring(0, 1) : '?'}
              </div>

              <div className="space-y-1 w-full min-w-0">
                <h4 className="font-bold text-sm text-foreground truncate">
                  {link ? (link.includes('t.me/') ? `@${link.split('t.me/')[1].split('/')[0]}` : 'Аккаунт продвижения') : 'Ожидание ссылки...'}
                </h4>
                <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px] mx-auto">
                  {link || 'ссылка не указана'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full pt-3 border-t border-border/10">
                <div className="bg-background/80 p-2.5 rounded-xl border border-border/10 text-center">
                  <span className="block text-[9px] text-muted-foreground font-bold uppercase">Канал</span>
                  <span className="text-xs font-bold text-foreground truncate block mt-0.5">
                    {selectedNetwork ? selectedNetwork.name : '—'}
                  </span>
                </div>
                <div className="bg-background/80 p-2.5 rounded-xl border border-border/10 text-center">
                  <span className="block text-[9px] text-muted-foreground font-bold uppercase">Объем</span>
                  <span className="text-xs font-bold text-foreground block mt-0.5">
                    {isDripFeedEnabled ? `${quantity * dripRuns} шт (${quantity} × ${dripRuns} зап.)` : `${quantity} шт`}
                  </span>
                </div>
              </div>
            </div>

            {/* Platform rules / Warnings */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground">Характеристики запуска:</h4>
              <div className="grid grid-cols-1 gap-2.5">
                <div className="p-3 bg-background/40 border border-border/20 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[9px] text-muted-foreground font-bold">Скорость старта</span>
                    <span className="text-xs font-bold text-foreground">{selectedService ? formatEtaSpeedBadge(selectedService) : "Стандартно"}</span>
                  </div>
                </div>

                <div className="p-3 bg-background/40 border border-border/20 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-[9px] text-muted-foreground font-bold">Гарантия на списания</span>
                    <span className="text-xs font-bold text-foreground">
                      {selectedService?.isRefillEnabled ? "30 дней (автопополнение)" : "Без гарантии"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="mt-8 pt-4 border-t border-border/10 flex items-center gap-2 text-[10px] text-muted-foreground">
            <Coins className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Ваш баланс: <strong className="text-foreground">{formatRub(userBalanceCents)} ₽</strong></span>
          </div>

        </div>
      </div>

    </div>
  );
}
