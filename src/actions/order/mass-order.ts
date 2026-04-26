"use server";

import { z } from "zod";
import { createSafeAction } from "@/lib/safe-action";
import { db } from "@/lib/db";
import { RateLimitService } from "@/services/core/rate-limit.service";
import { checkoutAction } from "./checkout";
import { verifySession } from "@/lib/session";

const massOrderSchema = z.object({
  text: z.string().min(10, "Введите список заказов"),
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

    let successCount = 0;
    let failedCount = 0;

    for (const line of lines) {
      try {
        const parts = line.split("|").map(p => p.trim());
        if (parts.length >= 3) {
          const serviceId = parts[0];
          const link = parts[1];
          const quantity = parseInt(parts[2], 10);
          
          if (!serviceId || !link || isNaN(quantity)) {
            failedCount++;
            continue;
          }

          // Use internal balance to process mass orders atomically
          const res = await checkoutAction({
            serviceId,
            link,
            quantity,
            email: user.email,
            gateway: "balance"
          });
          
          if (res.success) {
            successCount++;
          } else {
            failedCount++;
          }
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
