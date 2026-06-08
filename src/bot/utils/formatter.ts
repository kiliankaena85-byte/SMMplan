/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
/**
 * Экранирует спецсимволы HTML для безопасной отправки в Telegram с parse_mode: HTML.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function escapeHtml(text: any): string {
    if (text === null || text === undefined) return '';
    const str = String(text);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

import { applyBeautifulRounding } from '@/lib/financial-constants';

/**
 * Calculates the price per unit in RUB for a service.
 */
export function calculatePricePerUnit(
  service: { rate: number; markup: number; providerCurrency: string },
  usdToRub: number
): number {
  const isRub = service.providerCurrency === 'RUB';
  const exchangeRate = isRub ? 1.0 : usdToRub;
  const pricePer1kRub = applyBeautifulRounding(service.rate * service.markup * exchangeRate);
  return pricePer1kRub / 1000;
}

/**
 * Formats a unit price to a clean string representation.
 */
export function formatPricePerUnit(price: number): string {
  if (price === 0) return '0.00';
  let formatted: string;
  if (price < 0.01) {
    formatted = price.toFixed(6);
  } else if (price < 0.1) {
    formatted = price.toFixed(4);
  } else {
    formatted = price.toFixed(2);
  }
  
  if (formatted.includes('.')) {
    while (formatted.endsWith('0') && formatted.split('.')[1].length > 2) {
      formatted = formatted.slice(0, -1);
    }
  }
  return formatted;
}



