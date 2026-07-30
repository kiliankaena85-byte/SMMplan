"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { sendMagicLink, sendWelcomeLetter } from "@/lib/smtp";
import { RateLimitService } from "@/services/core/rate-limit.service";
import { logger } from "@/lib/logger";
import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { getClientIp } from "@/utils/ip";
import { normalizeTenantId } from "@/lib/tenant-resolver";

const log = logger.child({ component: 'MagicLink' });

const schema = z.object({
  email: z.string().email("Введите корректный email"),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function requestMagicLink(prevState: any, formData: FormData) {
  if (!formData || typeof formData.entries !== 'function') {
    return { error: "Некорректные данные формы", success: false };
  }
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, success: false };
  }

  const cleanEmail = parsed.data.email.toLowerCase();

  try {
    const isIpAllowed = await RateLimitService.check('auth:magic-link:ip', 15, 3600, true);
    if (!isIpAllowed) {
      log.warn('Magic link rate limit exceeded IP', { email: cleanEmail });
      return { error: "Слишком много запросов. Пожалуйста, подождите 1 час перед новым запросом.", success: false };
    }

    const cookieStore = await cookies();
    const refCode = cookieStore.get("ref")?.value;
    let referredById = null;

    if (refCode) {
      const referrer = await db.user.findUnique({ where: { referralCode: refCode } });
      if (referrer) referredById = referrer.id;
    }

    const txResult = await db.$transaction(async (tx) => {
      let isNewUser = false;
      const reqHeaders = await headers();
      const rawTenantId = reqHeaders.get("x-tenant-id");
      const tenantId = normalizeTenantId(rawTenantId) || "smmplan";
      
      let user = await tx.user.findFirst({
        where: { 
          email: cleanEmail,
          tenantId
        }
      });

      if (user && (user.isDeleted || !user.isActive)) {
        return { type: 'blocked' as const };
      }

      if (!user) {
        isNewUser = true;
        const isIpAllowedForReg = await RateLimitService.check('auth:register:ip', 3, 86400, true);
        if (!isIpAllowedForReg) {
          return { type: 'rate_limit_reg' as const };
        }

        const ownerCount = await tx.user.count({ where: { role: "OWNER", tenantId } });
        const role = ownerCount === 0 ? "OWNER" : "USER";
        const consentIp = await getClientIp();
        user = await tx.user.create({
          data: {
            email: cleanEmail,
            role,
            referredById,
            tenantId,
            tosAcceptedAt: new Date(),
            tosAcceptedIp: consentIp,
          }
        });
      }

      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

      await tx.authToken.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });
      await tx.authToken.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt,
        },
      });

      return { type: 'success' as const, user, isNewUser, rawToken };
    }, { isolationLevel: 'Serializable' });

    if (txResult.type === 'blocked') {
      log.warn('Magic link requested for blocked/deleted account', { email: cleanEmail });
      return { success: true, error: null };
    }

    if (txResult.type === 'rate_limit_reg') {
      log.warn('Registration IP rate limit exceeded (Anti-Fraud blocked attempt)');
      return { success: true, error: null };
    }

    const { user, isNewUser, rawToken } = txResult;

    try {
      await sendMagicLink(cleanEmail, rawToken);
      if (isNewUser) {
        sendWelcomeLetter(cleanEmail).catch(console.error);
      }
    } catch (smtpError) {
      log.error('Magic link SMTP error', { error: smtpError });
      console.error("Exact SMTP error:", smtpError);
      if (isNewUser) {
        log.info('Soft-deleting newly created user due to SMTP failure', { email: cleanEmail });
        try {
          await db.user.update({
            where: { id: user.id },
            data: {
              isDeleted: true,
              isActive: false,
              email: `failed_${user.id}@smmplan.local`
            }
          });
        } catch (e) {
          log.error('Failed to soft-delete newly created user', { error: e });
        }
      }
      return { error: "Не удалось отправить письмо. Проверьте правильность email или попробуйте позже.", success: false };
    }

    return { success: true, error: null };
  } catch (error) {
    log.error('Magic link request failed', { error: error instanceof Error ? error.message : String(error) });
    return { error: "Произошла ошибка при обработке запроса", success: false };
  }
}
