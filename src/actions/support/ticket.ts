'use server';

import { verifySession } from '@/lib/session';
import { ticketService } from '@/services/support/ticket.service';
import { db } from '@/lib/db';
import { aiSupportService } from '@/services/admin/ai-support.service';
import { requireStaffPermission } from '@/lib/server/rbac';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getClientIp } from '@/utils/ip';
import { auditAdmin } from '@/lib/admin-audit';
import { WalletOps } from '@/services/financial/wallet-ops';
import { CompensationService } from '@/services/financial/compensation.service';

/**
 * MANDATORY INTEGRITY WARNING:
 * DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
 */

// ... (rest of imports)

export async function generateSmartReplyAction(ticketId: string) {
  return requireStaffPermission('orders', 'view', async () => {
    try {
      const reply = await aiSupportService.generateReply(ticketId);
      return { success: true, reply };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}

import { RateLimitService } from '@/services/core/rate-limit.service';
import { publishMessageSSE } from '@/services/support/sse.service';

// === LIVE CHAT SERVER ACTION ===
const liveChatMessageSchema = z.object({
  ticketId: z.string().min(1),
  message: z.string().min(1, 'Сообщение не может быть пустым').max(4000),
  orderId: z.string().optional()
});

/**
 * Server Action: Send a live chat message from client cabinet.
 * Broadcasts to SSE stream for real-time delivery to operator.
 */
export async function sendLiveChatMessage(formData: FormData) {
  if (!formData || typeof formData.entries !== 'function') throw new Error("Некорректные данные формы");
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  // Anti-spam: 60 messages per minute
  const isAllowed = await RateLimitService.checkCustomKey(`live_chat:${session.userId}`, 60, 60);
  if (!isAllowed) {
    throw new Error('Вы отправляете сообщения слишком быстро. Подождите.');
  }

  const parsed = liveChatMessageSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error(parsed.error.errors[0].message);

  const { ticketId, message, orderId } = parsed.data;

  // Security: user must own the ticket
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.userId !== session.userId) throw new Error('Forbidden');

  // On-the-fly order binding (first message with order context)
  if (orderId && !ticket.orderId) {
    // Verify user owns the order too
    const order = await db.order.findFirst({
      where: { id: orderId, userId: session.userId }
    });
    if (order) {
      await db.ticket.update({
        where: { id: ticketId },
        data: { orderId }
      });
    }
  }

  // Add message via unified omnichannel service
  const savedMsg = await ticketService.addMessage(ticketId, 'USER', message, undefined, undefined, undefined, undefined, undefined, orderId || undefined);

  // Broadcast to SSE listeners (real-time delivery to operator panel & client tabs)
  if (savedMsg?.id) {
    await publishMessageSSE(ticketId, savedMsg.id);
  }

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  return { success: true };
}


const createTicketSchema = z.object({
  subject: z.string().min(1),
  message: z.string().min(1)
});

const ticketMessageSchema = z.object({
  ticketId: z.string().min(1),
  message: z.string().optional(),
  mediaUrl: z.string().optional(),
  mediaType: z.string().optional(),
  replyToId: z.string().optional(),
  orderId: z.string().optional()
}).refine(data => data.message || data.mediaUrl, "Either message or mediaUrl must be provided");

const adminReplySchema = z.object({
  ticketId: z.string().min(1),
  message: z.string().optional(),
  isInternal: z.any().transform(val => val === 'true' || val === 'on'),
  mediaUrl: z.string().optional(),
  mediaType: z.string().optional(),
  replyToId: z.string().optional()
}).refine(data => data.message || data.mediaUrl, "Either message or mediaUrl must be provided");

export async function createTicket(formData: FormData) {
  if (!formData || typeof formData.entries !== 'function') throw new Error("Некорректные данные формы");
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  // Rate Limit: Prevent ticket spam (max 5 tickets per 1 hour)
  const isAllowedUser = await RateLimitService.checkCustomKey(`create_ticket_user:${session.userId}`, 5, 3600);
  const isAllowedIp = await RateLimitService.check('create_ticket_ip', 10, 3600);
  if (!isAllowedUser || !isAllowedIp) {
    throw new Error('Вы создаете слишком много обращений. Пожалуйста, подождите некоторое время.');
  }

  const parsed = createTicketSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Данные тикета заполнены неверно');
  const { subject, message } = parsed.data;

  const ticket = await ticketService.getOrCreateTicket(session.userId, subject);
  await ticketService.addMessage(ticket.id, 'USER', message);

  revalidatePath('/dashboard/tickets');
  redirect(`/dashboard/tickets/${ticket.id}`);
}

export async function addTicketMessage(formData: FormData) {
  if (!formData || typeof formData.entries !== 'function') throw new Error("Некорректные данные формы");
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  // Rate Limit: Prevent message flooding (max 60 messages per 1 minute)
  const isAllowedUser = await RateLimitService.checkCustomKey(`add_message_user:${session.userId}`, 60, 60);
  const isAllowedIp = await RateLimitService.check('add_message_ip', 100, 60);
  if (!isAllowedUser || !isAllowedIp) {
    throw new Error('Слишком много сообщений. Пожалуйста, подождите перед следующим ответом.');
  }

  const parsed = ticketMessageSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Сообщение не может быть пустым');
  const { ticketId, message, mediaUrl, mediaType, replyToId, orderId } = parsed.data;

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.userId !== session.userId) throw new Error('Forbidden');

  let verifiedOrderId: string | undefined = undefined;
  if (orderId) {
    // Security check: verify user owns the SMM order
    const order = await db.order.findFirst({
      where: { id: orderId, userId: session.userId }
    });
    if (order) {
      verifiedOrderId = order.id;
      // Also link at the ticket level for legacy compatibility and top-level headers
      await db.ticket.update({
        where: { id: ticketId },
        data: { orderId: order.id }
      });
    }
  }

  const savedMsg = await ticketService.addMessage(ticketId, 'USER', message || '', mediaUrl, mediaType, replyToId, undefined, undefined, verifiedOrderId);
  if (savedMsg?.id) {
    await publishMessageSSE(ticketId, savedMsg.id);
  }
  revalidatePath(`/dashboard/tickets/${ticketId}`);
}

export async function adminReplyTicket(formData: FormData) {
  return requireStaffPermission('orders', 'edit', async (admin) => {
    const parsed = adminReplySchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) throw new Error('Ошибка валидации сообщения');
    const { ticketId, message, isInternal, mediaUrl, mediaType, replyToId } = parsed.data;

    const sender = isInternal ? 'INTERNAL' : 'STAFF';

    const savedMsg = await ticketService.addMessage(ticketId, sender, message || '', mediaUrl, mediaType, replyToId);

    const ipAddress = await getClientIp('unknown');
    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: isInternal ? 'TICKET_INTERNAL_NOTE_ADD' : 'TICKET_REPLY_SEND',
      target: ticketId,
      targetType: 'TICKET',
      newValue: { message, mediaUrl, mediaType, replyToId },
      ipAddress
    });

    // Broadcast STAFF replies to SSE stream (NOT internal notes)
    if (sender === 'STAFF') {
      await publishMessageSSE(ticketId, savedMsg.id);
    }

    revalidatePath(`/admin/tickets/${ticketId}`);
    revalidatePath(`/admin/tickets`);
  });
}

const changeStatusSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(['OPEN', 'PENDING', 'CLOSED'])
});

export async function changeTicketStatus(formData: FormData) {
  return requireStaffPermission('orders', 'edit', async (admin) => {
    const parsed = changeStatusSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) throw new Error('Неверный статус');
    const { ticketId, status } = parsed.data;

    const oldTicket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: { status: true }
    });

    await db.ticket.update({
      where: { id: ticketId },
      data: { 
        status,
        ...(status === 'CLOSED' ? { resolvedAt: new Date() } : {})
      }
    });

    const ipAddress = await getClientIp('unknown');
    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'TICKET_STATUS_CHANGE',
      target: ticketId,
      targetType: 'TICKET',
      oldValue: oldTicket?.status,
      newValue: status,
      ipAddress
    });

    revalidatePath(`/admin/tickets/${ticketId}`);
    revalidatePath(`/admin/tickets`);
  });
}

const editMessageSchema = z.object({
  messageId: z.string().min(1),
  newText: z.string().min(1)
});

export async function editTicketMessage(formData: FormData) {
  return requireStaffPermission('orders', 'edit', async (user) => {
    const parsed = editMessageSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) throw new Error('Ошибка редактирования сообщения');
    const { messageId, newText } = parsed.data;

    // Retrieve the old message
    const msg = await db.ticketMessage.findUnique({ 
      where: { id: messageId },
      include: { ticket: { include: { user: true } } }
    });
    if (!msg) throw new Error('Message not found');
    if (msg.sender === 'USER') {
      throw new Error('You cannot edit user messages');
    }

    const ipAddress = await getClientIp('unknown');
    // Transaction for updating text and auditing
    await db.$transaction(async (tx) => {
      await tx.ticketMessage.update({
        where: { id: messageId },
        data: { 
          text: newText.trim(),
          isEdited: true,
          originalText: msg.isEdited ? undefined : msg.text
        }
      });

      await tx.adminAuditLog.create({
        data: {
          adminId: user.id,
          adminEmail: user.email,
          action: 'TICKET_MESSAGE_EDITED',
          target: msg.id,
          targetType: 'TICKET_MESSAGE',
          oldValue: msg.text,
          newValue: newText.trim(),
          ipAddress
        }
      });
    });

    // Sync to Telegram if applicable
    if (msg.telegramMsgId && msg.ticket.user.telegramId && msg.sender === 'STAFF') {
      try {
        const { supportBotService } = await import('@/services/support/support-bot.service');
        await supportBotService.editSupportReply(msg.ticket.user.telegramId, msg.telegramMsgId, newText.trim());
      } catch (e) {
        console.error('[editTicketMessage] Error syncing edit to Telegram:', e);
        // We don't throw here to avoid failing the web UI if Telegram is temporarily down
      }
    }

    revalidatePath(`/admin/tickets/${msg.ticketId}`);
  });
}

const requestBindSchema = z.object({
  ticketId: z.string().min(1)
});

export async function requestTelegramBind(formData: FormData) {
  return requireStaffPermission('orders', 'edit', async () => {
    try {
      console.info('[requestTelegramBind] Action started');
      const parsed = requestBindSchema.safeParse(Object.fromEntries(formData.entries()));
      if (!parsed.success) {
        console.error('[requestTelegramBind] Validation failed:', parsed.error);
        throw new Error('Invalid ticketId');
      }
      const { ticketId } = parsed.data;
      console.info('[requestTelegramBind] Processing ticketId:', ticketId);

      const ticket = await db.ticket.findUnique({ where: { id: ticketId }, include: { user: true } });
      if (!ticket) throw new Error('Ticket not found');

      if (!ticket.user.email.startsWith('tg_')) {
        throw new Error('У пользователя уже есть веб-аккаунт');
      }

      const host = process.env.NEXT_PUBLIC_APP_URL || 'https://smmplan.pro';
      const magicLink = `${host}/api/support/telegram?forceAuth=true`;

      const messageText = `🎧 <b>Служба поддержки SMMplan</b>\n\nЧтобы мы могли найти ваши заказы и оформить возврат средств на баланс, пожалуйста, подтвердите владение заказом по ссылке: ${magicLink}`;

      const savedMsg = await ticketService.addMessage(ticketId, 'STAFF', messageText);

      await publishMessageSSE(ticketId, savedMsg.id);

      revalidatePath(`/admin/tickets/${ticketId}`);
    } catch (err) {
      console.error('[requestTelegramBind] Error:', err);
      throw err;
    }
  });
}

const manualBindSchema = z.object({
  ticketId: z.string().min(1),
  targetEmail: z.string().email('Некорректный email'),
  confirm: z.string().optional()
});

export async function adminManualTelegramBind(formData: FormData) {
  return requireStaffPermission('orders', 'edit', async (admin) => {
    try {
      // W6-5: SUPPORT cannot call manual bind
      if (!['ADMIN', 'OWNER'].includes(admin.role)) throw new Error('Forbidden: Only ADMIN or OWNER can manually bind Telegram accounts');

      const parsed = manualBindSchema.safeParse(Object.fromEntries(formData.entries()));
      if (!parsed.success) throw new Error('Invalid input');
      const { ticketId, targetEmail, confirm } = parsed.data;

      const ticket = await db.ticket.findUnique({ where: { id: ticketId }, include: { user: true } });
      if (!ticket) throw new Error('Ticket not found');

      const tempUser = ticket.user;
      if (!tempUser.email.startsWith('tg_') || !tempUser.telegramId) {
        throw new Error('Этот профиль не является временным Telegram-аккаунтом');
      }

      const webUser = await db.user.findUnique({ 
        where: { email: targetEmail },
        include: { _count: { select: { orders: true } } }
      });
      if (!webUser) {
        throw new Error('Целевой аккаунт с таким email не найден');
      }

      // W6-4: Add confirmationToken flow
      if (confirm !== 'true') {
        const tempUserOrders = await db.order.count({ where: { userId: tempUser.id } });
        return { 
          preview: true, 
          data: {
            tempUserEmail: tempUser.email,
            tempUserOrders: tempUserOrders,
            targetEmail: webUser.email,
            targetBalance: (Number(webUser.balance) / 100).toFixed(2),
            targetOrders: webUser._count.orders
          }
        };
      }

      const ipAddress = await getClientIp('unknown');
      await db.$transaction(async (tx) => {
        // 1. Move all relational data from tempUser to webUser
        await tx.ticket.updateMany({ where: { userId: tempUser.id }, data: { userId: webUser.id } });
        await tx.order.updateMany({ where: { userId: tempUser.id }, data: { userId: webUser.id } });
        await tx.payment.updateMany({ where: { userId: tempUser.id }, data: { userId: webUser.id } });
        await tx.ledgerEntry.updateMany({ where: { userId: tempUser.id }, data: { userId: webUser.id } });
        await tx.invoice.updateMany({ where: { userId: tempUser.id }, data: { userId: webUser.id } });
        await tx.auditLog.updateMany({ where: { userId: tempUser.id }, data: { userId: webUser.id } });

        // 2. Delete temp user to free up the unique telegramId
        await tx.user.delete({ where: { id: tempUser.id } });

        // 3. Bind telegramId to the target web user
        await tx.user.update({
          where: { id: webUser.id },
          data: { telegramId: tempUser.telegramId }
        });

        // 4. Audit Log
        await tx.adminAuditLog.create({
          data: {
            adminId: admin.id,
            adminEmail: admin.email,
            action: 'MANUAL_TELEGRAM_BIND',
            target: webUser.id,
            targetType: 'USER',
            oldValue: tempUser.email,
            newValue: webUser.email,
            ipAddress
          }
        });
      });

      revalidatePath(`/admin/tickets`);
      return { success: true };
    } catch (err) {
      console.error('[adminManualTelegramBind] Error:', err);
      throw err;
    }
  });
}

export async function bulkRefillOrdersAction(ticketId: string, orderIds: string[]) {
  return requireStaffPermission('orders', 'edit', async (admin) => {
    const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Тикет не найден');

    let processedCount = 0;
    const errors: string[] = [];
    const createdRefills: { id: string }[] = [];

    await db.$transaction(async (tx) => {
      for (const orderId of orderIds) {
        try {
          const order = await tx.order.findFirst({
            where: { id: orderId, userId: ticket.userId },
            include: { service: true }
          });

          if (!order) {
            errors.push(`Заказ ${orderId} не найден или принадлежит другому пользователю`);
            continue;
          }

          if (order.status === 'CANCELED' || order.status === 'ERROR') {
            errors.push(`Заказ #${order.numericId}: Невозможно докрутить отмененный или ошибочный заказ`);
            continue;
          }

          if (order.status === 'PARTIAL') {
            errors.push(`Заказ #${order.numericId}: Невозможно докрутить заказ с частичным возвратом`);
            continue;
          }

          if (!order.service.isRefillEnabled) {
            errors.push(`Заказ #${order.numericId}: Докрутка не поддерживается для этой услуги`);
            continue;
          }

          const refill = await tx.refill.create({
            data: {
              orderId: order.id,
              status: 'PENDING'
            }
          });

          createdRefills.push({ id: refill.id });
          processedCount++;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          errors.push(`Ошибка по заказу ${orderId}: ${err.message}`);
        }
      }
    });

    const { refillQueue } = await import('@/lib/queue-manager');
    for (const refill of createdRefills) {
      await refillQueue.add('process-refill', { refillId: refill.id });
    }

    const ipAddress = await getClientIp('unknown');
    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'TICKET_BULK_REFILL',
      target: ticketId,
      targetType: 'TICKET',
      newValue: { orderIds, processedCount, errors },
      ipAddress
    });

    revalidatePath(`/admin/tickets/${ticketId}`);
    revalidatePath('/admin/refills');

    return { success: true, processedCount, errors };
  });
}

export async function bulkRefundOrdersAction(ticketId: string, orderIds: string[]) {
  return requireStaffPermission('orders', 'edit', async (admin) => {
    const ticket = await db.ticket.findUnique({ 
      where: { id: ticketId },
      include: { user: true }
    });
    if (!ticket) throw new Error('Тикет не найден');

    // Check B2bConfig profile to see if the user is a B2B reseller
    const b2bConfig = await db.b2bConfig.findUnique({
      where: { userId: ticket.userId }
    });
    const isB2bClient = !!b2bConfig && b2bConfig.isB2b;

    let processedCount = 0;
    let totalRefundedCents = 0;
    const errors: string[] = [];

    const { calculatePartialRefund } = await import('@/utils/refund');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calculatedRefunds: any[] = [];

    await db.$transaction(async (tx) => {
      // Calculate total refund cents first
      let totalToRefundCents = 0;

      for (const orderId of orderIds) {
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (order && !['CANCELED', 'PARTIAL'].includes(order.status) && order.remains > 0 && order.userId === ticket.userId) {
          const calculatedAmount = calculatePartialRefund({
            remains: order.remains,
            quantity: order.quantity,
            charge: order.charge
          });
          if (calculatedAmount > 0) {
            totalToRefundCents += calculatedAmount;
            calculatedRefunds.push({ order, calculatedAmount });
          }
        } else if (order) {
          if (order.userId !== ticket.userId) {
            errors.push(`Заказ ${orderId} принадлежит другому пользователю`);
          } else if (['CANCELED', 'PARTIAL'].includes(order.status)) {
            errors.push(`Заказ #${order.numericId}: Уже отменен или частично возвращен`);
          } else if (order.remains <= 0) {
            errors.push(`Заказ #${order.numericId}: Нет остатков для возврата (remains <= 0)`);
          }
        } else {
          errors.push(`Заказ ${orderId} не найден`);
        }
      }

      if (totalToRefundCents > 0 && !isB2bClient) {
        const currentSpentToday = await getAdminSpentToday(admin.id, tx);
        const limitLeft = admin.supportLimitCents - currentSpentToday;
        if (totalToRefundCents > limitLeft) {
          throw new Error(`Превышен суточный лимит компенсаций оператора. Требуется: ${(totalToRefundCents / 100).toFixed(2)} ₽, Осталось: ${(limitLeft / 100).toFixed(2)} ₽`);
        }
      }

      // Perform updates
      for (const item of calculatedRefunds) {
        await tx.order.update({
          where: { id: item.order.id },
          data: { status: 'PARTIAL' }
        });

        const idempotencyKey = `refund_ticket_${ticketId}_order_${item.order.id}`;
        await WalletOps.refund(tx, ticket.userId, item.calculatedAmount,
          `Компенсация (частичный возврат) по тикету #${ticketId} за недовыполненный заказ #${item.order.numericId}`,
          { idempotencyKey, adminId: admin.id }
        );

        processedCount++;
        totalRefundedCents += item.calculatedAmount;
      }
    }, { isolationLevel: 'Serializable' });

    for (const item of calculatedRefunds) {
      CompensationService.trackCompensation(item.order.id).catch(err => console.error('[TicketActions] Failed to track compensation', err));
    }

    const ipAddress = await getClientIp('unknown');
    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'TICKET_BULK_REFUND',
      target: ticketId,
      targetType: 'TICKET',
      newValue: { orderIds, processedCount, totalRefundedCents, errors },
      ipAddress
    });

    revalidatePath(`/admin/tickets/${ticketId}`);
    revalidatePath(`/admin/tickets`);

    return { 
      success: true, 
      processedCount, 
      totalRefundedAmount: (totalRefundedCents / 100).toFixed(2), 
      errors 
    };
  });
}

import { getMSKMidnightUTC } from '@/services/admin/escrow.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAdminSpentToday(adminId: string, tx?: any): Promise<number> {
  const todayStart = getMSKMidnightUTC();

  const client = tx || db;
  const ledgerCompensations = await client.ledgerEntry.findMany({
    where: {
      adminId,
      createdAt: { gte: todayStart },
    },
    select: {
      amount: true
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ledgerCompensations.reduce((acc: number, entry: any) => {
    const amt = Number(entry.amount);
    return acc + Math.abs(amt);
  }, 0);
}


