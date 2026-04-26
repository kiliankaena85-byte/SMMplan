/**
 * Strict DTO for catalog table.
 * NEVER include rate (provider cost) in client DTOs.
 * markupX is safe: it's the user-visible multiplier.
 */
export interface CatalogServiceDTO {
  id: string;
  numericId: number;
  name: string;
  externalId: string | null;
  categoryId: string;
  categoryName: string;
  networkSlug: string | null;
  /** Provider cost per 1000 — visible only in admin, never to clients */
  rate: number;
  markup: number;
  minQty: number;
  maxQty: number;
  isActive: boolean;
  isQuarantined: boolean;
  quarantineReason: string | null;
  isDripFeedEnabled: boolean;
  isRefillEnabled: boolean;
  isCancelEnabled: boolean;
  ordersCount: number;
}
