'use server';

import { db } from '@/lib/db';
import { z } from 'zod';
import { RateLimitService } from '@/services/core/rate-limit.service';

import { headers } from 'next/headers';

const guestTicketSchema = z.object({
  email: z.string().email("Пожалуйста, введите корректный email"),
  message: z.string().min(10, "Вопрос должен быть не короче 10 символов").max(2000, "Вопрос слишком длинный")
});

export async function createGuestTicketAction(formData: FormData) {
  try {
    // 1. Rate Limit: Prevent spamming guest forms
    const reqHeaders = await headers();
    const realIp = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown';
    
    // W6-3: IP-based global limit (max 10 requests per hour per IP)
    const isIpAllowed = await RateLimitService.check(`guest_ip:${realIp}`, 10, 3600);
    if (!isIpAllowed) {
      return { success: false, error: "Слишком много обращений с вашего IP. Попробуйте позже." };
    }

    const emailInput = formData.get('email');
    const isAllowed = await RateLimitService.check(`guest_ticket:${emailInput}`, 5, 3600);
    if (!isAllowed) {
      return { success: false, error: "Слишком много обращений. Попробуйте позже." };
    }

    const parsed = guestTicketSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }
    const { email, message } = parsed.data;

    // W1-2 SECURITY FIX: Prevent Account Squatting
    // If a real user with this email exists (has passwordHash), reject guest ticket creation.
    // Attacker could use guest form to create tickets on behalf of other users.
    const existingUser = await db.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: { id: true, passwordHash: true }
    });
    if (existingUser?.passwordHash) {
      return { 
        success: false, 
        error: 'Аккаунт с этим email уже существует. Пожалуйста, войдите в систему для создания обращения.' 
      };
    }

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
