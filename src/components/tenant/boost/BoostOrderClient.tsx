'use client';

import React, { useState, useEffect, useTransition } from 'react';
import type { PublicNetwork, PublicCategory, PublicService } from '@/actions/order/catalog';
import { getServicesByCategoryAction } from '@/actions/order/catalog';
import { checkoutAction } from '@/actions/order/checkout';

interface BoostOrderClientProps {
  initialCatalog: PublicNetwork[];
  initialEmail?: string;
  initialServices?: PublicService[];
}

export const BoostOrderClient: React.FC<BoostOrderClientProps> = ({
  initialCatalog,
  initialEmail = '',
  initialServices = [],
}) => {
  const networks = initialCatalog || [];

  // 1. Social Network
  const defaultNetwork = networks.find((n) => n.slug === 'vk') || networks[0];
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>(defaultNetwork?.id || '');

  const currentNetwork = networks.find((n) => n.id === selectedNetworkId) || defaultNetwork;
  const categories: PublicCategory[] = currentNetwork?.categories || [];

  // 2. Category / Activity
  const defaultCategory = categories.find((c) => c.name.toLowerCase().includes('лайк') || c.name.toLowerCase().includes('подписчики')) || categories[0];
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(defaultCategory?.id || '');

  // 3. Services / Tiers
  const [services, setServices] = useState<PublicService[]>(initialServices);
  const [selectedService, setSelectedService] = useState<PublicService | null>(initialServices[0] || null);
  const [isLoadingServices, setIsLoadingServices] = useState<boolean>(false);

  // 4. Form inputs
  const [link, setLink] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(initialServices[0]?.minQty || 100);
  const [email, setEmail] = useState<string>(initialEmail);
  const [agreeOffer, setAgreeOffer] = useState<boolean>(true);
  const [agreePrivacy, setAgreePrivacy] = useState<boolean>(true);

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [shakeKey, setShakeKey] = useState<number>(0);
  const [isPending, startTransition] = useTransition();

  // Social Network Switch
  const handleSelectNetwork = (netId: string) => {
    setSelectedNetworkId(netId);
    setErrorMsg('');
    const net = networks.find((n) => n.id === netId);
    if (net && net.categories.length > 0) {
      const cat = net.categories.find((c) => c.name.toLowerCase().includes('лайк') || c.name.toLowerCase().includes('подписчики')) || net.categories[0];
      setSelectedCategoryId(cat.id);
    } else {
      setSelectedCategoryId('');
      setServices([]);
      setSelectedService(null);
    }
  };

  // Category Switch
  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    setErrorMsg('');
  };

  // Fetch services when category changes
  useEffect(() => {
    if (!selectedCategoryId) return;

    let isMounted = true;
    setIsLoadingServices(true);
    setErrorMsg('');

    getServicesByCategoryAction(selectedCategoryId, 'boost')
      .then((data) => {
        if (!isMounted) return;
        setServices(data);
        if (data.length > 0) {
          setSelectedService(data[0]);
          if (quantity < data[0].minQty) {
            setQuantity(data[0].minQty);
          }
        } else {
          setSelectedService(null);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setServices([]);
        setSelectedService(null);
      })
      .finally(() => {
        if (isMounted) setIsLoadingServices(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCategoryId]);

  const handleSelectService = (srv: PublicService) => {
    setSelectedService(srv);
    setErrorMsg('');
    if (quantity < srv.minQty) {
      setQuantity(srv.minQty);
    } else if (srv.maxQty && quantity > srv.maxQty) {
      setQuantity(srv.maxQty);
    }
  };

  // Quantity Stepper
  const step = 50;
  const handleQuantityStep = (delta: number) => {
    if (!selectedService) return;
    const min = selectedService.minQty || 10;
    const max = selectedService.maxQty || 1000000;
    const nextVal = Math.max(min, Math.min(max, (quantity || 0) + delta));
    setQuantity(nextVal);
  };

  // Price calculations
  const pricePerUnit = selectedService?.pricePerUnitRub || 0;
  const totalPriceNum = pricePerUnit * (quantity || 0);
  const formattedTotalPrice = totalPriceNum < 1 ? totalPriceNum.toFixed(2) : (Math.round(totalPriceNum * 100) / 100).toFixed(2);

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedService) {
      setErrorMsg('Пожалуйста, выберите подходящий тариф');
      setShakeKey(Date.now());
      return;
    }

    if (!link || link.trim().length < 3) {
      setErrorMsg('Укажите корректную ссылку');
      setShakeKey(Date.now());
      const el = document.getElementById('primelike-link-input');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!quantity || quantity < selectedService.minQty) {
      setErrorMsg(`Минимальное количество для этого тарифа: ${selectedService.minQty.toLocaleString('ru-RU')} шт.`);
      setShakeKey(Date.now());
      return;
    }

    if (selectedService.maxQty && quantity > selectedService.maxQty) {
      setErrorMsg(`Максимальное количество для этого тарифа: ${selectedService.maxQty.toLocaleString('ru-RU')} шт.`);
      setShakeKey(Date.now());
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setErrorMsg('Укажите корректный e-mail для получения чека');
      setShakeKey(Date.now());
      const el = document.getElementById('primelike-email-input');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!agreeOffer || !agreePrivacy) {
      setErrorMsg('Необходимо согласиться с условиями оферты и правилами');
      setShakeKey(Date.now());
      return;
    }

    startTransition(async () => {
      try {
        const res = await checkoutAction({
          serviceId: selectedService.id,
          link: link.trim(),
          quantity: quantity,
          email: email.trim(),
          gateway: 'yookassa',
          isRequirementsConfirmed: true,
        });

        if (res && res.success && res.data?.paymentUrl) {
          window.location.href = res.data.paymentUrl;
        } else if (res && !res.success) {
          setErrorMsg(res.error || 'Не удалось создать заказ. Попробуйте еще раз.');
          setShakeKey(Date.now());
        } else {
          setErrorMsg('Произошла ошибка при создании заказа');
          setShakeKey(Date.now());
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Ошибка при обращении к серверу';
        setErrorMsg(message);
        setShakeKey(Date.now());
      }
    });
  };

  const sortedServices = [...services].sort((a, b) => a.pricePerUnitRub - b.pricePerUnitRub);

  // Category Icon Resolver matching PrimeLike
  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('подписчик') || lower.includes('друг')) return '👥';
    if (lower.includes('лайк')) return '💙';
    if (lower.includes('репост')) return '🔁';
    if (lower.includes('опрос') || lower.includes('голос')) return '📊';
    if (lower.includes('просмотр')) return '👁️';
    if (lower.includes('прослуш')) return '🎧';
    if (lower.includes('коммент')) return '💬';
    if (lower.includes('реакц')) return '❤️';
    return '⚡';
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 text-left font-sans">
      
      {/* ── 1. PRIMELIKE HORIZONTAL SOCIAL NETWORKS ROW ── */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto pb-2 no-scrollbar">
        {networks.map((net) => {
          const isSelected = net.id === selectedNetworkId;

          if (isSelected) {
            return (
              <button
                key={net.id}
                type="button"
                className="h-12 px-6 rounded-2xl bg-[#009FE3] text-white font-bold text-sm flex items-center gap-2 shrink-0 shadow-sm cursor-pointer select-none active:scale-95 transition-all"
              >
                <span>{net.name}</span>
                <span className="font-mono text-sm font-black">VK</span>
              </button>
            );
          }

          return (
            <button
              key={net.id}
              type="button"
              onClick={() => handleSelectNetwork(net.id)}
              className="w-12 h-12 rounded-2xl bg-card hover:bg-muted text-foreground font-bold text-sm flex items-center justify-center shrink-0 border border-border/80 cursor-pointer select-none active:scale-95 transition-all shadow-xs"
              title={net.name}
            >
              {net.slug === 'telegram' && <span className="text-sky-500 text-lg">✈️</span>}
              {net.slug === 'vk' && <span className="text-blue-600 font-black text-sm">VK</span>}
              {net.slug === 'instagram' && <span className="text-pink-500 text-lg">📷</span>}
              {net.slug === 'tiktok' && <span className="text-foreground text-lg">🎵</span>}
              {net.slug === 'youtube' && <span className="text-red-500 text-lg">▶️</span>}
              {net.slug !== 'telegram' && net.slug !== 'vk' && net.slug !== 'instagram' && net.slug !== 'tiktok' && net.slug !== 'youtube' && (
                <span>⚡</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 2. PRIMELIKE 2-COLUMN ORDER TERMINAL (Vertical Category Sidebar + Big White Card) ── */}
      <div className="flex flex-col lg:flex-row items-start gap-6 pt-2">
        
        {/* Left Sidebar: Categories List */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-2 overflow-x-auto lg:overflow-visible">
          {categories.map((cat) => {
            const isSelected = cat.id === selectedCategoryId;
            const icon = getCategoryIcon(cat.name);

            if (isSelected) {
              return (
                <button
                  key={cat.id}
                  type="button"
                  className="w-full h-12 px-5 rounded-2xl bg-card border-2 border-foreground/30 text-foreground font-bold text-sm flex items-center gap-3 shrink-0 shadow-xs cursor-pointer select-none text-left"
                >
                  <span className="text-[#009FE3] text-base">{icon}</span>
                  <span className="truncate">{cat.name}</span>
                </button>
              );
            }

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat.id)}
                className="w-full h-12 px-5 rounded-2xl bg-card border-2 border-dashed border-border/90 hover:border-foreground/30 text-muted-foreground hover:text-foreground font-medium text-sm flex items-center gap-3 shrink-0 cursor-pointer select-none transition-all text-left"
              >
                <span className="text-muted-foreground text-base">{icon}</span>
                <span className="truncate">{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Area: Big White Form Container */}
        <div className="flex-1 w-full bg-card rounded-3xl border border-border/80 p-6 sm:p-9 shadow-xl shadow-black/5 space-y-7">
          
          {/* Tier Cards Row with Arrow */}
          <div className="relative">
            {isLoadingServices ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-44 rounded-3xl bg-muted/40 animate-pulse border border-border/40" />
                ))}
              </div>
            ) : sortedServices.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground bg-muted/20 rounded-2xl">
                Услуги в этой категории временно обновляются.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative">
                {sortedServices.map((srv, idx) => {
                  const isSelected = srv.id === selectedService?.id;
                  
                  const tierTitles = [
                    'Супер Эконом',
                    'Эконом',
                    'Стандарт лайки на клип/vkvideo/пост',
                  ];
                  const tierTitle = tierTitles[idx] || srv.name;

                  const tierDescriptions = [
                    'Боты. Разные страны. Возможны списания 90%, собачки! Ссылку указывать на фото/пост. Профиль/группа должны быть открыты.',
                    'Боты. Разные страны. Возможны списания. Профиль/группа должны быть открыты.',
                    'Боты, хорошее качество. Разные страны. Страница должна быть открыта. Ссылку указывать на видео, клип, пост.',
                  ];
                  const tierDesc = tierDescriptions[idx] || 'Для открытых каналов и страниц.';

                  return (
                    <div
                      key={srv.id}
                      onClick={() => handleSelectService(srv)}
                      className={`
                        p-6 rounded-3xl cursor-pointer select-none flex flex-col justify-between transition-all duration-150 relative min-h-[190px]
                        ${isSelected
                          ? 'bg-card border-2 border-[#009FE3] shadow-md ring-2 ring-[#009FE3]/20'
                          : 'bg-muted/40 hover:bg-muted/70 border border-border/70'
                        }
                      `}
                    >
                      <div>
                        <h4 className="font-bold text-base text-foreground mb-2">{tierTitle}</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{tierDesc}</p>
                      </div>

                      <div className="pt-4 flex items-center justify-between">
                        <span className={`
                          px-3.5 py-1.5 rounded-xl font-bold text-xs
                          ${isSelected
                            ? 'bg-[#009FE3] text-white shadow-xs'
                            : 'bg-muted text-foreground'
                          }
                        `}>
                          {srv.pricePerUnitRub < 0.01 ? srv.pricePerUnitRub.toFixed(4) : srv.pricePerUnitRub.toFixed(3)} ₽/1 шт
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Right Arrow Button (PrimeLike Slider Badge) */}
                <div className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#009FE3] text-white items-center justify-center shadow-md cursor-pointer select-none">
                  <span className="text-xs font-bold">›</span>
                </div>
              </div>
            )}
          </div>

          {/* 2 Inputs in 1 Row: Link & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div id="primelike-link-input" className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Ссылка на Вашу запись</span>
                <span className="text-[#009FE3]">⤵</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full h-14 pl-4 pr-10 rounded-2xl bg-muted/50 border border-border/80 focus:border-[#009FE3] focus:bg-background text-sm font-medium transition-all outline-none"
                  placeholder="https://vk.com/wall-000000001_001"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  🔗
                </span>
              </div>
            </div>

            <div id="primelike-email-input" className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Электронная почта
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 pl-4 pr-10 rounded-2xl bg-muted/50 border border-border/80 focus:border-[#009FE3] focus:bg-background text-sm font-medium transition-all outline-none"
                  placeholder="example@mail.ru"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  ✉️
                </span>
              </div>
            </div>
          </div>

          {/* Quantity Stepper Bar */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Количество
            </label>
            <div className="w-full h-14 rounded-2xl bg-muted/50 border border-border/80 flex items-center justify-between px-4">
              <button
                type="button"
                onClick={() => handleQuantityStep(-step)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer select-none"
              >
                —
              </button>
              <input
                type="number"
                min={selectedService?.minQty || 10}
                max={selectedService?.maxQty || 1000000}
                value={quantity || ''}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                className="w-36 text-center text-base font-bold font-mono bg-transparent outline-none text-foreground"
              />
              <button
                type="button"
                onClick={() => handleQuantityStep(step)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all cursor-pointer select-none"
              >
                ＋
              </button>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-2 text-xs text-muted-foreground pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeOffer}
                onChange={(e) => setAgreeOffer(e.target.checked)}
                className="w-4 h-4 rounded text-[#009FE3] accent-[#009FE3] mt-0.5"
              />
              <span>
                Нажимая кнопку, вы принимаете условия <span className="text-[#009FE3] underline">Оферты*</span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="w-4 h-4 rounded text-[#009FE3] accent-[#009FE3] mt-0.5"
              />
              <span>
                Нажимая кнопку, я даю свое согласие на обработку персональных данных и соглашаюсь с <span className="text-[#009FE3] underline">Правилами сервиса*</span>
              </span>
            </label>
          </div>

          {errorMsg && (
            <div key={shakeKey} className="p-3 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium animate-shake">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Promo code link */}
          <div className="text-right">
            <button type="button" className="text-xs text-muted-foreground hover:text-[#009FE3] underline cursor-pointer">
              Есть промокод?
            </button>
          </div>

          {/* ── 4. PRIMELIKE SOLID BLUE BOTTOM ACTION BAR ── */}
          <form onSubmit={handleSubmit}>
            <button
              type="submit"
              disabled={isPending}
              className="
                w-full h-16 rounded-2xl bg-[#009FE3] hover:bg-[#008cc9] text-white font-bold text-lg
                shadow-lg shadow-[#009FE3]/25 active:scale-[0.99] transition-all cursor-pointer
                flex items-center justify-between px-7 select-none
              "
            >
              <span className="font-mono text-xl font-black">
                {formattedTotalPrice} ₽
              </span>

              <span className="flex items-center gap-2 text-base sm:text-lg">
                {isPending ? 'Оформление заказа...' : 'Оформить заказ'}
              </span>
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};
