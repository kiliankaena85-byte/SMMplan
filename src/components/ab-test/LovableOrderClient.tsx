"use client";

import React, { useState, useRef, useActionState, useEffect, Suspense } from "react";
import { Button, Card, Chip, Dropdown, Modal } from "@heroui/react";
import { LinkIcon, SparklesIcon, ArrowRightIcon, Box, MoreHorizontal, ArrowLeftIcon, ArrowDownIcon, Info, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { getServicesByCategoryAction } from "@/actions/order/catalog";
import { checkoutAction } from "@/actions/order/checkout";

type Step = 'link' | 'network' | 'category' | 'service' | 'checkout';

const slideVariants = {
  enter: (direction: number) => ({
    y: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.96,
    position: "absolute" as const,
  }),
  center: {
    zIndex: 1,
    y: 0,
    opacity: 1,
    scale: 1,
    position: "relative" as const,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    y: direction < 0 ? 80 : -80,
    opacity: 0,
    scale: 0.96,
    position: "absolute" as const,
  })
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 }
};

interface LovableOrderClientProps {
  initialCatalog: any[];
  initialEmail?: string;
}

export function LovableOrderClient(props: LovableOrderClientProps) {
  return (
    <Suspense fallback={<div className="flex justify-center p-12"><Box className="w-8 h-8 text-primary animate-pulse" /></div>}>
      <LovableOrderClientInner {...props} />
    </Suspense>
  );
}

function LovableOrderClientInner({ initialCatalog, initialEmail }: LovableOrderClientProps) {
  const [step, setStep] = useState<Step>('link');
  const [direction, setDirection] = useState(1);
  const router = useRouter();
  const pathname = usePathname();
  
  const [link, setLink] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeNetwork, setActiveNetwork] = useState<any | null>(null);
  const [activeCategory, setActiveCategory] = useState<any | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [expandedInfoId, setExpandedInfoId] = useState<string | null>(null);
  
  const [quantity, setQuantity] = useState<number | string>("");
  const [email, setEmail] = useState(initialEmail || "");

  const quantityRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  
  const [isRequirementsConfirmed, setIsRequirementsConfirmed] = useState(false);
  const [showShakeError, setShowShakeError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  
  // Form State for React 19
  const [formState, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    const linkValue = formData.get("link") as string || link;
    const emailValue = formData.get("email") as string || email;
    const quantityValue = formData.get("quantity") as string || quantity.toString();
    const ts = Date.now();
    
    if (!selectedService) return { error: "Пожалуйста, выберите услугу", field: "general", timestamp: ts };
    if (!linkValue) return { error: "Пожалуйста, укажите ссылку", field: "link", timestamp: ts };
    if (selectedService.clientRequirement && !isRequirementsConfirmed) {
      setShowShakeError(true);
      setTimeout(() => setShowShakeError(false), 800);
      return { error: "Пожалуйста, подтвердите требования к заказу", field: "requirement", timestamp: ts };
    }
    
    let qtyNum = parseInt(quantityValue);
    if (isNaN(qtyNum)) qtyNum = 0;

    const minQty = selectedService.minQty || 100;
    const maxQty = selectedService.maxQty || 10000;
    if (qtyNum < minQty) return { error: `Минимальное количество: ${minQty}`, field: "quantity", timestamp: ts };
    if (qtyNum > maxQty) return { error: `Максимальное количество: ${maxQty}`, field: "quantity", timestamp: ts };
    if (!emailValue || !emailValue.includes('@')) return { error: "Некорректный email", field: "email", timestamp: ts };

    try {
      const res = await checkoutAction({
        serviceId: selectedService.id,
        link: linkValue,
        quantity: qtyNum,
        email: emailValue,
        gateway: 'yookassa',
        isRequirementsConfirmed: isRequirementsConfirmed
      });

      if (res && res.success && res.data?.paymentUrl) {
         window.location.href = res.data.paymentUrl;
         return { error: "", field: "", timestamp: ts };
      } else if (res && !res.success) {
         return { error: res.error || "Ошибка валидации данных", field: "general", timestamp: ts };
      }
      return { error: "Неизвестная ошибка", field: "general", timestamp: ts };
    } catch (err: any) {
      return { error: err.message || "Ошибка при создании заказа", field: "general", timestamp: ts };
    }
  }, { error: "", field: "", timestamp: 0 });

  useEffect(() => {
    if (formState.timestamp && formState.timestamp > 0 && formState.error) {
      setShakeKey(formState.timestamp);
      const fieldId = formState.field === "general" ? "form-submit-btn" : `field-${formState.field}`;
      const el = document.getElementById(fieldId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [formState.timestamp, formState.error, formState.field]);

  const navigateTo = (newStep: Step) => {
    const order = { 'link': 0, 'network': 1, 'category': 2, 'service': 3, 'checkout': 4 };
    setDirection(order[newStep] > order[step] ? 1 : -1);
    setStep(newStep);
  };

  const handleAnalyzeLink = (url: string) => {
    if (!url) return;
    setIsAnalyzing(true);
    
    const lowerUrl = url.toLowerCase();
    let matchedNetwork = null;
    
    if (lowerUrl.includes("t.me") || lowerUrl.includes("telegram")) {
      matchedNetwork = initialCatalog.find(n => n.name.toLowerCase().includes("telegram"));
    } else if (lowerUrl.includes("instagram.com")) {
      matchedNetwork = initialCatalog.find(n => n.name.toLowerCase().includes("instagram"));
    } else if (lowerUrl.includes("vk.com")) {
      matchedNetwork = initialCatalog.find(n => n.name.toLowerCase().includes("vk"));
    }
    
    if (!matchedNetwork && initialCatalog.length > 0) matchedNetwork = initialCatalog[0];
      
    if (matchedNetwork) {
      setActiveNetwork(matchedNetwork);
      setActiveCategory(null);
      setServices([]);
      setSelectedService(null);
      navigateTo('category');
    }
    setIsAnalyzing(false);
  };

  const selectCategory = async (cat: any) => {
    setActiveCategory(cat);
    setIsLoadingServices(true);
    setServices([]);
    navigateTo('service');
    try {
      const fetched = await getServicesByCategoryAction(cat.id);
      setServices(fetched || []);
    } catch(e) {} finally {
      setIsLoadingServices(false);
    }
  };

  const selectService = (srv: any) => {
    setSelectedService(srv);
    setQuantity(srv.minQty || 100);
    setIsRequirementsConfirmed(false);
    navigateTo('checkout');
  };

  useEffect(() => {
    if (step === 'checkout' && quantityRef.current) {
      setTimeout(() => quantityRef.current?.focus(), 300);
    }
  }, [step]);

  const numericQuantity = typeof quantity === 'string' ? (parseInt(quantity) || 0) : quantity;
  const price = selectedService ? (selectedService.pricePerUnitRub * numericQuantity).toFixed(2) : "0.00";

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center font-sans min-h-[60vh] py-8 px-4 relative overflow-hidden">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        
        {/* STEP 1: LINK INPUT */}
        {step === 'link' && (
          <motion.div
            key="step-link"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-3xl flex flex-col items-center"
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground mb-10 text-center leading-tight">
              Что хотите <span className="inline-block px-3 py-1 bg-foreground text-background rounded-2xl rotate-[-2deg] mx-1 shadow-md">продвигать</span> сегодня?
            </h1>
            <div className="relative group w-full max-w-2xl">
              <div className="relative flex items-center bg-background/60 backdrop-blur-2xl border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.06)] h-16 rounded-[1.5rem] px-3 focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/40 transition-all duration-300">
                <LinkIcon className="text-muted-foreground w-6 h-6 ml-3 flex-shrink-0" />
                <input
                  autoFocus
                  className="flex-1 text-lg py-3 px-4 bg-transparent outline-none w-full font-medium text-foreground placeholder:text-muted-foreground/50"
                  placeholder="Вставьте ссылку..."
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && link) handleAnalyzeLink(link);
                  }}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    setTimeout(() => handleAnalyzeLink(text), 100);
                  }}
                />
                <Button 
                  className="rounded-[1.2rem] bg-foreground text-background shadow-md mr-1 w-11 h-11 flex-shrink-0 flex items-center justify-center p-0 min-w-0 hover:bg-foreground/90 transition-all hover:-translate-y-0.5"
                  isPending={isAnalyzing}
                  onPress={() => handleAnalyzeLink(link)}
                >
                  <ArrowRightIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <div className="mt-12 flex justify-center w-full">
              <button 
                onClick={() => navigateTo('network')}
                className="mt-8 text-foreground/80 hover:text-foreground bg-muted/40 hover:bg-muted/60 px-6 py-3 rounded-full backdrop-blur-md border border-border/40 transition-all font-medium text-base flex items-center gap-3 group shadow-sm hover:shadow-md"
              >
                Или выберите услугу из каталога 
                <div className="bg-background rounded-full p-1 group-hover:bg-background shadow-sm transition-colors">
                  <ArrowDownIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 1.5: NETWORK SELECTION */}
        {step === 'network' && (
          <motion.div
            key="step-network"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full"
          >
            <div className="mb-6 w-full">
              <button 
                onClick={() => navigateTo('link')}
                className="text-foreground/70 hover:text-foreground flex items-center gap-2 mb-4 font-medium transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" /> Назад
              </button>
              <h2 className="text-2xl font-bold text-foreground mb-6">Выберите соцсеть</h2>
              
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full"
              >
                {initialCatalog.map(network => (
                  <motion.button
                    variants={itemVariants}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={network.id}
                    onClick={() => {
                      setActiveNetwork(network);
                      navigateTo('category');
                    }}
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-[1.5rem] border border-border/40 bg-card/40 backdrop-blur-md hover:bg-card/60 hover:border-primary/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all outline-none"
                  >
                    <img src={network.icon} alt={network.name} className="w-10 h-10 object-contain" />
                    <span className="font-bold text-foreground text-sm">{network.name}</span>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: CATEGORY SELECTION */}
        {step === 'category' && activeNetwork && (
          <motion.div
            key="step-category"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full"
          >
            <div className="mb-6 w-full">
              <button 
                onClick={() => navigateTo('network')}
                className="text-foreground/70 hover:text-foreground flex items-center gap-2 mb-4 font-medium transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" /> Назад к соцсетям
              </button>
              <div className="flex items-center gap-3 mb-6">
                <img src={activeNetwork.icon} alt={activeNetwork.name} className="w-8 h-8 object-contain" />
                <h2 className="text-2xl font-bold text-foreground">Выберите категорию</h2>
              </div>
            </div>

            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {activeNetwork.categories?.map((cat: any) => (
                <motion.div 
                  key={cat.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectCategory(cat)}
                  className="cursor-pointer p-5 rounded-[1.5rem] border border-border/40 bg-card/40 backdrop-blur-md hover:bg-card/60 hover:border-primary/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all flex items-center justify-between group"
                >
                   <h4 className="font-bold text-foreground text-lg">{cat.name}</h4>
                   <div className="w-8 h-8 rounded-full bg-primary/5 group-hover:bg-primary flex items-center justify-center transition-colors">
                     <ArrowRightIcon className="w-4 h-4 text-primary group-hover:text-primary-foreground" />
                   </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* STEP 3: SERVICE SELECTION */}
        {step === 'service' && activeCategory && (
          <motion.div
            key="step-service"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full"
          >
            <div className="mb-8">
              <button 
                onClick={() => navigateTo('category')}
                className="text-foreground/70 hover:text-foreground flex items-center gap-2 mb-2 font-medium transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" /> Назад к категориям
              </button>
              <h2 className="text-2xl font-bold text-foreground">{activeCategory.name}</h2>
            </div>

            {isLoadingServices ? (
              <div className="py-20 flex justify-center">
                <Box className="w-12 h-12 text-primary/50 animate-pulse" />
              </div>
            ) : (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 lg:grid-cols-2 gap-5"
              >
                {services.map((service) => (
                  <motion.div 
                    key={service.id}
                    variants={itemVariants}
                    layout
                    className={`cursor-pointer rounded-[1.5rem] border ${expandedInfoId === service.id ? 'border-primary/50 shadow-[0_12px_40px_rgb(0,0,0,0.12)] bg-card/60' : 'border-border/40 bg-card/40'} backdrop-blur-md hover:bg-card/60 hover:border-primary/40 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between group relative ${expandedInfoId === service.id ? '' : 'min-h-[200px]'}`}
                    onClick={() => selectService(service)}
                  >
                    <div className="p-6 pb-16">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h4 className="font-bold text-foreground text-xl leading-snug">{service.name}</h4>
                          <div onClick={(e) => { e.stopPropagation(); setExpandedInfoId(prev => prev === service.id ? null : service.id); }} className="shrink-0 z-10">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              isIconOnly
                              className={`bg-primary/5 hover:bg-primary/10 transition-transform ${expandedInfoId === service.id ? 'rotate-180 bg-primary/10' : ''}`}
                            >
                              <ArrowDownIcon className="w-4 h-4 text-primary" />
                            </Button>
                          </div>
                      </div>
                      
                      <AnimatePresence>
                        {expandedInfoId === service.id ? (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            {service.description && (
                              <div className="mt-4 p-4 rounded-2xl bg-muted/30 border border-border/50 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                {service.description}
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
                              <div className="p-3 rounded-2xl bg-card shadow-sm border border-border/50">
                                <p className="text-xs text-muted-foreground mb-1">Мин. заказ</p>
                                <p className="font-bold">{service.minQty}</p>
                              </div>
                              <div className="p-3 rounded-2xl bg-card shadow-sm border border-border/50">
                                <p className="text-xs text-muted-foreground mb-1">Макс. заказ</p>
                                <p className="font-bold">{service.maxQty}</p>
                              </div>
                              <div className="p-4 rounded-2xl bg-card shadow-sm border border-border/50 col-span-2 flex justify-between items-center">
                                <p className="text-xs text-muted-foreground font-medium">Скорость старта</p>
                                <p className="font-bold text-primary">{service.speed || 'Моментально'}</p>
                              </div>
                            </div>
                            <Button
                              className="w-full bg-primary text-primary-foreground font-bold rounded-xl mt-2 mb-2"
                              onPress={(e) => { e.stopPropagation(); selectService(service); }}
                            >
                              Выбрать услугу
                            </Button>
                          </motion.div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="mt-4 space-y-2"
                          >
                            <p className="text-[13px] text-muted-foreground flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> 
                              Старт: <span className="font-medium text-foreground">{service.speed || 'Моментально'}</span>
                            </p>
                            <p className="text-[13px] text-muted-foreground flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 
                              Лимиты: <span className="font-medium text-foreground">{service.minQty} - {service.maxQty} шт.</span>
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    <div className="absolute bottom-5 left-5 bg-foreground text-background px-4 py-2 rounded-full font-bold text-[14px] shadow-[0_4px_20px_rgb(0,0,0,0.1)] pointer-events-none">
                      {service.pricePerUnitRub.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ₽ <span className="font-normal opacity-80">/ шт</span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* STEP 4: CHECKOUT NATIVE WIZARD */}
        {step === 'checkout' && selectedService && (
          <motion.div
            key="step-checkout"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-2xl"
          >
            <div className="mb-6 flex justify-between items-start gap-4">
              <div>
                <button 
                  onClick={() => navigateTo('service')}
                  className="text-foreground/70 hover:text-foreground flex items-center gap-2 mb-4 font-medium transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4" /> Другая услуга
                </button>
                <h2 className="text-2xl font-bold text-foreground leading-tight">{selectedService.name}</h2>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-primary font-black text-xl">{selectedService.pricePerUnitRub.toFixed(2)} ₽</span>
                <span className="text-muted-foreground font-medium text-xs block">за 1 шт.</span>
              </div>
            </div>

            <Card className="bg-card/40 backdrop-blur-xl border border-border/40 shadow-[0_20px_60px_rgb(0,0,0,0.08)] rounded-[2rem] p-6 md:p-8 w-full max-w-xl mx-auto">
              <form action={formAction}>
                {/* 1. Количество */}
                <div id="field-quantity" className="mb-4">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Количество</label>
                  <input
                    ref={quantityRef}
                    name="quantity"
                    type="number"
                    min={selectedService.minQty || 100}
                    max={selectedService.maxQty || 10000}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (!link) {
                           setStep('link');
                        } else {
                           emailRef.current?.focus();
                        }
                      }
                    }}
                    key={formState.field === 'quantity' ? shakeKey : undefined}
                    className={`w-full bg-background/50 backdrop-blur-sm text-foreground placeholder:text-muted-foreground/40 px-5 py-4 rounded-2xl border border-border/40 ${formState.field === 'quantity' ? '!border-red-500 ring-4 ring-red-500/10 animate-shake' : 'focus:ring-4 focus:ring-primary/10 focus:border-primary/40'} transition-all text-lg font-bold outline-none`}
                    placeholder={`${selectedService.minQty || 100} — ${selectedService.maxQty || 10000}`}
                  />
                  {formState.error && formState.field === "quantity" && (
                    <div key={`err-qty-${shakeKey}`} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold shadow-sm animate-shake">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span role="alert">{formState.error}</span>
                    </div>
                  )}
                </div>

                {/* 2. Ссылка */}
                <div id="field-link" className="mb-4">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Ссылка на {selectedService.targetType === 'CHANNEL' ? 'канал/профиль' : selectedService.targetType === 'POST' ? 'пост' : 'объект'}</label>
                  <input 
                    name="link"
                    type="url" 
                    placeholder="https://..."
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        emailRef.current?.focus();
                      }
                    }}
                    key={formState.field === 'link' ? shakeKey : undefined}
                    className={`w-full bg-background/50 backdrop-blur-sm text-foreground placeholder:text-muted-foreground/40 px-5 py-4 rounded-2xl border border-border/40 ${formState.field === 'link' ? '!border-red-500 ring-4 ring-red-500/10 animate-shake' : 'focus:ring-4 focus:ring-primary/10 focus:border-primary/40'} transition-all text-base font-medium outline-none`}
                  />
                  {formState.error && formState.field === "link" && (
                    <div key={`err-link-${shakeKey}`} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold shadow-sm animate-shake">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span role="alert">{formState.error}</span>
                    </div>
                  )}
                </div>

                {/* 3. Email */}
                <div id="field-email" className="mb-4">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Email (для чека)</label>
                  <input 
                    ref={emailRef}
                    name="email"
                    type="email" 
                    placeholder="example@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    key={formState.field === 'email' ? shakeKey : undefined}
                    className={`w-full bg-background/50 backdrop-blur-sm text-foreground placeholder:text-muted-foreground/40 px-5 py-4 rounded-2xl border border-border/40 ${formState.field === 'email' ? '!border-red-500 ring-4 ring-red-500/10 animate-shake' : 'focus:ring-4 focus:ring-primary/10 focus:border-primary/40'} transition-all text-base font-medium outline-none`}
                  />
                  {formState.error && formState.field === "email" && (
                    <div key={`err-email-${shakeKey}`} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold shadow-sm animate-shake">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span role="alert">{formState.error}</span>
                    </div>
                  )}
                </div>

                {/* Чек-лист для старта (JIT Validation) */}
                {selectedService.clientRequirement && (
                  <div id="field-requirement" key={formState.field === 'requirement' ? shakeKey : undefined} className={`mb-6 p-4 rounded-2xl border transition-all duration-300 ${isRequirementsConfirmed ? 'bg-green-50/50 border-green-200' : (showShakeError || formState.field === 'requirement') ? 'bg-red-50 border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-shake' : 'bg-amber-50/50 border-amber-200'}`}>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider mb-2 text-foreground flex items-center gap-2">
                      <SparklesIcon className="w-4 h-4 text-amber-500" />
                      Чек-лист для старта
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {selectedService.clientRequirement}
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center mt-0.5">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={isRequirementsConfirmed}
                          onChange={(e) => setIsRequirementsConfirmed(e.target.checked)}
                        />
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isRequirementsConfirmed ? 'bg-green-500 border-green-500 text-white' : showShakeError ? 'border-red-500 bg-red-50' : 'border-muted-foreground/30 bg-background group-hover:border-primary/50'}`}>
                          <svg className={`w-3.5 h-3.5 pointer-events-none transition-transform duration-200 ${isRequirementsConfirmed ? 'scale-100' : 'scale-0'}`} viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 5L5 9L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      <span className={`text-sm font-medium transition-colors ${isRequirementsConfirmed ? 'text-green-700' : showShakeError ? 'text-red-600' : 'text-foreground'}`}>
                        {selectedService.clientConfirmation || "Я всё проверил, можно запускать"}
                      </span>
                    </label>
                  </div>
                )}

                {/* Оплата */}
                <div className="flex flex-col items-center mt-6">
                  {formState.error && formState.field === "general" && (
                    <div key={`err-gen-${shakeKey}`} className="w-full mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-shake">
                      <div className="bg-red-100 p-2 rounded-full text-red-600 flex-shrink-0">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <span role="alert" className="text-red-700 font-bold text-sm">
                        {formState.error}
                      </span>
                    </div>
                  )}

                  <div className="w-full flex items-center justify-between mb-4 px-2">
                    <span className="text-muted-foreground font-semibold">К оплате:</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-foreground">
                        {parseFloat(price) < 10 ? "10.00" : price}
                      </span>
                      <span className="text-lg font-bold text-muted-foreground">₽</span>
                    </div>
                  </div>
                  
                  {parseFloat(price) < 10 && parseFloat(price) > 0 && (
                     <div className="w-full mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                       <p className="text-xs text-amber-700 font-medium text-center">
                         Минимальное пополнение — 10 ₽. Остаток зачислится на баланс.
                       </p>
                     </div>
                  )}

                  <Button
                    id="form-submit-btn"
                    type="submit"
                    isPending={isPending}
                    className="w-full bg-primary rounded-2xl text-primary-foreground font-bold text-lg h-14 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    Оплатить заказ
                  </Button>
                  
                  {/* 152-ФЗ Implicit Consent */}
                  <div className="mt-4 text-center">
                  <p className="text-[10px] text-muted-foreground">
                    Нажимая кнопку, вы соглашаетесь с <a href="/legal/privacy" className="underline hover:text-foreground transition-colors" target="_blank">Политикой конфиденциальности</a> и <a href="/legal/terms" className="underline hover:text-foreground transition-colors" target="_blank">Публичной офертой</a>
                  </p>
                  </div>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

