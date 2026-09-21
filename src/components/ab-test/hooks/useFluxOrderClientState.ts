'use client';

import { useState, useRef, useActionState, useEffect } from "react";
import { getServicesByCategoryAction } from "@/actions/order/catalog";
import { checkoutAction, getAvailableGatewaysAction, calculatePriceAction } from "@/actions/order/checkout";
import { validateDripFeedDuration, DRIP_FEED_MAX_ERROR_MESSAGE, detectNetworkByUrl } from "@/hooks/useOrderWizard";
import { analyzeUrl } from "@/actions/order/analyze-url";
import { isLinkServiceCompatible } from "@/constants/link-service-compatibility";
import { resolveServiceTargetType } from "@/utils/target-type-mapper";
import type { FluxNetwork, FluxCategory, FluxService } from "@/types/flux";
import type { FluxStep } from "../sub/FluxNavHeader";
import { toast } from "sonner";

export interface UseFluxOrderClientStateProps {
  initialCatalog: FluxNetwork[];
  initialEmail?: string;
  tenantId?: string;
  userBalanceCents?: number;
  initialNetworkId?: string;
  initialCategoryId?: string;
  initialServiceId?: string;
  initialServices?: FluxService[];
}

export function useFluxOrderClientState({
  initialCatalog = [],
  initialEmail = "",
  tenantId = "flux",
  initialNetworkId,
  initialCategoryId,
  initialServiceId,
  initialServices = [],
}: UseFluxOrderClientStateProps) {
  // Determine initial selection based on props (e.g. for /boost or /services/telegram/busty)
  const initialNet = (initialNetworkId || initialCategoryId)
    ? (initialCatalog.find(n => n.id === initialNetworkId || n.categories?.some(c => c.id === initialCategoryId)) || null)
    : null;
  const initialCat = (initialNet && initialCategoryId)
    ? (initialNet.categories?.find(c => c.id === initialCategoryId) || null)
    : null;
  const initialSrv = (initialServices.length > 0)
    ? (initialServices.find(s => s.id === initialServiceId) || (initialCategoryId ? initialServices[0] : null))
    : null;

  const [step, setStep] = useState<FluxStep>(initialSrv ? 'checkout' : initialCat ? 'service' : 'link');
  const [direction, setDirection] = useState(1);
  const [link, setLink] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeNetwork, setActiveNetwork] = useState<FluxNetwork | null>(initialNet);
  const [activeCategory, setActiveCategory] = useState<FluxCategory | null>(initialCat);
  const [services, setServices] = useState<FluxService[]>(initialServices);
  const [selectedService, setSelectedService] = useState<FluxService | null>(initialSrv);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  const [quantity, setQuantity] = useState<number | string>(initialSrv?.minQty || "");
  const [email, setEmail] = useState(initialEmail || "");
  const [isRequirementsConfirmed, setIsRequirementsConfirmed] = useState(false);
  const [showShakeError, setShowShakeError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const [isDripFeedEnabled, setIsDripFeedEnabled] = useState(false);
  const [dripRuns, setDripRuns] = useState(5);
  const [dripInterval, setDripInterval] = useState(60);
  const [customData, setCustomData] = useState("");

  // Promo Code States
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPromo, setShowPromo] = useState(false);
  const [serverPriceRub, setServerPriceRub] = useState<number | null>(null);
  const [originalServerPriceRub, setOriginalServerPriceRub] = useState<number | null>(null);

  const quantityRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);

  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string>("yookassa");
  const [availableGateways, setAvailableGateways] = useState<{ yookassa: boolean; robokassa: boolean; cryptobot: boolean } | null>(null);
  const [isTgGuideOpen, setIsTgGuideOpen] = useState(false);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalEmail, setAuthModalEmail] = useState("");

  useEffect(() => {
    getAvailableGatewaysAction().then(res => {
      if (res && typeof res === 'object') {
        setAvailableGateways({
          yookassa: (res as any).yookassa ?? true,
          robokassa: (res as any).robokassa ?? false,
          cryptobot: (res as any).cryptobot ?? false
        });
      }
    }).catch(() => {});
  }, []);

  // Pre-load services if initialCategoryId is provided but initialServices was empty
  useEffect(() => {
    if (initialCategoryId && services.length === 0) {
      setIsLoadingServices(true);
      getServicesByCategoryAction(initialCategoryId, tenantId)
        .then((fetched) => {
          const srvList: FluxService[] = (fetched as any) || [];
          setServices(srvList);
          if (srvList.length > 0 && !selectedService) {
            const defaultSrv = srvList.find(s => s.id === initialServiceId) || srvList[0];
            setSelectedService(defaultSrv);
            setQuantity(defaultSrv.minQty || 100);
            setStep('checkout');
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingServices(false));
    }
  }, [initialCategoryId, tenantId, initialServiceId]);

  // Recalculate price and discount when promo, service, or quantity changes
  useEffect(() => {
    const numQty = typeof quantity === 'string' ? (parseInt(quantity) || 0) : quantity;
    if (!selectedService || !numQty) {
      setServerPriceRub(null);
      setOriginalServerPriceRub(null);
      return;
    }
    const totalQty = isDripFeedEnabled ? numQty * dripRuns : numQty;
    let cancelled = false;
    calculatePriceAction(
      selectedService.id,
      totalQty,
      appliedPromo || undefined,
      isDripFeedEnabled ? dripRuns : undefined
    )
      .then((res) => {
        if (!cancelled && res.success && res.data) {
          setServerPriceRub(res.data.totalCents / 100);
          if (res.data.discountCents > 0) {
            setOriginalServerPriceRub(res.data.originalTotalCents / 100);
            setDiscountPercent(res.data.discountPercent);
          } else {
            setOriginalServerPriceRub(null);
            setDiscountPercent(0);
          }
        } else if (!cancelled) {
          setServerPriceRub(null);
          setOriginalServerPriceRub(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setServerPriceRub(null);
          setOriginalServerPriceRub(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedService?.id, quantity, isDripFeedEnabled, dripRuns, appliedPromo]);

  const handleApplyPromo = async () => {
    const clean = promoCode.trim().toUpperCase();
    if (!clean) {
      setPromoMessage({ type: 'error', text: 'Введите промокод' });
      return;
    }
    if (clean.length < 3 || clean.length > 32 || !/^[A-Z0-9_-]+$/.test(clean)) {
      setPromoMessage({ type: 'error', text: 'Некорректный формат промокода' });
      return;
    }
    if (!selectedService) return;

    setIsApplyingPromo(true);
    setPromoMessage(null);
    try {
      const numQty = typeof quantity === "string" ? (parseInt(quantity) || 0) : quantity;
      const baseQty = numQty > 0 ? numQty : (selectedService.minQty || 10);
      const totalCalcQty = isDripFeedEnabled ? baseQty * dripRuns : baseQty;
      const res = await calculatePriceAction(
        selectedService.id,
        totalCalcQty,
        clean,
        isDripFeedEnabled ? dripRuns : undefined
      );
      if (res.success && res.data) {
        if (res.data.discountCents > 0) {
          setAppliedPromo(clean);
          setServerPriceRub(res.data.totalCents / 100);
          setOriginalServerPriceRub(res.data.originalTotalCents / 100);
          const percent = res.data.discountPercent || Math.round(
            (res.data.discountCents / (res.data.originalTotalCents || res.data.totalCents)) * 100
          );
          setDiscountPercent(percent);
          const msg = `Промокод «${clean}» применен: скидка ${percent}%`;
          setPromoMessage({ type: 'success', text: msg });
          toast.success(msg);
        } else {
          setAppliedPromo('');
          setPromoMessage({ type: 'error', text: 'Промокод не найден или скидка недоступна' });
        }
      } else {
        setAppliedPromo('');
        setPromoMessage({ type: 'error', text: res.error || 'Промокод не найден' });
      }
    } catch {
      setAppliedPromo('');
      setPromoMessage({ type: 'error', text: 'Не удалось проверить промокод' });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo('');
    setPromoCode('');
    setPromoMessage(null);
    setDiscountPercent(0);
    setOriginalServerPriceRub(null);
    setServerPriceRub(null);
  };

  const navigateTo = (newStep: FluxStep) => {
    const order: FluxStep[] = ['link', 'network', 'category', 'service', 'checkout'];
    const currentIdx = order.indexOf(step);
    const newIdx = order.indexOf(newStep);
    setDirection(newIdx > currentIdx ? 1 : -1);
    setStep(newStep);
  };

  const [formState, formAction, isPending] = useActionState(
    async (_prevState: any, _formData: FormData) => {
      if (!selectedService) return { error: "Выберите услугу", field: "general" };
      const currentLink = link.trim();
      if (!currentLink || currentLink.length < 3) {
        setShakeKey(k => k + 1);
        return { error: "Укажите ссылку для продвижения", field: "link" };
      }
      const numQty = typeof quantity === "string" ? (parseInt(quantity) || 0) : quantity;
      if (!numQty || numQty < selectedService.minQty || numQty > selectedService.maxQty) {
        setShakeKey(k => k + 1);
        return { error: `Укажите количество от ${selectedService.minQty} до ${selectedService.maxQty.toLocaleString('ru-RU')}`, field: "quantity" };
      }
      if (isDripFeedEnabled && !validateDripFeedDuration(dripRuns, dripInterval)) {
        setShakeKey(k => k + 1);
        return { error: DRIP_FEED_MAX_ERROR_MESSAGE, field: "general" };
      }
      const currentEmail = email.trim();
      if (!currentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail)) {
        setShakeKey(k => k + 1);
        return { error: "Укажите корректный email для чека", field: "email" };
      }
      if (
        (selectedService.clientRequirement || selectedService.clientConfirmation || selectedService.requireWarning) &&
        !isRequirementsConfirmed
      ) {
        setShowShakeError(true);
        setShakeKey(k => k + 1);
        return { error: "Подтвердите согласие с требованиями", field: "requirement" };
      }

      const totalQty = isDripFeedEnabled ? numQty * dripRuns : numQty;

      try {
        const res = await checkoutAction({
          serviceId: selectedService.id,
          link: currentLink,
          quantity: totalQty,
          email: currentEmail,
          gateway: selectedGateway,
          promoCodeStr: appliedPromo || undefined,
          runs: isDripFeedEnabled ? dripRuns : undefined,
          interval: isDripFeedEnabled ? dripInterval : undefined,
          customData: customData.trim() || undefined,
          isRequirementsConfirmed,
          tenantId
        });

        if (res.success && res.data) {
          const { paymentUrl, redirectUrl, guestOrderToken } = res.data;
          if (guestOrderToken && typeof window !== "undefined") {
            try {
              const tokens = JSON.parse(localStorage.getItem("smmflux_guest_tokens") || "[]");
              if (!tokens.includes(guestOrderToken)) {
                tokens.unshift(guestOrderToken);
                localStorage.setItem("smmflux_guest_tokens", JSON.stringify(tokens.slice(0, 30)));
              }
            } catch {}
          }
          if (paymentUrl) {
            window.location.href = paymentUrl;
            return { error: undefined };
          }
          if (redirectUrl) {
            window.location.href = redirectUrl;
            return { error: undefined };
          }
          window.location.href = `/order/${res.data.orderId}${guestOrderToken ? `?token=${guestOrderToken}` : ''}`;
          return { error: undefined };
        } else {
          setShakeKey(k => k + 1);
          const errorMsg = !res.success ? res.error : undefined;
          if (errorMsg?.includes("Войдите в аккаунт") || errorMsg?.includes("авторизован")) {
            setAuthModalEmail(currentEmail);
            setShowAuthModal(true);
            return { error: undefined };
          }
          return { error: errorMsg || "Не удалось создать заказ", field: "general" };
        }
      } catch (err: any) {
        setShakeKey(k => k + 1);
        return { error: err.message || "Сетевая ошибка при создании заказа", field: "general" };
      }
    },
    { error: undefined, field: undefined }
  );

  const handleAnalyzeLink = async (rawInput: string) => {
    const trimmedInput = rawInput.trim();
    if (!trimmedInput) return;
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeUrl(trimmedInput);
      if (analysis?.success && analysis.data?.platform) {
        const net = initialCatalog.find(
          n => n.name.toLowerCase() === analysis.data!.platform.toLowerCase() ||
               (n.slug && n.slug.toLowerCase() === analysis.data!.platform.toLowerCase())
        );
        if (net) {
          setActiveNetwork(net);
          setDetectedType(analysis.data.type || null);
          setSuggestedCategories(analysis.data.suggestedCategories || []);
          setActiveCategory(null);
          setServices([]);
          setSelectedService(null);
          navigateTo('category');
          return;
        }
      }
      throw new Error("Fallback");
    } catch {
      const matchedNetwork = detectNetworkByUrl(trimmedInput, initialCatalog as any) as any;
      if (matchedNetwork) {
        setActiveNetwork(matchedNetwork);
        setActiveCategory(null);
        setServices([]);
        setSelectedService(null);
        navigateTo('category');
      } else {
        toast.info("Не удалось определить платформу по ссылке", {
          description: "Пожалуйста, выберите соцсеть из списка:"
        });
        navigateTo('network');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectCategory = async (cat: FluxCategory) => {
    setActiveCategory(cat);
    setIsLoadingServices(true);
    setServices([]);
    navigateTo('service');
    try {
      const fetched = await getServicesByCategoryAction(cat.id, tenantId);
      let srvList: FluxService[] = (fetched as any) || [];
      if (detectedType) {
        const compatible = srvList.filter(s =>
          isLinkServiceCompatible(detectedType, resolveServiceTargetType(s))
        );
        if (compatible.length > 0) srvList = compatible;
      }
      setServices(srvList);
    } catch {
      setServices([]);
    } finally {
      setIsLoadingServices(false);
    }
  };

  const selectService = (srv: FluxService) => {
    setSelectedService(srv);
    const numQty = typeof quantity === "string" ? (parseInt(quantity) || 0) : quantity;
    const clampedQty = numQty < srv.minQty
      ? srv.minQty
      : (srv.maxQty && numQty > srv.maxQty)
        ? srv.maxQty
        : (numQty || srv.minQty || 100);
    setQuantity(clampedQty);
    setIsRequirementsConfirmed(false);
    setShowShakeError(false);
    if (!srv.isDripFeedEnabled) {
      setIsDripFeedEnabled(false);
    }
    if (step !== 'checkout') {
      navigateTo('checkout');
    }
  };

  const numericQuantity = typeof quantity === "string" ? (parseInt(quantity) || 0) : quantity;
  const effectiveQuantity = isDripFeedEnabled ? numericQuantity * dripRuns : numericQuantity;
  const basePrice = selectedService ? (selectedService.pricePerUnitRub * effectiveQuantity) : 0;
  const price = (serverPriceRub ?? basePrice).toFixed(2);

  return {
    step, direction, link, setLink, isAnalyzing, activeNetwork, setActiveNetwork,
    activeCategory, services, selectedService, isLoadingServices,
    quantity, setQuantity, numericQuantity, effectiveQuantity, price,
    email, setEmail, isRequirementsConfirmed, setIsRequirementsConfirmed,
    showShakeError, shakeKey, isDripFeedEnabled, setIsDripFeedEnabled,
    dripRuns, setDripRuns, dripInterval, setDripInterval,
    customData, setCustomData, selectedGateway, setSelectedGateway,
    availableGateways, isTgGuideOpen, setIsTgGuideOpen,
    showAuthModal, setShowAuthModal, authModalEmail,
    quantityRef, emailRef, linkRef,
    detectedType, setDetectedType, suggestedCategories, setSuggestedCategories,
    navigateTo, formState, formAction, isPending, handleAnalyzeLink,
    selectCategory, selectService,
    // Promo Code Props
    showPromo, setShowPromo, promoCode, setPromoCode,
    appliedPromo, isApplyingPromo, discountPercent,
    originalServerPriceRub, promoMessage, handleApplyPromo, handleRemovePromo,
  };
}
