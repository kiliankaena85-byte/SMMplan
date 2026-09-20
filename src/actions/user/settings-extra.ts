'use server';

/**
 * User Settings Extra Actions Facade
 * Provides 100% backward-compatible exports for all user settings actions.
 * Concrete implementations are decomposed into domain-specific modules in './settings/'.
 * Next.js 'use server' requires every export to be an async function.
 */

import {
  updateTaxRequisitesAction as _updateTaxRequisitesAction,
  updateCompanyRequisitesAction as _updateCompanyRequisitesAction,
} from './settings/requisites.action';

import {
  updateApiWebhookAction as _updateApiWebhookAction,
} from './settings/webhook.action';

import {
  confirm152FzConsentAction as _confirm152FzConsentAction,
} from './settings/consent.action';

import {
  generateApiKeyAction as _generateApiKeyAction,
  resetApiKeyAction as _resetApiKeyAction,
  revokeApiKeyAction as _revokeApiKeyAction,
} from './settings/api-key.action';

import {
  getTelegramBindDetailsAction as _getTelegramBindDetailsAction,
  updateTelegramNotificationSettingsAction as _updateTelegramNotificationSettingsAction,
  unbindTelegramAction as _unbindTelegramAction,
} from './settings/telegram.action';

export async function updateTaxRequisitesAction(...args: Parameters<typeof _updateTaxRequisitesAction>) {
  return _updateTaxRequisitesAction(...args);
}

export async function updateCompanyRequisitesAction(...args: Parameters<typeof _updateCompanyRequisitesAction>) {
  return _updateCompanyRequisitesAction(...args);
}

export async function updateApiWebhookAction(...args: Parameters<typeof _updateApiWebhookAction>) {
  return _updateApiWebhookAction(...args);
}

export async function confirm152FzConsentAction(...args: Parameters<typeof _confirm152FzConsentAction>) {
  return _confirm152FzConsentAction(...args);
}

export async function generateApiKeyAction(...args: Parameters<typeof _generateApiKeyAction>) {
  return _generateApiKeyAction(...args);
}

export async function resetApiKeyAction(...args: Parameters<typeof _resetApiKeyAction>) {
  return _resetApiKeyAction(...args);
}

export async function revokeApiKeyAction(...args: Parameters<typeof _revokeApiKeyAction>) {
  return _revokeApiKeyAction(...args);
}

export async function getTelegramBindDetailsAction(...args: Parameters<typeof _getTelegramBindDetailsAction>) {
  return _getTelegramBindDetailsAction(...args);
}

export async function updateTelegramNotificationSettingsAction(...args: Parameters<typeof _updateTelegramNotificationSettingsAction>) {
  return _updateTelegramNotificationSettingsAction(...args);
}

export async function unbindTelegramAction(...args: Parameters<typeof _unbindTelegramAction>) {
  return _unbindTelegramAction(...args);
}
