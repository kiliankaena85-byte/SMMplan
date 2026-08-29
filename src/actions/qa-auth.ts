'use server';

import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { createSession } from '@/lib/session';
import { normalizeTenantId } from '@/lib/tenant-resolver-edge';

export interface QALoginResult {
  success: boolean;
  error?: string;
  redirectUrl?: string;
}

export async function qaDirectLoginAction(formData: {
  role: 'admin' | 'client';
  secretKey: string;
  tenantId?: string;
  targetEmail?: string;
}): Promise<QALoginResult> {
  const expectedSecret = process.env.QA_SECRET_KEY;
  if (!expectedSecret) {
    return { 
      success: false, 
      error: 'Секретный QA ключ не настроен на сервере в переменных окружения.' 
    };
  }

  const providedSecret = formData.secretKey?.trim() || '';
  const userSecretBuf = Buffer.from(providedSecret);
  const expectedSecretBuf = Buffer.from(expectedSecret);

  if (
    userSecretBuf.length !== expectedSecretBuf.length ||
    !crypto.timingSafeEqual(userSecretBuf, expectedSecretBuf)
  ) {
    return { 
      success: false, 
      error: 'Неверный секретный ключ QA доступа. Проверьте правильность ключа.' 
    };
  }

  const tenant = normalizeTenantId(formData.tenantId || 'smmplan');
  const targetEmail = (
    formData.targetEmail || 
    (formData.role === 'admin' ? 'admin@smmplan.pro' : 'client@smmplan.pro')
  ).toLowerCase();

  let user = await db.user.findFirst({
    where: {
      email: targetEmail,
      tenantId: tenant === 'flux' ? { in: ['lovable', 'flux'] } : tenant,
    },
  });

  if (!user) {
    user = await db.user.findFirst({
      where: { email: targetEmail },
    });
  }

  if (!user) {
    return { 
      success: false, 
      error: `Тестовый пользователь (${targetEmail}) не найден в базе данных.` 
    };
  }

  await createSession(user.id);

  return {
    success: true,
    redirectUrl: formData.role === 'admin' ? '/admin' : '/dashboard',
  };
}
