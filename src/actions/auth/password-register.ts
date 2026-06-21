'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { RateLimitService } from '@/services/core/rate-limit.service';
import { logger } from '@/lib/logger';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { sendMagicLink } from '@/lib/smtp';

const log = logger.child({ component: 'PasswordRegister' });

const schema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(8, "Пароль должен быть не менее 8 символов"),
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
      // Check if user already exists
      const existingUser = await tx.user.findUnique({
        where: { email: cleanEmail },
        select: { id: true, isDeleted: true, isActive: true }
      });

      if (existingUser) {
        return { type: 'exists' as const };
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Handle referral code if present in cookies
      const cookieStore = await cookies();
      const refCode = cookieStore.get("ref")?.value;
      let referredById = null;

      if (refCode) {
        const referrer = await tx.user.findUnique({ where: { referralCode: refCode } });
        if (referrer) referredById = referrer.id;
      }

      // Auto-bootstrap: First user is OWNER
      const ownerCount = await tx.user.count({ where: { role: "OWNER" } });
      const role = ownerCount === 0 ? "OWNER" : "USER";

      const newUser = await tx.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          role,
          referredById,
          isActive: true,
          isEmailVerified: false,
        }
      });

      return { type: 'success' as const, user: newUser };
    }, { isolationLevel: 'Serializable' });

    if (result.type === 'exists') {
      return { error: "Пользователь с таким email уже зарегистрирован. Пожалуйста, войдите.", success: false };
    }

    const { user } = result;

    // 3. Generate verification token and send email
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    await db.authToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 15), // 15 minutes
      }
    });

    await sendMagicLink(cleanEmail, rawToken);

    log.info('Password registration verification email sent', { email: cleanEmail, userId: user.id });

    return { success: true, error: null, message: "Пожалуйста, проверьте вашу почту для подтверждения регистрации." };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error('Password registration action failed', { error: errorMessage, email: cleanEmail });
    return { error: "Ошибка сервера при регистрации. Попробуйте позже.", success: false };
  }
}
