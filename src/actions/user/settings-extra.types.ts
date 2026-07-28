export interface CompanyRequisitesInput {
  companyName?: string | null;
  inn?: string | null;
  kpp?: string | null;
  legalAddress?: string | null;
}

export interface UpdateCompanyRequisitesResult {
  success: boolean;
  error?: string;
}

export interface B2bWebhookInput {
  webhookUrl?: string | null;
  isWebhookActive?: boolean;
  regenerateSecret?: boolean;
}

export interface UpdateB2bWebhookResult {
  success: boolean;
  error?: string;
  webhookSecret?: string | null;
  webhookUrl?: string | null;
  isWebhookActive?: boolean;
}

export interface Confirm152FzConsentResult {
  success: boolean;
  error?: string;
  tosAcceptedAt?: Date | string | null;
  tosAcceptedIp?: string | null;
}

export interface ApiKeyActionResult {
  success: boolean;
  apiKey?: string;
  error?: string;
}
