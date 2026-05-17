"use client";

import { useOrderEngine } from "@/hooks/useOrderEngine";
import { PublicNetwork } from "@/actions/order/catalog";
import { motion } from "framer-motion";
import { Zap, LogIn } from "lucide-react";
import React from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
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
import { IconBox } from "@tabler/icons-react";
import { MassOrderPreview } from "./order-engine/MassOrderPreview";
import { MassConfirmEmailModal } from "./order-engine/MassConfirmEmailModal";

export function SmartLinkLanding({
  initialCatalog,
  initialEmail,
  contactSettings
}: {
  initialCatalog: PublicNetwork[];
  initialEmail?: string;
  contactSettings?: {
    SITE_NAME?: string;
    COMPANY_NAME?: string;
    SUPPORT_EMAIL?: string;
    TELEGRAM_SUPPORT_BOT?: string;
    LEGAL_INN?: string;
    LEGAL_OGRNIP?: string;
    LEGAL_ADDRESS?: string;
  };
}) {
  const companyName = contactSettings?.SITE_NAME || contactSettings?.COMPANY_NAME || "Smmplan";
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
    isMassMode,
    massCalculation,
    isMassCalculating,
  } = engine;

  const {
    isSubmitting,
    showEmailModal, setShowEmailModal,
    showLinkModal, setShowLinkModal,
    linkHasError, setLinkHasError,
    showMassConfirmModal, setShowMassConfirmModal,
    handleMassCheckoutConfirm,
    handleCheckout
  } = useCheckoutOrchestrator({ engine });


  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-x-clip">
      
      {/* ── Abstract Soft Background (Instead of 3D Scene) ── */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-primary/5 to-background pointer-events-none z-0 select-none overflow-hidden" />
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[500px] bg-primary/8 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* ── Секция 1: Шапка (Light Fintech) ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border/50 shadow-[0_4px_30px_rgba(0,0,0,0.02)] transition-all">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-[0_2px_10px] shadow-primary/10">
              <Zap className="w-4 h-4 text-primary fill-current" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-foreground hidden sm:block">{companyName}</span>
          </Link>

          <nav className="hidden md:flex gap-8 text-sm font-bold text-muted-foreground">
            <Link href={ROUTES.HOME} className="hover:text-primary transition-colors">Услуги</Link>
            <a 
              href="/api/support/telegram"
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-primary transition-colors flex items-center gap-1.5"
            >
              Поддержка <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </a>
            <Link href={ROUTES.FAQ} className="hover:text-primary transition-colors">FAQ</Link>
          </nav>

          <Link
            href={ROUTES.AUTH.LOGIN}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-default-100 text-foreground text-sm font-bold border border-default-200 hover:bg-default-200 transition-all duration-300"
          >
            <LogIn className="w-4 h-4 text-muted-foreground" />
            <span className="hidden sm:inline">Войти</span>
          </Link>
        </div>
      </header>

      {/* ── Секция 2: Hero Блок (App Style) ── */}
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-2 sm:px-4 md:px-6 py-12 md:py-20 pb-40 flex flex-col items-center relative z-10">

        {/* --- Dynamic Theme-Aware Heart Aurora --- */}
        <div className="absolute top-0 inset-x-0 h-[800px] z-[-1] pointer-events-none overflow-hidden">
          
          {/* Base Colored Canvas (Adapts to Theme) */}
          <div className="absolute inset-0 bg-slate-950" />
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/80 via-primary/50 to-secondary/80" />
          
          {/* Main Heart Blob (Pure Primary Color) */}
          <svg 
            viewBox="0 0 24 24" 
            className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[120vw] min-w-[1200px] max-w-[1800px] h-auto text-primary blur-[200px] rotate-45"
            fill="currentColor"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>

          {/* Secondary contrast blobs to keep the glow rich */}
          <div className="absolute top-[10%] right-[10%] w-[40vw] h-[400px] bg-secondary/70 rounded-full blur-[100px]" />
          <div className="absolute top-[30%] left-[10%] w-[35vw] h-[350px] bg-primary/60 rounded-full blur-[90px]" />

          {/* Light wash on top for readability */}
          <div className="absolute top-0 inset-x-0 h-[200px] bg-gradient-to-b from-black/20 to-transparent" />
          
          {/* Smooth fade to page bg at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-[250px] bg-gradient-to-t from-background via-background/90 to-transparent" />
        </div>

        <motion.div 
          initial={{ opacity: 0.0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.1,
            duration: 0.8,
            ease: "easeOut",
          }}
          className="text-center space-y-5 mb-10 max-w-3xl relative z-10 w-full mt-4"
        >
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-primary-foreground leading-[1.05] drop-shadow-sm">
            Ускоряем ваши <span className="text-primary-foreground">соцсети</span>
          </h1>
          <p className="text-lg text-primary-foreground/90 leading-relaxed font-medium max-w-xl mx-auto drop-shadow-sm">
            Автоматическая платформа для продвижения в социальных сетях с мгновенным запуском.
          </p>
          {/* Social Proof Stats */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 pt-2">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-black text-primary-foreground tabular-nums drop-shadow-sm">15+</p>
              <p className="text-xs font-bold text-primary-foreground/80 uppercase tracking-wider drop-shadow-sm">Платформ</p>
            </div>
            <div className="w-px h-10 bg-card/20"></div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-black text-primary-foreground tabular-nums drop-shadow-sm">300+</p>
              <p className="text-xs font-bold text-primary-foreground/80 uppercase tracking-wider drop-shadow-sm">Услуг</p>
            </div>
            <div className="w-px h-10 bg-card/20"></div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-black text-primary-foreground tabular-nums drop-shadow-sm">24/7</p>
              <p className="text-xs font-bold text-primary-foreground/80 uppercase tracking-wider drop-shadow-sm">Поддержка</p>
            </div>
          </div>
        </motion.div>

        {/* ── Main Input & UI Panel ── */}
        <div className="w-full max-w-[98%] xl:max-w-[1600px] mx-auto bg-content1 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.08)] ring-1 ring-border/50 rounded-[2.5rem] p-4 sm:p-6 lg:p-8 pt-8 relative">
          
          {/* Smart Input (Massive Pill) */}
          <HeroInput 
            engine={engine} 
            handleCheckout={handleCheckout} 
            linkHasError={linkHasError} 
            setLinkHasError={setLinkHasError} 
          />

          {/* Витрина интерфейса */}
          <div className="w-full bg-content1 rounded-3xl overflow-hidden mt-6">
             {isMassMode ? (
               <MassOrderPreview
                 engine={engine}
                 handleCheckout={handleCheckout}
                 isSubmitting={isSubmitting}
               />
             ) : (
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
                   <div className="flex flex-col flex-1 min-w-0 border-r border-border/50 pb-12 lg:pb-0">
                     {/* 2.2 Center Column: Services Container */}
                     <div className="p-4 md:p-6 lg:p-8 bg-content1 relative flex flex-col min-h-0">
                       <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
                         <h3 className="font-extrabold text-foreground text-xl md:text-2xl flex items-center gap-3">
                           Выберите тариф {services.length > 0 && <span className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">{services.length}</span>}
                         </h3>
                       </div>

                       <>
                         {services.length === 0 && isLoading ? (
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8 pt-4">
                             {Array.from({length: 8}).map((_, i) => (
                               <div key={i} className="w-full flex flex-col p-5 md:p-6 min-h-[400px] bg-content2 border border-border/50 shadow-sm animate-pulse rounded-[2rem]" />
                             ))}
                           </div>
                         ) : services.length === 0 ? (
                           <div className="flex-1 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border/50 bg-gradient-to-b from-content2/80 to-content1 rounded-[2rem] min-h-[320px] p-8">
                             <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center">
                               <IconBox className="w-8 h-8 text-primary/60" />
                             </div>
                             <div className="text-center space-y-1.5">
                               <p className="text-base font-bold text-foreground">
                                 {!networkId ? 'Выберите платформу' : !categoryId ? 'Выберите категорию' : 'Услуги не найдены'}
                               </p>
                               <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
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

                     {/* SECTION 3: DYNAMIC PAYLOAD & WARNINGS */}
                     <DynamicPayloadWarnings engine={engine} />

                     {/* SECTION 4: BOTTOM CHECKOUT AREA */}
                     <BottomCheckout engine={engine} handleCheckout={handleCheckout} isSubmitting={isSubmitting} />

                   </div> {/* Closes MIDDLE WRAPPER */}
                 </div> {/* Closes SECTION 2: COLUMNS lg:flex-row */}
               </div>
             )}
          </div>
        </div>
        

      </main>

      {/* Trust and WhyUs wrappers */}
      <div className="relative z-10 -mt-10 bg-background">
        <TrustBar />
        <WhyUs companyName={companyName} />
        <Reviews />
        <FAQ companyName={companyName} />
      </div>
      
      {/* ── Секция 3: Подвал "Premium Trust" (Mega-Footer) ── */}
      <MegaFooter contactSettings={contactSettings} />

      {/* ══════════ DESKTOP STICKY CHECKOUT BAR (Финтех-бар) ══════════ */}
      {!isMassMode && (
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
          onClearSelection={() => setSelectedService(null)}
        />
      )}

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

      {/* ══════════ MASS ORDER CONFIRM MODAL ══════════ */}
      <MassConfirmEmailModal
        showMassConfirmModal={showMassConfirmModal}
        setShowMassConfirmModal={setShowMassConfirmModal}
        email={email}
        setEmail={setEmail}
        totalPriceFormatted={massCalculation ? massCalculation.totalRub.toFixed(2) : "0.00"}
        isSubmitting={isSubmitting}
        handleMassCheckoutConfirm={handleMassCheckoutConfirm}
        validCount={massCalculation ? massCalculation.validCount : 0}
      />
    </div>
  );
}

