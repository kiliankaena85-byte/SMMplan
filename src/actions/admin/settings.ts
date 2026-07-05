'use server';

import crypto from 'crypto';
import { requireStaffPermission, requireOwnerPermission } from '@/lib/server/rbac';
import { roleSchema, globalSettingsSchema } from '@/validators/admin.validators';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { settingsService } from '@/services/admin/settings.service';
import { catalogQueue } from '@/workers/queues';
import { VaultService } from '@/lib/vault';
import { auditAdmin, auditAdminAwaitable } from '@/lib/admin-audit';
import { getClientIp } from '@/utils/ip';


// ── User Role Update ──
export async function updateUserRole(formData: FormData) {
  const result = await requireOwnerPermission(async (admin) => {
    const parsed = roleSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { success: false as const, error: 'Некорректные данные' };
    const { userId: targetUserId, role: newRole, staffRoleId } = parsed.data;

    if (targetUserId === admin.id) throw new Error('Cannot change own role');

    // SECURITY: Only OWNER can assign high-level administrative roles
    if (['ADMIN', 'OWNER'].includes(newRole) && admin.role !== 'OWNER') {
      return { success: false as const, error: 'Только Владелец может назначать роли Админ или Владелец' };
    }

    const targetUser = await db.user.findUnique({ where: { id: targetUserId }, select: { role: true, email: true } });
    if (!targetUser) return { success: false as const, error: 'Пользователь не найден' };

    // SECURITY: Only OWNER can change roles of existing ADMINs or OWNERs
    if (['ADMIN', 'OWNER'].includes(targetUser.role) && admin.role !== 'OWNER') {
      return { success: false as const, error: 'Только Владелец может изменять права администраторов' };
    }

    const finalStaffRoleId = staffRoleId === 'NONE' || !staffRoleId ? null : staffRoleId;
    await settingsService.updateUserRole(targetUserId, newRole, finalStaffRoleId);

    const ipAddress = await getClientIp();

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'USER_ROLE_CHANGE',
      target: targetUserId,
      targetType: 'USER',
      oldValue: { email: targetUser.email, role: targetUser.role },
      newValue: { role: newRole },
      ipAddress
    });


    revalidatePath('/admin/settings');
    return { success: true as const };
  });

  if (result && typeof result === 'object' && 'success' in result && !result.success) {
    throw new Error(result.error);
  }
}


// ── System Settings Update ──
export async function updateGlobalSettings(formData: FormData) {
  if (!formData || typeof formData.entries !== 'function') {
    return { success: false, errors: { _form: ["Некорректные данные формы"] } };
  }
  const result = await requireStaffPermission("settings", "edit", async (user) => {
    const parsed = globalSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { 
        success: false as const, 
        errors: parsed.error.flatten().fieldErrors 
      };
    }
    
    const {
      siteName,
      siteDescription,
      usnScheme,
      welcomeMessage,
      yookassaShopId,
      yookassaSecretKey: rawYookassaSecret,
      yookassaTestShopId,
      yookassaTestSecretKey: rawYookassaTestSecret,
      cryptoBotToken: rawCryptoBotToken,
      robokassaLogin,
      robokassaPassword: rawRobokassaPassword,
      robokassaWebhookPassword: rawRobokassaWebhookPassword,
      exchangeRateUSD,
      emailProvider,
      resendApiKey: rawResendApiKey,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword: rawSmtpPassword,
      supportEmailDomain,
      inboundEmailWebhookSecret: rawInboundSecret,
      contactSupportEmail,
      contactPrivacyEmail,
      contactTelegramBot,
      contactTelegramChannel,
      contactWhatsApp,
      contactVk,
      legalCompanyName,
      legalCompanyInn,
      legalCompanyOgrnip,
      legalCompanyAddress,
      taxRate,
      opexMonthly,
      quarantineThreshold,
      globalMarkup,
      safetyFloor,
      siteLogoUrl,
      siteFaviconUrl,
    } = parsed.data;

    const oldSettings = await db.systemSettings.findUnique({ where: { id: 'global' } });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataToUpdate: any = {};
    if (formData.has('_isGeneralSettings')) {
      dataToUpdate.maintenanceMode = formData.has('maintenanceMode');
    }
    if (formData.has('siteName')) dataToUpdate.siteName = siteName;
    if (formData.has('siteDescription')) dataToUpdate.siteDescription = siteDescription;
    if (formData.has('usnScheme')) dataToUpdate.usnScheme = usnScheme;
    if (formData.has('contactSupportEmail')) dataToUpdate.contactSupportEmail = contactSupportEmail;
    if (formData.has('contactPrivacyEmail')) dataToUpdate.contactPrivacyEmail = contactPrivacyEmail;
    if (formData.has('contactTelegramBot')) dataToUpdate.contactTelegramBot = contactTelegramBot;
    if (formData.has('contactTelegramChannel')) dataToUpdate.contactTelegramChannel = contactTelegramChannel;
    if (formData.has('contactWhatsApp')) dataToUpdate.contactWhatsApp = contactWhatsApp;
    if (formData.has('contactVk')) dataToUpdate.contactVk = contactVk;
    if (formData.has('legalCompanyName')) dataToUpdate.legalCompanyName = legalCompanyName;
    if (formData.has('legalCompanyInn')) dataToUpdate.legalCompanyInn = legalCompanyInn;
    if (formData.has('legalCompanyOgrnip')) dataToUpdate.legalCompanyOgrnip = legalCompanyOgrnip;
    if (formData.has('legalCompanyAddress')) dataToUpdate.legalCompanyAddress = legalCompanyAddress;
    if (formData.has('welcomeMessage') && welcomeMessage !== null) dataToUpdate.welcomeMessage = welcomeMessage;
    
    // Finance & Taxes
    if (formData.has('taxRate') && taxRate !== undefined) dataToUpdate.taxRate = taxRate;
    if (formData.has('opexMonthly') && opexMonthly !== undefined) {
      dataToUpdate.opexMonthly = Math.round(opexMonthly * 100);
    }
    
    // Branding
    if (formData.has('siteLogoUrl')) dataToUpdate.siteLogoUrl = siteLogoUrl;
    if (formData.has('siteFaviconUrl')) dataToUpdate.siteFaviconUrl = siteFaviconUrl;

    // Catalog & Pricing
    if (formData.has('globalMarkup') && globalMarkup !== undefined) dataToUpdate.globalMarkup = globalMarkup;
    if (formData.has('safetyFloor') && safetyFloor !== undefined) dataToUpdate.safetyFloor = safetyFloor;
    if (formData.has('quarantineThreshold') && quarantineThreshold !== undefined) {
      dataToUpdate.quarantineThreshold = quarantineThreshold / 100;
    }

    let isRateChanged = false;
    let finalExchangeRate = exchangeRateUSD;

    if (exchangeRateUSD !== undefined && exchangeRateUSD >= 0) {
      if (exchangeRateUSD === 0) {
        // Trigger CBR sync immediately
        try {
          const { CBRRateService } = await import('@/services/system/cbr-rate.service');
          const syncResult = await CBRRateService.syncCBRExchangeRate();
          if (syncResult.updated) {
            finalExchangeRate = syncResult.systemRate;
            dataToUpdate.exchangeRateUSD = finalExchangeRate;
            dataToUpdate.exchangeRateUpdatedAt = new Date();
            isRateChanged = true;
          } else {
            finalExchangeRate = syncResult.systemRate || 95.0;
            dataToUpdate.exchangeRateUSD = finalExchangeRate;
            isRateChanged = true;
          }
        } catch (syncErr) {
          console.error('[SettingsAction] Failed to sync CBR rate on 0 input:', syncErr);
        }
      } else {
        if (oldSettings?.exchangeRateUSD !== exchangeRateUSD) {
          dataToUpdate.exchangeRateUSD = exchangeRateUSD;
          dataToUpdate.exchangeRateUpdatedAt = null; // Clear sync timestamp to indicate manual mode
          isRateChanged = true;
        }
      }
    }

    // Helper to prevent overwriting secrets with placeholders
    const isPlaceholder = (val?: string | null) => !val || val.trim() === '' || val.includes('•••');

    // Only update secrets if they are provided (prevent overwriting with empty or placeholders)
    if (formData.has('yookassaShopId')) dataToUpdate.yookassaShopId = yookassaShopId;
    if (rawYookassaSecret && !isPlaceholder(rawYookassaSecret)) dataToUpdate.yookassaSecretKey = VaultService.encrypt(rawYookassaSecret);
    if (formData.has('yookassaTestShopId')) dataToUpdate.yookassaTestShopId = yookassaTestShopId;
    if (rawYookassaTestSecret && !isPlaceholder(rawYookassaTestSecret)) dataToUpdate.yookassaTestSecretKey = VaultService.encrypt(rawYookassaTestSecret);
    if (rawCryptoBotToken && !isPlaceholder(rawCryptoBotToken)) dataToUpdate.cryptoBotToken = VaultService.encrypt(rawCryptoBotToken);
    
    if (formData.has('robokassaLogin')) dataToUpdate.robokassaLogin = robokassaLogin;
    if (rawRobokassaPassword && !isPlaceholder(rawRobokassaPassword)) dataToUpdate.robokassaPassword = VaultService.encrypt(rawRobokassaPassword);
    if (rawRobokassaWebhookPassword && !isPlaceholder(rawRobokassaWebhookPassword)) dataToUpdate.robokassaWebhookPassword = VaultService.encrypt(rawRobokassaWebhookPassword);

    // Email / SMTP settings
    if (formData.has('emailProvider') && emailProvider !== undefined) dataToUpdate.emailProvider = emailProvider;
    if (rawResendApiKey && !isPlaceholder(rawResendApiKey)) {
      dataToUpdate.resendApiKey = VaultService.encrypt(rawResendApiKey.trim());
    }
    if (formData.has('smtpHost') && smtpHost !== null) dataToUpdate.smtpHost = smtpHost;
    if (formData.has('smtpPort') && smtpPort !== undefined) dataToUpdate.smtpPort = smtpPort;
    if (formData.has('smtpUser') && smtpUser !== null) dataToUpdate.smtpUser = smtpUser;
    if (rawSmtpPassword && !isPlaceholder(rawSmtpPassword)) dataToUpdate.smtpPassword = VaultService.encrypt(rawSmtpPassword);
    if (formData.has('supportEmailDomain') && supportEmailDomain !== null) dataToUpdate.supportEmailDomain = supportEmailDomain;
    if (rawInboundSecret && !isPlaceholder(rawInboundSecret)) dataToUpdate.inboundEmailWebhookSecret = VaultService.encrypt(rawInboundSecret);

    await settingsService.updateSystemSettings(dataToUpdate);

    // Atomic Re-pricing: trigger background sync if rate changed
    if (isRateChanged && finalExchangeRate) {
       try {
         await catalogQueue.add('sync-prices-bg', { type: 'SYNC_PRICES', usdToRub: finalExchangeRate });
       } catch (err) {
         console.error('[SettingsAction] Failed to enqueue background price sync:', err);
       }
    }

    const ipAddress = await getClientIp();

    const sensitiveKeys = ['yookassaSecretKey', 'yookassaTestSecretKey', 'cryptoBotToken', 'robokassaPassword', 'robokassaWebhookPassword', 'resendApiKey', 'smtpPassword', 'inboundEmailWebhookSecret'];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeDataToUpdate: any = { ...dataToUpdate };
    for (const key of sensitiveKeys) {
      if (safeDataToUpdate[key]) safeDataToUpdate[key] = '***';
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oldValueToLog: any = {};
    for (const key of Object.keys(safeDataToUpdate)) {
      if (oldSettings && key in oldSettings) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        oldValueToLog[key] = sensitiveKeys.includes(key) ? '***' : (oldSettings as any)[key];
      }
    }

    auditAdmin({
      adminId: user.id,
      adminEmail: user.email,
      action: 'SYSTEM_SETTINGS_UPDATE',
      target: 'global',
      targetType: 'SETTINGS',
      oldValue: oldValueToLog,
      newValue: safeDataToUpdate,
      ipAddress
    });

    // Invalidate the SettingsProvider cache so changes apply instantly (SMTP, Keys, Rates)
    try {
      const { revalidateTag } = (await import('next/cache')) as unknown as { revalidateTag: (tag: string) => unknown };
      revalidateTag('settings');
      revalidatePath('/admin/settings');
    } catch (cacheErr) {
      console.error('[SettingsAction] Warning: Failed to invalidate cache tag:', cacheErr);
      // We don't throw here to avoid failing the action if Redis cache is temporarily down
    }
    return { success: true as const };
  });

  if (result && typeof result === 'object' && 'success' in result && !result.success) {
    if ('errors' in result) {
      return result;
    }
    throw new Error('error' in result ? (result as Record<string, unknown>).error as string : 'Unknown error');
  }
  return result;
}

// ── Generate Inbound Mail Webhook Secret ──
export async function generateInboundSecretAction() {
  const result = await requireStaffPermission("settings", "edit", async (admin) => {
    const rawSecret = crypto.randomBytes(32).toString('hex');
    const encryptedSecret = VaultService.encrypt(rawSecret);

    await settingsService.updateSystemSettings({
      inboundEmailWebhookSecret: encryptedSecret
    });

    const ipAddress = await getClientIp();

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'INBOUND_SECRET_GENERATE',
      target: 'global',
      targetType: 'SETTINGS',
      ipAddress
    });

    try {
      const { revalidateTag } = (await import('next/cache')) as unknown as { revalidateTag: (tag: string) => unknown };
      revalidateTag('settings');
      revalidatePath('/admin/settings');
    } catch (cacheErr) {
      console.error('[SettingsAction] Warning: Failed to invalidate cache tag:', cacheErr);
    }

    return { success: true as const, secret: rawSecret };
  });

  if (result && typeof result === 'object' && 'success' in result && !result.success) {
    throw new Error(result.error);
  }
  return result;
}

