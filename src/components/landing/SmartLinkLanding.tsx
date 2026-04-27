"use client";

import { useOrderEngine } from "@/hooks/useOrderEngine";
import { PublicNetwork } from "@/actions/order/catalog";
import { checkoutAction } from "@/actions/order/checkout";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Zap, CheckCircle2, Loader2, Link2, LogIn, ChevronRight, ChevronLeft, CheckSquare, Square, Shield, CreditCard, Mail, GripHorizontal, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import React, { useState, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { TrustBar } from "./TrustBar";
import { WhyUs } from "./WhyUs";
import { FAQ } from "./FAQ";
import { Reviews } from "./Reviews";
import { SocialIcon } from "@/components/ui/SocialIcon";

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
  const { scrollY } = useScroll();
  const skyY = useTransform(scrollY, [0, 1000], [0, 250]);
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
      
      {/* ── Abstract Soft Background (Instead of 3D Scene) ── */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-sky-50 to-slate-50 pointer-events-none z-0 select-none overflow-hidden" />
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[600px] bg-blue-100/50 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[500px] bg-sky-100/40 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* ── Секция 1: Шапка (Light Fintech) ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 shadow-[0_4px_30px_rgba(0,0,0,0.02)] transition-all">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100 shadow-[0_2px_10px_rgba(14,165,233,0.1)]">
              <Zap className="w-4 h-4 text-sky-500 fill-current" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-800 hidden sm:block">Smmplan</span>
          </Link>

          <nav className="hidden md:flex gap-8 text-sm font-bold text-slate-600">
            <Link href="/" className="hover:text-sky-600 transition-colors">Услуги</Link>
            <Link href="/dashboard/tickets" className="hover:text-sky-600 transition-colors">Поддержка</Link>
            <Link href="/p/faq" className="hover:text-sky-600 transition-colors">FAQ</Link>
          </nav>

          <Link
            href="/login"
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-100 text-slate-800 text-sm font-bold border border-slate-200 hover:bg-slate-200 transition-all duration-300"
          >
            <LogIn className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Войти</span>
          </Link>
        </div>
      </header>

      {/* ── Секция 2: Hero Блок (App Style) ── */}
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-2 sm:px-4 md:px-6 py-12 md:py-20 pb-40 flex flex-col items-center relative z-10">

        <motion.div 
          initial={{ opacity: 0.0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.1,
            duration: 0.8,
            ease: "easeOut",
          }}
          className="text-center space-y-6 mb-16 max-w-3xl relative z-10 w-full mt-4"
        >
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
            Ускоряем ваши <span className="text-sky-500">соцсети</span>
          </h1>
          <p className="text-xl text-slate-500 leading-relaxed font-medium">
            Smmplan — автоматическая платформа премиум-класса.
          </p>
        </motion.div>

        {/* ── Main Input & UI Panel ── */}
        <div className="w-full max-w-[98%] xl:max-w-[1600px] mx-auto bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.08)] ring-1 ring-slate-100 rounded-[2.5rem] p-4 sm:p-6 lg:p-8 pt-8 relative overflow-hidden">
          
          {/* Smart Input (Massive Pill) */}
          <div className="w-full max-w-4xl mx-auto relative z-20 mb-10 mt-4">
            <div className="relative flex items-center w-full bg-white rounded-full p-2 sm:p-3 border-2 border-slate-100 transition-all shadow-[0_8px_30px_-10px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.08)] focus-within:border-sky-300 focus-within:shadow-[0_12px_50px_-12px_rgba(14,165,233,0.25)] h-20 md:h-24">
              <div className="pl-6 sm:pl-8 pr-3 flex-shrink-0">
                   {isLoading 
                     ? <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-sky-500 animate-spin" />
                     : <Link2 className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                   }
              </div>
              <input
                id="landing-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={(e) => {
                  setTimeout(() => setIsFocused(false), 200);
                }}
                placeholder="Вставьте ссылку на профиль или пост..."
                className="flex-1 bg-transparent border-none outline-none text-lg sm:text-2xl font-semibold text-slate-800 placeholder:text-slate-400 px-2 sm:px-4 h-full w-full"
              />
              <Button 
                onClick={handleCheckout}
                disabled={isCalculating}
                className="h-full rounded-full px-8 md:px-12 bg-sky-500 hover:bg-sky-600 text-white font-bold text-lg md:text-xl shadow-lg shadow-sky-500/30 transition-all hover:scale-[1.02] active:scale-95"
              >
                {isCalculating ? <Loader2 className="w-6 h-6 animate-spin" /> : "Начать"}
              </Button>
            </div>
          </div>

          {/* Витрина интерфейса */}
          <div className="w-full bg-white rounded-3xl overflow-hidden mt-6">
             {/* НЕТ АНИМАЦИИ СКРЫТИЯ (ПРОСИЛИ ПОКАЗАТЬ КАК МОКАП ДАЖЕ ДО ФОКУСА ИЛИ АКТИВИРОВАТЬ СРАЗУ)
                 Мы будем показывать интерфейс всегда, чтобы работал как красивая витрина */}
             <div className="w-full flex flex-col will-change-transform">
               
               {/* SECTION 1.0: MOBILE SELECTORS (< MD) */}
               <div className="md:hidden flex flex-col gap-3 p-4 bg-muted border-b border-border">
                 <select
                   aria-label="Выберите платформу"
                   value={networkId || ""}
                   onChange={(e) => setNetworkId(e.target.value)}
                   className="w-full h-14 px-4 bg-background border border-border shadow-sm font-bold text-foreground rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none outline-none"
                 >
                   <option value="" disabled>Платформа...</option>
                   {catalog.map(n => (
                     <option key={n.id} value={n.id}>{n.name}</option>
                   ))}
                 </select>
                 
                 {networkId && availableCategories.length > 0 && (
                   <select
                     aria-label="Выберите категорию"
                     value={categoryId || ""}
                     onChange={(e) => setCategoryId(e.target.value)}
                     className="w-full h-14 px-4 bg-primary/5 border border-primary/20 shadow-sm font-bold text-primary rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none outline-none mt-1"
                   >
                     <option value="" disabled>Категория...</option>
                     {availableCategories.map(c => (
                       <option key={c.id} value={c.id}>{c.name}</option>
                     ))}
                   </select>
                 )}
               </div>

               {/* SECTION 1: NETWORKS (Top Tabs Premium) - Hidden on Mobile */}
               <div className="hidden md:flex bg-slate-50 border-b border-slate-100 p-4 shrink-0 flex-col gap-4">
                 
                 {/* Top 6 Platforms Row — Active shows name, inactive icon-only */}
                 <div className="flex flex-wrap gap-2 py-2 items-center justify-center">
                   {topNetworks.map(net => {
                     const slugLower = net.slug.toLowerCase();
                     const isActive = networkId === net.id;

                     return (
                       <button
                         key={net.id}
                         onClick={(e) => { e.preventDefault(); setNetworkId(net.id); setShowAllNetworks(false); }}
                         title={net.name}
                         className={`group relative flex items-center justify-center gap-2.5 rounded-full font-bold text-[15px] origin-center shrink-0 transition-all duration-300 ${
                           isActive 
                             ? 'bg-sky-500 text-white shadow-[0_8px_24px_-6px_rgba(14,165,233,0.5)] h-12 md:h-14 px-5 md:px-6 scale-[1.02]'
                             : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:shadow-md hover:text-slate-800 w-12 h-12 md:w-14 md:h-14 shadow-sm'
                         }`}
                       >
                         <SocialIcon 
                           slug={net.slug} 
                           size={24}
                           className={`shrink-0 z-10 transition-all duration-300 ${
                             isActive 
                              ? 'drop-shadow-sm scale-110 brightness-0 invert' 
                              : 'grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100'
                           }`} 
                         />
                         {isActive && (
                           <span className="z-10 tracking-tight whitespace-nowrap">
                             {net.name}
                           </span>
                         )}
                       </button>
                     );
                   })}
                   
                   {/* More Button */}
                   {otherNetworks.length > 0 && (
                     <button
                       onClick={(e) => { e.preventDefault(); setShowAllNetworks(!showAllNetworks); }}
                       title={showAllNetworks ? 'Скрыть' : `Ещё ${otherNetworks.length} платформ`}
                       className={`flex items-center justify-center gap-2 h-12 md:h-14 rounded-full font-bold text-sm transition-all duration-300 shrink-0 ${
                         showAllNetworks 
                           ? 'bg-sky-100 text-sky-700 shadow-inner px-5' 
                           : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:shadow-md hover:text-slate-800 w-12 md:w-14 shadow-sm'
                       }`}
                     >
                       <GripHorizontal className={`w-6 h-6 transition-transform duration-300 ${showAllNetworks ? 'rotate-180' : ''}`} />
                       {showAllNetworks && <span>Скрыть</span>}
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
                        <div className="pt-2 pb-4 px-2 border-t border-border/50">
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
                                       ? 'bg-white border-sky-400 text-slate-900 shadow-md ring-1 ring-sky-400/50 scale-105' 
                                       : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 shadow-sm hover:text-slate-900'
                                   }`}
                                 >
                                    <SocialIcon 
                                      slug={net.slug} 
                                      size={18}
                                      className={`shrink-0 transition-all duration-300 ${isActive ? 'drop-shadow-sm scale-110' : 'grayscale opacity-50 hover:grayscale-0 hover:opacity-100'}`} 
                                    />
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

               {/* SECTION 2: COLUMNS (Categories & Services) — HARD BOUNDARY */}
               <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] min-h-[400px] border-b border-border/50">
                 
                {/* 2.1 Left Column: Categories (Tablet Horizontal / Desktop Vertical) */}
                 <div className="hidden md:flex lg:flex-col flex-row flex-wrap lg:flex-nowrap lg:border-r border-slate-100 p-4 lg:p-6 gap-3 bg-slate-50/50 shrink-0 lg:min-w-[320px] items-center lg:items-stretch">
                    {availableCategories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={(e) => { e.preventDefault(); setCategoryId(cat.id); }}
                        className={`text-left px-5 py-3 lg:py-4 rounded-full lg:rounded-[1.5rem] text-[15px] font-bold transition-all duration-200 whitespace-nowrap lg:whitespace-normal shrink-0 lg:shrink group flex items-center justify-between active:scale-95 ${
                          categoryId === cat.id 
                            ? 'bg-white text-sky-600 shadow-[0_8px_30px_-6px_rgba(0,0,0,0.08)] ring-1 ring-slate-100 scale-[1.02]'
                            : 'bg-transparent text-slate-500 hover:bg-slate-100/80 hover:text-slate-800'
                        }`}
                      >
                        <span>{cat.name}</span>
                        {categoryId === cat.id && <ChevronRight className="hidden lg:block w-5 h-5 opacity-100 translate-x-0" />}
                      </button>
                    ))}
                    {availableCategories.length === 0 && (
                      <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-border rounded-xl">
                        <p className="text-xs text-slate-400 font-medium">Нет категорий</p>
                      </div>
                    )}
                 </div>

                  {/* 2.2 Right Column: Services Container */}
                  <div className="p-4 md:p-6 lg:p-8 bg-white relative flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
                      <h3 className="font-extrabold text-slate-900 text-xl md:text-2xl flex items-center gap-3">
                         Выберите тариф <span className="text-sm font-bold bg-sky-100/50 text-sky-600 px-3 py-1 rounded-full">{services.length}</span>
                      </h3>
                    </div>

                    <>
                      {services.length === 0 && isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                           {[1,2,3,4,5,6].map(i => <div key={i} className="min-h-[220px] w-full bg-slate-50 border border-slate-100 shadow-sm animate-pulse rounded-[2rem]" />)}
                        </div>
                      ) : services.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-sm font-medium text-slate-400 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-[2rem] min-h-[220px]">
                          Услуги не найдены
                        </div>
                      ) : (
                        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5 pb-8 pt-4 transition-opacity duration-200 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                           {services.map((srv) => {
                             const isSelected = selectedService?.id === srv.id;
                             return (
                               <Card 
                                 key={srv.id}
                                 onClick={() => setSelectedService(srv)}
                                 className={`cursor-pointer w-full flex flex-col p-5 md:p-6 border-2 rounded-[2rem] relative overflow-visible transition-all duration-300 ${
                                   isSelected ? 'border-sky-400 shadow-[0_12px_40px_-10px_rgba(14,165,233,0.3)] bg-white z-10 scale-[1.02]' : 'border-slate-100 bg-white hover:border-sky-200 hover:shadow-lg shadow-sm'
                                 }`}
                               >
                                 {srv.badge && (
                                   <Badge intent="primary" className="absolute -top-3 -right-2 z-20 text-[10px] shadow-sm tracking-wide">
                                     {srv.badge}
                                   </Badge>
                                 )}
                                 
                                 <div className="flex-1 flex flex-col pt-1">
                                    <h4 className="font-extrabold text-[16px] leading-[22px] text-slate-900 mb-4 line-clamp-3 min-h-[66px]">{srv.name}</h4>
                                    <div className="flex-1 mb-5 flex flex-col">
                                      <p className="flex-1 text-[13px] text-slate-500 font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 overflow-hidden">
                                        <span className="line-clamp-4">
                                          {srv.description || (srv.name.toLowerCase().includes('без гарант') 
                                            ? "Услуга без гарантии. В случае отписок или списаний восстановление (докрутка) не производится." 
                                            : "Стандартные условия сервиса. 30 дней гарантии на списания.")}
                                        </span>
                                      </p>
                                    </div>
                                    <p className="text-xs text-slate-400 font-bold flex items-center justify-between mt-auto px-1">
                                      <span>Запуск: <span className="text-slate-700">{srv.speed}</span></span>
                                      <span>Мин: <span className="text-slate-700">{srv.minQty}</span></span>
                                    </p>
                                 </div>
                                 <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-end px-1">
                                   <div>
                                     <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Цена за 1 шт.</p>
                                     <p className="text-2xl font-black text-slate-900 tabular-nums leading-none">
                                         {parseFloat(((srv.pricePer1kRub / 1000) < 0.1 ? (srv.pricePer1kRub / 1000).toFixed(4) : (srv.pricePer1kRub / 1000).toFixed(2))).toString()} ₽
                                     </p>
                                   </div>
                                   <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                                     isSelected ? 'border-sky-500 bg-primary text-white' : 'border-border text-transparent'
                                   }`}>
                                     <CheckCircle2 className="w-4 h-4" />
                                   </div>
                                 </div>
                               </Card>
                             );
                           })}
                        </div>
                      )}
                    </>
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
                      <div className="bg-background/50 p-6 md:px-8 flex flex-col gap-4">
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
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">{customFieldLabel}</label>
                          {isCustomComments ? (
                            <textarea 
                              value={customData} 
                              onChange={e => setCustomData(e.target.value)} 
                              placeholder="Каждая строка - новый комментарий..."
                              className="w-full min-h-[100px] p-4 rounded-xl border border-border bg-card text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all resize-y shadow-sm"
                            />
                          ) : (
                            <input 
                              type="text" 
                              value={customData} 
                              onChange={e => setCustomData(e.target.value)} 
                              placeholder={isPoll ? "Например: 2" : "Слова через запятую..."}
                              className="w-full h-12 px-4 rounded-xl border border-border bg-card text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all shadow-sm"
                            />
                          )}
                        </div>
                      )}
                      </div>
                  );
                })()}

               {/* SECTION 4: BOTTOM CHECKOUT AREA */}
               <div className="bg-slate-50 border-t border-slate-100 p-6 md:p-8 lg:p-10 flex flex-col gap-8 rounded-b-[2.5rem]">
                 {/* Top row with inputs */}
                 <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">Email для чека</label>
                       <div className="relative">
                         <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                         <input 
                           type="email" 
                           value={email} 
                           onChange={e => setEmail(e.target.value)} 
                           placeholder="you@example.com"
                           className="w-full h-16 pl-14 pr-6 rounded-full border-2 border-slate-200 bg-white shadow-sm text-[15px] font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-sky-400 focus:shadow-[0_8px_20px_-6px_rgba(14,165,233,0.2)] outline-none transition-all"
                         />
                       </div>
                    </div>
                    <div className="space-y-3">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">Количество</label>
                       <input 
                         type="number" 
                         value={quantity} 
                         min={selectedService?.minQty || 10}
                         onChange={e => setQuantity(Number(e.target.value))} 
                         className="w-full h-16 px-6 rounded-full border-2 border-slate-200 bg-white shadow-sm text-xl font-black tabular-nums text-slate-800 focus:bg-white focus:border-sky-400 focus:shadow-[0_8px_20px_-6px_rgba(14,165,233,0.2)] outline-none transition-all"
                       />
                    </div>
                 </div>

                 {/* Bottom row with price and button */}
                 <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-slate-200">
                    {/* Legal Consent inline with checkout */}
                    <div className="flex items-center gap-3 order-2 md:order-1">
                      <button onClick={() => setAgreedToTerms(!agreedToTerms)} className="text-sky-500 focus:outline-none shrink-0 rounded hover:scale-105 transition-transform">
                          {agreedToTerms ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6 text-slate-300" />}
                      </button>
                      <p className="text-[14px] text-slate-500 font-medium">
                        Согласен с <Link href="/p/offer" className="underline text-slate-700 hover:text-sky-600">офертой</Link>
                      </p>
                    </div>

                    <div className="flex items-center gap-8 w-full md:w-auto order-1 md:order-2 justify-between md:justify-end">
                       <div className="text-right flex-shrink-0">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Итого к оплате</p>
                          <div className="flex items-center justify-end gap-2 min-h-[40px]">
                            {isCalculating ? (
                               <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
                            ) : (
                               <p className="text-4xl md:text-5xl font-black text-slate-900 tabular-nums leading-none tracking-tight">{totalPriceFormatted.replace('₽', '')} <span className="text-2xl md:text-3xl text-sky-500">₽</span></p>
                            )}
                          </div>
                       </div>
                       <Button 
                          onClick={handleCheckout}
                          disabled={!selectedService || !url || quantity < (selectedService?.minQty || 1) || isSubmitting || !agreedToTerms || (
                            (selectedService.name.toLowerCase().includes('опрос') || 
                             selectedService.name.toLowerCase().includes('свои') || 
                             selectedService.name.toLowerCase().includes('свой текст') || 
                             selectedService.name.toLowerCase().includes('ключево')) && !customData.trim()
                          )}
                          className={`min-w-[200px] h-16 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center gap-2 group ${
                             agreedToTerms && selectedService ? 'hover:scale-[1.03] active:scale-95' : 'opacity-60 grayscale'
                          }`}
                       >
                          {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                            <>Оплатить <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" /></>
                          )}
                       </Button>
                    </div>
                 </div>
               </div>
             </div>
          </div>
        </div>
        
      </main>

      {/* Trust and WhyUs wrappers */}
      <div className="relative z-10 -mt-10 bg-white">
        <TrustBar />
        <WhyUs />
        <Reviews />
        <FAQ />
      </div>
      
      {/* ── Секция 3: Подвал "Premium Trust" (Mega-Footer) ── */}
      <footer className="bg-slate-900 text-slate-400 pt-20 pb-10 rounded-t-[3rem] mt-auto relative overflow-hidden">
        {/* Glow effect for footer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-sky-900/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          
          {/* Column 1: Brand & Payments */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 bg-card/10 rounded-xl flex items-center justify-center">
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
              className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-primary/10 text-sky-400 font-bold text-sm border border-sky-500/20 hover:bg-primary hover:text-white transition-all w-full sm:w-auto"
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
