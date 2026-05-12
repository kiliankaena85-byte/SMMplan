'use server'

import { db } from '@/lib/db'
import { requireStaffPermission } from '@/lib/server/rbac'

export async function createInvoiceAction(userId: string, amount: number) {
  return requireStaffPermission('finance', 'edit', async () => {
    // 1. Verify user exists and has B2B fields
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { inn: true, companyName: true }
    });

    if (!user) throw new Error('Пользователь не найден');
    if (!user.inn) throw new Error('У пользователя не заполнен ИНН. Выставление счета невозможно.');

    // 2. Create the Invoice record
    const invoice = await db.invoice.create({
      data: {
        userId,
        amount, // in cents
        status: 'PENDING'
      }
    });

    // Note: Here we would typically generate a PDF using a library like pdfkit or puppeteer
    // and upload it to an S3 bucket, then save the URL to `invoice.fileUrl`.
    // For now, we return the generated ID.
    
    return { success: true, invoiceId: invoice.id };
  });
}

export async function markInvoicePaidAction(invoiceId: string) {
  return requireStaffPermission('finance', 'edit', async () => {
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error('Счет не найден');
    if (invoice.status === 'PAID') throw new Error('Счет уже оплачен');

    await db.$transaction(async (tx) => {
      // 1. Mark as PAID
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID' }
      });

      // 2. Add funds to User balance
      await tx.user.update({
        where: { id: invoice.userId },
        data: { balance: { increment: invoice.amount } }
      });

      // 3. Log in Ledger
      await tx.ledgerEntry.create({
        data: {
          userId: invoice.userId,
          amount: invoice.amount,
          reason: `Оплата по B2B счету #${invoice.id}`,
          status: 'APPROVED',
          idempotencyKey: `invoice-${invoice.id}`
        }
      });
    });

    return { success: true };
  });
}
