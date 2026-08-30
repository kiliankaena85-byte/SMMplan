'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/session';
import { headers } from 'next/headers';
import { RateLimitService } from '@/services/core/rate-limit.service';
import { logger } from '@/lib/logger';
import { normalizeTenantId } from '@/lib/tenant-resolver-edge';
import { getClientIp } from '@/utils/ip';

const log = logger.child({ component: 'PasswordLogin' });

const schema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
  twoFactorCode: z.string().optional(),
});

/** @public Public user login action */
export async function loginWithPasswordAction(prevState: unknown, formData: FormData) {
  if (!formData || typeof formData.entries !== 'function') {
    return { error: "Некорректные данные формы", success: false };
  }
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, success: false };
  }

  const { email, password, twoFactorCode } = parsed.data;
  const cleanEmail = email.toLowerCase().trim();

  try {
    const { SecurityAuditLogger } = await import('@/lib/security/audit-logger');
    const ipAddress = await getClientIp();

    // 1. IP-level Rate Limit (Max 20 attempts per hour, 5 attempts per minute)
    const isIpAllowed = await RateLimitService.check('auth:password:ip', 20, 3600, true);
    const isIpBurstAllowed = await RateLimitService.check(`auth:password:ip:burst:${ipAddress}`, 5, 60, true);
    if (!isIpAllowed || !isIpBurstAllowed) {
      log.warn('Password login IP rate limit exceeded', { ip: ipAddress, email: cleanEmail });
      await SecurityAuditLogger.log({
        event: 'BRUTE_FORCE_BLOCKED',
        email: cleanEmail,
        severity: 'WARNING',
        details: { reason: 'IP rate limit exceeded', ip: ipAddress },
      });
      return { error: "Слишком много попыток входа с этого IP-адреса. Пожалуйста, подождите немного перед следующей попыткой.", success: false };
    }

    // 3. Email-level Rate Limit (Max 5 attempts per 15 minutes to prevent targeted brute-forcing)
    const isEmailAllowed = await RateLimitService.checkCustomKey(`password-attempts:${cleanEmail}`, 5, 900, true);
    if (!isEmailAllowed) {
      log.warn('Password login email rate limit exceeded', { email: cleanEmail });
      await SecurityAuditLogger.log({
        event: 'BRUTE_FORCE_BLOCKED',
        email: cleanEmail,
        severity: 'WARNING',
        details: { reason: 'Email brute force rate limit exceeded' },
      });
      return { error: "Аккаунт временно заблокирован из-за большого числа неверных попыток. Попробуйте через 15 минут.", success: false };
    }

    // 4. Find User
    const reqHeaders = await headers();
    const rawTenantId = reqHeaders.get("x-tenant-id");
    const tenantId = normalizeTenantId(rawTenantId) || "smmplan";
    
    let user = await db.user.findFirst({
      where: { 
        email: cleanEmail,
        tenantId
      },
      select: { 
        id: true, 
        tenantId: true, 
        passwordHash: true, 
        role: true, 
        isActive: true, 
        isDeleted: true, 
        isEmailVerified: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true
      }
    });

    // Fallback: Global Admin/Owner login across any tenant
    if (!user) {
      user = await db.user.findFirst({
        where: {
          email: cleanEmail,
          role: { in: ["OWNER", "ADMIN"] },
          isDeleted: false
        },
        select: { 
          id: true, 
          tenantId: true, 
          passwordHash: true, 
          role: true, 
          isActive: true, 
          isDeleted: true, 
          isEmailVerified: true,
          twoFactorEnabled: true,
          twoFactorSecret: true,
          twoFactorBackupCodes: true
        }
      });
    }

    if (!user) {
      // Anti-Enumeration: return standard error so attackers don't know if email exists
      log.warn('Password login: User not found', { email: cleanEmail, tenantId });
      await SecurityAuditLogger.log({
        event: 'LOGIN_FAILED',
        email: cleanEmail,
        tenantId,
        details: { reason: 'User not found' }
      });
      return { error: "Неверный email или пароль", success: false };
    }

    if (user.isDeleted || !user.isActive) {
      log.warn('Password login attempted for blocked/deleted account', { email: cleanEmail });
      await SecurityAuditLogger.log({
        event: 'LOGIN_FAILED',
        userId: user.id,
        email: cleanEmail,
        tenantId,
        details: { reason: 'Account disabled or deleted' }
      });
      return { error: "Неверный email или пароль", success: false };
    }

    if (!user.isEmailVerified) {
      log.warn('Password login: Email not verified', { email: cleanEmail });
      return { error: "Пожалуйста, подтвердите email по ссылке из письма", success: false };
    }

    if (!user.passwordHash) {
      log.info('Auth login: Account authentication method check', { userId: user.id });
      
      const isSmtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD;
      if (!isSmtpConfigured) {
        return { error: "Вход по ссылке временно недоступен (ошибка почты). Обратитесь в поддержку для установки пароля.", success: false };
      }
      
      return { error: "Для вашего аккаунта не установлен пароль. Пожалуйста, войдите по ссылке на почту.", success: false };
    }

    // 4. Compare Password
    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      log.warn('Password login: Invalid password', { email: cleanEmail });
      await SecurityAuditLogger.log({
        event: 'LOGIN_FAILED',
        userId: user.id,
        email: cleanEmail,
        tenantId,
        details: { reason: 'Invalid password' }
      });
      return { error: "Неверный email или пароль", success: false };
    }

    // 5. Two-Factor Authentication (2FA) Verification
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!twoFactorCode || twoFactorCode.trim().length === 0) {
        return {
          requires2fa: true,
          error: "Введите 6-значный код из приложения аутентификатора (Google Authenticator / 2FA)",
          success: false,
        };
      }

      const { verifyTotpToken, verifyAndConsumeBackupCode } = await import('@/lib/auth/2fa');
      const isTotpValid = verifyTotpToken(user.twoFactorSecret, twoFactorCode.trim());

      if (!isTotpValid) {
        // Try backup recovery code
        const backupResult = verifyAndConsumeBackupCode(twoFactorCode.trim(), user.twoFactorBackupCodes || []);
        if (!backupResult.valid) {
          log.warn('Password login: Invalid 2FA TOTP or backup code', { userId: user.id });
          await SecurityAuditLogger.log({
            event: '2FA_FAILED',
            userId: user.id,
            email: cleanEmail,
            tenantId,
            details: { reason: 'Invalid TOTP/backup token' },
            severity: 'WARNING',
          });
          return { error: "Неверный код 2FA или резервный код", success: false, requires2fa: true };
        }

        // Consume backup code
        await db.user.update({
          where: { id: user.id },
          data: { twoFactorBackupCodes: backupResult.remainingHashedCodes },
        });
        log.info('2FA backup recovery code consumed', { userId: user.id });
      }

      await SecurityAuditLogger.log({
        event: '2FA_VERIFIED',
        userId: user.id,
        email: cleanEmail,
        tenantId,
      });
    }

    // P-1: Auto-rehash legacy password hashes (salt:key format N=16384) to $s2$65536$... format
    if (!user.passwordHash.startsWith('$s2$')) {
      try {
        const { hashPassword } = await import('@/lib/auth/password');
        const newHash = await hashPassword(password);
        await db.user.update({
          where: { id: user.id },
          data: { passwordHash: newHash },
        });
        log.info('Auto-rehashed legacy password hash to scrypt N=65536', { userId: user.id });
      } catch (e) {
        log.error('Failed to auto-rehash legacy password', { error: e instanceof Error ? e.message : String(e) });
      }
    }

    // 6. Create Session
    await createSession(user.id);

    await SecurityAuditLogger.log({
      event: 'LOGIN_SUCCESS',
      userId: user.id,
      email: cleanEmail,
      tenantId,
    });

    log.info('Password login successful', { email: cleanEmail, userId: user.id });

    // Determine redirect path
    let redirectTo = '/dashboard';
    if (["OWNER", "ADMIN", "MANAGER", "SUPPORT"].includes(user.role)) {
      redirectTo = '/admin/dashboard';
    }

    return { success: true, error: null, redirectTo };
  } catch (error: unknown) {
    log.error('Password login action failed', { error: (error instanceof Error ? error.message : String(error)), email: cleanEmail });
    return { error: "Ошибка сервера при авторизации. Попробуйте позже.", success: false };
  }
}
