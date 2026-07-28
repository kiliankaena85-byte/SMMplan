'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { RateLimitService } from '@/services/core/rate-limit.service';
import { logger } from '@/lib/logger';
import { cookies, headers } from 'next/headers';
import crypto from 'crypto';
import { sendMagicLink } from '@/lib/smtp';
import { getClientIp } from '@/utils/ip';
import { normalizeTenantId } from '@/lib/tenant-resolver';

import { passwordPolicySchema } from '@/validators/password-policy';

const log = logger.child({ component: 'PasswordRegister' });

const schema = z.object({
  email: z.string().email("Введите корректный email"),
  password: passwordPolicySchema,
});

export async function registerWithPasswordAction(prevState: unknown, formData: FormData) {
  if (!formData || typeof formData.entries !== 'function') {
    return { error: "Некорректные данные формы", success: false };
  }
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, success: false };
  }

  const { email, password } = parsed.data;
  const cleanEmail = email.toLowerCase().trim();

  try {
    // 1. IP-level registration limit (Max 3 registrations per 24 hours per IP to prevent spam/abuse)
    const isIpAllowed = await RateLimitService.check('auth:register:ip', 3, 86400);
    if (!isIpAllowed) {
      log.warn('Password registration IP rate limit exceeded', { email: cleanEmail });
      return { error: "Превышен лимит регистраций с вашего IP. Попробуйте завтра.", success: false };
    }

    // 2. Transaction for atomic user creation
    const result = await db.$transaction(async (tx) => {
      const reqHeaders = await headers();
      const rawTenantId = reqHeaders.get("x-tenant-id");
      const tenantId = normalizeTenantId(rawTenantId) || "smmplan";

      // Check if user already exists in this tenant
      const existingUser = await tx.user.findFirst({
        where: { 
          email: cleanEmail,
          tenantId
        },
        select: { id: true, tenantId: true, isDeleted: true, isActive: true, passwordHash: true }
      });

      const passwordHash = await hashPassword(password);

      if (existingUser) {
        if (existingUser.isDeleted || !existingUser.isActive) {
          return { type: 'blocked' as const };
        }
        // If user was created via Magic Link (no password set yet), set their password now!
        if (!existingUser.passwordHash) {
          const updatedUser = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              passwordHash,
              isEmailVerified: true,
            }
          });
          return { type: 'password_set' as const, user: updatedUser };
        }
        return { type: 'exists' as const };
      }

      // Handle referral code if present in cookies
      const cookieStore = await cookies();
      const refCode = cookieStore.get("ref")?.value;
      let referredById = null;

      if (refCode) {
        const referrer = await tx.user.findUnique({ where: { referralCode: refCode } });
        if (referrer) referredById = referrer.id;
      }

      // Auto-bootstrap: First user is OWNER
      const ownerCount = await tx.user.count({ where: { role: "OWNER", tenantId } });
      const role = ownerCount === 0 ? "OWNER" : "USER";

      const newUser = await tx.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          role,
          referredById,
          isActive: true,
          isEmailVerified: true,
          tenantId,
          tosAcceptedAt: new Date(),
          tosAcceptedIp: await getClientIp(),
        }
      });

      return { type: 'success' as const, user: newUser };
    }, { isolationLevel: 'Serializable' });

    if (result.type === 'blocked') {
      return { error: "Аккаунт заблокирован или выключен. Обратитесь в поддержку.", success: false };
    }

    if (result.type === 'exists') {
      return { error: "Пользователь с таким email уже зарегистрирован. Пожалуйста, войдите.", success: false };
    }

    const { user } = result;

    // 3. Create Session immediately so user doesn't get blocked
    const { createSession } = await import('@/lib/session');
    await createSession(user.id);

    // 4. Try sending welcome email in background (non-blocking)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    try {
      await db.authToken.create({
        data: {
          token: hashedToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 15),
        }
      });
      await sendMagicLink(cleanEmail, rawToken).catch(() => {});
    } catch {
      log.warn('Registration email send skipped/failed', { email: cleanEmail });
    }

    log.info('Password registration successful with auto-login', { email: cleanEmail, userId: user.id });

    let redirectTo = '/dashboard';
    if (["OWNER", "ADMIN", "MANAGER", "SUPPORT"].includes(user.role)) {
      redirectTo = '/admin/dashboard';
    }

    return { success: true, error: null, redirectTo, message: "Регистрация успешна! Выполняется вход..." };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error('Password registration action failed', { error: errorMessage, email: cleanEmail });
    return { error: "Ошибка сервера при регистрации. Попробуйте позже.", success: false };
  }
}
