'use server';

import { db } from '@/lib/db';
import { z } from 'zod';
import { RateLimitService } from '@/services/core/rate-limit.service';
import { getClientIp } from '@/utils/ip';

const guestTicketSchema = z.object({
  name: z.string().min(2, "Имя должно быть не короче 2 символов").max(100, "Имя слишком длинное"),
  email: z.string().email("Пожалуйста, введите корректный email"),
  message: z.string().min(10, "Вопрос должен быть не короче 10 символов").max(2000, "Вопрос слишком длинный")
});

export async function createGuestTicketAction(formData: FormData) {
  try {
    // 1. Zod input validation first
    const parsed = guestTicketSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }
    const { name, email, message } = parsed.data;
    const lowerEmail = email.toLowerCase().trim();

    // 2. Prevent Account Squatting / Identity Fraud
    // If a real user with this email exists (has passwordHash or telegramId), reject guest ticket creation.
    const existingUser = await db.user.findUnique({
      where: { email: lowerEmail },
      select: { id: true, passwordHash: true, telegramId: true }
    });
    
    const isRegistered = !!existingUser && (
      existingUser.passwordHash !== null ||
      existingUser.telegramId !== null
    );

    if (isRegistered) {
      return { 
        success: false, 
        error: 'Аккаунт с этим email уже существует. Пожалуйста, войдите в систему для создания обращения.' 
      };
    }

    // 3. Multi-Layer Anti-Spam Rate Limiting via RateLimitService
    const realIp = await getClientIp('unknown');
    
    // IP-based global limit (max 10 requests per hour per IP)
    const isIpAllowed = await RateLimitService.check(`guest_ip:${realIp}`, 10, 3600);
    if (!isIpAllowed) {
      return { success: false, error: "Слишком много обращений с вашего IP. Попробуйте позже." };
    }

    // Email-based limit (max 5 requests per hour per Email)
    const isAllowed = await RateLimitService.check(`guest_ticket:${lowerEmail}`, 5, 3600);
    if (!isAllowed) {
      return { success: false, error: "Слишком много обращений. Попробуйте позже." };
    }

    // 4. Find or create Shadow User
    const user = await db.user.upsert({
      where: { email: lowerEmail },
      update: {},
      create: { 
        email: lowerEmail,
        adminNote: "Создан автоматически через гостевую форму поддержки"
      }
    });

    // 5. Create Ticket with Source = EMAIL
    const ticket = await db.ticket.create({
      data: {
        userId: user.id,
        subject: `Вопрос от гостя: ${name}`,
        source: "EMAIL",
        status: "OPEN"
      }
    });

    // 6. Add the initial message
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
