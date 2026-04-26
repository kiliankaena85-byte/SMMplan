"use client";

import { useOrderEngine } from "@/hooks/useOrderEngine";
import { PublicNetwork } from "@/actions/order/catalog";
import { checkoutAction } from "@/actions/order/checkout";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, CheckCircle2, Loader2, Link2, LogIn, ChevronRight, ChevronLeft, CheckSquare, Square, Shield, CreditCard, Mail, GripHorizontal, X, ChevronDown } from "lucide-react";
import { Select, SelectItem, Input as HeroInput, Button as HeroButton } from "@heroui/react";
import React, { useState, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { TrustBar } from "./TrustBar";
import { WhyUs } from "./WhyUs";
import { FAQ } from "./FAQ";

export function SmartLinkLanding({
  initialCatalog,
  initialEmail
}: {
  initialCatalog: PublicNetwork[];
  initialEmail?: string;
}) {
  const engine = useOrderEngine(initialCatalog, initialEmail);
  const {
    url, setUrl,
    networkId, setNetworkId,
    categoryId, setCategoryId,
    selectedService, setSelectedService,
    quantity, setQuantity,
    email, setEmail,
    customData, setCustomData,
    agreedToTerms, setAgreedToTerms,
    catalog,
    availableCategories,
    services,
    isLoading,
    isCalculating,
    pricing,
    totalPriceFormatted,
  } = engine;

  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllNetworks, setShowAllNetworks] = useState(false);

  const TOP_SLUGS = useMemo(() => ['telegram', 'vk', 'instagram', 'youtube', 'tiktok', 'twitch'], []);
  const { topNetworks, otherNetworks } = useMemo(() => {
    const top = catalog.filter(n => TOP_SLUGS.includes(n.slug.toLowerCase()));
    top.sort((a,b) => TOP_SLUGS.indexOf(a.slug.toLowerCase()) - TOP_SLUGS.indexOf(b.slug.toLowerCase()));
    const other = catalog.filter(n => !TOP_SLUGS.includes(n.slug.toLowerCase()));
    return { topNetworks: top, otherNetworks: other };
  }, [catalog, TOP_SLUGS]);
  
  // Show UI if there is input, focus, or even loosely by default for preview
  const isExpanded = url.trim().length > 0 || isFocused;
  
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (carouselRef.current) carouselRef.current.scrollBy({ left: -250, behavior: 'smooth' });
  };
  
  const scrollRight = () => {
    if (carouselRef.current) carouselRef.current.scrollBy({ left: 250, behavior: 'smooth' });
  };

  const handleCheckout = async () => {
    if (!selectedService || !url || quantity < selectedService.minQty || !agreedToTerms) return;
    if (!email || !email.includes('@')) {
      alert("Пожалуйста, введите корректный email для получения чека.");
      return;
    }
    
    setIsSubmitting(true);
    const res = await checkoutAction({
      serviceId: selectedService.id,
      link: url,
      quantity,
      email,
      customData: customData.trim() || undefined,
      gateway: 'yookassa' // Standard generic checkout via yookassa
    });
    
    setIsSubmitting(false);
    if (res.success && res.data?.paymentUrl) {
      window.location.href = res.data.paymentUrl;
    } else {
      const errorMessage = !res.success ? res.error : "Ошибка создания заказа. Попробуйте снова.";
      alert(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col relative overflow-hidden">
      
      {/* ── Background Soft Blobs (Glassmorphism Environment) ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-sky-200/60 blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute top-[20%] right-[-5%] w-[700px] h-[700px] rounded-full bg-indigo-200/50 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[20%] w-[500px] h-[500px] rounded-full bg-teal-100/60 blur-[120px] pointer-events-none" />

      {/* ── Секция 1: Стеклянная Шапка (Glass Header) ── */}
      <header className="sticky top-0 z-50 bg-white/50 backdrop-blur-md border-b border-white/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white fill-current" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">Smmplan</span>
          </Link>

          <nav className="hidden md:flex gap-8 text-sm font-semibold text-slate-600">
            <Link href="/" className="hover:text-sky-600 transition-colors">Услуги</Link>
            <Link href="/dashboard/tickets" className="hover:text-sky-600 transition-colors">Поддержка</Link>
            <Link href="/p/faq" className="hover:text-sky-600 transition-colors">FAQ</Link>
          </nav>

          <Link
            href="/login"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-sky-500 text-white text-sm font-bold shadow-md hover:bg-sky-400 hover:shadow-lg transition-all duration-200"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Войти в аккаунт</span>
          </Link>
        </div>
      </header>

      {/* ── Секция 2: Hero Блок "Smart Glass" ── */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-20 flex flex-col items-center relative z-10">

        <div className="text-center space-y-6 mb-12 max-w-3xl">
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-slate-900 leading-tight">
            Умное продвижение <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-500">соцсетей</span>
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed font-medium">
            Алгоритм Smmplan — ваша аудитория наша забота.
          </p>
        </div>

        {/* ── Glass Card (Центральный Интерактивный Блок) ── */}
        <div className="w-full max-w-5xl mx-auto bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] rounded-[2.5rem] p-4 sm:p-8 relative overflow-hidden">
          
          {/* Smart Input */}
          <div className="w-full max-w-3xl mx-auto relative z-20 mb-8 mt-4">
            <HeroInput
              id="landing-url"
              type="url"
              size="lg"
              radius="lg"
              value={url}
              onValueChange={setUrl}
              onFocusChange={setIsFocused}
              placeholder="Вставьте ссылку на профиль или канал..."
              startContent={
                isLoading 
                  ? <Loader2 className="w-6 h-6 text-sky-500 animate-spin flex-shrink-0" />
                  : <Link2 className="w-6 h-6 text-slate-400 flex-shrink-0" />
              }
              endContent={
                <HeroButton 
                  color="primary" 
                  radius="lg" 
                  className="font-bold shadow-md h-10 md:h-14 px-5 md:px-8 bg-sky-500 hover:bg-sky-400 min-w-fit"
                  isLoading={isCalculating}
                  onPress={handleCheckout}
                >
                  Анализ
                </HeroButton>
              }
              classNames={{
                inputWrapper: "h-14 md:h-16 lg:h-20 bg-white hover:bg-white/90 shadow-xl border border-slate-200 pr-2 pl-4 md:pl-6 focus-within:!border-sky-500 focus-within:!ring-4 focus-within:!ring-sky-500/10 transition-all shadow-slate-200",
                input: "text-base md:text-lg font-medium text-slate-900 placeholder:text-slate-400 !bg-transparent outline-none ml-2",
              }}
            />
          </div>

          {/* Витрина интерфейса (Expandable) */}
          <div className="w-full bg-white/50 border border-white/80 rounded-3xl overflow-hidden shadow-inner">
             {/* НЕТ АНИМАЦИИ СКРЫТИЯ (ПРОСИЛИ ПОКАЗАТЬ КАК МОКАП ДАЖЕ ДО ФОКУСА ИЛИ АКТИВИРОВАТЬ СРАЗУ)
                 Мы будем показывать интерфейс всегда, чтобы работал как красивая витрина */}
             <div className="w-full flex flex-col will-change-transform">
               
               {/* SECTION 1.0: MOBILE SELECTORS (< MD) */}
               <div className="md:hidden flex flex-col gap-3 p-4 bg-slate-50/50 border-b border-slate-200/50">
                 <Select
                   aria-label="Выберите платформу"
                   placeholder="Платформа..."
                   selectedKeys={networkId ? [networkId] : []}
                   onChange={(e) => setNetworkId(e.target.value)}
                   size="lg"
                   variant="faded"
                   radius="lg"
                   scrollShadowProps={{ isEnabled: false }}
                   classNames={{
                     trigger: "bg-white border-slate-200 shadow-sm font-bold text-slate-800 h-14 hover:border-slate-300",
                     value: "text-slate-800 font-bold",
                     popoverContent: "bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl"
                   }}
                 >
                   {catalog.map(n => (
                     <SelectItem key={n.id} value={n.id} textValue={n.name} className="font-medium text-slate-800">
                        <div className="flex items-center gap-3">
                          <Image src={`/assets/logos/${n.slug.toLowerCase()}.svg`} alt={n.name} width={20} height={20} className="w-5 h-5 shrink-0" />
                          <span className="truncate">{n.name}</span>
                        </div>
                     </SelectItem>
                   ))}
                 </Select>
                 
                 {networkId && availableCategories.length > 0 && (
                   <Select
                     aria-label="Выберите категорию"
                     placeholder="Категория..."
                     selectedKeys={categoryId ? [categoryId] : []}
                     onChange={(e) => setCategoryId(e.target.value)}
                     size="lg"
                     variant="faded"
                     radius="lg"
                     scrollShadowProps={{ isEnabled: false }}
                     className="mt-1"
                     classNames={{
                       trigger: "bg-sky-50 border-sky-300 shadow-sm font-bold text-sky-900 h-14 hover:border-sky-400",
                       value: "text-sky-900 font-bold",
                       popoverContent: "bg-white/95 backdrop-blur-xl border border-sky-100 rounded-2xl shadow-xl"
                     }}
                   >
                     {availableCategories.map(c => (
                       <SelectItem key={c.id} value={c.id} textValue={c.name} className="font-medium text-slate-800">
                         <span className="truncate block pr-2">{c.name}</span>
                       </SelectItem>
                     ))}
                   </Select>
                 )}
               </div>

               {/* SECTION 1: NETWORKS (Top Tabs Premium) - Hidden on Mobile */}
               <div className="hidden md:flex bg-slate-50/50 border-b border-slate-200/50 p-4 shrink-0 flex-col gap-4">
                 
                 {/* Top 6 Platforms Row */}
                 <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 items-center lg:justify-center">
                   {topNetworks.map(net => {
                     const slugLower = net.slug.toLowerCase();
                     const iconSrc = `/assets/logos/${slugLower}.svg`;

                     return (
                       <button
                         key={net.id}
                         onClick={(e) => { e.preventDefault(); setNetworkId(net.id); setShowAllNetworks(false); }}
                         className={`group relative flex items-center justify-center gap-3 h-14 rounded-2xl border font-bold text-[15px] transition-all duration-300 origin-center overflow-hidden shrink-0 ${
                           networkId === net.id 
                             ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/10 px-6 scale-[1.02]'
                             : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 min-w-[4rem] px-5 shadow-sm'
                         }`}
                       >
                         {/* Optional background glow on active state */}
                         {networkId === net.id && (
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                         )}
                         <Image 
                           src={iconSrc} 
                           alt={net.name} 
                           width={28} 
                           height={28} 
                           className={`shrink-0 transition-all duration-500 ease-out z-10 ${
                             networkId === net.id 
                              ? 'drop-shadow-[0_2px_4px_rgba(255,255,255,0.4)] scale-110' 
                              : 'opacity-70 grayscale group-hover:grayscale-0 group-hover:scale-105 group-hover:opacity-100'
                           }`} 
                         />
                         {networkId === net.id && (
                           <motion.span
                             initial={{ opacity: 0, x: -10 }}
                             animate={{ opacity: 1, x: 0 }}
                             exit={{ opacity: 0 }}
                             className="z-10 tracking-tight whitespace-nowrap"
                           >
                             {net.name}
                           </motion.span>
                         )}
                       </button>
                     );
                   })}
                   
                   {/* More Button */}
                   {otherNetworks.length > 0 && (
                     <button
                       onClick={(e) => { e.preventDefault(); setShowAllNetworks(!showAllNetworks); }}
                       className={`flex items-center justify-center gap-2 h-14 rounded-2xl border font-bold text-sm transition-all duration-300 shrink-0 px-5 ${
                         showAllNetworks 
                           ? 'bg-sky-100 border-sky-300 text-sky-700 shadow-inner' 
                           : 'bg-slate-100/50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                       }`}
                     >
                       <GripHorizontal className={`w-5 h-5 transition-transform duration-300 ${showAllNetworks ? 'rotate-180' : ''}`} />
                       <span className="hidden sm:inline">{showAllNetworks ? 'Скрыть' : `Ещё ${otherNetworks.length}`}</span>
                     </button>
                   )}
                 </div>

                 {/* Expanded Grid for Other Platforms */}
                 <AnimatePresence>
                   {showAllNetworks && (
                     <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                     >
                        <div className="pt-2 pb-4 px-2 border-t border-slate-200/50">
                          <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Все платформы</h4>
                          <div className="flex flex-wrap gap-2">
                             {otherNetworks.map(net => {
                               const isActive = networkId === net.id;
                               return (
                                 <button
                                   key={net.id}
                                   onClick={(e) => { e.preventDefault(); setNetworkId(net.id); setShowAllNetworks(false); }}
                                   className={`flex items-center gap-2 h-10 px-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                                     isActive 
                                       ? 'bg-slate-800 border-slate-800 text-white shadow-md' 
                                       : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 shadow-sm'
                                   }`}
                                 >
                                    {net.icon && (
                                      <Image 
                                        src={net.icon} 
                                        alt={net.name} 
                                        width={18} 
                                        height={18} 
                                        className={`shrink-0 transition-opacity ${isActive ? 'opacity-100 brightness-0 invert' : 'opacity-60 saturate-0'}`} 
                                      />
                                    )}
                                    {net.name}
                                 </button>
                               );
                             })}
                          </div>
                        </div>
                     </motion.div>
                   )}
                 </AnimatePresence>

               </div>

               {/* SECTION 2: COLUMNS (Categories & Services) */}
               <div className="flex flex-col lg:grid lg:grid-cols-[240px_1fr] flex-1">
                 
                 {/* 2.1 Left Column: Categories (Tablet Horizontal / Desktop Vertical) */}
                 <div className="hidden md:flex lg:flex-col flex-row border-b lg:border-b-0 lg:border-r border-slate-200/50 p-4 gap-2 overflow-x-auto lg:overflow-y-auto max-h-[auto] lg:max-h-[500px] scrollbar-hide bg-slate-50/30 shrink-0 lg:min-w-[240px] items-center lg:items-stretch">
                    {availableCategories.map(cat => (
                      <button
                        key={cat.id}
                        onMouseDown={(e) => { e.preventDefault(); setCategoryId(cat.id); }}
                        className={`text-left px-5 py-2.5 lg:py-3.5 rounded-full lg:rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap shrink-0 group flex items-center justify-between ${
                          categoryId === cat.id 
                            ? 'bg-sky-100 text-sky-700 border border-sky-300 shadow-sm lg:shadow-[inset_4px_0_0_0] lg:shadow-sky-500 lg:bg-sky-100/50 lg:border-sky-200'
                            : 'bg-white lg:bg-transparent text-slate-600 border border-slate-200 lg:border-transparent hover:bg-slate-100/50'
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        <ChevronRight className={`hidden lg:block w-4 h-4 transition-transform duration-200 ${categoryId === cat.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0'}`} />
                      </button>
                    ))}
                    {availableCategories.length === 0 && (
                      <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-200 rounded-xl">
                        <p className="text-xs text-slate-400 font-medium">Нет категорий</p>
                      </div>
                    )}
                 </div>

                  {/* 2.2 Right Column: Services Container */}
                  <div className="p-4 md:p-6 lg:p-8 bg-transparent relative overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                      <h3 className="font-extrabold text-slate-900 flex items-center gap-3 text-base md:text-lg">
                         Выберите тариф <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full">{services.length}</span>
                      </h3>
                      
                      <div className="hidden lg:flex gap-2">
                         <button onClick={scrollLeft} className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
                         <button onClick={scrollRight} className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
                      </div>
                    </div>

                    {isLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:gap-4 lg:overflow-hidden gap-4">
                         {[1,2,3,4].map(i => <div key={i} className="min-h-[200px] lg:min-w-[260px] bg-slate-200/50 animate-pulse rounded-2xl" />)}
                      </div>
                    ) : services.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-sm text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl min-h-[200px]">
                        Услуги не найдены
                      </div>
                    ) : (
                      <div ref={carouselRef} className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:gap-5 lg:overflow-x-auto pb-6 scrollbar-hide lg:snap-x pt-2 lg:px-2 lg:-mx-2 gap-4">
                         {services.map(srv => {
                           const isSelected = selectedService?.id === srv.id;
                           return (
                             <div 
                               key={srv.id}
                               onClick={() => setSelectedService(srv)}
                               className={`lg:snap-start cursor-pointer w-full lg:min-w-[260px] lg:max-w-[280px] flex flex-col p-4 md:p-5 rounded-2xl border-2 transition-all duration-300 relative bg-white shadow-sm hover:shadow-md ${
                                 isSelected ? 'border-sky-500 shadow-lg shadow-sky-500/10 scale-[1.02] z-10' : 'border-slate-100 hover:border-slate-300'
                               }`}
                             >
                               {srv.badge && (
                                 <div className="absolute -top-3 -right-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-full shadow-md">
                                   {srv.badge}
                                 </div>
                               )}
                               
                               <div className="flex-1">
                                 <h4 className="font-extrabold text-sm leading-tight text-slate-900 mb-2.5">{srv.name}</h4>
                                 <p className="text-[11px] text-slate-500 mb-4 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-3">
                                   {srv.description || "Стандартные условия сервиса. 30 дней гарантии на списания."}
                                 </p>
                                 <p className="text-xs text-slate-500 font-semibold flex items-center justify-between">
                                   <span>Запуск: <span className="text-slate-900">{srv.speed}</span></span>
                                   <span>Мин: <span className="text-slate-900">{srv.minQty}</span></span>
                                 </p>
                               </div>
                               <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-end">
                                 <div>
                                   <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Цена за 1 шт.</p>
                                   <p className="text-xl font-black text-slate-900 tabular-nums leading-none">
                                       {parseFloat(((srv.pricePer1kRub / 1000) < 0.1 ? (srv.pricePer1kRub / 1000).toFixed(4) : (srv.pricePer1kRub / 1000).toFixed(2))).toString()} ₽
                                   </p>
                                 </div>
                                 <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                                   isSelected ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-200 text-transparent'
                                 }`}>
                                   <CheckCircle2 className="w-4 h-4" />
                                 </div>
                               </div>
                            </div>
                          );
                        })}
                     </div>
                   )}
                 </div>
               </div>

               {/* SECTION 3: DYNAMIC PAYLOAD & WARNINGS */}
                {(() => {
                  const sName = selectedService?.name.toLowerCase() || "";
                  const isCustomComments = sName.includes('свои') || sName.includes('свой текст');
                  const isKeywords = sName.includes('ключево');
                  const isPoll = sName.includes('опрос') || sName.includes('голосование');
                  const isLiveStream = sName.includes('зрител') || sName.includes('эфир') || sName.includes('трансляц');
                  const isPrivateChannel = sName.includes('закрыт');
                  const customFieldLabel = isCustomComments ? 'Ваши комментарии (по одному в строке)' 
                    : isKeywords ? 'Ключевые слова (через запятую)' 
                    : isPoll ? 'Номер варианта ответа' 
                    : null;

                  if (!customFieldLabel && !isLiveStream && !isPrivateChannel) return null;

                  return (
                    <div className="bg-slate-50/50 border-t border-slate-200/50 p-6 md:px-8 flex flex-col gap-4">
                      {isLiveStream && (
                         <div className="w-full bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 flex items-start gap-3">
                           <Zap className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                           <div className="text-sm">
                             <p className="font-bold">Внимание: Заказ на Прямой Эфир!</p>
                             <p className="mt-1 opacity-90">Услуга для запущенной трансляции. Если стрим прервется, гарантия сгорает!</p>
                           </div>
                         </div>
                      )}

                      {isPrivateChannel && (
                         <div className="w-full bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4 flex items-start gap-3">
                           <Zap className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                           <div className="text-sm">
                             <p className="font-bold">Требуется приватная ссылка</p>
                             <p className="mt-1 opacity-90">Используйте ссылку-приглашение (напр. t.me/+AbcDeF). Иначе заказ будет отменен.</p>
                           </div>
                         </div>
                      )}

                      {customFieldLabel && (
                        <div className="w-full space-y-2 mt-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">{customFieldLabel}</label>
                          {isCustomComments ? (
                            <textarea 
                              value={customData} 
                              onChange={e => setCustomData(e.target.value)} 
                              placeholder="Каждая строка - новый комментарий..."
                              className="w-full min-h-[100px] p-4 rounded-xl border border-slate-200 bg-white text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all resize-y shadow-sm"
                            />
                          ) : (
                            <input 
                              type="text" 
                              value={customData} 
                              onChange={e => setCustomData(e.target.value)} 
                              placeholder={isPoll ? "Например: 2" : "Слова через запятую..."}
                              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all shadow-sm"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

               {/* SECTION 4: BOTTOM CHECKOUT AREA */}
               <div className="bg-white border-t border-slate-200/50 p-6 md:p-8 flex flex-col items-end gap-6">
                 {/* Top row with inputs */}
                 <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Email для чека</label>
                       <div className="relative">
                         <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                         <input 
                           type="email" 
                           value={email} 
                           onChange={e => setEmail(e.target.value)} 
                           placeholder="you@example.com"
                           className="w-full h-14 pl-12 pr-4 rounded-xl border border-slate-200 bg-slate-50 shadow-inner text-sm focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                         />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Количество</label>
                       <input 
                         type="number" 
                         value={quantity} 
                         min={selectedService?.minQty || 10}
                         onChange={e => setQuantity(Number(e.target.value))} 
                         className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-slate-50 shadow-inner text-lg font-bold tabular-nums text-slate-900 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                       />
                    </div>
                 </div>

                 {/* Bottom row with price and button */}
                 <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6 pt-4 border-t border-slate-100">
                    {/* Legal Consent inline with checkout */}
                    <div className="flex items-center gap-3 order-2 md:order-1">
                      <button onClick={() => setAgreedToTerms(!agreedToTerms)} className="text-sky-500 focus:outline-none shrink-0 border border-slate-200 rounded p-1 hover:bg-slate-50">
                          {agreedToTerms ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-300" />}
                      </button>
                      <p className="text-sm text-slate-500 font-medium">
                        Согласен с <Link href="/p/offer" className="underline hover:text-slate-900">офертой</Link>
                      </p>
                    </div>

                    <div className="flex items-center gap-6 w-full md:w-auto order-1 md:order-2 justify-between md:justify-end">
                       <div className="text-right">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Итого к оплате</p>
                          <div className="flex items-center justify-end gap-2">
                            {isCalculating ? (
                               <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                            ) : (
                               <p className="text-4xl font-black text-slate-900 tabular-nums leading-none tracking-tight">{totalPriceFormatted.replace('₽', '')} <span className="text-2xl text-sky-500">₽</span></p>
                            )}
                          </div>
                       </div>
                       <button 
                          onClick={handleCheckout}
                          disabled={!selectedService || !url || quantity < (selectedService?.minQty || 1) || isSubmitting || !agreedToTerms || (
                            (selectedService.name.toLowerCase().includes('опрос') || 
                             selectedService.name.toLowerCase().includes('свои') || 
                             selectedService.name.toLowerCase().includes('свой текст') || 
                             selectedService.name.toLowerCase().includes('ключево')) && !customData.trim()
                          )}
                          className="h-16 px-10 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg shadow-xl shadow-slate-900/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[180px] group"
                       >
                          {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                            <span className="flex items-center gap-2">Оплатить <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
                          )}
                       </button>
                    </div>
                 </div>
               </div>
             </div>
          </div>
        </div>
        
      </main>

      {/* Trust and WhyUs optional wrappers (keeping them clean) */}
      <div className="relative z-10 -mt-10 mb-20">
        <TrustBar />
      </div>
      
      {/* ── Секция 3: Подвал "Premium Trust" (Mega-Footer) ── */}
      <footer className="bg-zinc-950 text-zinc-400 pt-20 pb-10 rounded-t-[3rem] mt-auto">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          
          {/* Column 1: Brand & Payments */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tight">Smmplan</span>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
              Профессиональная платформа для продвижения. Работаем официально, чеки отправляются автоматически.
            </p>
            <div className="pt-4 flex gap-3 text-zinc-600">
               <CreditCard className="w-8 h-8" />
               <Shield className="w-8 h-8" />
            </div>
            <p className="text-[10px] text-zinc-600 max-w-xs leading-relaxed">
              * Сервисы Instagram и Facebook принадлежат компании Meta, признанной экстремистской организацией и запрещенной в РФ.
            </p>
          </div>

          {/* Column 2: Legal Links */}
          <div className="space-y-6 md:pl-10">
            <h4 className="text-white font-bold tracking-wide">Документы</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="/p/offer" className="hover:text-white transition-colors">Публичная оферта</Link></li>
              <li><Link href="/p/privacy" className="hover:text-white transition-colors">Политика конфиденциальности</Link></li>
              <li><Link href="/p/refund" className="hover:text-white transition-colors">Правила возврата средств</Link></li>
              <li><Link href="/p/terms" className="hover:text-white transition-colors">Правила использования</Link></li>
            </ul>
          </div>

          {/* Column 3: Contact & Support */}
          <div className="space-y-6">
            <h4 className="text-white font-bold tracking-wide">Нужна помощь?</h4>
            <p className="text-sm">Служба поддержки работает 24/7. Время ответа до 15 минут.</p>
            <Link 
              href="/dashboard/tickets"
              className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-sky-500/10 text-sky-400 font-bold text-sm border border-sky-500/20 hover:bg-sky-500 hover:text-white transition-all w-full sm:w-auto"
            >
              Задать вопрос
            </Link>
            <div className="pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500">ИНН: 123456789012 • ОГРНИП: 123456789012345</p>
              <p className="text-xs text-zinc-500 mt-1">support@smmplan.ru</p>
            </div>
          </div>

        </div>

        <div className="max-w-6xl mx-auto px-6 border-t border-zinc-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-zinc-600">
          <p>© {new Date().getFullYear()} Smmplan Lite. Все права защищены.</p>
          <p>Made with ❤️ in CIS</p>
        </div>
      </footer>
    </div>
  );
}
