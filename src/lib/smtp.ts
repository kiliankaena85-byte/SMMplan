import nodemailer from 'nodemailer';
import dns from 'dns';
import { SettingsProvider } from '@/lib/settings';
import { Resend } from 'resend';
import { logger } from '@/lib/logger';
import { getBaseUrlAsync, getBaseUrlSync } from '@/utils/get-base-url';

import { normalizeTenantId, getTenantHost, getTenantSiteName } from '@/lib/seo-helpers';

// Force IPv4 DNS resolution first to avoid ENETUNREACH on dual-stack environments without IPv6 routing
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const log = logger.child({ component: 'SMTP' });

async function getEmailContext(tenantId?: string | null) {
  const normTenant = normalizeTenantId(tenantId);
  const companyName = getTenantSiteName(normTenant);
  const supportDomain = getTenantHost(normTenant);
  return { companyName, supportDomain, tenantId: normTenant };
}

type TransporterResult =
  | { provider: 'RESEND'; resend: Resend; fromEmail: string; smtpUser: string | null }
  | { provider: 'SMTP'; transporter: nodemailer.Transporter; fromEmail: string; smtpUser: string | null };

async function getTransporter(): Promise<TransporterResult | null> {
  const s = await SettingsProvider.getEmailSettings();

  // DEPLOYMENT NOTE (РФ-инфраструктура):
  // Resend и Twilio могут блокировать отправку на домены .ru или с российских IP.
  // Для production в РФ рекомендуется использовать SMTP-провайдер:
  //   - Yandex 360 для бизнеса: smtp.yandex.ru:465
  //   - Mail.ru для бизнеса: smtp.mail.ru:465
  //   - Локальный Postfix / MailCow
  // Настройка SMTP производится в панели администратора → Настройки → Email.

  if (s.emailProvider === 'RESEND') {
    if (!s.resendApiKey) {
      log.error('RESEND selected but API key is not configured');
      throw new Error('Email provider is set to Resend but API key is missing. Check admin settings.');
    }
    return { provider: 'RESEND', resend: new Resend(s.resendApiKey), smtpUser: s.smtpUser, fromEmail: s.smtpUser || 'no-reply@smmplan.pro' };
  }

  if (!s.smtpHost || !s.smtpUser || !s.smtpPassword) {
    return null; // SMTP не сконфигурирован
  }

  const transporter = nodemailer.createTransport({
    host: s.smtpHost,
    port: s.smtpPort || 465,
    secure: s.smtpPort === 465,
    auth: {
      user: s.smtpUser,
      pass: s.smtpPassword,
    },
    family: 4, // Force IPv4 to prevent ENETUNREACH on systems without IPv6 routing
  } as any);

  return { provider: 'SMTP', transporter, smtpUser: s.smtpUser, fromEmail: s.smtpUser };
}

type DispatchOptions = {
  companyName: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

async function dispatch(result: TransporterResult, options: DispatchOptions) {
  const fromAddress = `"${options.companyName} Support" <${result.fromEmail}>`;

  if (result.provider === 'RESEND') {
    log.info('Sending via RESEND', { to: options.to, subject: options.subject });
    const { error } = await result.resend.emails.send({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.replyTo ? { reply_to: options.replyTo } : {}),
    });
    if (error) {
      log.error('Resend delivery failed', { to: options.to, subject: options.subject, code: (error instanceof Error ? error.name : 'Error') });
      throw new Error(`Resend error: ${(error instanceof Error ? error.message : String(error))}`);
    }
  } else {
    log.info('Sending via SMTP', { to: options.to, subject: options.subject });
    await result.transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    });
  }
}

export async function sendMagicLink(email: string, token: string, tenantId?: string) {
  const { companyName } = await getEmailContext(tenantId);
  let baseUrl = await getBaseUrlAsync().catch(() => '');
  if (!baseUrl) {
    const { supportDomain } = await getEmailContext(tenantId);
    baseUrl = `https://${supportDomain}`;
  }
  const normTenant = normalizeTenantId(tenantId);
  const tenantParam = normTenant && normTenant !== 'smmplan' ? `&tenant=${normTenant}` : '';
  const link = `${baseUrl}/api/auth/verify?token=${token}${tenantParam}`;

  console.info(`\n========================================\n[MAGIC LINK FOR ${email} (${companyName})]:\n${link}\n========================================\n`);

  const result = await getTransporter();

  if (!result) {
    log.warn('SMTP Not configured. Magic link printed to console.', { email, link });
    return;
  }

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e4e4e7;">
      <h2 style="color: #18181b;">Вход в ${companyName}</h2>
      <p style="color: #71717a; line-height: 1.5;">Вы запросили ссылку для входа. Нажмите на кнопку ниже, чтобы войти в аккаунт. Ссылка действительна 15 минут.</p>
      <div style="margin-top: 32px; text-align: center;">
        <a href="${link}" style="background-color: #18181b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
          Войти в ${companyName}
        </a>
      </div>
      <p style="margin-top: 32px; font-size: 12px; color: #a1a1aa;">Если вы не запрашивали письмо, проигнорируйте его.</p>
    </div>
  `;

  try {
    await dispatch(result, { companyName, to: email, subject: `Ваша ссылка для входа в ${companyName}`, html: htmlContent });
  } catch (err: unknown) {
    log.error('SMTP send failed (printed link above in console)', { 
      error: (err instanceof Error ? err.message : String(err)),
      email,
      link
    });
    // In staging / dev / when ISP blocks port 465, do not fail the request if link was generated
    if (process.env.APP_URL?.includes('test.smmplan.pro') || process.env.NODE_ENV !== 'production' || process.env.DEV_MOCK_SMTP === 'true') {
      return;
    }
    throw err;
  }
}

export async function sendMail(email: string, subject: string, htmlContent: string, replyTo?: string, tenantId?: string) {
  const { companyName } = await getEmailContext(tenantId);
  const result = await getTransporter();

  if (!result) {
    if (process.env.NODE_ENV === 'production') {
      log.error('Not configured in AdminPanel');
    } else {
      log.warn('Not configured. Email skipped.', { to: email, subject });
    }
    return;
  }

  try {
    await dispatch(result, { companyName, to: email, subject, html: htmlContent, replyTo });
  } catch (err: unknown) {
    if (process.env.NODE_ENV === 'production' && process.env.DEV_MOCK_SMTP !== 'true') {
      throw err;
    } else {
      log.error('SMTP email delivery failed', { to: email, subject, error: (err instanceof Error ? err.message : String(err)) });
    }
  }
}

export async function sendAuthMail(email: string, otp: string, tenantId?: string) {
  const { companyName } = await getEmailContext(tenantId);

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e4e4e7;">
      <h2 style="color: #18181b;">Вход в ${companyName}</h2>
      <p style="color: #71717a; line-height: 1.5;">Ваш код для входа: <strong>${otp}</strong>. Ссылка действительна 15 минут.</p>
    </div>
  `;
  return sendMail(email, `Код входа в ${companyName}`, htmlContent, undefined, tenantId);
}

export async function sendWelcomeLetter(email: string, tenantId?: string) {
  const { companyName } = await getEmailContext(tenantId);

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e4e4e7;">
      <h2 style="color: #18181b;">Добро пожаловать в ${companyName}! 🎉</h2>
      <p style="color: #71717a; line-height: 1.5;">Спасибо за регистрацию в нашем сервисе! Мы предоставляем качественное продвижение в социальных сетях.</p>
      <div style="margin-top: 32px; padding: 16px; background-color: #f4f4f5; border-radius: 8px;">
        <h4 style="margin-top: 0; color: #18181b;">Ваши преимущества:</h4>
        <ul style="color: #71717a; padding-left: 20px;">
          <li>Сотни услуг для всех популярных соцсетей</li>
          <li>Быстрый старт заказов — от 5 минут</li>
          <li>Реферальная программа — платим 15% с заказов друзей</li>
        </ul>
      </div>
      <p style="margin-top: 32px; font-size: 14px; color: #71717a;">Пополняйте баланс и запускайте накрутку прямо сейчас!</p>
    </div>
  `;
  return sendMail(email, `Добро пожаловать в ${companyName}!`, htmlContent, undefined, tenantId);
}

export async function sendOrderCompletedMail(email: string, orderId: string, serviceName: string, tenantId?: string) {
  const { companyName, supportDomain } = await getEmailContext(tenantId);

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e4e4e7;">
      <h2 style="color: #10b981;">Заказ #<span>${orderId}</span> выполнен! ✅</h2>
      <p style="color: #71717a; line-height: 1.5;">Ваш заказ на услугу <strong>${serviceName}</strong> в сервисе ${companyName} был успешно выполнен.</p>
      <div style="margin-top: 32px; text-align: center;">
        <a href="https://${supportDomain}/dashboard/orders" style="background-color: #18181b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
          Посмотреть мои заказы
        </a>
      </div>
    </div>
  `;
  return sendMail(email, `Ваш заказ #${orderId} выполнен — ${companyName}!`, htmlContent, undefined, tenantId);
}

export async function sendOrderPaidMail(email: string, orderId: string, serviceName: string, tenantId?: string) {
  const { companyName, supportDomain } = await getEmailContext(tenantId);

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 28px; border-radius: 16px; border: 1px solid #e4e4e7; color: #18181b;">
      <h2 style="color: #10b981; margin-top: 0; font-size: 22px;">Заказ #<span>${orderId}</span> успешно оплачен! 🚀</h2>
      <p style="color: #52525b; line-height: 1.6; font-size: 15px;">
        Ваш заказ на услугу <strong>${serviceName}</strong> в сервисе ${companyName} принят и запущен в обработку.
      </p>
      
      <div style="background: #f4f4f5; padding: 16px; border-radius: 12px; margin: 20px 0; font-size: 13px; line-height: 1.5; color: #3f3f46;">
        <div>📄 <strong>Электронный чек 54-ФЗ:</strong> сформирован и отправлен в ОФД.</div>
        <div style="margin-top: 6px;">⚡ <strong>Старт выполнения:</strong> в течение 1–5 минут.</div>
      </div>

      <div style="margin: 28px 0; text-align: center;">
        <a href="https://${supportDomain}/dashboard/orders" style="background-color: #0284c7; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;">
          Перейти в личный кабинет →
        </a>
      </div>

      <div style="border-top: 1px solid #e4e4e7; padding-top: 16px; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
        💡 <em>Если вы допустили опечатку в email или не можете войти в аккаунт, обратитесь в нашу службу поддержки с номером заказа #${orderId} и чеком оплаты.</em>
      </div>
    </div>
  `;
  return sendMail(email, `Чек и запуск заказа #${orderId} — ${companyName}`, htmlContent, undefined, tenantId);
}

export async function sendOrderCanceledMail(email: string, orderId: string, serviceName: string, tenantId?: string) {
  const { companyName, supportDomain } = await getEmailContext(tenantId);

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e4e4e7;">
      <h2 style="color: #ef4444;">Заказ #<span>${orderId}</span> отменен ❌</h2>
      <p style="color: #71717a; line-height: 1.5;">Ваш заказ на услугу <strong>${serviceName}</strong> в сервисе ${companyName} был отменен. Средства возвращены на ваш баланс.</p>
      <div style="margin-top: 32px; text-align: center;">
        <a href="https://${supportDomain}/dashboard/orders" style="background-color: #18181b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
          Посмотреть мои заказы
        </a>
      </div>
    </div>
  `;
  return sendMail(email, `Ваш заказ #${orderId} отменен — ${companyName}`, htmlContent, undefined, tenantId);
}

