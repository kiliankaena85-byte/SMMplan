import { PublicService } from "@/actions/order/catalog";
import { OrderEngine } from "@/hooks/useOrderEngine";
import React from "react";

export type CheckoutMode = 
  | "card"    // Variant 2: In-Card Accordion
  | "modal"   // Variant 3: Centered Quick Dialog
  | "wizard"  // Variant 4: Step-by-Step Focus Wizard
  | "hud"     // Variant 5: Floating Dynamic HUD Capsule
  | "bottom"  // Variant 6: Bottom Sheet Dock
  | "table";  // Variant 7: Quick Table Row

export interface CheckoutVariantProps {
  selectedService: PublicService | null;
  url: string;
  setShowLinkModal: (val: boolean) => void;
  quantity: number;
  setQuantity: (val: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pricing: any;
  email: string;
  setEmail: (val: string) => void;
  promoCode: string;
  setPromoCode: (val: string) => void;
  isCalculating: boolean;
  isSubmitting: boolean;
  handleCheckout: (gateway?: string) => void;
  onClose: () => void;
  emailInputRef?: React.RefObject<HTMLInputElement | null>;
  emailHasError?: boolean;
  termsHasError?: boolean;
  engine: OrderEngine;
  onOpenDocument?: (slug: string) => void;
  userBalanceCents?: number;
}
