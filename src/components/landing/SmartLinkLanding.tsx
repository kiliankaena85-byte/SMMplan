'use client';
// audit-disable STR-002

import { useOrderEngine } from "@/hooks/useOrderEngine";
import { PublicNetwork, PublicService } from "@/actions/order/catalog";
import { motion } from "framer-motion";
import React from "react";
import { ROUTES } from "@/lib/routes";
import { TrustBar } from "./TrustBar";
import { LinkModal } from "./order-engine/LinkModal";
import dynamic from "next/dynamic";

const WhyUs = dynamic(() => import("./WhyUs").then((mod) => mod.WhyUs));
const FAQ = dynamic(() => import("./FAQ").then((mod) => mod.FAQ));
const Reviews = dynamic(() => import("./Reviews").then((mod) => mod.Reviews));
const MegaFooter = dynamic(() => import("./MegaFooter").then((mod) => mod.MegaFooter));

const CheckoutDrawer = dynamic(
  () => import("./order-engine/drawer/CheckoutDrawer").then((mod) => mod.CheckoutDrawer),
  { ssr: false }
);

const PaymentGatewaySelectionModal = dynamic(
  () => import("./order-engine/PaymentGatewaySelectionModal").then((mod) => mod.PaymentGatewaySelectionModal),
  { ssr: false }
);

const LegalDocumentModal = dynamic(
  () => import("./order-engine/LegalDocumentModal").then((mod) => mod.LegalDocumentModal),
  { ssr: false }
);

const PlatformLinkGuideDrawer = dynamic(
  () => import("./order-engine/PlatformLinkGuideDrawer").then((mod) => mod.PlatformLinkGuideDrawer),
  { ssr: false }
);

const MassConfirmEmailModal = dynamic(
  () => import("./order-engine/MassConfirmEmailModal").then((mod) => mod.MassConfirmEmailModal),
  { ssr: false }
);

const StepWizardCheckout = dynamic(
  () => import("./order-engine/variants/StepWizardCheckout").then((mod) => mod.StepWizardCheckout),
  { ssr: false }
);
const MobileWizard = dynamic(
  () => import("./order-engine/MobileWizard").then((mod) => mod.MobileWizard),
  { ssr: false }
);
import { NetworkSelector } from "./order-engine/NetworkSelector";
import { CategorySidebar } from "./order-engine/CategorySidebar";
import { ServiceGrid } from "./order-engine/ServiceGrid";
import { MobileCatalogModal } from "./order-engine/MobileCatalogModal";
import { useCheckoutOrchestrator } from "./order-engine/useCheckoutOrchestrator";
import { HeroInput } from "./order-engine/HeroInput";
import { DynamicPayloadWarnings } from "./order-engine/DynamicPayloadWarnings";
import { Box } from "lucide-react";
import { PlatformSelectorFallback } from "@/components/orders/PlatformSelectorFallback";
import { UniversalOrderForm } from "@/components/orders/UniversalOrderForm";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SocialIcon } from "@/components/ui/SocialIcon";
import { Header } from "./Header";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export function SmartLinkLanding({
  initialCatalog,
  initialEmail,
  contactSettings,
  initialServiceId = "",
  initialCategoryId = "",
  initialNetworkId = "",
  userBalanceCents = 0,
  tenantId,
  customHeroTitle,
  customHeroSubtitle,
  seoHubContent,
  initialServices = []
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
  initialServiceId?: string;
  initialCategoryId?: string;
  initialNetworkId?: string;
  userBalanceCents?: number;
  tenantId?: string;
  customHeroTitle?: React.ReactNode;
  customHeroSubtitle?: string;
  seoHubContent?: React.ReactNode;
  initialServices?: PublicService[];
}) {
  const companyName = contactSettings?.SITE_NAME || contactSettings?.COMPANY_NAME || "SMMplan";
  const engine = useOrderEngine(initialCatalog, initialEmail, initialServiceId, initialCategoryId, initialNetworkId, initialServices);
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
    massCalculation,
  } = engine;

  const desktopEmailInputRef = React.useRef<HTMLInputElement>(null);
  const mobileEmailInputRef = React.useRef<HTMLInputElement>(null);
  const [isGuideOpen, setIsGuideOpen] = React.useState(false);
  const [activeLegalSlug, setActiveLegalSlug] = React.useState<string | null>(null);
  const [showCatalogModal, setShowCatalogModal] = React.useState(false);
  const [showSmartCart, setShowSmartCart] = React.useState(false);

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
    termsHasError,
    showPaymentModal, setShowPaymentModal,
    confirmAndPay
  } = useCheckoutOrchestrator({ 
    engine, 
    desktopEmailInputRef, 
    mobileEmailInputRef
  });



  const checkoutVariantProps = React.useMemo(() => ({
    selectedService,
    url,
    setShowLinkModal,
    quantity,
    setQuantity,
    pricing,
    email,
    setEmail,
    promoCode: engine.promoCode,
    setPromoCode: engine.setPromoCode,
    isCalculating: engine.isCalculating,
    isSubmitting,
    handleCheckout,
    onClose: () => setSelectedService(null),
    emailInputRef: desktopEmailInputRef,
    emailHasError,
    termsHasError,
    engine,
    onOpenDocument: setActiveLegalSlug,
    userBalanceCents
  }), [
    selectedService, url, setShowLinkModal, quantity, setQuantity, pricing,
    email, setEmail, engine, isSubmitting, handleCheckout,
    setSelectedService, desktopEmailInputRef, emailHasError, termsHasError,
    setActiveLegalSlug, userBalanceCents
  ]);

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
      
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-primary/5 to-background pointer-events-none z-0 select-none overflow-hidden" />

      <Header initialEmail={initialEmail} siteName={companyName} tenantId={tenantId} activePath={ROUTES.HOME} />

      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-2 sm:px-4 md:px-6 pt-12 md:pt-28 pb-16 md:pb-40 flex flex-col items-center relative z-10">

        <div className="absolute top-0 inset-x-0 h-[800px] z-[-1] pointer-events-none overflow-hidden premium-dot-grid" />
        <div className="absolute top-0 inset-x-0 h-[800px] z-[-1] pointer-events-none overflow-hidden bg-gradient-to-b from-transparent via-background/50 to-background" />

        <div className="absolute top-0 inset-x-0 h-[600px] z-[-2] pointer-events-none overflow-hidden select-none">
          <div className="absolute top-[10%] left-[12%] w-72 h-72 rounded-full bg-pink-500/10 dark:bg-pink-500/5 blur-3xl pointer-events-none animate-blob-1" />
          <div className="absolute top-[15%] right-[15%] w-80 h-80 rounded-full bg-primary/10 dark:bg-primary/5 blur-3xl pointer-events-none animate-blob-2" />
          <div className="absolute top-[30%] left-[30%] w-64 h-64 rounded-full bg-emerald-500/10 dark:emerald-500/5 blur-3xl pointer-events-none animate-blob-3" />
        </div>

        <div 
          className="text-center space-y-4 mb-8 max-w-4xl relative z-20 w-full mt-2 px-2 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <div className="mb-2">
            <ThemeSwitcher />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.08] drop-shadow-md text-balance">
            {customHeroTitle || (
              <>
                Продвижение в <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-pink-500 dark:from-sky-400 dark:via-indigo-400 dark:to-pink-400">Telegram, VK и соцсетях</span> от 0.01 ₽
              </>
            )}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-medium max-w-2xl mx-auto drop-shadow-sm text-pretty">
            {customHeroSubtitle || "Прямой доступ к оптовым шлюзам продвижения без наценок агентств. Без паролей и регистрации — мгновенный запуск за 30 секунд."}
          </p>
          <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-10 pt-1">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums tracking-tight drop-shadow-sm">15+</p>
              <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider drop-shadow-sm">Платформ</p>
            </div>
            <div className="w-px h-8 bg-border"></div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums tracking-tight drop-shadow-sm">300+</p>
              <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider drop-shadow-sm">Услуг</p>
            </div>
            <div className="w-px h-8 bg-border"></div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums tracking-tight drop-shadow-sm">9-21</p>
              <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider drop-shadow-sm">Поддержка (МСК)</p>
            </div>
          </div>

          {/* ГЛАВНЫЙ ИНПУТ ДЛЯ ВСТАВКИ ССЫЛКИ В HERO СЕКЦИИ (ТОЛЬКО ДЕСКТОП, НА МОБИЛЬНЫХ РАБОТАЕТ ПОШАГОВЫЙ WIZARD) */}
          <div className="pt-3 w-full hidden md:block">
            <HeroInput 
              engine={engine} 
              handleCheckout={handleCheckout} 
              linkHasError={linkHasError} 
              setLinkHasError={setLinkHasError} 
              onOpenGuide={() => setIsGuideOpen(true)}
            />
          </div>
        </div>
 
        <div className="w-full max-w-[98%] xl:max-w-[1600px] mx-auto bg-content1 shadow-2xl ring-1 ring-border/20 rounded-2xl md:rounded-[2.5rem] p-4 sm:p-6 lg:p-8 pt-6 relative">
          
          <div className="min-h-[500px] transition-all duration-300">
            {unfilteredCatalog.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border/50 bg-gradient-to-b from-content2/80 to-content1 rounded-2xl min-h-[360px] p-8 m-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center animate-bounce">
                  <Box className="w-8 h-8 text-primary/60" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-extrabold text-foreground">Каталог временно недоступен</p>
                  <p className="text-sm text-muted-foreground max-w-md leading-relaxed mx-auto text-pretty">
                    В настоящий момент мы обновляем список услуг и проводим техническое обслуживание. Пожалуйста, зайдите немного позже или обратитесь в поддержку.
                  </p>
                </div>
              </div>
            ) : (showSmartCart || engine.isMassMode) ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <UniversalOrderForm 
                  userEmail={initialEmail} 
                  initialText={engine.url}
                  onEmpty={() => {
                    setShowSmartCart(false);
                    engine.setUrl("");
                  }}
                />
              </div>
            ) : (
              <>
                {url.trim().length >= 5 && !isLoading && (!engine.platform || !networkId) && !engine.manualPlatform && (
                  <div className="mb-4 animate-in fade-in duration-300 w-full max-w-4xl mx-auto relative z-20">
                    <PlatformSelectorFallback
                      onSelect={engine.setManualPlatform}
                      availablePlatforms={availablePlatforms}
                    />
                  </div>
                )}

                <div id="catalog-section" className="w-full bg-content1 rounded-3xl overflow-visible md:overflow-hidden mt-2 md:mt-6">
                  <div className="w-full flex flex-col will-change-transform">
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

                    <NetworkSelector engine={engine} />

                    <div className="hidden md:flex flex-col lg:flex-row min-h-[400px] border-b border-border/50 relative items-start">
                      <CategorySidebar engine={engine} />

                      <div className="flex flex-col flex-1 min-w-0 border-r border-border/50 pb-12 lg:pb-0">
                        <div className="p-4 md:p-6 lg:p-8 bg-content1 relative flex flex-col min-h-0">
                          <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
                            <h3 className="font-extrabold text-foreground text-xl md:text-2xl tracking-tight flex items-center gap-3">
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
                              <div className="flex-1 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border/50 bg-gradient-to-b from-content2/80 to-content1 rounded-2xl min-h-[320px] p-8">
                                <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center">
                                  <Box className="w-5 h-5 text-primary/60" />
                                </div>
                                <div className="text-center space-y-1.5">
                                  <p className="text-base font-bold text-foreground">
                                    {!networkId ? 'Выберите платформу' : !engine.categoryId ? 'Выберите категорию' : 'Услуги не найдены'}
                                  </p>
                                  <p className="text-sm text-muted-foreground max-w-xs leading-relaxed text-pretty">
                                    {!networkId
                                      ? 'Вставьте ссылку на профиль/пост выше, или выберите нужную соцсеть из списка.'
                                      : !engine.categoryId
                                      ? 'Выберите нужную категорию услуг в меню слева.'
                                      : 'В этой категории пока нет доступных услуг. Попробуйте выбрать другую.'}
                                  </p>
                                </div>
                              </div>
                                                        ) : (
                              <>
                                <div className={`pb-8 pt-4 transition-opacity duration-300 hidden md:block ${isLoading && services.length === 0 ? 'opacity-50' : 'opacity-100'}`}>
                                  <ServiceGrid 
                                    engine={engine} 
                                    checkoutProps={checkoutVariantProps}
                                  />
                                </div>
                              </>
                            )}
                          </>
                        </div>

                        <DynamicPayloadWarnings engine={engine} />

                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <div className="relative z-10 -mt-10 bg-background">
        {seoHubContent && (
          <div className="w-full max-w-[98%] xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-10">
            {seoHubContent}
          </div>
        )}
        <TrustBar />
        <WhyUs companyName={companyName} />
        <Reviews />
        <FAQ companyName={companyName} />
      </div>
      
      <MegaFooter contactSettings={contactSettings} tenantId={tenantId} />

      {/* ══════════ ACTIVE CHECKOUT VARIANT OVERLAYS ══════════ */}
      {!engine.isMassMode && !showSmartCart && (
        <StepWizardCheckout {...checkoutVariantProps} />
      )}

      {/* ══════════ LINK MODAL (Progressive Disclosure) ══════════ */}
      <LinkModal
        showLinkModal={showLinkModal}
        setShowLinkModal={setShowLinkModal}
        url={url}
        setUrl={setUrl}
        handleCheckout={handleCheckout}
        networkSlug={unfilteredCatalog.find(n => n.id === engine.networkId)?.slug || engine.networkId}
        categorySlug={unfilteredCatalog.find(n => n.id === engine.networkId)?.categories.find(c => c.id === engine.categoryId)?.slug || engine.categoryId}
        serviceName={selectedService?.name}
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
        totalPriceFormatted={
          showSmartCart
            ? (massCalculation ? massCalculation.totalRub.toFixed(2) : "0.00")
            : (pricing ? (pricing.totalCents / 100).toFixed(2) : "0.00")
        }
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

