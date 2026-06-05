'use server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import { requireStaffPermission } from '@/lib/server/rbac';

import { auditAdmin } from '@/lib/admin-audit';
import { getClientIp } from '@/utils/ip';

const pageSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1)
});

export async function savePage(formData: FormData) {
  return requireStaffPermission('settings', 'edit', async (admin) => {
    const parsed = pageSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return;
    const { id: pageId, slug, title, content: rawContent } = parsed.data;

    // Sanitize HTML to prevent XSS (OWASP A01)
    const content = sanitizeHtml(rawContent, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'figure', 'figcaption']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        'img': ['src', 'alt', 'width', 'height', 'loading'],
        '*': ['class', 'style']
      },
      allowedSchemes: ['http', 'https', 'data'],
    });

    let oldPage = null;
    if (pageId) {
      oldPage = await db.page.findUnique({
        where: { id: pageId }
      });
      await db.page.update({
        where: { id: pageId },
        data: { slug, title, content }
      });
    } else {
      await db.page.create({
        data: { slug, title, content }
      });
    }

    const ipAddress = await getClientIp('unknown');
    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CMS_PAGE_SAVE',
      target: pageId || slug,
      targetType: 'CMS_PAGE',
      oldValue: oldPage,
      newValue: { slug, title, content },
      ipAddress
    });

    revalidatePath('/admin/pages');
    revalidatePath(`/p/${slug}`);
    redirect('/admin/pages');
  });
}
