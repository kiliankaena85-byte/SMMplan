"use client";

import React, { useState, useRef, useActionState, useEffect, Suspense } from "react";
import { Button } from "@heroui/react";
import { LinkIcon, SparklesIcon, ArrowRightIcon, Box, ArrowLeftIcon, ArrowDownIcon, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  
  const [link, setLink] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeNetwork, setActiveNetwork] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeCategory, setActiveCategory] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [services, setServices] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  
  const [quantity, setQuantity] = useState<number | string>("");
  const [email, setEmail] = useState(initialEmail || "");

  const quantityRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  
  const [isRequirementsConfirmed, setIsRequirementsConfirmed] = useState(false);
  const [showShakeError, setShowShakeError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  
  // Form State for React 19
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Ошибка при создании заказа";
      return { error: errorMsg, field: "general", timestamp: ts };
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectCategory = async (cat: any) => {
    setActiveCategory(cat);
    setIsLoadingServices(true);
    setServices([]);
    navigateTo('service');
    try {
      const fetched = await getServicesByCategoryAction(cat.id);
      setServices(fetched || []);
    } catch { 
      // error is intentionally ignored here since we just set services to empty
    } finally {
      setIsLoadingServices(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center font-sans min-h-[60vh] pb-32 pt-8 px-4 relative overflow-hidden">
      {step !== 'link' && (
        <motion.div 
          layoutId="hero-input"
          className="w-full max-w-3xl mb-8 flex items-center bg-background/80 backdrop-blur-3xl border border-border/20 shadow-sm h-14 rounded-2xl px-2 z-10"
        >
          <button
            onClick={() => {
              if (step === 'checkout') navigateTo('service');
              else if (step === 'service') navigateTo('category');
              else if (step === 'category') navigateTo('network');
              else if (step === 'network') navigateTo('link');
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors mr-2 flex-shrink-0"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <LinkIcon className="text-muted-foreground w-4 h-4 mr-2 flex-shrink-0" />
          <div className="flex-1 text-sm font-medium text-foreground truncate mr-2">
            {link || "Без ссылки"}
          </div>
          <button 
            onClick={() => { setLink(''); setStep('link'); }}
            className="w-8 h-8 mr-1 flex-shrink-0 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-bold"
          >
            &times;
          </button>
        </motion.div>
      )}
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
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tighter text-foreground mb-8 md:mb-10 text-center leading-tight px-2">
              Что хотите <span className="inline-block px-2 sm:px-3 py-1 bg-foreground text-background rounded-[1rem] sm:rounded-2xl rotate-[-2deg] mx-1 shadow-md">продвигать</span> сегодня?
            </h1>
            <div className="relative group w-full max-w-2xl px-2 sm:px-0">
              <motion.div layoutId="hero-input" className="relative flex items-center bg-background/80 backdrop-blur-3xl border border-border/20 shadow-[0_8px_40px_rgb(0,0,0,0.04)] h-14 sm:h-16 rounded-[1.5rem] sm:rounded-[2rem] px-2 sm:px-3 focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/30 transition-all duration-500 hover:shadow-[0_8px_50px_rgb(0,0,0,0.06)]">
                <LinkIcon className="text-muted-foreground w-5 h-5 sm:w-6 sm:h-6 ml-2 sm:ml-3 flex-shrink-0" />
                <input
                  autoFocus
                  className="flex-1 text-base sm:text-lg py-2 sm:py-3 px-3 sm:px-4 bg-transparent outline-none w-full font-medium text-foreground placeholder:text-muted-foreground/50"
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
                  className="rounded-[1rem] sm:rounded-[1.2rem] bg-foreground text-background shadow-md mr-0.5 sm:mr-1 w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 flex items-center justify-center p-0 min-w-0 hover:bg-foreground/90 transition-all hover:-translate-y-0.5"
                  isPending={isAnalyzing}
                  onPress={() => handleAnalyzeLink(link)}
                >
                  <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </motion.div>
            </div>
            
            <div className="mt-12 flex justify-center w-full">
              <button 
                onClick={() => navigateTo('network')}
                className="mt-6 sm:mt-8 text-foreground/80 hover:text-foreground bg-background/80 hover:bg-background px-4 sm:px-6 py-2.5 sm:py-3 rounded-full backdrop-blur-md border border-border/40 transition-all font-medium text-sm sm:text-base flex items-center gap-2 sm:gap-3 group shadow-sm hover:shadow-md"
              >
                Или выберите услугу из каталога 
                <div className="bg-background rounded-full p-1 group-hover:bg-background shadow-sm transition-colors">
                  <ArrowDownIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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
              <h2 className="text-2xl font-bold text-foreground mb-6">Выберите соцсеть</h2>
              
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 w-full"
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
                    className="flex flex-col items-center justify-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-border/40 bg-card/80 backdrop-blur-2xl hover:bg-card hover:border-primary/50 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 outline-none"
                  >
                    <img src={network.icon} alt={network.name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
                    <span className="font-bold text-foreground text-xs sm:text-sm">{network.name}</span>
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
              <div className="flex items-center gap-3 mb-6">
                <img src={activeNetwork.icon} alt={activeNetwork.name} className="w-8 h-8 object-contain" />
                <h2 className="text-2xl font-bold text-foreground">Выберите категорию</h2>
              </div>
            </div>

            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5"
            >
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {activeNetwork.categories?.map((cat: any) => (
                <motion.div 
                  key={cat.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectCategory(cat)}
                  className="cursor-pointer p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-border/40 bg-card/80 backdrop-blur-2xl hover:bg-card hover:border-primary/50 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-between group"
                >
                   <h4 className="font-bold text-foreground text-base sm:text-lg">{cat.name}</h4>
                   <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/5 group-hover:bg-primary flex items-center justify-center transition-colors">
                     <ArrowRightIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary group-hover:text-primary-foreground" />
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
                className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-5"
              >
                {services.map((service) => (
                  <motion.div 
                    key={service.id}
                    layoutId={`service-card-${service.id}`}
                    variants={itemVariants}
                    className="cursor-pointer rounded-[1.5rem] sm:rounded-[2rem] border border-border/40 bg-card/80 backdrop-blur-2xl hover:bg-card hover:border-primary/50 hover:shadow-[0_16px_50px_rgb(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between group relative min-h-[140px] sm:min-h-[160px]"
                    onClick={() => selectService(service)}
                  >
                    <div className="p-5 pb-14 sm:p-6 sm:pb-16">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <motion.h4 layoutId={`title-${service.id}`} className="font-bold text-foreground text-lg sm:text-xl leading-snug">{service.name}</motion.h4>
                      </div>
                      
                      <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
                        <p className="text-[12px] sm:text-[13px] text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> 
                          Старт: <span className="font-medium text-foreground">{service.speed || 'Моментально'}</span>
                        </p>
                        <p className="text-[12px] sm:text-[13px] text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 
                          Лимиты: <span className="font-medium text-foreground">{service.minQty} - {service.maxQty} шт.</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="absolute bottom-4 left-4 sm:bottom-5 sm:left-5 bg-foreground text-background px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold text-[13px] sm:text-[14px] shadow-[0_4px_20px_rgb(0,0,0,0.1)] pointer-events-none">
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
            <motion.div 
              layoutId={`service-card-${selectedService.id}`}
              className="bg-card/80 backdrop-blur-3xl border border-border/30 shadow-[0_24px_80px_rgb(0,0,0,0.08)] rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-5 md:p-6 w-full mx-auto overflow-hidden relative"
            >
              <div className="mb-4 sm:mb-5 flex justify-between items-start gap-3 sm:gap-4">
                <div>
                  <motion.h2 layoutId={`title-${selectedService.id}`} className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{selectedService.name}</motion.h2>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-primary font-black text-lg sm:text-xl">{selectedService.pricePerUnitRub.toFixed(2)} ₽</span>
                  <span className="text-muted-foreground font-medium text-[10px] sm:text-xs block">за 1 шт.</span>
                </div>
              </div>

              {/* Плавное появление деталей услуги */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                {selectedService.description && (
                  <div className="mb-4 sm:mb-5 p-3 sm:p-4 rounded-[1.25rem] sm:rounded-2xl bg-muted/70 border border-border/50 text-[13px] sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap shadow-inner max-h-[30vh] overflow-y-auto">
                    {selectedService.description}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
                  <div className="p-2.5 sm:p-3 rounded-[1.25rem] sm:rounded-2xl bg-background/90 shadow-sm border border-border/40 backdrop-blur-sm">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Мин. заказ</p>
                    <p className="font-bold text-base sm:text-lg">{selectedService.minQty}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-[1.25rem] sm:rounded-2xl bg-background/90 shadow-sm border border-border/40 backdrop-blur-sm">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Макс. заказ</p>
                    <p className="font-bold text-base sm:text-lg">{selectedService.maxQty}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-[1.25rem] sm:rounded-2xl bg-background/90 shadow-sm border border-border/40 col-span-2 sm:col-span-1 backdrop-blur-sm flex flex-col justify-center">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Скорость</p>
                    <p className="font-bold text-primary text-base sm:text-lg">{selectedService.speed || 'Моментально'}</p>
                  </div>
                </div>
              </motion.div>

              <hr className="border-border/10 mb-4 sm:mb-5" />

              {/* Плавное появление формы */}
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <form action={formAction}>
                  {/* 1. Количество */}
                <div id="field-quantity" className="mb-3">
                  <label className="block text-xs font-bold text-foreground/80 uppercase tracking-wider mb-1 ml-1">Количество</label>
                  <input
                    ref={quantityRef}
                    name="quantity"
                    type="number"
                    min={selectedService.minQty || 100}
                    max={selectedService.maxQty || 10000}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    onFocus={(e) => {
                      const target = e.target;
                      setTimeout(() => target.select(), 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (!link) {
                           linkRef.current?.focus();
                        } else {
                           emailRef.current?.focus();
                        }
                      }
                    }}
                    key={formState.field === 'quantity' ? shakeKey : undefined}
                    className={`w-full bg-background backdrop-blur-md text-foreground placeholder:text-muted-foreground px-3 py-2.5 sm:px-4 sm:py-3 rounded-[1.25rem] sm:rounded-[1.5rem] border border-border/80 ${formState.field === 'quantity' ? '!border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'focus:ring-4 focus:ring-primary/10 focus:border-primary/40'} transition-all duration-300 text-base sm:text-lg font-bold outline-none shadow-sm`}
                    placeholder={`${selectedService.minQty || 100} — ${selectedService.maxQty || 10000}`}
                  />
                  <AnimatePresence mode="popLayout">
                    {formState.error && formState.field === "quantity" && (
                      <motion.div 
                        key={`err-qty-${shakeKey}`} 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                        animate={{ opacity: 1, height: "auto", marginTop: 8 }} 
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold shadow-sm overflow-hidden"
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span role="alert">{formState.error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 2. Ссылка */}
                <div id="field-link" className="mb-3">
                  <label className="block text-xs font-bold text-foreground/80 uppercase tracking-wider mb-1 ml-1">Ссылка на {selectedService.targetType === 'CHANNEL' ? 'канал/профиль' : selectedService.targetType === 'POST' ? 'пост' : 'объект'}</label>
                  <input 
                    ref={linkRef}
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
                    className={`w-full bg-background backdrop-blur-md text-foreground placeholder:text-muted-foreground px-3 py-2.5 sm:px-4 sm:py-3 rounded-[1.25rem] sm:rounded-[1.5rem] border border-border/80 ${formState.field === 'link' ? '!border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'focus:ring-4 focus:ring-primary/10 focus:border-primary/40'} transition-all duration-300 text-sm sm:text-base font-medium outline-none shadow-sm`}
                  />
                  <AnimatePresence mode="popLayout">
                    {formState.error && formState.field === "link" && (
                      <motion.div 
                        key={`err-link-${shakeKey}`} 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                        animate={{ opacity: 1, height: "auto", marginTop: 8 }} 
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold shadow-sm overflow-hidden"
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span role="alert">{formState.error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 3. Email */}
                <div id="field-email" className="mb-3">
                  <label className="block text-xs font-bold text-foreground/80 uppercase tracking-wider mb-1 ml-1">Email (для чека)</label>
                  <input 
                    ref={emailRef}
                    name="email"
                    type="email" 
                    placeholder="example@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    key={formState.field === 'email' ? shakeKey : undefined}
                    className={`w-full bg-background backdrop-blur-md text-foreground placeholder:text-muted-foreground px-3 py-2.5 sm:px-4 sm:py-3 rounded-[1.25rem] sm:rounded-[1.5rem] border border-border/80 ${formState.field === 'email' ? '!border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'focus:ring-4 focus:ring-primary/10 focus:border-primary/40'} transition-all duration-300 text-sm sm:text-base font-medium outline-none shadow-sm`}
                  />
                  <AnimatePresence mode="popLayout">
                    {formState.error && formState.field === "email" && (
                      <motion.div 
                        key={`err-email-${shakeKey}`} 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                        animate={{ opacity: 1, height: "auto", marginTop: 8 }} 
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold shadow-sm overflow-hidden"
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span role="alert">{formState.error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Чек-лист для старта (JIT Validation) */}
                {selectedService.clientRequirement && (
                  <div id="field-requirement" key={formState.field === 'requirement' ? shakeKey : undefined} className={`mb-4 p-3 rounded-[1.25rem] sm:rounded-[1.5rem] border transition-all duration-300 ${isRequirementsConfirmed ? 'bg-green-50/50 border-green-200' : (showShakeError || formState.field === 'requirement') ? 'bg-red-50 border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-shake' : 'bg-amber-50/30 border-amber-200/50'}`}>
                    <h4 className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider mb-1 text-foreground flex items-center gap-2">
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
                <div className="flex flex-col items-center mt-4">
                  <AnimatePresence mode="popLayout">
                    {formState.error && formState.field === "general" && (
                      <motion.div 
                        key={`err-gen-${shakeKey}`} 
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }} 
                        animate={{ opacity: 1, height: "auto", marginBottom: 24 }} 
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="w-full p-4 bg-red-50 border border-red-200 rounded-[1.5rem] flex items-center gap-3 shadow-[0_0_15px_rgba(239,68,68,0.2)] overflow-hidden"
                      >
                        <div className="bg-red-100 p-2 rounded-full text-red-600 flex-shrink-0">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <span role="alert" className="text-red-700 font-bold text-sm">
                          {formState.error}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                     <div className="w-full mb-4 p-3 bg-amber-50 rounded-[1.5rem] border border-amber-200">
                       <p className="text-xs text-amber-700 font-medium text-center">
                         Минимальное пополнение — 10 ₽. Остаток зачислится на баланс.
                       </p>
                     </div>
                  )}

                  <Button
                    id="form-submit-btn"
                    type="submit"
                    isPending={isPending}
                    className="w-full bg-primary rounded-[1.5rem] text-primary-foreground font-bold text-lg h-14 shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.12)] hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
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
              </motion.div>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

