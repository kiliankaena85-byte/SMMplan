'use server';

import { db } from '@/lib/db';
import { z } from 'zod';
import { RateLimitService } from '@/services/core/rate-limit.service';

const guestTicketSchema = z.object({
  email: z.string().email("Пожалуйста, введите корректный email"),
  message: z.string().min(10, "Вопрос должен быть не короче 10 символов").max(2000, "Вопрос слишком длинный")
});

export async function createGuestTicketAction(formData: FormData) {
  try {
    // 1. Rate Limit: Prevent spamming guest forms
    const ip = 'guest'; // In App Router, we'd ideally get IP from headers, but let's use a generic throttle for the example or extract from next/headers
    const isAllowed = await RateLimitService.check(`guest_ticket:${formData.get('email')}`, 5, 3600);
    if (!isAllowed) {
      return { success: false, error: "Слишком много обращений. Попробуйте позже." };
    }

    const parsed = guestTicketSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }
    const { email, message } = parsed.data;

    // 2. Find or create Shadow User
    const user = await db.user.upsert({
      where: { email: email.toLowerCase() },
      update: {},
      create: { 
        email: email.toLowerCase(),
        adminNote: "Создан автоматически через гостевую форму поддержки"
      }
    });

    // 3. Create Ticket with Source = EMAIL
    const ticket = await db.ticket.create({
      data: {
        userId: user.id,
        subject: "Вопрос от гостя (с сайта)",
        source: "EMAIL",
        status: "OPEN"
      }
    });

    // 4. Add the initial message
    await db.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        sender: "USER",
        text: message
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('[createGuestTicketAction]', error);
    return { success: false, error: "Внутренняя ошибка сервера" };
  }
}
