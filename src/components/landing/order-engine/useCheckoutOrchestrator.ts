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

  const handleCheckout = async () => {
    const { selectedService, url, quantity, customData, agreedToTerms, email } = engine;

    if (!selectedService) {
      toast.error("Пожалуйста, выберите услугу.", { position: 'top-center' });
      return;
    }
    if (selectedService.cooldownUntil && new Date(selectedService.cooldownUntil) > new Date()) {
      toast.error("Эта услуга временно недоступна для заказа (находится на проверке качества). Пожалуйста, выберите другую.", { position: 'top-center' });
      return;
    }
    
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
      gateway: 'yookassa' // Standard generic checkout via yookassa
    });
    
    setIsSubmitting(false);
    if (res.success && res.data?.paymentUrl) {
      window.location.href = res.data.paymentUrl;
    } else {
      const errorMessage = !res.success ? res.error : "Ошибка создания заказа. Попробуйте снова.";
      toast.error(errorMessage, { position: 'top-center' });
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
    handleCheckout
  };
}
