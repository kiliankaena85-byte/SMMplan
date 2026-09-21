/**
 * (c) 2024-2026 OmniSMM 1.0. All rights reserved.
 * 
 * Domain Types for Silo Internal Linking Architecture (Yandex 2026 YATI & Proxima).
 * Layer: Level 0 (Domain & Pure Invariants).
 */

export type SiloActivityType =
  | 'FOLLOWERS'
  | 'LIKES'
  | 'VIEWS'
  | 'REPOSTS'
  | 'COMMENTS'
  | 'VOTES'
  | 'BOOSTS'
  | 'OTHER';

export interface SiloCategoryLink {
  id: string;
  name: string;
  slug: string;
  networkSlug: string;
  networkName: string;
  activityType: SiloActivityType;
  canonicalUrl: string;
  minPricePerUnitRub?: number;
  servicesCount?: number;
}

export interface SiloServiceLink {
  id: string;
  numericId: number;
  name: string;
  slug: string | null;
  networkSlug: string;
  networkName: string;
  categorySlug: string;
  categoryName: string;
  activityType: SiloActivityType;
  pricePerUnitRub: number;
  minQty: number;
  maxQty: number;
  canonicalUrl: string;
  speedClass?: string | null;
  hasRefill?: boolean;
}

export interface SiloRecommendationBundle {
  targetActivityType: SiloActivityType;
  headline: string;
  subheadline: string;
  complementaryCategories: SiloCategoryLink[];
  complementaryServices: SiloServiceLink[];
  tenantId: string;
  siteName: string;
}
