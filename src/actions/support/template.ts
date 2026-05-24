'use server';

import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/server/rbac';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getClientIp } from '@/utils/ip';
import { auditAdmin } from '@/lib/admin-audit';

const templateSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, 'Название обязательно'),
  text: z.string().min(1, 'Текст обязателен'),
  sort: z.number().int().default(0)
});

export async function getTemplates() {
  return requireStaffPermission('support', 'view', async () => {
    return db.supportTemplate.findMany({
      orderBy: { sort: 'asc' }
    });
  });
}

export async function upsertTemplate(formData: FormData) {
  return requireStaffPermission('support', 'edit', async (admin) => {

  const parsed = templateSchema.safeParse({
    id: formData.get('id') || undefined,
    label: formData.get('label'),
    text: formData.get('text'),
    sort: parseInt(formData.get('sort') as string || '0', 10)
  });

  if (!parsed.success) {
    throw new Error('Invalid input');
  }

  const data = parsed.data;
  const ipAddress = await getClientIp('unknown');

  if (data.id) {
    const oldTemplate = await db.supportTemplate.findUnique({
      where: { id: data.id }
    });

    const newTemplate = await db.supportTemplate.update({
      where: { id: data.id },
      data: { label: data.label, text: data.text, sort: data.sort }
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
      data: { label: data.label, text: data.text, sort: data.sort }
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

export async function deleteTemplate(formData: FormData) {
  return requireStaffPermission('support', 'edit', async (admin) => {

  const id = formData.get('id') as string;
  if (!id) throw new Error('No id provided');

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
