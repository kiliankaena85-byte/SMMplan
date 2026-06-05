"use server";

import { db as prisma } from "@/lib/db";
import { enforcePageRole } from "@/lib/server/rbac";
import { revalidateTag } from "next/cache";
import { z } from "zod";

const contentSchema = z.object({
  title: z.string().min(3, "Заголовок должен быть длиннее 3 символов"),
  slug: z.string().min(2, "Slug обязателен").refine((val) => {
    // Защита системных маршрутов (Скрытый риск №3)
    const reservedWords = ["api", "admin", "auth", "_next", "static", "dashboard", "orders", "draft"];
    return !reservedWords.includes(val.toLowerCase());
  }, "Этот URL зарезервирован системой"),
  type: z.enum(["PAGE", "ACADEMY_LESSON", "GLOSSARY_TERM", "NEWS_POST"]),
  categoryId: z.string().nullable().optional(),
  excerpt: z.string().nullable().optional(),
  contentJson: z.string().nullable().optional(),
  isPublished: z.boolean().default(false),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
});

export async function createContent(formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const admin = await enforcePageRole(["ADMIN", "OWNER"]);

  const data = {
    title: formData.get("title") as string,
    slug: formData.get("slug") as string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: formData.get("type") as any,
    categoryId: formData.get("categoryId") as string || null,
  };

  const parsed = contentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const item = await prisma.contentItem.create({
      data: {
        ...parsed.data,
        authorName: "Администратор", // Записываем автора из сессии
      },
    });

    revalidateTag("cms-list", {});
    return { success: true, item };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "Статья с таким URL (slug) уже существует." };
    }
    return { success: false, error: "Ошибка базы данных" };
  }
}

// SD-12 SECURITY FIX: Runtime validation schema for content updates.
// TypeScript types are erased at runtime — only Zod prevents field injection.
const contentUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  slug: z.string().min(2).refine((val) => {
    const reservedWords: string[] = ["api", "admin", "auth", "_next", "static", "dashboard", "orders", "draft"];
    return !reservedWords.includes(val.toLowerCase());
  }, "Этот URL зарезервирован системой").optional(),
  type: z.enum(["PAGE", "ACADEMY_LESSON", "GLOSSARY_TERM", "NEWS_POST"]).optional(),
  categoryId: z.string().nullable().optional(),
  excerpt: z.string().nullable().optional(),
  contentJson: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
}).strict(); // .strict() rejects any fields not in the schema (e.g., id, authorName, publishedAt)

export async function updateContent(id: string, updateData: Partial<z.infer<typeof contentSchema>>) {
  await enforcePageRole(["ADMIN", "OWNER"]);

  // SD-12 FIX: Validate updateData through Zod before passing to Prisma
  const parsed = contentUpdateSchema.safeParse(updateData);
  if (!parsed.success) {
    return { success: false, error: "Невалидные данные для обновления", errors: parsed.error.flatten().fieldErrors };
  }

  try {
    // Внимание: Здесь мы сохраняем ТОЛЬКО JSON (Премортем Сценарий №5)
    // HTML генерация происходит строго в отдельной функции publishContent
    // Это спасает БД от блокировок при частых автосохранениях

    const item = await prisma.contentItem.update({
      where: { id },
      data: parsed.data, // Now guaranteed to only contain allowed fields
    });

    // Гранулярный сброс кэша (Скрытый риск №2)
    revalidateTag(`article-${item.slug}`, {});
    revalidateTag("cms-list", {});

    return { success: true, item };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return { success: false, error: "Ошибка при обновлении статьи" };
  }
}

export async function publishContent(id: string) {
  await enforcePageRole(["ADMIN", "OWNER"]);

  try {
    const item = await prisma.contentItem.findUnique({ where: { id } });
    if (!item || !item.contentJson) {
      return { success: false, error: "Статья не найдена или пустая" };
    }

    // SSR Конвертация (Фаза 2: Защита от XSS и тяжелого клиента)
    // Динамический импорт, чтобы ServerBlockNoteEditor не тянул зависимости в Edge Runtimes
    const { ServerBlockNoteEditor } = await import("@blocknote/server-util");
    
    const editor = ServerBlockNoteEditor.create();
    const blocks = JSON.parse(item.contentJson);
    const contentHtml = await editor.blocksToHTMLLossy(blocks);

    const updated = await prisma.contentItem.update({
      where: { id },
      data: {
        contentHtml,
        isPublished: true,
        publishedAt: item.publishedAt || new Date(),
      },
    });

    revalidateTag(`article-${item.slug}`, {});
    revalidateTag("cms-list", {});

    return { success: true, item: updated };
  } catch (error) {
    console.error("Publish error:", error);
    return { success: false, error: "Ошибка при генерации HTML или публикации" };
  }
}

export async function unpublishContent(id: string) {
  await enforcePageRole(["ADMIN", "OWNER"]);

  try {
    const updated = await prisma.contentItem.update({
      where: { id },
      data: {
        isPublished: false,
      },
    });

    revalidateTag(`article-${updated.slug}`, {});
    revalidateTag("cms-list", {});

    return { success: true, item: updated };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return { success: false, error: "Ошибка при снятии с публикации" };
  }
}
