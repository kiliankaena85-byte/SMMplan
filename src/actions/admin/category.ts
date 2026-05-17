"use server";

import { db as prisma } from "@/lib/db";
import { enforcePageRole } from "@/lib/server/rbac";
import { revalidateTag } from "next/cache";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(2, "Имя слишком короткое"),
  slug: z.string().min(2, "Slug обязателен").refine((val) => {
    const reservedWords = ["api", "admin", "auth", "_next", "static"];
    return !reservedWords.includes(val.toLowerCase());
  }, "Этот URL зарезервирован системой"),
  parentId: z.string().nullable().optional(),
  sort: z.number().int().default(0),
});

export async function createCategory(formData: FormData) {
  await enforcePageRole(["ADMIN", "OWNER"]);

  const data = {
    name: formData.get("name") as string,
    slug: formData.get("slug") as string,
    parentId: formData.get("parentId") as string || null,
    sort: Number(formData.get("sort") || 0),
  };

  const parsed = categorySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const category = await prisma.contentCategory.create({
      data: parsed.data,
    });

    revalidateTag("cms-categories", {});
    return { success: true, category };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "Категория с таким URL (slug) уже существует." };
    }
    return { success: false, error: "Ошибка базы данных" };
  }
}

/**
 * Проверка на циклические зависимости (Сценарий №1 из Премортем-отчета)
 */
async function hasCircularReference(categoryId: string, newParentId: string | null): Promise<boolean> {
  if (!newParentId) return false;
  if (categoryId === newParentId) return true; // Прямая ссылка на себя

  let currentParentId = newParentId;
  // Поднимаемся вверх по дереву до 5 уровней вложенности, чтобы найти цикл
  for (let i = 0; i < 5; i++) {
    const parent = await prisma.contentCategory.findUnique({
      where: { id: currentParentId },
      select: { parentId: true },
    });

    if (!parent || !parent.parentId) return false;
    if (parent.parentId === categoryId) return true; // Нашли цикл!
    
    currentParentId = parent.parentId;
  }

  return false;
}

export async function updateCategory(id: string, updateData: Partial<z.infer<typeof categorySchema>>) {
  await enforcePageRole(["ADMIN", "OWNER"]);

  // Защита от бесконечной рекурсии (Infinite Loop Preventer)
  if (updateData.parentId !== undefined) {
    const isCircular = await hasCircularReference(id, updateData.parentId);
    if (isCircular) {
      return { success: false, error: "Обнаружена циклическая зависимость категорий. Это приведет к падению сайта!" };
    }
  }

  try {
    const category = await prisma.contentCategory.update({
      where: { id },
      data: updateData,
    });

    revalidateTag("cms-categories", {});
    return { success: true, category };
  } catch (error) {
    return { success: false, error: "Ошибка при обновлении категории" };
  }
}

export async function deleteCategory(id: string) {
  await enforcePageRole(["ADMIN", "OWNER"]);

  try {
    await prisma.contentCategory.delete({
      where: { id },
    });
    
    revalidateTag("cms-categories", {});
    return { success: true };
  } catch (error) {
    return { success: false, error: "Ошибка при удалении категории" };
  }
}
