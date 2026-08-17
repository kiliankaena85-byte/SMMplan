'use server';

import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/server/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getClientIp } from '@/utils/ip';
import { auditAdmin } from '@/lib/admin-audit';

const templateSchema = z.object({
  id: z.string().optional(),
  shortcut: z.string()
    .min(1, 'Шорткат обязателен')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Шорткат может содержать только латинские буквы, цифры, дефис и подчеркивание')
    .optional()
    .nullable(),
  label: z.string().min(1, 'Название обязательно'),
  text: z.string().min(1, 'Текст обязателен'),
  category: z.string().default('GENERAL'),
  isActive: z.boolean().default(true),
  sort: z.number().int().default(0)
});

export async function getTemplates() {
  return requireStaffPermission('tickets', 'view', async () => {
    return db.supportTemplate.findMany({
      orderBy: { sort: 'asc' }
    });
  });
}

export async function incrementTemplateUsage(id: string) {
  return requireStaffPermission('tickets', 'view', async () => {
    try {
      await db.supportTemplate.update({
        where: { id },
        data: { useCount: { increment: 1 } }
      });
      return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return { success: false, error: 'Database error' };
    }
  });
}

export async function upsertTemplate(formData: FormData) {
  return requireStaffPermission('tickets', 'edit', async (admin) => {

  const parsed = templateSchema.safeParse({
    id: formData.get('id') || undefined,
    shortcut: formData.get('shortcut') || null,
    label: formData.get('label'),
    text: formData.get('text'),
    category: formData.get('category') || 'GENERAL',
    isActive: formData.get('isActive') === 'true' || formData.get('isActive') === 'on',
    sort: parseInt(formData.get('sort') as string || '0', 10)
  });

  if (!parsed.success) {
    throw new Error('Invalid input: ' + parsed.error.message);
  }

  const data = parsed.data;
  const ipAddress = await getClientIp('unknown');

  if (data.id) {
    const oldTemplate = await db.supportTemplate.findUnique({
      where: { id: data.id }
    });

    const newTemplate = await db.supportTemplate.update({
      where: { id: data.id },
      data: {
        shortcut: data.shortcut,
        label: data.label,
        text: data.text,
        category: data.category,
        isActive: data.isActive,
        sort: data.sort
      }
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SUPPORT_TEMPLATE_UPDATE',
      target: data.id,
      targetType: 'SETTINGS',
      oldValue: oldTemplate,
      newValue: newTemplate,
      ipAddress
    });
  } else {
    const newTemplate = await db.supportTemplate.create({
      data: {
        shortcut: data.shortcut,
        label: data.label,
        text: data.text,
        category: data.category,
        isActive: data.isActive,
        sort: data.sort
      }
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SUPPORT_TEMPLATE_CREATE',
      target: newTemplate.id,
      targetType: 'SETTINGS',
      newValue: newTemplate,
      ipAddress
    });
  }

    revalidatePath('/admin/tickets');
    revalidatePath('/admin/tickets/[id]', 'page');
  });
}

const deleteTemplateSchema = z.object({
  id: z.string().min(1, 'ID шаблона обязателен'),
});

export async function deleteTemplate(formData: FormData) {
  return requireStaffPermission('tickets', 'edit', async (admin) => {
    const rawId = formData.get('id');
    const parsed = deleteTemplateSchema.safeParse({ id: rawId });
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0]?.message || 'No id provided');
    }

    const { id } = parsed.data;

    const oldTemplate = await db.supportTemplate.findUnique({
      where: { id }
    });

    await db.supportTemplate.delete({
      where: { id }
    });

  const ipAddress = await getClientIp('unknown');
  auditAdmin({
    adminId: admin.id,
    adminEmail: admin.email,
    action: 'SUPPORT_TEMPLATE_DELETE',
    target: id,
    targetType: 'SETTINGS',
    oldValue: oldTemplate,
    ipAddress
  });

    revalidatePath('/admin/tickets');
    revalidatePath('/admin/tickets/[id]', 'page');
  });
}
