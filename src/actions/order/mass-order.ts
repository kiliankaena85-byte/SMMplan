"use server";

import { z } from "zod";
import { createSafeAction } from "@/lib/safe-action";
import { db } from "@/lib/db";
import { RateLimitService } from "@/services/core/rate-limit.service";
import { checkoutAction } from "./checkout";
import { verifySession } from "@/lib/session";

const massOrderSchema = z.object({
  text: z.string().min(10, "Введите список заказов"),
  requirementsConfirmed: z.boolean().optional(),
});

export const createMassOrderAction = async (input: z.infer<typeof massOrderSchema>) => {
  return createSafeAction(massOrderSchema, input, async (data) => {
    const session = await verifySession();
    if (!session?.userId) throw new Error("Только для авторизованных пользователей");

    const isAllowed = await RateLimitService.check("massOrder", 3, 60);
    if (!isAllowed) throw new Error("Слишком часто. Подождите.");

    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user) throw new Error("Пользователь не найден");

    const lines = data.text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 50) throw new Error("Максимум 50 заказов за раз");

    // Pre-parse the lines
    const parsedOrders: Array<{ numericId: number; link: string; quantity: number }> = [];
    for (const line of lines) {
       const parts = line.split("|").map(p => p.trim());
       if (parts.length >= 3) {
           const numId = parseInt(parts[0], 10);
           const link = parts[1];
           const quantity = parseInt(parts[2], 10);
           if (!isNaN(numId) && link && !isNaN(quantity)) {
               parsedOrders.push({ numericId: numId, link, quantity });
           }
       }
    }

    if (parsedOrders.length === 0) throw new Error("Не найдено корректных строк");

    const numericIds = parsedOrders.map(o => o.numericId);
    const services = await db.service.findMany({
       where: { numericId: { in: numericIds }, isActive: true }
    });
    
    // Map numericId -> DB entity
    const serviceMap = new Map<number, any>();
    services.forEach(s => serviceMap.set(s.numericId, s));

    // --- REQUIREMENTS CHECK PHASE (Human-in-the-loop protection) ---
    if (!data.requirementsConfirmed) {
       const allReqs = new Set<string>();
       services.forEach(srv => {
          const r = (srv.features as any)?.requirements;
          if (r && Array.isArray(r)) {
             r.forEach((req: string) => allReqs.add(req));
          }
       });

       if (allReqs.size > 0) {
          // Instead of throwing, we return a special object that the client handles
          return { requiresConfirmation: true, aggregatedRequirements: Array.from(allReqs) };
       }
    }
    // -------------------------------------------------------------

    let successCount = 0;
    let failedCount = 0;

    for (const order of parsedOrders) {
      try {
        const service = serviceMap.get(order.numericId);
        if (!service) {
           failedCount++;
           continue;
        }

        // Use internal balance to process mass orders atomically
        const res = await checkoutAction({
          serviceId: service.id,
          link: order.link,
          quantity: order.quantity,
          email: user.email,
          gateway: "balance"
        });
        
        if (res.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (e) {
        failedCount++;
      }
    }

    if (successCount === 0) {
      throw new Error(`Не удалось создать заказы. Возможно, у вас недостаточно средств на внутреннем балансе, или неверный формат.`);
    }

    return { 
      success: true, 
      message: `Успешно: ${successCount}, Ошибок: ${failedCount}` 
    };
  });
};
