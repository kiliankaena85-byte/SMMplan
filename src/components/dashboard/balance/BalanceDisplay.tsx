'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RotateCw, Wallet } from 'lucide-react';
import { refreshBalanceAction } from '@/actions/auth/refresh-balance';
import { toast } from 'sonner';

interface BalanceDisplayProps {
  initialBalance: string;
  variant: 'sidebar' | 'mobile-header';
}

export function BalanceDisplay({ initialBalance, variant }: BalanceDisplayProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const triggerRefresh = useCallback(async (isSilent = false) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await refreshBalanceAction();
      if (res.success && res.balanceRub) {
        setBalance(res.balanceRub);
        if (!isSilent) {
          toast.success('Баланс успешно обновлен!');
        }
      } else {
        if (!isSilent) {
          toast.error(res.error || 'Не удалось обновить баланс');
        }
      }
    } catch (e) {
      console.error(e);
      if (!isSilent) {
        toast.error('Произошла ошибка при обновлении баланса');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // Set up short-term polling if user manually refreshes, to catch delayed payment webhooks
  useEffect(() => {
    if (pollCount <= 0) return;

    const timer = setTimeout(() => {
      triggerRefresh(true);
      setPollCount((prev) => prev - 1);
    }, 10000); // poll every 10 seconds

    return () => clearTimeout(timer);
  }, [pollCount, triggerRefresh]);

  const handleManualClick = () => {
    triggerRefresh(false);
    // Start polling for 12 cycles (2 minutes total) to capture the webhook
    setPollCount(12);
  };

  if (variant === 'mobile-header') {
    return (
      <div className="flex items-center gap-1.5 text-foreground shrink-0 select-none">
        <span className="text-xs font-bold tabular-nums tracking-wide">{balance}</span>
        <button
          onClick={handleManualClick}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-90 cursor-pointer"
          title="Обновить баланс"
          aria-label="Обновить баланс"
          disabled={isRefreshing}
        >
          <RotateCw className={`w-3.5 h-3.5 transition-transform duration-500 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="mx-3 mt-4 p-3.5 rounded-2xl bg-primary/[0.03] border border-primary/10 shadow-sm relative overflow-hidden group">
      {/* Light glow pattern inside balance card */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] uppercase font-extrabold text-muted-foreground/80 tracking-wider">
          Баланс
        </span>
        <button
          onClick={handleManualClick}
          className="p-1 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200 active:scale-90 cursor-pointer"
          title="Обновить баланс"
          aria-label="Обновить баланс"
          disabled={isRefreshing}
        >
          <RotateCw className={`w-3.5 h-3.5 transition-transform duration-500 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>
      
      <div className="text-xl font-black text-foreground tabular-nums tracking-tight mb-2">
        {balance}
      </div>

      <Link
        href="/dashboard/add-funds"
        className="w-full flex items-center justify-center gap-1.5 text-xs font-extrabold bg-primary text-primary-foreground rounded-xl py-2 shadow-sm shadow-primary/20 hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
      >
        <Wallet className="w-3.5 h-3.5" />
        <span>Пополнить</span>
      </Link>
    </div>
  );
}
