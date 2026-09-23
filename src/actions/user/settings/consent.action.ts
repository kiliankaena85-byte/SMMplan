'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { getClientIp } from '@/utils/ip';
import { revalidatePath } from 'next/cache';
import type { Confirm152FzConsentResult } from '../settings-extra.types';

export async function confirm152FzConsentAction(): Promise<Confirm152FzConsentResult> {
  const session = await verifySession();
  if (!session?.userId) {
    return { success: false, error: 'Авторизуйтесь для выполнения этого действия' };
  }

  const clientIp = await getClientIp();
  const now = new Date();

  try {
    const updatedUser = await db.user.update({
      where: { id: session.userId },
      data: {
        tosAcceptedAt: now,
        tosAcceptedIp: clientIp,
      },
      select: {
        tosAcceptedAt: true,
        tosAcceptedIp: true,
      },
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/settings/notifications');
    return {
      success: true,
      tosAcceptedAt: updatedUser.tosAcceptedAt,
      tosAcceptedIp: updatedUser.tosAcceptedIp,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('[confirm152FzConsentAction] Error:', message);
    return { success: false, error: 'Не удалось зафиксировать согласие 152-ФЗ' };
  }
}
