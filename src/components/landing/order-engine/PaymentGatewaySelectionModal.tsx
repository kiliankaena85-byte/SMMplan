import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Wallet, ChevronRight, Loader2, Coins, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentGatewaySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalPriceFormatted: string;
  isSubmitting: boolean;
  onSelectGateway: (gateway: string) => void;
}

export function PaymentGatewaySelectionModal({
  isOpen,
  onClose,
  totalPriceFormatted,
  isSubmitting,
  onSelectGateway,
}: PaymentGatewaySelectionModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("yookassa");
  const [available, setAvailable] = useState<{ yookassa: boolean; robokassa: boolean; cryptobot: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      import("@/actions/order/checkout").then(({ getAvailableGatewaysAction }) => {
        getAvailableGatewaysAction().then((res) => {
          if (res.success && res.data) {
            setAvailable(res.data);
            const active = res.data;
            if (!active[selectedMethod as keyof typeof active]) {
              const firstAvailable = ["yookassa", "robokassa", "cryptobot"].find(
                (id) => active[id as keyof typeof active]
              );
              if (firstAvailable) {
                setSelectedMethod(firstAvailable);
              }
            }
          }
        });
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePay = () => {
    onSelectGateway(selectedMethod);
  };

  const methods = [
    {
      id: "yookassa",
      label: "Карты РФ и СБП",
      note: "Мгновенное зачисление, без комиссии",
      icon: CreditCard,
      color: "text-primary bg-primary/10 border-primary/20",
      badge: "Комиссия 0%",
    },
    {
      id: "robokassa",
      label: "Зарубежные карты и кошельки",
      note: "Оплата картами СНГ и другими способами",
      icon: Coins,
      color: "text-info bg-info/10 border-info/20",
    },
    {
      id: "cryptobot",
      label: "Криптовалюта",
      note: "USDT, TON, BTC, ETH. Анонимно и без лимитов",
      icon: Wallet,
      color: "text-warning-text bg-warning/10 border-warning/20",
    },
  ];

  const filteredMethods = methods.filter((m) => {
    if (!available) return true; // Show all while loading
    return available[m.id as keyof typeof available];
  });


  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[350] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-card rounded-[1.5rem] sm:rounded-[2rem] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.2)] p-4 sm:p-6 md:p-8 w-full max-w-lg relative border border-border/60"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-black text-foreground">Способ оплаты</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Выберите удобную платежную систему для завершения
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-full bg-default-100 hover:bg-default-200 flex items-center justify-center transition-colors active:scale-90 shrink-0"
              title="Закрыть"
              aria-label="Закрыть модальное окно"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Amount Box */}
          <div className="bg-default-100 rounded-2xl p-4 flex justify-between items-center mb-6 border border-border/50 shadow-inner">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">К оплате:</span>
            <span className="text-2xl font-black text-foreground tabular-nums">
              {totalPriceFormatted} <span className="text-primary ml-0.5">₽</span>
            </span>
          </div>

          {/* Payment Methods Grid */}
          <div className="space-y-3 mb-6">
            {available !== null && filteredMethods.length === 0 ? (
              <div className="p-5 bg-default-100/50 border border-border/50 rounded-2xl text-center text-sm text-muted-foreground">
                <p className="font-bold text-foreground mb-1">Оплата временно недоступна 🛠️</p>
                Пожалуйста, напишите в поддержку, и мы быстро решим вопрос.
              </div>
            ) : (
              filteredMethods.map(({ id, label, note, icon: Icon, color, badge }) => {
                const isSelected = selectedMethod === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(20);
                      setSelectedMethod(id);
                    }}
                    className={`w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border text-left transition-all duration-200 active:scale-[0.99] group ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/50 bg-background hover:border-primary/40 hover:bg-default-50"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${color} transition-transform duration-200 group-hover:scale-105`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-extrabold text-foreground tracking-tight leading-tight flex items-center gap-2">
                        {label}
                        {badge && (
                          <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success-text ring-1 ring-inset ring-success/20">
                            {badge}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-snug break-words">
                        {note}
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground scale-100"
                        : "border-border scale-90"
                    }`}>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-card" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Action Row */}
          <div className="flex flex-col gap-3 mt-2">
            <Button
              onClick={handlePay}
              disabled={isSubmitting || (available !== null && filteredMethods.length === 0)}
              className="h-14 w-full rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Оплатить {totalPriceFormatted} ₽{" "}
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5" />
              <span>Безопасная оплата. Данные защищены 256-битным шифрованием.</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
