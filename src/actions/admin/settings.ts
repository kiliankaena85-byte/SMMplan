'use server';

import { requireStaffPermission } from '@/lib/server/rbac';
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
  const result = await requireStaffPermission("settings", "edit", async (admin) => {
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
  const result = await requireStaffPermission("settings", "edit", async (user) => {
    const parsed = globalSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) throw new Error('Validation failed');
    
    const {
      maintenanceMode,
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
    } = parsed.data;

    const oldSettings = await db.systemSettings.findUnique({ where: { id: 'global' } });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataToUpdate: any = { 
      maintenanceMode, 
      siteName, 
      siteDescription,
      usnScheme,
      contactSupportEmail,
      contactPrivacyEmail,
      contactTelegramBot,
      contactTelegramChannel,
      contactWhatsApp,
      contactVk,
      legalCompanyName,
      legalCompanyInn,
      legalCompanyOgrnip,
      legalCompanyAddress
    };
    if (welcomeMessage !== null) dataToUpdate.welcomeMessage = welcomeMessage;
    
    let isRateChanged = false;
    if (exchangeRateUSD !== undefined && exchangeRateUSD >= 0) {
      if (oldSettings?.exchangeRateUSD !== exchangeRateUSD) {
        dataToUpdate.exchangeRateUSD = exchangeRateUSD;
        isRateChanged = true;
      }
    }

    // Only update secrets if they are provided (prevent overwriting with empty)
    if (yookassaShopId) dataToUpdate.yookassaShopId = yookassaShopId;
    if (rawYookassaSecret) dataToUpdate.yookassaSecretKey = VaultService.encrypt(rawYookassaSecret);
    if (yookassaTestShopId) dataToUpdate.yookassaTestShopId = yookassaTestShopId;
    if (rawYookassaTestSecret) dataToUpdate.yookassaTestSecretKey = VaultService.encrypt(rawYookassaTestSecret);
    if (rawCryptoBotToken) dataToUpdate.cryptoBotToken = VaultService.encrypt(rawCryptoBotToken);
    if (robokassaLogin) dataToUpdate.robokassaLogin = robokassaLogin;
    if (rawRobokassaPassword) dataToUpdate.robokassaPassword = VaultService.encrypt(rawRobokassaPassword);

    // Email / SMTP settings
    if (emailProvider !== undefined) dataToUpdate.emailProvider = emailProvider;
    if (rawResendApiKey && rawResendApiKey.trim() !== '') {
      dataToUpdate.resendApiKey = VaultService.encrypt(rawResendApiKey.trim());
    }
    if (smtpHost !== null) dataToUpdate.smtpHost = smtpHost;
    if (smtpPort !== undefined) dataToUpdate.smtpPort = smtpPort;
    if (smtpUser !== null) dataToUpdate.smtpUser = smtpUser;
    if (rawSmtpPassword) dataToUpdate.smtpPassword = VaultService.encrypt(rawSmtpPassword);
    if (supportEmailDomain !== null) dataToUpdate.supportEmailDomain = supportEmailDomain;
    if (rawInboundSecret) dataToUpdate.inboundEmailWebhookSecret = VaultService.encrypt(rawInboundSecret);

    await settingsService.updateSystemSettings(dataToUpdate);

    // Atomic Re-pricing: trigger background sync if rate changed
    if (isRateChanged && exchangeRateUSD) {
       try {
         await catalogQueue.add('sync-prices-bg', { type: 'SYNC_PRICES', usdToRub: exchangeRateUSD });
       } catch (err) {
         console.error('[SettingsAction] Failed to enqueue background price sync:', err);
       }
    }

    const ipAddress = await getClientIp();

    auditAdmin({
      adminId: user.id,
      adminEmail: user.email,
      action: 'SYSTEM_SETTINGS_UPDATE',
      target: 'global',
      targetType: 'SETTINGS',
      oldValue: { siteName: oldSettings?.siteName, maintenanceMode: oldSettings?.maintenanceMode },
      newValue: { siteName, maintenanceMode },
      ipAddress
    });

    // Invalidate the SettingsProvider cache so changes apply instantly (SMTP, Keys, Rates)
    try {
      const { revalidateTag } = await import('next/cache');
      revalidateTag('settings', {});
      revalidatePath('/admin/settings');
    } catch (cacheErr) {
      console.error('[SettingsAction] Warning: Failed to invalidate cache tag:', cacheErr);
      // We don't throw here to avoid failing the action if Redis cache is temporarily down
    }
    return true;
  });

  if (result && typeof result === 'object' && 'success' in result && !result.success) {
    throw new Error(result.error);
  }
}

// ── COP Usability Simulator ──
const flows: Record<string, { clicks: number; cognitiveLoad: number; steps: Array<{ name: string; clicks: number; cognitiveLoad: number }>; rating: 'PREMIUM' | 'ACCEPTABLE' | 'HIGH' }> = {
  CLIENT_ORDER: {
    clicks: 6,
    cognitiveLoad: 6,
    steps: [
      { name: "Переход на страницу заказа", clicks: 1, cognitiveLoad: 1 },
      { name: "Выбор категории и услуги", clicks: 2, cognitiveLoad: 2 },
      { name: "Ввод ссылки для накрутки", clicks: 1, cognitiveLoad: 1 },
      { name: "Ввод количества", clicks: 1, cognitiveLoad: 1 },
      { name: "Нажатие кнопки 'Создать заказ'", clicks: 1, cognitiveLoad: 1 }
    ],
    rating: 'PREMIUM'
  },
  SUPPORT_TICKET: {
    clicks: 7,
    cognitiveLoad: 8,
    steps: [
      { name: "Переход в раздел поддержки", clicks: 1, cognitiveLoad: 1 },
      { name: "Нажатие 'Новый тикет'", clicks: 1, cognitiveLoad: 1 },
      { name: "Выбор темы и категории проблемы", clicks: 2, cognitiveLoad: 2 },
      { name: "Заполнение темы и текста сообщения", clicks: 2, cognitiveLoad: 3 },
      { name: "Отправка тикета", clicks: 1, cognitiveLoad: 1 }
    ],
    rating: 'ACCEPTABLE'
  },
  ROLE_CHANGE: {
    clicks: 7,
    cognitiveLoad: 7,
    steps: [
      { name: "Переход в настройки системы", clicks: 1, cognitiveLoad: 1 },
      { name: "Выбор вкладки 'Команда'", clicks: 1, cognitiveLoad: 1 },
      { name: "Поиск нужного сотрудника", clicks: 2, cognitiveLoad: 2 },
      { name: "Выбор новой роли в выпадающем списке", clicks: 2, cognitiveLoad: 2 },
      { name: "Сохранение изменений / подтверждение", clicks: 1, cognitiveLoad: 1 }
    ],
    rating: 'ACCEPTABLE'
  }
};

export async function runCopSimulation(flowType: string) {
  const result = await requireStaffPermission("settings", "edit", async (admin) => {
    if (!['CLIENT_ORDER', 'SUPPORT_TICKET', 'ROLE_CHANGE'].includes(flowType)) {
      return { success: false as const, error: 'Некорректный тип сценария' };
    }

    const flow = flows[flowType];
    const targetSizeWeight = 1.0;
    const frictionScore = (flow.clicks * 1.5) + (flow.cognitiveLoad * 2.0) - (targetSizeWeight * 0.5);

    let rating: 'PREMIUM' | 'ACCEPTABLE' | 'HIGH' = 'HIGH';
    if (frictionScore <= 21) {
      rating = 'PREMIUM';
    } else if (frictionScore <= 27) {
      rating = 'ACCEPTABLE';
    }

    const ipAddress = await getClientIp();

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'COP_SIMULATION',
      target: flowType,
      targetType: 'SYSTEM',
      oldValue: {},
      newValue: { frictionScore, rating, clicks: flow.clicks, cognitiveLoad: flow.cognitiveLoad },
      ipAddress
    });

    return {
      success: true as const,
      frictionScore,
      rating,
      steps: flow.steps
    };
  });

  if (result && typeof result === 'object' && 'success' in result && !result.success) {
    throw new Error(result.error);
  }

  return result;
}
