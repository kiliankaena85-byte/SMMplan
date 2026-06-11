"use client";

import { useOrderEngine } from "@/hooks/useOrderEngine";
import { PublicNetwork, PublicService } from "@/actions/order/catalog";
import { motion } from "framer-motion";
import React from "react";
import { ROUTES } from "@/lib/routes";
import { TrustBar } from "./TrustBar";
import { WhyUs } from "./WhyUs";
import { FAQ } from "./FAQ";
import { Reviews } from "./Reviews";
import { LinkModal } from "./order-engine/LinkModal";
import { StickyCheckoutBar } from "./order-engine/StickyCheckoutBar";
import { NetworkSelector } from "./order-engine/NetworkSelector";
import { CategorySidebar } from "./order-engine/CategorySidebar";
import { ServiceGrid } from "./order-engine/ServiceGrid";
import { MobileWizard } from "./order-engine/MobileWizard";
import { MobileCatalogModal } from "./order-engine/MobileCatalogModal";
import { LegalDocumentModal } from "./order-engine/LegalDocumentModal";
import { useCheckoutOrchestrator } from "./order-engine/useCheckoutOrchestrator";
import { HeroInput } from "./order-engine/HeroInput";
import { DynamicPayloadWarnings } from "./order-engine/DynamicPayloadWarnings";
import { MegaFooter } from "./MegaFooter";
import { PlatformLinkGuideDrawer } from "./order-engine/PlatformLinkGuideDrawer";
import { PaymentGatewaySelectionModal } from "./order-engine/PaymentGatewaySelectionModal";
import { IconBox } from "@tabler/icons-react";
import { MassOrderPreview } from "./order-engine/MassOrderPreview";
import { MassConfirmEmailModal } from "./order-engine/MassConfirmEmailModal";
import { PlatformSelectorFallback } from "@/components/orders/PlatformSelectorFallback";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SocialIcon } from "@/components/ui/SocialIcon";
import { Header } from "./Header";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

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
  const companyName = contactSettings?.SITE_NAME || contactSettings?.COMPANY_NAME || "SMMplan";
  const engine = useOrderEngine(initialCatalog, initialEmail);
  const {
    url, setUrl,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    networkId, setNetworkId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    categoryId, setCategoryId,
    selectedService, setSelectedService,
    quantity, setQuantity,
    email, setEmail,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    customData, setCustomData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    agreedToTerms, setAgreedToTerms,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    catalog,
    unfilteredCatalog,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    availableCategories,
    services,
    isLoading,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isCalculating,
    pricing,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    totalPriceFormatted,
    isMassMode,
    massCalculation,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isMassCalculating,
  } = engine;

  const desktopEmailInputRef = React.useRef<HTMLInputElement>(null);
  const mobileEmailInputRef = React.useRef<HTMLInputElement>(null);
  const [isGuideOpen, setIsGuideOpen] = React.useState(false);
  const [activeLegalSlug, setActiveLegalSlug] = React.useState<string | null>(null);
  const [showCatalogModal, setShowCatalogModal] = React.useState(false);

  const handleSelectServiceFromCatalog = (srv: PublicService, catId: string, netId: string) => {
    engine.setNetworkId(netId);
    engine.setCategoryId(catId);
    engine.setSelectedService(srv);
    setShowCatalogModal(false);
  };

  const {
    isSubmitting,
    showLinkModal, setShowLinkModal,
    linkHasError, setLinkHasError,
    showMassConfirmModal, setShowMassConfirmModal,
    handleMassCheckoutConfirm,
    handleCheckout,
    emailHasError,
    showPaymentModal, setShowPaymentModal,
    confirmAndPay
  } = useCheckoutOrchestrator({ 
    engine, 
    desktopEmailInputRef, 
    mobileEmailInputRef 
  });

  const availablePlatforms = unfilteredCatalog.map(net => {
    let platformEnum = IntelligencePlatform.OTHER;
    const slugUpper = net.slug.toUpperCase();
    if (slugUpper.includes('TELEGRAM')) platformEnum = IntelligencePlatform.TELEGRAM;
    else if (slugUpper.includes('YOUTUBE')) platformEnum = IntelligencePlatform.YOUTUBE;
    else if (slugUpper.includes('INSTAGRAM')) platformEnum = IntelligencePlatform.INSTAGRAM;
    else if (slugUpper.includes('TIKTOK')) platformEnum = IntelligencePlatform.TIKTOK;
    else if (slugUpper.includes('VK')) platformEnum = IntelligencePlatform.VK;
    else if (slugUpper.includes('TWITCH')) platformEnum = IntelligencePlatform.TWITCH;
    else if (slugUpper.includes('TWITTER') || slugUpper === 'X') platformEnum = IntelligencePlatform.TWITTER;
    else if (slugUpper.includes('LIKEE')) platformEnum = IntelligencePlatform.LIKEE;
    
    return {
      id: net.id,
      name: platformEnum
    };
  }).filter(p => p.name !== IntelligencePlatform.OTHER);


  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-x-clip">
      
      {/* ── Abstract Soft Background (Instead of 3D Scene) ── */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-primary/5 to-background pointer-events-none z-0 select-none overflow-hidden" />

      <Header initialEmail={initialEmail} siteName={companyName} activePath={ROUTES.HOME} />

      {/* ── Секция 2: Hero Блок (App Style) ── */}
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-2 sm:px-4 md:px-6 py-8 md:py-20 pb-16 md:pb-40 flex flex-col items-center relative z-10">

        {/* --- Variant B: Fintech Dot Grid Backdrop --- */}
        <div className="absolute top-0 inset-x-0 h-[800px] z-[-1] pointer-events-none overflow-hidden premium-dot-grid" />
        <div className="absolute top-0 inset-x-0 h-[800px] z-[-1] pointer-events-none overflow-hidden bg-gradient-to-b from-transparent via-background/50 to-background" />

        {/* --- Glassmorphic Blur Blobs (Floating space spheres inspired by Lovable.dev) --- */}
        <div className="absolute top-0 inset-x-0 h-[600px] z-[-2] pointer-events-none overflow-hidden select-none">
          {/* Blob 1: Pink/Violet */}
          <motion.div
            animate={{
              x: [0, 50, -30, 0],
              y: [0, -30, 40, 0],
              scale: [1, 1.1, 0.95, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-[10%] left-[12%] w-72 h-72 rounded-full bg-pink-500/10 dark:bg-pink-500/5 blur-3xl"
          />
          {/* Blob 2: Sky Blue/Primary */}
          <motion.div
            animate={{
              x: [0, -60, 40, 0],
              y: [0, 40, -30, 0],
              scale: [1, 0.95, 1.05, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-[15%] right-[15%] w-80 h-80 rounded-full bg-primary/10 dark:bg-primary/5 blur-3xl"
          />
          {/* Blob 3: Emerald */}
          <motion.div
            animate={{
              x: [0, 30, -40, 0],
              y: [0, 50, 30, 0],
              scale: [1, 1.05, 0.98, 1],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-[30%] left-[30%] w-64 h-64 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl"
          />
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
          <div className="mb-4">
            <ThemeSwitcher />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.05] drop-shadow-md">
            Ускоряем ваши <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-pink-500 dark:from-sky-400 dark:via-indigo-400 dark:to-pink-400">соцсети</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed font-medium max-w-xl mx-auto drop-shadow-sm">
            Автоматическая платформа для продвижения в социальных сетях с мгновенным запуском.
          </p>
          {/* Social Proof Stats */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-10 pt-2">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums drop-shadow-sm">15+</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider drop-shadow-sm">Платформ</p>
            </div>
            <div className="w-px h-10 bg-border"></div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums drop-shadow-sm">300+</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider drop-shadow-sm">Услуг</p>
            </div>
            <div className="w-px h-10 bg-border"></div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums drop-shadow-sm">24/7</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider drop-shadow-sm">Поддержка</p>
            </div>
          </div>
        </motion.div>
 
        {/* ── Main Input & UI Panel ── */}
        <div className="w-full max-w-[98%] xl:max-w-[1600px] mx-auto bg-content1 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.08)] border border-border/80 rounded-2xl md:rounded-[2.5rem] p-4 sm:p-6 lg:p-8 pt-8 relative">
          
          {/* Smart Input (Massive Pill) - Hidden on mobile to prevent duplicate inputs */}
          <div className="hidden md:block">
            <HeroInput 
              engine={engine} 
              handleCheckout={handleCheckout} 
              linkHasError={linkHasError} 
              setLinkHasError={setLinkHasError} 
              onOpenGuide={() => setIsGuideOpen(true)}
            />
          </div>



          {url.trim().length >= 5 && !isLoading && (!engine.platform || !networkId) && !engine.manualPlatform && (
            <div className="mt-4 animate-in fade-in duration-300 w-full max-w-4xl mx-auto relative z-20 hidden md:block">
              <PlatformSelectorFallback
                onSelect={engine.setManualPlatform}
                availablePlatforms={availablePlatforms}
              />
            </div>
          )}

          {/* Витрина интерфейса */}
          <div id="catalog-section" className="w-full bg-content1 rounded-3xl overflow-visible md:overflow-hidden mt-2 md:mt-6">
             {unfilteredCatalog.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border/50 bg-gradient-to-b from-content2/80 to-content1 rounded-[2.5rem] min-h-[360px] p-8 m-4">
                 <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center animate-bounce">
                   <IconBox className="w-8 h-8 text-primary/60" />
                 </div>
                 <div className="text-center space-y-2">
                   <p className="text-lg font-extrabold text-foreground">Каталог временно недоступен</p>
                   <p className="text-sm text-muted-foreground max-w-md leading-relaxed mx-auto">
                     В настоящий момент мы обновляем список услуг и проводим техническое обслуживание. Пожалуйста, зайдите немного позже или обратитесь в поддержку.
                   </p>
                 </div>
               </div>
             ) : isMassMode ? (
               <MassOrderPreview
                 engine={engine}
                 handleCheckout={handleCheckout}
                 isSubmitting={isSubmitting}
               />
             ) : (
               <div className="w-full flex flex-col will-change-transform">
                 {/* SECTION 1.0: MOBILE WIZARD (< MD) — 2-step master */}
                    <MobileWizard 
                      engine={engine} 
                      handleCheckout={handleCheckout} 
                      isSubmitting={isSubmitting} 
                      emailInputRef={mobileEmailInputRef}
                      emailHasError={emailHasError}
                      onOpenGuide={() => setIsGuideOpen(true)}
                      onOpenDocument={setActiveLegalSlug}
                      onOpenCatalog={() => setShowCatalogModal(true)}
                    />

                 {/* SECTION 1: NETWORKS (Top Tabs Premium) - Hidden on Mobile */}
                 <NetworkSelector engine={engine} />

                 {/* SECTION 2: COLUMNS (Categories & Services & Checkout) — HARD BOUNDARY */}
                 <div className="hidden md:flex flex-col lg:flex-row min-h-[400px] border-b border-border/50 relative items-start">
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
                          <div className={`pb-8 pt-4 transition-opacity duration-300 hidden md:block ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                             {/* Main Grid Render */}
                             <ServiceGrid engine={engine} />
                           </div>
                         )}
                       </>
                     </div>

                     {/* SECTION 3: DYNAMIC PAYLOAD & WARNINGS */}
                     <DynamicPayloadWarnings engine={engine} />

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
          email={email}
          setEmail={setEmail}
          promoCode={engine.promoCode}
          setPromoCode={engine.setPromoCode}
          isCalculating={engine.isCalculating}
          isSubmitting={isSubmitting}
          handleCheckout={handleCheckout}
          onClearSelection={() => setSelectedService(null)}
          emailInputRef={desktopEmailInputRef}
          emailHasError={emailHasError}
          engine={engine}
          onOpenDocument={setActiveLegalSlug}
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
      <PlatformLinkGuideDrawer
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        initialPlatform={engine.catalog.find(n => n.id === engine.networkId)?.slug || "telegram"}
      />
      <PaymentGatewaySelectionModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalPriceFormatted={pricing ? (pricing.totalCents / 100).toFixed(2) : "0.00"}
        isSubmitting={isSubmitting}
        onSelectGateway={confirmAndPay}
      />
      <LegalDocumentModal
        slug={activeLegalSlug}
        onClose={() => setActiveLegalSlug(null)}
      />

      {/* Fullscreen Mobile Catalog Modal */}
      {showCatalogModal && (
        <MobileCatalogModal
          catalog={catalog}
          selectedService={selectedService}
          onSelect={handleSelectServiceFromCatalog}
          onClose={() => setShowCatalogModal(false)}
        />
      )}
    </div>
  );
}

