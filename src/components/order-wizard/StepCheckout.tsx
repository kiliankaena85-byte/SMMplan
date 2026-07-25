import React, { useRef, useState, useEffect, useActionState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SparklesIcon, AlertCircle } from "lucide-react";
import { Button } from "@heroui/react";
import { checkoutAction } from "@/actions/order/checkout";
import { slideVariants } from "./animations";

interface StepCheckoutProps {
  direction: number;
  selectedService: any;
  link: string;
  email: string;
  quantity: string | number;
  isRequirementsConfirmed: boolean;
  setLink: (val: string) => void;
  setEmail: (val: string) => void;
  setQuantity: (val: string | number) => void;
  setIsRequirementsConfirmed: (val: boolean) => void;
}

export function StepCheckout({
  direction,
  selectedService,
  link,
  email,
  quantity,
  isRequirementsConfirmed,
  setLink,
  setEmail,
  setQuantity,
  setIsRequirementsConfirmed,
}: StepCheckoutProps) {
  const quantityRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  
  const [showShakeError, setShowShakeError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formState, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    const linkValue = formData.get("link") as string || link;
    const emailValue = formData.get("email") as string || email;
    const quantityValue = formData.get("quantity") as string || quantity.toString();
    const ts = Date.now();
    
    if (!selectedService) return { error: "Пожалуйста, выберите услугу", field: "general", timestamp: ts };
    if (!linkValue) return { error: "Пожалуйста, укажите ссылку", field: "link", timestamp: ts };
    if (selectedService.clientRequirement && !isRequirementsConfirmed) {
      setShowShakeError(true);
      setTimeout(() => setShowShakeError(false), 800);
      return { error: "Пожалуйста, подтвердите требования к заказу", field: "requirement", timestamp: ts };
    }
    
    let qtyNum = parseInt(quantityValue);
    if (isNaN(qtyNum)) qtyNum = 0;

    const minQty = selectedService.minQty || 100;
    const maxQty = selectedService.maxQty || 10000;
    if (qtyNum < minQty) return { error: `Минимальное количество: ${minQty}`, field: "quantity", timestamp: ts };
    if (qtyNum > maxQty) return { error: `Максимальное количество: ${maxQty}`, field: "quantity", timestamp: ts };
    if (!emailValue || !emailValue.includes('@')) return { error: "Некорректный email", field: "email", timestamp: ts };

    try {
      const res = await checkoutAction({
        serviceId: selectedService.id,
        link: linkValue,
        quantity: qtyNum,
        email: emailValue,
        gateway: 'yookassa',
        isRequirementsConfirmed: isRequirementsConfirmed
      });

      if (res && res.success && res.data?.paymentUrl) {
         window.location.href = res.data.paymentUrl;
         return { error: "", field: "", timestamp: ts };
      } else if (res && !res.success) {
         return { error: res.error || "Ошибка валидации данных", field: "general", timestamp: ts };
      }
      return { error: "Неизвестная ошибка", field: "general", timestamp: ts };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Ошибка при создании заказа";
      return { error: errorMsg, field: "general", timestamp: ts };
    }
  }, { error: "", field: "", timestamp: 0 });

  useEffect(() => {
    if (formState.timestamp && formState.timestamp > 0 && formState.error) {
      setShakeKey(formState.timestamp);
      const fieldId = formState.field === "general" ? "form-submit-btn" : `field-${formState.field}`;
      const el = document.getElementById(fieldId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [formState.timestamp, formState.error, formState.field]);

  useEffect(() => {
    setTimeout(() => {
      if (quantityRef.current) quantityRef.current.focus();
    }, 300);
  }, []);

  if (!selectedService) return null;

  const numericQuantity = typeof quantity === 'string' ? (parseInt(quantity) || 0) : quantity;
  const price = (selectedService.pricePerUnitRub * numericQuantity).toFixed(2);

  return (
    <motion.div
      key="step-checkout"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full max-w-2xl"
    >
      <motion.div 
        layoutId={`service-card-${selectedService.id}`}
        className="bg-card border shadow-sm rounded-2xl p-4 sm:p-5 md:p-6 w-full mx-auto overflow-hidden relative"
      >
        <div className="mb-4 sm:mb-5 flex justify-between items-start gap-3 sm:gap-4">
          <div>
            <motion.h2 layoutId={`title-${selectedService.id}`} className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{selectedService.name}</motion.h2>
          </div>
          <div className="flex-shrink-0 text-right">
            <span className="text-primary font-black text-lg sm:text-xl">{selectedService.pricePerUnitRub.toFixed(2)} ₽</span>
            <span className="text-muted-foreground font-medium text-[10px] sm:text-xs block">за 1 шт.</span>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {selectedService.description && (
            <div className="mb-4 sm:mb-5 p-3 sm:p-4 rounded-xl bg-muted text-[13px] sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap shadow-inner max-h-[30vh] overflow-y-auto">
              {selectedService.description}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
            <div className="p-2.5 sm:p-3 rounded-xl bg-background shadow-sm border">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Мин. заказ</p>
              <p className="font-bold text-base sm:text-lg">{selectedService.minQty}</p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-background shadow-sm border">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Макс. заказ</p>
              <p className="font-bold text-base sm:text-lg">{selectedService.maxQty}</p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-background shadow-sm border col-span-2 sm:col-span-1 flex flex-col justify-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Скорость</p>
              <p className="font-bold text-primary text-base sm:text-lg">{selectedService.speed || 'Моментально'}</p>
            </div>
          </div>
        </motion.div>

        <hr className="border-border/10 mb-4 sm:mb-5" />

        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <form action={formAction}>
            <div id="field-quantity" className="mb-3">
              <label className="block text-xs font-bold text-foreground/80 uppercase tracking-wider mb-1 ml-1">Количество</label>
              <input
                ref={quantityRef}
                name="quantity"
                type="number"
                min={selectedService.minQty || 100}
                max={selectedService.maxQty || 10000}
                value={quantity.toString()}
                onChange={(e) => setQuantity(e.target.value)}
                onFocus={(e) => {
                  const target = e.target;
                  setTimeout(() => target.select(), 0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!link) {
                       linkRef.current?.focus();
                    } else {
                       emailRef.current?.focus();
                    }
                  }
                }}
                key={formState.field === 'quantity' ? shakeKey : undefined}
                className={`w-full bg-background text-foreground placeholder:text-muted-foreground px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border ${formState.field === 'quantity' ? '!border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-shake' : 'focus:ring-2 focus:ring-primary/20 focus:border-primary'} transition-all duration-300 text-base sm:text-lg font-bold outline-none shadow-sm`}
                placeholder={`${selectedService.minQty || 100} — ${selectedService.maxQty || 10000}`}
              />
              <AnimatePresence mode="popLayout">
                {formState.error && formState.field === "quantity" && (
                  <motion.div 
                    key={`err-qty-${shakeKey}`} 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                    animate={{ opacity: 1, height: "auto", marginTop: 8 }} 
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold shadow-sm overflow-hidden"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span role="alert">{formState.error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div id="field-link" className="mb-3">
              <label className="block text-xs font-bold text-foreground/80 uppercase tracking-wider mb-1 ml-1">Ссылка на {selectedService.targetType === 'CHANNEL' ? 'канал/профиль' : selectedService.targetType === 'POST' ? 'пост' : 'объект'}</label>
              <input 
                ref={linkRef}
                name="link"
                type="url" 
                placeholder="https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    emailRef.current?.focus();
                  }
                }}
                key={formState.field === 'link' ? shakeKey : undefined}
                className={`w-full bg-background text-foreground placeholder:text-muted-foreground px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border ${formState.field === 'link' ? '!border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-shake' : 'focus:ring-2 focus:ring-primary/20 focus:border-primary'} transition-all duration-300 text-sm sm:text-base font-medium outline-none shadow-sm`}
              />
              <AnimatePresence mode="popLayout">
                {formState.error && formState.field === "link" && (
                  <motion.div 
                    key={`err-link-${shakeKey}`} 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                    animate={{ opacity: 1, height: "auto", marginTop: 8 }} 
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold shadow-sm overflow-hidden"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span role="alert">{formState.error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div id="field-email" className="mb-3">
              <label className="block text-xs font-bold text-foreground/80 uppercase tracking-wider mb-1 ml-1">Email (для чека)</label>
              <input 
                ref={emailRef}
                name="email"
                type="email" 
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                key={formState.field === 'email' ? shakeKey : undefined}
                className={`w-full bg-background text-foreground placeholder:text-muted-foreground px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border ${formState.field === 'email' ? '!border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-shake' : 'focus:ring-2 focus:ring-primary/20 focus:border-primary'} transition-all duration-300 text-sm sm:text-base font-medium outline-none shadow-sm`}
              />
              <AnimatePresence mode="popLayout">
                {formState.error && formState.field === "email" && (
                  <motion.div 
                    key={`err-email-${shakeKey}`} 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                    animate={{ opacity: 1, height: "auto", marginTop: 8 }} 
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold shadow-sm overflow-hidden"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span role="alert">{formState.error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {selectedService.clientRequirement && (
              <div id="field-requirement" key={formState.field === 'requirement' ? shakeKey : undefined} className={`mb-4 p-4 rounded-xl border transition-all duration-300 ${isRequirementsConfirmed ? 'bg-green-50/50 border-green-200' : (showShakeError || formState.field === 'requirement') ? 'bg-red-50 border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-shake' : 'bg-amber-50/30 border-amber-200/50'}`}>
                <h4 className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider mb-1 text-foreground flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-amber-500" />
                  Чек-лист для старта
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedService.clientRequirement}
                </p>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={isRequirementsConfirmed}
                      onChange={(e) => setIsRequirementsConfirmed(e.target.checked)}
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isRequirementsConfirmed ? 'bg-green-500 border-green-500 text-white' : showShakeError ? 'border-red-500 bg-red-50' : 'border-muted-foreground/30 bg-background group-hover:border-primary/50'}`}>
                      <svg className={`w-3.5 h-3.5 pointer-events-none transition-transform duration-200 ${isRequirementsConfirmed ? 'scale-100' : 'scale-0'}`} viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 5L5 9L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <span className={`text-sm font-medium transition-colors ${isRequirementsConfirmed ? 'text-green-700' : showShakeError ? 'text-red-600' : 'text-foreground'}`}>
                    {selectedService.clientConfirmation || "Я всё проверил, можно запускать"}
                  </span>
                </label>
              </div>
            )}

            <div className="flex flex-col items-center mt-6">
              <AnimatePresence mode="popLayout">
                {formState.error && formState.field === "general" && (
                  <motion.div 
                    key={`err-gen-${shakeKey}`} 
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }} 
                    animate={{ opacity: 1, height: "auto", marginBottom: 24 }} 
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="w-full p-4 bg-red-50 border border-red-200 rounded-[1.5rem] flex items-center gap-3 shadow-[0_0_15px_rgba(239,68,68,0.2)] overflow-hidden"
                  >
                    <div className="bg-red-100 p-2 rounded-full text-red-600 flex-shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <span role="alert" className="text-red-700 font-bold text-sm">
                      {formState.error}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="w-full flex items-center justify-between mb-4 px-2">
                <span className="text-muted-foreground font-semibold">К оплате:</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-foreground">
                    {parseFloat(price) < 10 ? "10.00" : price}
                  </span>
                  <span className="text-lg font-bold text-muted-foreground">₽</span>
                </div>
              </div>
              
              {parseFloat(price) < 10 && parseFloat(price) > 0 && (
                 <div className="w-full mb-4 p-3 bg-amber-50 rounded-[1.5rem] border border-amber-200">
                   <p className="text-xs text-amber-700 font-medium text-center">
                     Минимальное пополнение — 10 ₽. Остаток зачислится на баланс.
                   </p>
                 </div>
              )}

              <Button
                id="form-submit-btn"
                type="submit"
                isPending={isPending}
                className="w-full bg-primary rounded-xl text-primary-foreground font-bold text-lg h-14 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                Оплатить заказ
              </Button>
              
              <div className="mt-4 text-center">
                <p className="text-[10px] text-muted-foreground">
                  Нажимая кнопку, вы соглашаетесь с <a href="/legal/privacy" className="underline hover:text-foreground transition-colors" target="_blank" rel="noreferrer">Политикой конфиденциальности</a> и <a href="/legal/terms" className="underline hover:text-foreground transition-colors" target="_blank" rel="noreferrer">Публичной офертой</a>
                </p>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
