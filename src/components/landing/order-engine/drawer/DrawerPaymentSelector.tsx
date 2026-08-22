'use client';

import React from "react";
import { Check, CreditCard, Coins, Wallet } from "lucide-react";

interface DrawerPaymentSelectorProps {
  gateway: "yookassa" | "cryptobot" | "balance";
  setGateway: (g: "yookassa" | "cryptobot" | "balance") => void;
  userBalanceCents?: number;
  totalCents: number;
}

export function DrawerPaymentSelector({
  gateway,
  setGateway,
  userBalanceCents = 0,
  totalCents
}: DrawerPaymentSelectorProps) {
  const showBalanceOption = userBalanceCents >= totalCents;

  const paymentMethods = [
    {
      id: "yookassa" as const,
      name: "Карта РФ / СБП",
      description: "Оплата через ЮKassa или Систему быстрых платежей",
      icon: CreditCard,
      color: "text-primary border-primary/20 bg-primary/5"
    },
    {
      id: "cryptobot" as const,
      name: "CryptoBot",
      description: "Оплата криптовалютой (USDT, TON и др.)",
      icon: Coins,
      color: "text-warning border-warning/20 bg-warning/5"
    },
    ...(showBalanceOption ? [{
      id: "balance" as const,
      name: "Личный баланс",
      description: `Баланс: ${(userBalanceCents / 100).toFixed(2)} ₽`,
      icon: Wallet,
      color: "text-success border-success/20 bg-success/5"
    }] : [])
  ];

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-3.5 shadow-sm">
      <label className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wider block">
        Способ оплаты
      </label>

      <div className="flex flex-col gap-2.5">
        {paymentMethods.map((method) => {
          const isSelected = gateway === method.id;
          const Icon = method.icon;

          return (
            <button
              key={method.id}
              type="button"
              onClick={() => setGateway(method.id)}
              className={`w-full min-h-[56px] p-3.5 rounded-xl border text-left flex items-center gap-3.5 transition-all duration-200 active:scale-[0.99] cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-xs"
                  : "border-border/80 bg-background hover:border-border hover:bg-content2"
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${isSelected ? method.color : "bg-content2 text-foreground/70 border border-border/80"}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-black text-foreground leading-tight">
                  {method.name}
                </p>
                <p className="text-xs text-muted-foreground font-semibold mt-0.5 truncate leading-tight">
                  {method.description}
                </p>
              </div>
              {isSelected && (
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs self-center">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
