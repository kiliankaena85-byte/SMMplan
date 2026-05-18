import { useState } from 'react';
import { toast } from 'sonner';
import { checkoutAction } from '@/actions/order/checkout';
import { OrderEngine } from '@/hooks/useOrderEngine';

interface CheckoutOrchestratorOptions {
  engine: OrderEngine;
}

export function useCheckoutOrchestrator({ engine }: CheckoutOrchestratorOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkHasError, setLinkHasError] = useState(false);
  const [showMassConfirmModal, setShowMassConfirmModal] = useState(false);

  const handleMassCheckoutConfirm = async (confirmedEmail: string) => {
    const { url } = engine;
    setIsSubmitting(true);
    try {
      const { massOrderCheckoutAction } = await import('@/actions/order/mass');
      const res = await massOrderCheckoutAction({
        text: url,
        email: confirmedEmail,
        gateway: 'yookassa'
      });
      if (res.success) {
        if (res.data?.paymentUrl) {
          window.location.href = res.data.paymentUrl;
        } else {
          toast.error('Не удалось получить ссылку на оплату. Обратитесь в поддержку.', { position: 'top-center' });
        }
      } else {
        toast.error(res.error || 'Ошибка создания заказа. Попробуйте еще раз.', { position: 'top-center' });
      }
    } catch (e: any) {
      toast.error(e.message || 'Ошибка платежного шлюза.', { position: 'top-center' });
    } finally {
      setIsSubmitting(false);
      setShowMassConfirmModal(false);
    }
  };

  const handleCheckout = async () => {
    const { selectedService, url, quantity, customData, agreedToTerms, email, isMassMode, massCalculation, promoCode } = engine;

    if (isMassMode) {
      if (!massCalculation || massCalculation.validCount === 0) {
        toast.error("Нет валидных заказов для оформления. Пожалуйста, исправьте ошибки.", { position: 'top-center' });
        return;
      }
      if (!agreedToTerms) {
        toast.error("Пожалуйста, ознакомьтесь и согласитесь с условиями Оферты.", { position: 'top-center' });
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

    // --- WAVE 4.2 CROSS-PLATFORM MISMATCH PROTECTION ---
    const activeNetwork = engine.catalog.find(n => n.id === engine.networkId);
    if (engine.platform && activeNetwork) {
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

    let finalUrl = rawUrl;
    if (!/^https?:\/\//i.test(finalUrl) && finalUrl.includes('.')) {
      finalUrl = 'https://' + finalUrl;
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
      } catch (e) {
        setLinkHasError(true);
        toast.error("Неверный формат ссылки.", { position: 'top-center' });
        setShowLinkModal(true);
        return;
      }
    }
    if (quantity < (selectedService.minQty || 1)) {
      toast.error(`Минимальное количество для заказа: ${selectedService.minQty}`, { position: 'top-center' });
      return;
    }
    const reqCustomData = selectedService.name.toLowerCase().includes('опрос') || 
                          selectedService.name.toLowerCase().includes('свои') || 
                          selectedService.name.toLowerCase().includes('свой текст') || 
                          selectedService.name.toLowerCase().includes('ключево');
    if (reqCustomData && (!customData || customData.trim().length === 0)) {
      toast.error("Укажите необходимые данные для этой услуги (текст комментариев, ответы и т.д.)", { position: 'top-center' });
      return;
    }
    if (!agreedToTerms) {
      toast.error("Пожалуйста, ознакомьтесь и согласитесь с условиями Оферты.", { position: 'top-center' });
      return;
    }

    if (!email || !email.includes('@')) {
      setShowEmailModal(true);
      return;
    }
    
    setIsSubmitting(true);
    const res = await checkoutAction({
      serviceId: selectedService.id,
      link: finalUrl,
      quantity,
      email,
      customData: customData.trim() || undefined,
      promoCodeStr: promoCode.trim() || undefined,
      gateway: 'yookassa' // Standard generic checkout via yookassa
    });
    
    setIsSubmitting(false);
    if (res.success && res.data?.paymentUrl) {
      window.location.href = res.data.paymentUrl;
    } else if (!res.success) {
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
        toast.error(errorMessage, { position: 'top-center' });
      }
    }
  };

  return {
    isSubmitting,
    showEmailModal,
    setShowEmailModal,
    showLinkModal,
    setShowLinkModal,
    linkHasError,
    setLinkHasError,
    showMassConfirmModal,
    setShowMassConfirmModal,
    handleMassCheckoutConfirm,
    handleCheckout
  };
}
