'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const setPasswordSchema = z.object({
  password: z.string().min(8, "Пароль должен состоять как минимум из 8 символов"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"]
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Введите текущий пароль"),
  newPassword: z.string().min(8, "Новый пароль должен состоять как минимум из 8 символов"),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"]
});

export async function setPasswordAction(formData: FormData) {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: 'Пожалуйста, войдите в аккаунт' };
  }

  const rawData = Object.fromEntries(formData.entries());
  const parsed = setPasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { password } = parsed.data;

  try {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true }
    });

    if (!user) {
      return { success: false, error: 'Пользователь не найден' };
    }

    if (user.passwordHash) {
      return { success: false, error: 'У вас уже установлен пароль. Используйте форму смены пароля.' };
    }

    const hashed = await hashPassword(password);

    await db.user.update({
      where: { id: session.userId },
      data: { passwordHash: hashed }
    });

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to set password:', error);
    return { success: false, error: 'Ошибка сервера при установке пароля' };
  }
}

export async function changePasswordAction(formData: FormData) {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: 'Пожалуйста, войдите в аккаунт' };
  }

  const rawData = Object.fromEntries(formData.entries());
  const parsed = changePasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true }
    });

    if (!user) {
      return { success: false, error: 'Пользователь не найден' };
    }

    if (!user.passwordHash) {
      return { success: false, error: 'У вас не установлен пароль. Пожалуйста, сначала установите пароль.' };
    }

    const isMatch = await verifyPassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return { success: false, error: 'Неверный текущий пароль' };
    }

    const hashed = await hashPassword(newPassword);

    await db.user.update({
      where: { id: session.userId },
      data: { passwordHash: hashed }
    });

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to change password:', error);
    return { success: false, error: 'Ошибка сервера при смене пароля' };
  }
}
