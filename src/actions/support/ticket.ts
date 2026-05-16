'use server';

import { verifySession } from '@/lib/session';
import { ticketService } from '@/services/support/ticket.service';
import { db } from '@/lib/db';
import { aiSupportService } from '@/services/admin/ai-support.service';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

// ... (rest of imports)

export async function generateSmartReplyAction(ticketId: string) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !['ADMIN', 'SUPPORT', 'OWNER'].includes(user.role)) throw new Error('Forbidden');

  try {
    const reply = await aiSupportService.generateReply(ticketId);
    return { success: true, reply };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
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
  replyToId: z.string().optional()
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
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const parsed = createTicketSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Данные тикета заполнены неверно');
  const { subject, message } = parsed.data;

  const ticket = await ticketService.getOrCreateTicket(session.userId, subject);
  await ticketService.addMessage(ticket.id, 'USER', message);

  revalidatePath('/dashboard/tickets');
  redirect(`/dashboard/tickets/${ticket.id}`);
}

export async function addTicketMessage(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const parsed = ticketMessageSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Сообщение не может быть пустым');
  const { ticketId, message, mediaUrl, mediaType, replyToId } = parsed.data;

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.userId !== session.userId) throw new Error('Forbidden');

  await ticketService.addMessage(ticketId, 'USER', message || '', mediaUrl, mediaType, replyToId);
  revalidatePath(`/dashboard/tickets/${ticketId}`);
}

export async function adminReplyTicket(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !['ADMIN', 'SUPPORT', 'OWNER'].includes(user.role)) throw new Error('Forbidden');

  const parsed = adminReplySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Ошибка валидации сообщения');
  const { ticketId, message, isInternal, mediaUrl, mediaType, replyToId } = parsed.data;

  const sender = isInternal ? 'INTERNAL' : 'STAFF';

  await ticketService.addMessage(ticketId, sender, message || '', mediaUrl, mediaType, replyToId);
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/admin/tickets`);
}

const changeStatusSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(['OPEN', 'PENDING', 'CLOSED'])
});

export async function changeTicketStatus(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !['ADMIN', 'SUPPORT', 'OWNER'].includes(user.role)) throw new Error('Forbidden');

  const parsed = changeStatusSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Неверный статус');
  const { ticketId, status } = parsed.data;

  await db.ticket.update({
    where: { id: ticketId },
    data: { 
      status,
      ...(status === 'CLOSED' ? { resolvedAt: new Date() } : {})
    }
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/admin/tickets`);
}

const editMessageSchema = z.object({
  messageId: z.string().min(1),
  newText: z.string().min(1)
});

export async function editTicketMessage(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !['ADMIN', 'SUPPORT', 'OWNER'].includes(user.role)) throw new Error('Forbidden');

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

  // Transaction for updating text and auditing
  await db.$transaction(async (tx) => {
    await tx.ticketMessage.update({
      where: { id: messageId },
      data: { text: newText.trim() }
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
        ipAddress: 'internal'
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
}

const requestBindSchema = z.object({
  ticketId: z.string().min(1)
});

export async function requestTelegramBind(formData: FormData) {
  try {
    console.log('[requestTelegramBind] Action started');
    const session = await verifySession();
    if (!session) throw new Error('Unauthorized');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !['ADMIN', 'SUPPORT', 'OWNER'].includes(user.role)) throw new Error('Forbidden');

  const parsed = requestBindSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    console.error('[requestTelegramBind] Validation failed:', parsed.error);
    throw new Error('Invalid ticketId');
  }
  const { ticketId } = parsed.data;
  console.log('[requestTelegramBind] Processing ticketId:', ticketId);

  const ticket = await db.ticket.findUnique({ where: { id: ticketId }, include: { user: true } });
  if (!ticket) throw new Error('Ticket not found');

  if (!ticket.user.email.startsWith('tg_')) {
    throw new Error('У пользователя уже есть веб-аккаунт');
  }

  const host = process.env.NEXT_PUBLIC_APP_URL || 'https://smmplan.pro';
  const magicLink = `${host}/api/support/telegram?forceAuth=true`;

  const messageText = `🎧 <b>Служба поддержки Smmplan</b>\n\nЧтобы мы могли найти ваши заказы и оформить возврат средств на баланс, пожалуйста, подтвердите владение заказом по ссылке: ${magicLink}`;

    await ticketService.addMessage(ticketId, 'STAFF', messageText);
    revalidatePath(`/admin/tickets/${ticketId}`);
  } catch (err) {
    console.error('[requestTelegramBind] Error:', err);
    throw err;
  }
}

const manualBindSchema = z.object({
  ticketId: z.string().min(1),
  targetEmail: z.string().email('Некорректный email')
});

export async function adminManualTelegramBind(formData: FormData) {
  try {
    const session = await verifySession();
    if (!session) throw new Error('Unauthorized');

  const admin = await db.user.findUnique({ where: { id: session.userId } });
  if (!admin || !['ADMIN', 'SUPPORT', 'OWNER'].includes(admin.role)) throw new Error('Forbidden');

  const parsed = manualBindSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Invalid input');
  const { ticketId, targetEmail } = parsed.data;

  const ticket = await db.ticket.findUnique({ where: { id: ticketId }, include: { user: true } });
  if (!ticket) throw new Error('Ticket not found');

  const tempUser = ticket.user;
  if (!tempUser.email.startsWith('tg_') || !tempUser.telegramId) {
    throw new Error('Этот профиль не является временным Telegram-аккаунтом');
  }

  const webUser = await db.user.findUnique({ where: { email: targetEmail } });
  if (!webUser) {
    throw new Error('Целевой аккаунт с таким email не найден');
  }

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
        ipAddress: 'internal'
      }
    });
  });

  revalidatePath(`/admin/tickets`);
  } catch (err) {
    console.error('[adminManualTelegramBind] Error:', err);
    throw err;
  }
}

