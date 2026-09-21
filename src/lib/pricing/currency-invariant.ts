import { db } from '@/lib/db';
import { SettingsProvider } from '@/lib/settings';

/**
 * PAIRED CURRENCY SNAPSHOT (P0-1)
 * Every Service row stores BOTH the provider raw rate AND its RUB equivalent
 * captured at the same instant. Runtime code MUST read costPer1kRub directly,
 * never recomputing from rawRate × currency in public-facing endpoints.
 */
export interface CurrencySnapshot {
  rawRate: number;           // Provider's raw rate (whatever unit they returned)
  currency: 'USD' | 'RUB' | 'EUR' | 'UAH' | 'KZT';
  costPer1kRub: number;      // FROZEN base cost in RUB per 1000 units
  usdRateAtCapture: number;  // Exchange rate used for the audit trail
  capturedAt: Date;          // Timestamp for audit / staleness monitoring
}

export type SupportedCurrency = 'USD' | 'RUB' | 'EUR' | 'UAH' | 'KZT';

export const SUPPORTED_CURRENCIES: readonly SupportedCurrency[] = ['USD', 'RUB', 'EUR', 'UAH', 'KZT'] as const;

export function normalizeProviderCurrency(currency: unknown): SupportedCurrency | null {
  if (!currency || typeof currency !== 'string') return null;
  const upper = currency.toUpperCase().trim();
  if (upper === 'RUR') return 'RUB';
  if ((SUPPORTED_CURRENCIES as readonly string[]).includes(upper)) {
    return upper as SupportedCurrency;
  }
  return null;
}

export function isValidProviderCurrency(currency: unknown): currency is SupportedCurrency {
  return normalizeProviderCurrency(currency) !== null;
}

export interface CustomCrossRates {
  eurToUsd?: number;
  uahToUsd?: number;
  kztToUsd?: number;
  updatedAt?: Date;
}

/**
 * CANONICAL COST INVARIANT (P0-1)
 * Calculates the exact cost in RUB for a given provider rate and currency.
 *
 * Fail-Closed Invariants:
 * 1. Forbids silent fallback to USD (throws on missing/unsupported currency).
 * 2. Strict rates & positive multipliers.
 * 3. Supports dynamic cross-rates with safe compile-time fallbacks.
 */
export function getCostRub(
  rate: number,
  currency: string,
  usdRate: number,
  crossRates?: CustomCrossRates
): number {
  if (typeof rate !== 'number' || !isFinite(rate) || rate < 0) {
    throw new Error(`INVALID_RATE: rate must be a non-negative finite number, got ${rate}`);
  }

  if (!currency || typeof currency !== 'string') {
    throw new Error(`CURRENCY_UNSUPPORTED: currency is required (rate=${rate})`);
  }

  const normalized = currency.toUpperCase().trim();

  let cost: number;
  switch (normalized) {
    case 'RUB':
      cost = rate;
      break;
    case 'USD':
      if (typeof usdRate !== 'number' || !isFinite(usdRate) || usdRate <= 0) {
        throw new Error(`INVALID_USD_RATE: usdRate must be a positive number, got ${usdRate}`);
      }
      cost = rate * usdRate;
      break;
    case 'EUR':
      if (typeof usdRate !== 'number' || !isFinite(usdRate) || usdRate <= 0) {
        throw new Error(`INVALID_USD_RATE: usdRate must be a positive number, got ${usdRate}`);
      }
      const eurFactor = crossRates?.eurToUsd && crossRates.eurToUsd > 0 ? crossRates.eurToUsd : 1.08;
      cost = rate * eurFactor * usdRate;
      break;
    case 'UAH':
      if (typeof usdRate !== 'number' || !isFinite(usdRate) || usdRate <= 0) {
        throw new Error(`INVALID_USD_RATE: usdRate must be a positive number, got ${usdRate}`);
      }
      const uahFactor = crossRates?.uahToUsd && crossRates.uahToUsd > 0 ? crossRates.uahToUsd : 0.027;
      cost = rate * uahFactor * usdRate;
      break;
    case 'KZT':
      if (typeof usdRate !== 'number' || !isFinite(usdRate) || usdRate <= 0) {
        throw new Error(`INVALID_USD_RATE: usdRate must be a positive number, got ${usdRate}`);
      }
      const kztFactor = crossRates?.kztToUsd && crossRates.kztToUsd > 0 ? crossRates.kztToUsd : 0.0023;
      cost = rate * kztFactor * usdRate;
      break;
    default:
      // FAIL LOUD / FAIL CLOSED — strictly forbid silent fallback to USD
      throw new Error(`CURRENCY_UNSUPPORTED: ${currency} (rate=${rate})`);
  }

  if (!isFinite(cost) || cost < 0) {
    throw new Error(`CURRENCY_CONVERSION_INVALID: ${rate} ${currency} → ${cost} RUB`);
  }

  return Math.round(cost * 10000) / 10000;
}

export async function buildCurrencySnapshot(
  rawRate: number,
  providerCurrency: string
): Promise<CurrencySnapshot> {
  if (!providerCurrency || typeof providerCurrency !== 'string') {
    throw new Error(`CURRENCY_UNSUPPORTED: providerCurrency is required (rate=${rawRate})`);
  }
  const currency = providerCurrency.toUpperCase().trim() as CurrencySnapshot['currency'];
  let usdRate = 95.0;
  try {
    const fetched = await SettingsProvider.getExchangeRateUSD();
    if (fetched && fetched > 0) usdRate = fetched;
  } catch {
    usdRate = 95.0;
  }

  const costPer1kRub = getCostRub(rawRate, currency, usdRate);

  // Sanity check: cost must be finite and positive for active services
  if (!isFinite(costPer1kRub) || costPer1kRub <= 0) {
    throw new Error(`CURRENCY_CONVERSION_INVALID: ${rawRate} ${currency} → ${costPer1kRub} RUB`);
  }

  return {
    rawRate,
    currency,
    costPer1kRub,
    usdRateAtCapture: usdRate,
    capturedAt: new Date()
  };
}

/**
 * PROVIDER CURRENCY CHANGE DETECTOR (P0-2)
 * If provider's balanceCurrency changes or existing services have mismatched currencies,
 * all existing Service rows need a fresh snapshot before catalog synchronization.
 */
export async function detectCurrencyChange(
  providerId: string,
  newCurrency: string
): Promise<{ changed: boolean; oldCurrency: string | null; serviceCount: number }> {
  const normalizedNew = normalizeProviderCurrency(newCurrency) || (newCurrency || 'USD').toUpperCase().trim();
  const provider = await db.provider.findUnique({
    where: { id: providerId },
    select: { balanceCurrency: true }
  });

  const oldCurrency = provider?.balanceCurrency ? provider.balanceCurrency.toUpperCase().trim() : null;
  const currencyDiffers = !oldCurrency || oldCurrency !== normalizedNew;

  const mismatchedServicesCount = await db.service.count({
    where: {
      providerId,
      providerCurrency: { not: normalizedNew }
    }
  });

  if (currencyDiffers || mismatchedServicesCount > 0) {
    const serviceCount = await db.service.count({
      where: { providerId }
    });
    return { changed: true, oldCurrency: oldCurrency || 'USD', serviceCount };
  }

  return { changed: false, oldCurrency, serviceCount: 0 };
}

/**
 * BULK RE-SNAPSHOT when provider currency changes
 * Called before shadow catalog refresh or on balance auto-sync so existing Service rows
 * get fresh costPer1kRub and pricePer1000Cents BEFORE new services land.
 */
export async function resnapshotOnCurrencyChange(
  providerId: string,
  oldCurrency: string,
  newCurrency: string
): Promise<number> {
  const normalizedNew = normalizeProviderCurrency(newCurrency) || (newCurrency || 'USD').toUpperCase().trim();
  const services = await db.service.findMany({
    where: { providerId },
    select: { id: true, rate: true, providerCurrency: true, markup: true }
  });

  let updated = 0;
  for (const svc of services) {
    try {
      const snapshot = await buildCurrencySnapshot(svc.rate, normalizedNew);
      const markup = svc.markup && svc.markup > 0 ? svc.markup : 2.0;
      await db.service.update({
        where: { id: svc.id },
        data: {
          providerCurrency: normalizedNew,
          costPer1kRub: snapshot.costPer1kRub,
          currencyCapturedAt: snapshot.capturedAt,
          usdRateAtCapture: snapshot.usdRateAtCapture,
          // Recompute retail from new base cost
          pricePer1000Cents: Math.round(snapshot.costPer1kRub * markup * 100)
        }
      });
      updated++;
    } catch (err) {
      console.error(`[CurrencyResnapshot] Failed for service ${svc.id}:`, err);
    }
  }

  // Ensure Provider.balanceCurrency in PostgreSQL matches normalizedNew
  try {
    await db.provider.update({
      where: { id: providerId },
      data: { balanceCurrency: normalizedNew }
    });
  } catch (provErr) {
    console.warn(`[CurrencyResnapshot] Failed to update balanceCurrency for provider ${providerId}:`, provErr);
  }

  try {
    await db.routingAuditLog.create({
      data: {
        serviceId: 'SYSTEM',
        action: 'PROVIDER_CURRENCY_CHANGED',
        reason: `Provider currency changed ${oldCurrency} → ${normalizedNew}, resnapshotted ${updated} services`
      }
    });
  } catch (auditErr) {
    console.warn(`[CurrencyResnapshot] Failed to create routingAuditLog:`, auditErr);
  }

  return updated;
}

/**
 * Reconciles provider currency changes and resnapshots services if mismatched
 */
export async function reconcileCurrencyBeforeSync(
  providerId: string,
  newBalanceCurrency: string
): Promise<{ resnapshotted: boolean; serviceCount: number }> {
  const normalizedNew = normalizeProviderCurrency(newBalanceCurrency) || (newBalanceCurrency || 'USD').toUpperCase().trim();
  const change = await detectCurrencyChange(providerId, normalizedNew);
  if (!change.changed) {
    return { resnapshotted: false, serviceCount: 0 };
  }

  const updated = await resnapshotOnCurrencyChange(providerId, change.oldCurrency || 'USD', normalizedNew);
  return { resnapshotted: true, serviceCount: updated };
}
