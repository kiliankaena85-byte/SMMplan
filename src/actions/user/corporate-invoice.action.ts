'use server';

import { db } from "@/lib/db";
import { verifySession } from "@/lib/session";
import { z } from "zod";

const apiInvoiceSchema = z.object({
  amountRub: z.number().min(3000, "Минимальная сумма счета для юрлиц — 3 000 ₽").max(10000000, "Максимальная сумма счета — 10 000 000 ₽"),
  companyName: z.string().min(2, "Укажите название компании или ИП").max(200),
  inn: z.string().regex(/^(\d{10}|\d{12})$/, "ИНН должен состоять из 10 (для ООО) или 12 цифр (для ИП)"),
  kpp: z.string().regex(/^\d{9}$/, "КПП должен состоять из 9 цифр").optional().or(z.literal("")),
  legalAddress: z.string().max(300).optional(),
});

export type ApiInvoiceInput = z.infer<typeof apiInvoiceSchema>;

export interface ApiInvoiceResult {
  success: boolean;
  error?: string;
  invoice?: {
    invoiceId: string;
    paymentId: string;
    amountRub: number;
    companyName: string;
    inn: string;
    kpp: string | null;
    createdAt: string;
  };
}

export async function createApiInvoiceAction(input: ApiInvoiceInput): Promise<ApiInvoiceResult> {
  try {
    const session = await verifySession();
    if (!session) {
      return { success: false, error: "Необходима авторизация" };
    }

    const validated = apiInvoiceSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.errors[0]?.message || "Некорректные данные для выставления счета",
      };
    }

    const { amountRub, companyName, inn, kpp, legalAddress } = validated.data;
    const amountCents = BigInt(Math.round(amountRub * 100));

    // Update user profile and create invoice
    const result = await db.$transaction(async (tx) => {
      // 1. Update company profile
      await tx.user.update({
        where: { id: session.userId },
        data: {
          companyName,
          inn,
          kpp: kpp || null,
          legalAddress: legalAddress || null,
        },
      });

      // 2. Ensure API config exists
      await tx.apiConfig.upsert({
        where: { userId: session.userId },
        create: {
          userId: session.userId,
          isApiEnabled: true,
          prioritySupport: true,
        },
        update: {
          isApiEnabled: true,
        },
      });

      // 3. Create pending payment record
      const payment = await tx.payment.create({
        data: {
          userId: session.userId,
          amount: amountCents,
          currency: "RUB",
          status: "PENDING",
          gateway: "api_invoice",
        },
      });

      // 4. Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          userId: session.userId,
          amount: amountCents,
          status: "PENDING",
          paymentId: payment.id,
        },
      });

      return {
        invoiceId: invoice.id,
        paymentId: payment.id,
        amountRub,
        companyName,
        inn,
        kpp: kpp || null,
        createdAt: invoice.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      invoice: result,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Не удалось сформировать счёт";
    return {
      success: false,
      error: message,
    };
  }
}
