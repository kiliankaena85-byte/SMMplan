'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type {
  CompanyRequisitesInput,
  UpdateCompanyRequisitesResult,
} from '../settings-extra.types';

const taxRequisitesSchema = z.object({
  companyName: z.string().max(255, 'Название компании не должно превышать 255 символов').nullable().optional(),
  inn: z.string().refine(val => !val || /^\d{10}$|^\d{12}$/.test(val.trim()), {
    message: 'ИНН должен содержать ровно 10 цифр (для организаций) или 12 цифр (для ИП)',
  }).nullable().optional(),
  kpp: z.string().refine(val => !val || /^\d{9}$/.test(val.trim()), {
    message: 'КПП должен содержать ровно 9 цифр',
  }).nullable().optional(),
  ogrn: z.string().refine(val => !val || /^\d{13}$|^\d{15}$/.test(val.trim()), {
    message: 'ОГРН должен содержать ровно 13 цифр (для юрлиц) или 15 цифр ОГРНИП (для ИП)',
  }).nullable().optional(),
  legalAddress: z.string().max(500, 'Юридический адрес не должен превышать 500 символов').nullable().optional(),
});

export async function updateTaxRequisitesAction(
  data: CompanyRequisitesInput
): Promise<UpdateCompanyRequisitesResult> {
  const session = await verifySession();
  if (!session?.userId) {
    return { success: false, error: 'Авторизуйтесь для выполнения этого действия' };
  }

  const parsed = taxRequisitesSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || 'Некорректные реквизиты',
    };
  }

  const companyName = parsed.data.companyName?.trim() || null;
  const inn = parsed.data.inn?.trim() || null;
  const kpp = parsed.data.kpp?.trim() || null;
  const ogrn = parsed.data.ogrn?.trim() || null;
  const legalAddress = parsed.data.legalAddress?.trim() || null;

  try {
    await db.user.update({
      where: { id: session.userId },
      data: {
        companyName,
        inn,
        kpp,
        ogrn,
        legalAddress,
      },
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/settings/requisites');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('[updateTaxRequisitesAction] Error:', message);
    return { success: false, error: 'Не удалось сохранить реквизиты компании' };
  }
}

export async function updateCompanyRequisitesAction(
  data: CompanyRequisitesInput
): Promise<UpdateCompanyRequisitesResult> {
  return updateTaxRequisitesAction(data);
}
