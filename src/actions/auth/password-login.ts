'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/session';
import { RateLimitService } from '@/services/core/rate-limit.service';
import { logger } from '@/lib/logger';

const log = logger.child({ component: 'PasswordLogin' });

const schema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export async function loginWithPasswordAction(prevState: any, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, success: false };
  }

  const { email, password } = parsed.data;
  const cleanEmail = email.toLowerCase().trim();

  try {
    // 1. IP-level Rate Limit (Max 20 attempts per hour)
    const isIpAllowed = await RateLimitService.check('auth:password:ip', 20, 3600);
    if (!isIpAllowed) {
      log.warn('Password login IP rate limit exceeded', { email: cleanEmail });
      return { error: "Слишком много попыток входа с этого IP-адреса. Пожалуйста, подождите 1 час.", success: false };
    }

    // 2. Email-level Rate Limit (Max 5 attempts per 15 minutes to prevent brute-forcing)
    const isEmailAllowed = await RateLimitService.checkCustomKey(`password-attempts:${cleanEmail}`, 5, 900);
    if (!isEmailAllowed) {
      log.warn('Password login email rate limit exceeded', { email: cleanEmail });
      return { error: "Аккаунт временно заблокирован из-за большого числа неверных попыток. Попробуйте через 15 минут.", success: false };
    }

    // 3. Find User
    const user = await db.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, passwordHash: true, role: true }
    });

    if (!user) {
      // Anti-Enumeration: return standard error so attackers don't know if email exists
      log.warn('Password login: User not found', { email: cleanEmail });
      return { error: "Неверный email или пароль", success: false };
    }

    if (!user.passwordHash) {
      log.info('Password login: User has no password set', { email: cleanEmail });
      return { error: "Для вашего аккаунта не установлен пароль. Пожалуйста, войдите по ссылке на почту.", success: false };
    }

    // 4. Compare Password
    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      log.warn('Password login: Invalid password', { email: cleanEmail });
      return { error: "Неверный email или пароль", success: false };
    }

    // 5. Create Session
    await createSession(user.id);

    log.info('Password login successful', { email: cleanEmail, userId: user.id });

    // Determine redirect path
    let redirectTo = '/dashboard';
    if (["OWNER", "ADMIN", "MANAGER", "SUPPORT"].includes(user.role)) {
      redirectTo = '/admin/dashboard';
    }

    return { success: true, error: null, redirectTo };
  } catch (error: any) {
    log.error('Password login action failed', { error: error.message, email: cleanEmail });
    return { error: "Ошибка сервера при авторизации. Попробуйте позже.", success: false };
  }
}
