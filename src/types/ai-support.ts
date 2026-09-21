export type AiSupportMode = 'DISABLED' | 'WHITELIST_ONLY' | 'CANARY' | 'ALL_USERS';

export type AiHandlingState = 'ACTIVE' | 'SUSPENDED_BY_STAFF' | 'ESCALATED' | 'QUOTA_OFF';

export interface LayaIntent {
  category: 'order_status' | 'drop_refill' | 'payment_billing' | 'link_technical' | 'refund_complaint' | 'general_faq';
  confidence: number; // 0.0 .. 1.0
}

export interface LayaSentiment {
  level: 0 | 1 | 2 | 3; // 0: Calm, 1: Impatient, 2: Angry, 3: Hostile/Legal
  label: 'CALM' | 'IMPATIENT' | 'ANGRY' | 'HOSTILE';
  confidence: number;
}

export interface LayaEscalation {
  shouldEscalate: boolean;
  probability: number; // 0.0 .. 1.0
  reason?: string;
}

export interface LayaDecisionResult {
  intent: LayaIntent;
  sentiment: LayaSentiment;
  escalation: LayaEscalation;
  source: 'TIER_0_REGEX' | 'TIER_1_LAYA' | 'TIER_2_FALLBACK';
  latencyMs: number;
}

export interface PiiScrubResult {
  scrubbedText: string;
  tokensMap: Record<string, string>;
  hasSensitiveData: boolean;
}

export interface SafeOrderSnapshot {
  id: string;
  serviceName: string;
  network: string;
  status: string;
  quantity: number;
  remains: number;
  chargeRub: string;
  createdAt: string;
  hasRefillGuarantee: boolean;
  safeErrorSummary?: string;
}

export interface ClientContextSnapshot {
  user: {
    anonymousId: string;
    registrationDays: number;
    balanceRub: string;
    bonusBalanceRub: string;
    customerTier: 'NEW' | 'REGULAR' | 'VIP';
  };
  recentOrders: SafeOrderSnapshot[];
  recentPayments: Array<{
    amountRub: string;
    status: string;
    gateway: string;
    createdAt: string;
  }>;
  relevantKnowledge?: string;
  allowedNumbers: string[];
}

export interface GroundingCheckResult {
  isGrounded: boolean;
  ungroundedNumbers: string[];
  confidence: number;
}

export interface DlpCheckResult {
  cleanText: string;
  blocked: boolean;
  violation?: 'DETECTED_TARGET_LINK_LEAK' | 'DETECTED_API_KEY_OR_TOKEN' | 'DETECTED_SYSTEM_PROMPT_LEAK' | 'LEGAL_LIABILITY_ADMISSION';
}
