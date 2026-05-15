"use client";

import { useOrderEngine } from "@/hooks/useOrderEngine";
import { PublicNetwork } from "@/actions/order/catalog";
import { checkoutAction } from "@/actions/order/checkout";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Zap, Check, CheckCircle2, Loader2, Link2, LogIn, ChevronRight, ChevronLeft, CheckSquare, Square, Shield, CreditCard, Mail, GripHorizontal, X, ChevronDown, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import React, { useState, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { TrustBar } from "./TrustBar";
import { WhyUs } from "./WhyUs";
import { FAQ } from "./FAQ";
import { Reviews } from "./Reviews";
import { LinkModal } from "./order-engine/LinkModal";
import { EmailModal } from "./order-engine/EmailModal";
import { StickyCheckoutBar } from "./order-engine/StickyCheckoutBar";
import { NetworkSelector } from "./order-engine/NetworkSelector";
import { CategorySidebar } from "./order-engine/CategorySidebar";
import { ServiceGrid } from "./order-engine/ServiceGrid";
import { MobileSelectors } from "./order-engine/MobileSelectors";
import { useCheckoutOrchestrator } from "./order-engine/useCheckoutOrchestrator";
import { HeroInput } from "./order-engine/HeroInput";
import { DynamicPayloadWarnings } from "./order-engine/DynamicPayloadWarnings";
import { BottomCheckout } from "./order-engine/BottomCheckout";
import { MegaFooter } from "./MegaFooter";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { CategoryIcon, cleanCategoryName } from "@/components/ui/CategoryIcon";
import { IconClock, IconBox } from "@tabler/icons-react";

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

  const {
    isSubmitting,
    showEmailModal, setShowEmailModal,
    showLinkModal, setShowLinkModal,
    linkHasError, setLinkHasError,
    handleCheckout
  } = useCheckoutOrchestrator({ engine });


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col relative overflow-x-clip">
      
      {/* ── Abstract Soft Background (Instead of 3D Scene) ── */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-primary/5 to-slate-50 pointer-events-none z-0 select-none overflow-hidden" />
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[500px] bg-primary/8 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* ── Секция 1: Шапка (Light Fintech) ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 shadow-[0_4px_30px_rgba(0,0,0,0.02)] transition-all">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-[0_2px_10px] shadow-primary/10">
              <Zap className="w-4 h-4 text-primary fill-current" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-800 hidden sm:block">Smmplan</span>
          </Link>

          <nav className="hidden md:flex gap-8 text-sm font-bold text-slate-600">
            <Link href="/" className="hover:text-primary transition-colors">Услуги</Link>
            <Link href="/dashboard/tickets" className="hover:text-primary transition-colors">Поддержка</Link>
            <Link href="/p/faq" className="hover:text-primary transition-colors">FAQ</Link>
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
          className="text-center space-y-5 mb-10 max-w-3xl relative z-10 w-full mt-0"
        >
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
            Ускоряем ваши <span className="text-primary">соцсети</span>
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed font-medium max-w-xl mx-auto">
            Автоматическая платформа для продвижения в социальных сетях с мгновенным запуском.
          </p>
          {/* Social Proof Stats */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 pt-2">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">15+</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Платформ</p>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">300+</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Услуг</p>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-black text-primary tabular-nums">24/7</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Поддержка</p>
            </div>
          </div>
        </motion.div>

        {/* ── Main Input & UI Panel ── */}
        <div className="w-full max-w-[98%] xl:max-w-[1600px] mx-auto bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.08)] ring-1 ring-slate-100 rounded-[2.5rem] p-4 sm:p-6 lg:p-8 pt-8 relative">
          
          {/* Smart Input (Massive Pill) */}
          <HeroInput 
            engine={engine} 
            handleCheckout={handleCheckout} 
            linkHasError={linkHasError} 
            setLinkHasError={setLinkHasError} 
          />

          {/* Витрина интерфейса */}
          <div className="w-full bg-white rounded-3xl overflow-hidden mt-6">
             {/* НЕТ АНИМАЦИИ СКРЫТИЯ (ПРОСИЛИ ПОКАЗАТЬ КАК МОКАП ДАЖЕ ДО ФОКУСА ИЛИ АКТИВИРОВАТЬ СРАЗУ)
                 Мы будем показывать интерфейс всегда, чтобы работал как красивая витрина */}
             <div className="w-full flex flex-col will-change-transform">
               
               {/* SECTION 1.0: MOBILE SELECTORS (< MD) */}
               <MobileSelectors engine={engine} />

               {/* SECTION 1: NETWORKS (Top Tabs Premium) - Hidden on Mobile */}
               <NetworkSelector engine={engine} />

               {/* SECTION 2: COLUMNS (Categories & Services & Checkout) — HARD BOUNDARY */}
               <div className="flex flex-col lg:flex-row min-h-[400px] border-b border-border/50 relative items-start">
                 
                 {/* 2.1 Left Column: Categories (Tablet Horizontal / Desktop Vertical) */}
                 <CategorySidebar engine={engine} />

                  {/* MIDDLE WRAPPER */}
                  <div className="flex flex-col flex-1 min-w-0 border-r border-slate-100 pb-12 lg:pb-0">
                    {/* 2.2 Center Column: Services Container */}
                    <div className="p-4 md:p-6 lg:p-8 bg-white relative flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
                      <h3 className="font-extrabold text-slate-900 text-xl md:text-2xl flex items-center gap-3">
                         Выберите тариф {services.length > 0 && <span className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">{services.length}</span>}
                      </h3>
                    </div>

                    <>
                      {services.length === 0 && isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8 pt-4">
                           {Array.from({length: 8}).map((_, i) => (
                             <div key={i} className="w-full flex flex-col p-5 md:p-6 min-h-[400px] bg-slate-50 border border-slate-100 shadow-sm animate-pulse rounded-[2rem]" />
                           ))}
                        </div>
                      ) : services.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-slate-200 bg-gradient-to-b from-slate-50/80 to-white rounded-[2rem] min-h-[320px] p-8">
                          <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center">
                            <IconBox className="w-8 h-8 text-primary/60" />
                          </div>
                          <div className="text-center space-y-1.5">
                            <p className="text-base font-bold text-slate-700">
                              {!networkId ? 'Выберите платформу' : !categoryId ? 'Выберите категорию' : 'Услуги не найдены'}
                            </p>
                            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                              {!networkId 
                                ? 'Вставьте ссылку на профиль/пост выше, или выберите нужную соцсеть из списка.' 
                                : !categoryId 
                                ? 'Выберите нужную категорию услуг в меню слева.' 
                                : 'В этой категории пока нет доступных услуг. Попробуйте выбрать другую.'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className={`pb-8 pt-4 transition-opacity duration-300 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                           
                           {/* Main Grid Render */}
                           <ServiceGrid engine={engine} />
                        </div>
                      )}
                    </>
                  </div>
                  {/* Note: Middle Wrapper continues through Section 3 & 4 */}

               {/* SECTION 3: DYNAMIC PAYLOAD & WARNINGS */}
               <DynamicPayloadWarnings engine={engine} />

               {/* SECTION 4: BOTTOM CHECKOUT AREA */}
               <BottomCheckout engine={engine} handleCheckout={handleCheckout} isSubmitting={isSubmitting} />
               
               </div> {/* Closes MIDDLE WRAPPER */}
               </div> {/* Closes SECTION 2: COLUMNS lg:flex-row */}

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
      <MegaFooter />

      {/* ══════════ DESKTOP STICKY CHECKOUT BAR (Финтех-бар) ══════════ */}
      <StickyCheckoutBar
        selectedService={selectedService}
        url={url}
        setShowLinkModal={setShowLinkModal}
        quantity={quantity}
        setQuantity={setQuantity}
        pricing={pricing}
        agreedToTerms={agreedToTerms}
        setAgreedToTerms={setAgreedToTerms}
        isSubmitting={isSubmitting}
        handleCheckout={handleCheckout}
      />

      {/* ══════════ LINK MODAL (Progressive Disclosure) ══════════ */}
      <LinkModal
        showLinkModal={showLinkModal}
        setShowLinkModal={setShowLinkModal}
        url={url}
        setUrl={setUrl}
        handleCheckout={handleCheckout}
      />

      {/* ══════════ EMAIL MODAL (Progressive Disclosure) ══════════ */}
      <EmailModal
        showEmailModal={showEmailModal}
        setShowEmailModal={setShowEmailModal}
        email={email}
        setEmail={setEmail}
        url={url}
        totalPriceFormatted={totalPriceFormatted}
        isSubmitting={isSubmitting}
        handleCheckout={handleCheckout}
      />
    </div>
  );
}

