interface OrchestratorCheckoutParams {
  isMassMode?: boolean;
  text?: string;
  email?: string;
  expectedTotalRub?: number;
  serviceId?: string;
  link?: string;
  quantity?: number;
  runs?: number;
  interval?: number;
  idempotencyKey?: string;
  isLinkOverridden?: boolean;
  isRequirementsConfirmed?: boolean;
  [key: string]: unknown;
}

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { OrderEngine } from '@/hooks/useOrderEngine';
import { mutateLink, getLinkValidator } from '@/validators/link-mutators';
import { inferTargetTypeFromCategory } from '@/utils/target-type';
import { IntelligencePlatform } from '@/services/analyzer/link-rules';
import { ABVariant } from '@/hooks/useABTest';

interface CheckoutOrchestratorOptions {
  engine: OrderEngine;
  desktopEmailInputRef?: React.RefObject<HTMLInputElement | null>;
  mobileEmailInputRef?: React.RefObject<HTMLInputElement | null>;
  abVariant?: ABVariant | null;
}

export function useCheckoutOrchestrator({ 
  engine, 
  desktopEmailInputRef, 
  mobileEmailInputRef,
  abVariant
}: CheckoutOrchestratorOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkHasError, setLinkHasError] = useState(false);
  const [showMassConfirmModal, setShowMassConfirmModal] = useState(false);
  const [emailHasError, setEmailHasError] = useState(false);
  const [termsHasError, setTermsHasError] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [pendingCheckoutParams, setPendingCheckoutParams] = useState<OrchestratorCheckoutParams | null>(null);

  useEffect(() => {
    if (engine.email && engine.email.includes('@')) {
      setEmailHasError(false);
    }
  }, [engine.email]);

  useEffect(() => {
    if (engine.agreedToTerms) {
      setTermsHasError(false);
    }
  }, [engine.agreedToTerms]);

  const handleMassCheckoutConfirm = async (confirmedEmail: string) => {
    setShowMassConfirmModal(false);
    setPendingCheckoutParams({
      isMassMode: true,
      email: confirmedEmail,
      text: engine.url,
      expectedTotalRub: engine.massCalculation?.totalRub,
    });
    setShowPaymentModal(true);
  };

  const handleCheckout = async (directGateway?: string) => {
    const { selectedService, url, quantity, customData, agreedToTerms, email, isMassMode, massCalculation, promoCode } = engine;

    if (isMassMode) {
      if (!massCalculation || massCalculation.validCount === 0) {
        toast.error("Нет валидных заказов для оформления. Пожалуйста, исправьте ошибки.", { position: 'top-center' });
        return;
      }
      setShowMassConfirmModal(true);
      return;
    }

    if (!selectedService) {
      toast.error("Пожалуйста, выберите услугу.", { position: 'top-center' });
      return;
    }
    if (selectedService.cooldownUntil && new Date(selectedService.cooldownUntil) > new Date()) {
      toast.error("Эта услуга временно недоступна для заказа (находится на проверке качества). Пожалуйста, выберите другую.", { position: 'top-center' });
      return;
    }

    if (!isMassMode) {
      if (engine.isCalculating) {
        toast.error("Идет расчет стоимости заказа. Пожалуйста, подождите...", { position: 'top-center' });
        return;
      }
      if (!engine.pricing) {
        toast.error("Не удалось рассчитать стоимость заказа. Пожалуйста, проверьте количество или попробуйте позже.", { position: 'top-center' });
        return;
      }
    }


    // --- WAVE 4.2 CROSS-PLATFORM MISMATCH PROTECTION ---
    const activeNetwork = engine.catalog.find(n => n.id === engine.networkId);
    if (!engine.isLinkOverridden && engine.platform && activeNetwork) {
      const detectedPlatform = engine.platform.toLowerCase();
      const selectedPlatform = activeNetwork.slug.toLowerCase();
      
      // Allow if either string includes the other (e.g. 'instagram' vs 'instagram_likes')
      if (!selectedPlatform.includes(detectedPlatform) && !detectedPlatform.includes(selectedPlatform)) {
        setLinkHasError(true);
        toast.error(`Ссылка не подходит. Указана ссылка для ${engine.platform}, но выбрана соцсеть ${activeNetwork.name}.`, { position: 'top-center' });
        setShowLinkModal(true);
        return;
      }
    }
    // ---------------------------------------------------
    
    setLinkHasError(false);
    const rawUrl = url.trim();
    if (rawUrl.length < 3) {
      setLinkHasError(true);
      toast.error("Ссылка или юзернейм слишком короткие.", { position: 'top-center' });
      setShowLinkModal(true);
      return;
    }
    if (rawUrl.includes(' ')) {
      setLinkHasError(true);
      toast.error("Ссылка не должна содержать пробелов.", { position: 'top-center' });
      setShowLinkModal(true);
      return;
    }
    if (/[а-яА-Я]/.test(rawUrl) && !rawUrl.includes('рф')) {
      setLinkHasError(true);
      toast.error("Ссылка содержит недопустимые символы (кириллицу).", { position: 'top-center' });
      setShowLinkModal(true);
      return;
    }

    // --- HIGH-PRECISION LINK VALIDATION & MUTATION ---
    const activePlatform = engine.platform || engine.manualPlatform;
    let finalUrl = rawUrl;

    if (!engine.isLinkOverridden && selectedService && activePlatform && activePlatform !== IntelligencePlatform.OTHER) {
      const activeCat = engine.catalog.flatMap(n => n.categories).find(c => c.id === selectedService.categoryId);
      const targetType = selectedService.targetType === 'POST'
        ? inferTargetTypeFromCategory(activeCat?.name)
        : (selectedService.targetType || inferTargetTypeFromCategory(activeCat?.name));

      const cleanUrl = mutateLink(finalUrl, activePlatform, targetType);
      if (cleanUrl !== finalUrl) {
        finalUrl = cleanUrl;
        engine.setUrl(cleanUrl);
      }

      const validator = getLinkValidator(activePlatform, targetType);
      const linkResult = validator.safeParse(finalUrl);
      
      if (!linkResult.success) {
        setLinkHasError(true);
        toast.error(linkResult.error.errors[0].message, { position: 'top-center' });
        setShowLinkModal(true);
        return;
      }
    } else {
      // Fallback basic url schema parsing (also runs for overridden links)
      if (!/^https?:\/\//i.test(finalUrl) && finalUrl.includes('.')) {
        finalUrl = 'https://' + finalUrl;
        engine.setUrl(finalUrl);
      }
      if (/^https?:\/\//i.test(finalUrl)) {
        try {
          const u = new URL(finalUrl);
          if (!u.hostname.includes('.')) {
            setLinkHasError(true);
            toast.error("Указан некорректный домен.", { position: 'top-center' });
            setShowLinkModal(true);
            return;
          }
          if (u.pathname === '/' || u.pathname.length < 2) {
            setLinkHasError(true);
            toast.error("Укажите ссылку на конкретный профиль или пост, а не на главную страницу.", { position: 'top-center' });
            setShowLinkModal(true);
            return;
          }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          setLinkHasError(true);
          toast.error("Неверный формат ссылки.", { position: 'top-center' });
          setShowLinkModal(true);
          return;
        }
      } else {
        setLinkHasError(true);
        toast.error("Ссылка в обход валидации должна быть корректной (начинаться с http:// или https://)", { position: 'top-center' });
        setShowLinkModal(true);
        return;
      }
    }
    // -------------------------------------------------
    // --- WAVE 4.3 MANDATORY WARNING CONFIRMATION CHECK ---
    const sName = selectedService.name.toLowerCase();
    const isLiveStream = sName.includes('зрител') || sName.includes('эфир') || sName.includes('трансляц');
    const isPrivateChannel = sName.includes('закрыт');
    
    const urlLower = url.toLowerCase();
    const isPrivateTelegramPost = urlLower.includes('t.me/c/') || urlLower.includes('telegram.me/c/');
    const isVkPhotoOrVideo = urlLower.includes('vk.com/photo') || urlLower.includes('vk.com/video') || urlLower.includes('vk.ru/photo') || urlLower.includes('vk.ru/video') || urlLower.includes('vkvideo.ru/');

    const activeCategory = activeNetwork?.categories.find(c => c.id === engine.categoryId);
    const isTelegramViews = activeNetwork?.slug?.toLowerCase() === 'telegram'
      && activeCategory?.name?.toLowerCase().includes('просмотр')
      && !activeCategory?.name?.toLowerCase().includes('авто')
      && !activeCategory?.name?.toLowerCase().includes('auto')
      && !activeCategory?.name?.toLowerCase().includes('будущ')
      && selectedService?.targetType !== 'CHANNEL';

    // Validation message from validator
    let validationWarningActive = false;
    if (url.trim().length > 3 && selectedService && activeNetwork) {
      const activePlatform = engine.platform || engine.manualPlatform;
      const validationPlatform = (activePlatform && activePlatform !== IntelligencePlatform.OTHER)
        ? activePlatform
        : activeNetwork.slug.toUpperCase();
      
      const activeCatForVal = engine.catalog.flatMap(n => n.categories).find(c => c.id === selectedService.categoryId);
      const targetType = selectedService.targetType === 'POST'
        ? inferTargetTypeFromCategory(activeCatForVal?.name)
        : (selectedService.targetType || inferTargetTypeFromCategory(activeCatForVal?.name));
      
      try {
        const validator = getLinkValidator(validationPlatform, targetType);
        const linkResult = validator.safeParse(url);
        if (!linkResult.success) {
          validationWarningActive = true;
        }
      } catch (e) {
        console.warn('Link validation warning check failed:', e);
      }
    }

    const hasDbWarnings = !!(
      (selectedService.requireWarning && selectedService.warningMessage) ||
      (activeCategory?.requireWarning && activeCategory?.warningMessage)
    );

    const hasWarnings = isLiveStream || isPrivateChannel || isPrivateTelegramPost || isVkPhotoOrVideo || isTelegramViews || validationWarningActive || hasDbWarnings;

    if (hasWarnings && !engine.isWarningConfirmed) {
      engine.setWarningHasError(true);
      toast.error("Пожалуйста, подтвердите согласие с особенностями продвижения (отметьте галочку согласия в предупреждениях).", { 
        position: 'top-center',
        duration: 5000 
      });
      setTimeout(() => {
        const warningEl = document.getElementById("warning-confirm-checkbox");
        if (warningEl) {
          warningEl.scrollIntoView({ behavior: "smooth", block: "center" });
          warningEl.focus();
        }
      }, 100);
      return;
    }

    if (quantity < (selectedService.minQty || 1)) {
      toast.error(`Минимальное количество для заказа: ${selectedService.minQty}`, { position: 'top-center' });
      return;
    }
    if (engine.dripFeedEnabled && engine.runs > 0) {
      const chunk = Math.floor(quantity / engine.runs);
      if (chunk < (selectedService.minQty || 1)) {
        toast.error(`Для Drip-feed количество на один запуск (${chunk}) не может быть меньше минимального (${selectedService.minQty || 1})`, { position: 'top-center' });
        return;
      }
    } else if (engine.isSmartDrip && engine.smartDripDays > 0) {
      const chunk = Math.floor(quantity / engine.smartDripDays);
      if (chunk < (selectedService.minQty || 1)) {
        toast.error(`Для Умного Drip-feed количество на 1 день (${chunk}) не может быть меньше минимального (${selectedService.minQty || 1})`, { position: 'top-center' });
        return;
      }
    }
    const nameLower = selectedService.name.toLowerCase();
    const customDataType = selectedService.customDataType;
    const reqCustomData = (customDataType && customDataType !== 'NONE') ||
                          (nameLower.includes('опрос') && !nameLower.includes('просмотр')) || 
                          nameLower.includes('свои') || 
                          nameLower.includes('свой текст') || 
                          nameLower.includes('ключево');
    if (reqCustomData && (!customData || customData.trim().length === 0)) {
      toast.error("Укажите необходимые данные для этой услуги (текст комментариев, ответы и т.д.)", { position: 'top-center' });
      return;
    }
    if (!agreedToTerms) {
      setTermsHasError(true);
      // Per Article 438 Civil Code RF: acceptance of the offer must be an explicit act by the user.
      // Per 152-FZ: processing of personal data (email) requires explicit consent.
      toast.error("Пожалуйста, примите условия Оферты и Политики конфиденциальности.", {
        position: "top-center",
        duration: 4000,
      });
      // Scroll to and highlight the legal checkbox
      setTimeout(() => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const checkboxId = isMobile ? "standard-legal-checkbox" : "desktop-legal-checkbox";
        const checkbox = document.getElementById(checkboxId) || document.getElementById("standard-legal-checkbox");
        if (checkbox) {
          checkbox.scrollIntoView({ behavior: "smooth", block: "center" });
          checkbox.focus();
        }
      }, 100);
      return;
    }

    if (!email || !email.includes('@')) {
      setEmailHasError(true);
      toast.error("Пожалуйста, укажите корректную электронную почту (email) для получения чека.", { position: 'top-center' });
      if (typeof window !== 'undefined') {
        if (window.innerWidth >= 768) {
          desktopEmailInputRef?.current?.focus();
        } else {
          mobileEmailInputRef?.current?.focus();
        }
      }
      return;
    }
    
    const checkoutParams = {
      serviceId: selectedService.id,
      link: finalUrl,
      quantity,
      email,
      customData: customData.trim() || undefined,
      promoCodeStr: promoCode.trim() || undefined,
      mediaGroupUrl: engine.mediaGroupUrl?.trim() || undefined,
      isLinkOverridden: engine.isLinkOverridden,
      isSmartDrip: engine.isSmartDrip,
      smartDripDays: engine.isSmartDrip ? engine.smartDripDays : undefined,
      runs: engine.dripFeedEnabled ? engine.runs : undefined,
      interval: engine.dripFeedEnabled ? engine.dripInterval : undefined,
      abVariant: abVariant || undefined
    };

    if (directGateway) {
      setIsSubmitting(true);
      try {
        const { checkoutAction } = await import('@/actions/order/checkout');
        const res = await checkoutAction({
          ...checkoutParams,
          gateway: directGateway
        });
        if (res.success) {
          if (res.data?.paymentUrl) {
            const allowedDomains = ['yookassa.ru', 'crypto.bot', 'robokassa.ru', 'pay.cryptometria.com'];
            try {
              const parsedUrl = new URL(res.data.paymentUrl);
              if (!allowedDomains.some(d => parsedUrl.hostname.endsWith(d))) {
                throw new Error('Invalid payment URL domain');
              }
              window.location.href = res.data.paymentUrl;
            } catch {
              toast.error('Некорректный URL платежного шлюза');
              return;
            }
          } else if (res.data?.orderId) {
            window.location.href = `/success?orderId=${res.data.orderId}`;
          } else if (res.data?.paymentId) {
            window.location.href = `/success?paymentId=${res.data.paymentId}`;
          }
          return;
        } else {
          if (res.error?.includes("Telegram-аккаунт") || res.error?.includes("привяжите ваш Telegram-аккаунт")) {
            toast.error(res.error, {
              position: 'top-center',
              duration: 8000,
              action: {
                label: 'Привязать',
                onClick: () => window.location.href = '/dashboard/settings'
              }
            });
            return;
          }
          if (res.error?.startsWith('VOUCHER_USE_BALANCE:')) {
            toast.error(
              'Это ваучер на пополнение баланса. Перейдите в раздел «Мой баланс» для активации.',
              {
                position: 'top-center',
                duration: 6000,
                action: {
                  label: 'Мой баланс',
                  onClick: () => window.location.href = '/dashboard/add-funds'
                }
              }
            );
          } else {
            const errorMessage = res.error || "Ошибка создания заказа. Попробуйте снова.";
            window.location.href = `/support/payment-error?error=${encodeURIComponent(errorMessage)}&serviceId=${checkoutParams.serviceId}&gateway=${directGateway}&email=${encodeURIComponent(email)}&quantity=${quantity}&url=${encodeURIComponent(finalUrl)}&paymentId=&orderId=`;
          }
        }
            } catch (e: unknown) {
        setIsSubmitting(false);
        const err = e as Error;
        const errorMessage = err.message || "Ошибка платежного шлюза.";
        window.location.href = `/support/payment-error?error=${encodeURIComponent(errorMessage)}&serviceId=${checkoutParams.serviceId}&gateway=${directGateway}&email=${encodeURIComponent(email)}&quantity=${quantity}&url=${encodeURIComponent(finalUrl)}&paymentId=&orderId=`;
      }
      return;
    }

    setPendingCheckoutParams(checkoutParams);
    setShowPaymentModal(true);
  };

  const confirmAndPay = async (gateway: string) => {
    if (!pendingCheckoutParams) return;
    setIsSubmitting(true);
    try {
      if (pendingCheckoutParams.isMassMode) {
        const { massOrderCheckoutAction } = await import('@/actions/order/mass');
        const res = await massOrderCheckoutAction({
          text: pendingCheckoutParams.text || "",
          email: pendingCheckoutParams.email || "",
          gateway: gateway as 'yookassa' | 'cryptobot' | 'balance',
          expectedTotalRub: pendingCheckoutParams.expectedTotalRub
        });
        setIsSubmitting(false);
        setShowPaymentModal(false);
        if (res.success) {
          if (res.data?.paymentUrl) {
            window.location.href = res.data.paymentUrl;
          } else {
            const errorMessage = 'Ошибка: не удалось получить ссылку на оплату.';
            window.location.href = `/support/payment-error?error=${encodeURIComponent(errorMessage)}&gateway=${gateway}&email=${encodeURIComponent(pendingCheckoutParams.email || '')}&url=${encodeURIComponent(pendingCheckoutParams.text || '')}&paymentId=&orderId=`;
          }
        } else {
          const errorMessage = res.error || 'Ошибка создания заказа. Попробуйте еще раз.';
          window.location.href = `/support/payment-error?error=${encodeURIComponent(errorMessage)}&gateway=${gateway}&email=${encodeURIComponent(pendingCheckoutParams.email || '')}&url=${encodeURIComponent(pendingCheckoutParams.text || '')}&paymentId=&orderId=`;
        }
        return;
      }

      const { checkoutAction } = await import('@/actions/order/checkout');
      const res = await checkoutAction({
        email: pendingCheckoutParams.email || "",
        link: pendingCheckoutParams.link || "",
        quantity: pendingCheckoutParams.quantity || 0,
        serviceId: pendingCheckoutParams.serviceId || "",
        runs: pendingCheckoutParams.runs,
        interval: pendingCheckoutParams.interval,
        idempotencyKey: pendingCheckoutParams.idempotencyKey,
        isLinkOverridden: pendingCheckoutParams.isLinkOverridden,
        isRequirementsConfirmed: pendingCheckoutParams.isRequirementsConfirmed,
        gateway
      });
      setIsSubmitting(false);
      setShowPaymentModal(false);
      if (res.success && res.data?.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      } else if (!res.success) {
        if (res.error?.includes("Telegram-аккаунт") || res.error?.includes("привяжите ваш Telegram-аккаунт")) {
          toast.error(res.error, {
            position: 'top-center',
            duration: 8000,
            action: {
              label: 'Привязать',
              onClick: () => window.location.href = '/dashboard/settings'
            }
          });
          return;
        }
        if (res.error?.startsWith('VOUCHER_USE_BALANCE:')) {
          toast.error(
            'Это ваучер на пополнение баланса. Перейдите в раздел «Мой баланс» для активации.',
            {
              position: 'top-center',
              duration: 6000,
              action: {
                label: 'Мой баланс',
                onClick: () => window.location.href = '/dashboard/add-funds'
              }
            }
          );
        } else {
          const errorMessage = res.error || "Ошибка создания заказа. Попробуйте снова.";
          const serviceId = pendingCheckoutParams.serviceId || '';
          const email = pendingCheckoutParams.email || '';
          const quantity = pendingCheckoutParams.quantity || '';
          const url = pendingCheckoutParams.link || '';
          const paymentId = '';
          const orderId = '';
          window.location.href = `/support/payment-error?error=${encodeURIComponent(errorMessage)}&serviceId=${serviceId}&gateway=${gateway}&email=${encodeURIComponent(email)}&quantity=${quantity}&url=${encodeURIComponent(url)}&paymentId=${paymentId}&orderId=${orderId}`;
        }
      }
        } catch (e: unknown) {
      setIsSubmitting(false);
      const err = e as Error;
      const errorMessage = err.message || "Ошибка платежного шлюза.";
      if (errorMessage.includes("Telegram-аккаунт") || errorMessage.includes("привяжите ваш Telegram-аккаунт")) {
        toast.error(errorMessage, {
          position: 'top-center',
          duration: 8000,
          action: {
            label: 'Привязать',
            onClick: () => window.location.href = '/dashboard/settings'
          }
        });
        return;
      }
      const serviceId = pendingCheckoutParams.serviceId || '';
      const email = pendingCheckoutParams.email || '';
      const quantity = pendingCheckoutParams.quantity || '';
      const url = pendingCheckoutParams.link || '';
      window.location.href = `/support/payment-error?error=${encodeURIComponent(errorMessage)}&serviceId=${serviceId}&gateway=${gateway}&email=${encodeURIComponent(email)}&quantity=${quantity}&url=${encodeURIComponent(url)}&paymentId=&orderId=`;
    }
  };

  return {
    isSubmitting,
    showLinkModal,
    setShowLinkModal,
    linkHasError,
    setLinkHasError,
    showMassConfirmModal,
    setShowMassConfirmModal,
    handleMassCheckoutConfirm,
    handleCheckout,
    emailHasError,
    termsHasError,
    showPaymentModal,
    setShowPaymentModal,
    confirmAndPay
  };
}
