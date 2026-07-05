'use server';

import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/server/rbac';
import { revalidatePath } from 'next/cache';
import { WalletOps } from '@/services/financial/wallet-ops';
import { z } from 'zod';
import crypto from 'crypto';
import { getClientIp } from '@/utils/ip';

import { getAdminSpentToday } from './ticket';

const compensationSchema = z.object({
  ticketId: z.string().min(1),
  costRub: z.number().positive().max(50000), // W4-3 FIX: Upper limit
  note: z.string().min(3),
  topUpBalance: z.boolean().default(false)
});

export async function logManualCompensation(formData: FormData) {
  return requireStaffPermission('orders', 'edit', async (user) => {

  const parsed = compensationSchema.safeParse({
    ticketId: formData.get('ticketId'),
    costRub: parseFloat(formData.get('costRub') as string),
    note: formData.get('note'),
    topUpBalance: formData.get('topUpBalance') === 'true'
  });

  if (!parsed.success) {
    throw new Error('Invalid input');
  }

  const { ticketId, costRub, note, topUpBalance } = parsed.data;
  const costCents = Math.round(costRub * 100);

  // OWNER has infinite limit effectively. For others, check limits.
  const isOwner = user.role === 'OWNER';
  if (!isOwner) {
    const currentSpentToday = await getAdminSpentToday(user.id);
    const limitLeft = user.supportLimitCents - currentSpentToday;
    if (limitLeft < costCents) {
      throw new Error(`Недостаточно лимита доверия на сегодня. Доступно: ${(limitLeft / 100).toFixed(2)} ₽`);
    }
  }

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: { userId: true, id: true }
  });

  if (!ticket) throw new Error('Ticket not found');

  // Generate a deterministic idempotency key based on inputs
  // If the admin clicks twice with the exact same parameters, the DB unique constraint will reject it.
  const idempotencyHash = crypto.createHash('md5').update(`${ticketId}-${costCents}-${note}-${topUpBalance}`).digest('hex');
  const idempotencyKey = `compensation-${ticket.id}-${idempotencyHash}`;

  const ipAddress = await getClientIp('unknown');

  // Perform operations in a transaction
  await db.$transaction(async (tx) => {
    // 1. Check limit dynamically inside tx if not owner to prevent concurrent bypass
    if (!isOwner) {
      const currentSpentToday = await getAdminSpentToday(user.id, tx);
      const limitLeft = user.supportLimitCents - currentSpentToday;
      if (limitLeft < costCents) {
        throw new Error('Недостаточно лимита доверия. Обнаружена конкурентная транзакция.');
      }
    }

    // 2. If top-up is requested, increment user balance
    if (topUpBalance) {
      await WalletOps.credit(tx, ticket.userId, costCents,
         `Компенсация (На баланс): ${note}`,
        { adminId: user.id, idempotencyKey }
      );
    } else {
      // 3. For manual refill, credit user and then debit them back (net balance change = 0, but ledger invariant is preserved)
      const creditKey = `compensation-credit-${ticket.id}-${idempotencyHash}`;
      const chargeKey = `compensation-charge-${ticket.id}-${idempotencyHash}`;

      // Credit the compensation (amount > 0)
      await WalletOps.credit(tx, ticket.userId, costCents,
        `Компенсация (Докрут): ${note}`,
        { adminId: user.id, idempotencyKey: creditKey }
      );

      // Charge the cost of the refill (amount < 0) as system charge to prevent double-spending the admin's daily budget limit
      await WalletOps.charge(tx, ticket.userId, costCents,
        `Списание за ручной докрут: ${note}`,
        { idempotencyKey: chargeKey }
      );
    }

    // 4. Write AdminAuditLog
    await tx.adminAuditLog.create({
      data: {
        adminId: user.id,
        adminEmail: user.email,
        action: topUpBalance ? 'BALANCE_TOPUP_COMPENSATION' : 'MANUAL_REFILL_COMPENSATION',
        target: ticket.id,
        targetType: 'TICKET',
        oldValue: JSON.stringify({ supportLimitCents: user.supportLimitCents }),
        newValue: JSON.stringify({ supportLimitCents: isOwner ? user.supportLimitCents : user.supportLimitCents - costCents }),
        ipAddress
      }
    });

    // 5. Inject silent message to ChatWindow
    await tx.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        sender: 'INTERNAL',
        text: `[СИСТЕМА] Сотрудник (${user.email}) оформил компенсацию (${topUpBalance ? 'зачислен баланс' : 'ручной докрут'}). Потрачено: ${costRub.toLocaleString('ru-RU')} ₽.\nКомментарий: ${note}`
      }
    });
  });

    revalidatePath('/admin/tickets');
    revalidatePath(`/admin/tickets/${ticketId}`, 'page');
    revalidatePath(`/admin/finance`);
  });
}
