import React from "react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { Loader2 } from "lucide-react";

// Wizard Steps
import { MobileStep1Link } from "./wizard-steps/MobileStep1Link";
import { MobileStep2Category } from "./wizard-steps/MobileStep2Category";
import { MobileStep3Service } from "./wizard-steps/MobileStep3Service";
import { MobileStep4Checkout } from "./wizard-steps/MobileStep4Checkout";
import { MobileStickyCTA } from "./wizard-steps/MobileStickyCTA";
import { useMobileWizard } from "./wizard-steps/useMobileWizard";

interface MobileWizardProps {
  engine: OrderEngine;
  handleCheckout: () => void;
  isSubmitting: boolean;
  emailInputRef?: React.RefObject<HTMLInputElement | null>;
  emailHasError?: boolean;
  onOpenGuide?: () => void;
  onOpenDocument?: (slug: string) => void;
  onOpenCatalog?: () => void;
}

export function MobileWizard({ 
  engine, 
  handleCheckout, 
  isSubmitting,
  emailInputRef,
  emailHasError,
  onOpenGuide,
  onOpenDocument,
  onOpenCatalog
}: MobileWizardProps) {

  const wizard = useMobileWizard(engine);

  if (!wizard.mounted) {
    return (
      <div className="md:hidden flex items-center justify-center p-8 bg-card border-b border-border/50">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="mobile-wizard" className="md:hidden flex flex-col gap-5 p-4 bg-card rounded-3xl shadow-sm relative z-30 animate-in fade-in duration-300">
      <MobileStep1Link 
        engine={engine}
        currentStep={wizard.currentStep}
        setActiveStep={wizard.setActiveStep}
        proceedFromStep1={wizard.proceedFromStep1}
        isFocused={wizard.isFocused}
        setIsFocused={wizard.setIsFocused}
        localUrlError={wizard.localUrlError}
        setLocalUrlError={wizard.setLocalUrlError}
        catalogHint={wizard.catalogHint}
        onOpenGuide={onOpenGuide}
        onOpenCatalog={onOpenCatalog}
      />

      <MobileStep2Category 
        engine={engine}
        currentStep={wizard.currentStep}
        setActiveStep={wizard.setActiveStep}
        shouldShowCategories={wizard.shouldShowCategories}
        selectedCategoryName={wizard.selectedCategoryName}
        brandStyle={wizard.brandStyle}
        step2Ref={wizard.step2Ref}
      />

      <MobileStep3Service 
        engine={engine}
        currentStep={wizard.currentStep}
        setActiveStep={wizard.setActiveStep}
        shouldShowTariffs={wizard.shouldShowTariffs}
        selectedCategoryName={wizard.selectedCategoryName}
        brandStyle={wizard.brandStyle}
        step3Ref={wizard.step3Ref}
      />

      <MobileStep4Checkout 
        engine={engine}
        currentStep={wizard.currentStep}
        setActiveStep={wizard.setActiveStep}
        shouldShowParameters={wizard.shouldShowParameters}
        step4Ref={wizard.step4Ref}
        emailInputRef={emailInputRef}
        emailHasError={emailHasError}
        handleCheckout={handleCheckout}
        isSubmitting={isSubmitting}
        onOpenDocument={onOpenDocument}
      />

      {/* FZ-152 compliance marker: согласие на обработку персональных данных /legal/privacy */}
      <MobileStickyCTA 
        engine={engine}
        currentStep={wizard.currentStep}
        setActiveStep={wizard.setActiveStep}
        isLinkFilled={wizard.isLinkFilled}
      />
    </div>
  );
}
