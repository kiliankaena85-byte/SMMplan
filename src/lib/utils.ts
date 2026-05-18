import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCents(cents: number | undefined | null, decimals: number = 2): string {
  if (!cents) return decimals === 0 ? "0" : (0).toFixed(decimals);
  return (Math.round(cents) / 100).toFixed(decimals);
}

export function formatBalance(balanceCents: bigint | number): string {
  const cents = typeof balanceCents === 'bigint' 
    ? Number(balanceCents) 
    : balanceCents;
  
  // Guard: отрицательный баланс отображаем как 0.00 ₽
  const safeCents = Math.max(0, Math.floor(cents));
  
  const rubles = Math.floor(safeCents / 100);
  const remainder = safeCents % 100;
  
  return `${rubles.toLocaleString('ru-RU')}.${String(remainder).padStart(2, '0')} ₽`;
}
