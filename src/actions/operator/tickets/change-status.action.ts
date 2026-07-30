'use server';

import { requireOperatorPermission } from '@/lib/operator/rbac';
import { db } from '@/lib/db';
import { getClientIp } from '@/utils/ip';
import { auditAdmin } from '@/lib/admin-audit';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const schema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(['OPEN', 'PENDING', 'CLOSED']),
});

export async function changeTicketStatusAction(data: {
  ticketId: string;
  status: 'OPEN' | 'PENDING' | 'CLOSED';
}) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: 'Некорректный статус тикета' };
  }

  try {
    const result = await requireOperatorPermission('tickets', 'edit', async (admin) => {
      const { ticketId, status } = parsed.data;

      const oldTicket = await db.ticket.findUnique({
        where: { id: ticketId },
        select: { status: true },
      });
      if (!oldTicket) {
        throw new Error('Обращение не найдено');
      }

      await db.ticket.update({
        where: { id: ticketId },
        data: {
          status,
          ...(status === 'CLOSED' ? { resolvedAt: new Date() } : {}),
        },
      });

      const ipAddress = await getClientIp('unknown');
      auditAdmin({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'TICKET_STATUS_CHANGE',
        target: ticketId,
        targetType: 'TICKET',
        oldValue: oldTicket.status,
        newValue: status,
        ipAddress,
      });

      return { success: true as const };
    });

    if (result.success) {
      revalidatePath(`/operator/tickets`);
    }

    return result;
  } catch (err) {
    console.error('[changeTicketStatusAction] Error changing status:', err);
    const message = err instanceof Error ? err.message : 'Ошибка сервера при смене статуса';
    return { success: false as const, error: message };
  }
}
