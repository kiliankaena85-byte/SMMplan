"use server";

import { db as prisma } from "@/lib/db";
import { requireStaffPermission } from "@/lib/server/rbac";
import { verifySession } from "@/lib/session";
import { applyBeautifulRounding } from "@/lib/financial-constants";
import { SettingsProvider } from "@/lib/settings";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Zod Schema for Article validation at runtime
const articleSchema = z.object({
  title: z.string().min(3, "Заголовок должен быть не менее 3 символов"),
  slug: z.string()
    .min(2, "Slug обязателен")
    .regex(/^[a-z0-9-_]+$/, "Slug может содержать только строчные латинские буквы, цифры, дефис и подчеркивание")
    .refine((val) => {
      const reservedWords = [
        "api", "admin", "auth", "_next", "static", "dashboard", 
        "orders", "draft", "knowledge", "p", "catalog", "finance", 
        "marketing", "providers", "settings", "tickets", "clients"
      ];
      return !reservedWords.includes(val.toLowerCase());
    }, "Этот URL зарезервирован системой"),
  description: z.string().min(10, "Описание должно быть содержательным"),
  content: z.string().min(10, "Контент не должен быть пустым"),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  category: z.string().min(1, "Категория обязательна"),
  authorName: z.preprocess(
    (val) => (val === "" || val === undefined || val === null) ? "Михаил" : val,
    z.string().min(2, "Имя автора должно состоять минимум из 2 символов").max(100).optional()
  ),
  authorRole: z.preprocess(
    (val) => (val === "" || val === undefined || val === null) ? "Системный архитектор прокси-сетей SMMplan" : val,
    z.string().min(2, "Роль автора должна состоять минимум из 2 символов").max(200).optional()
  ),
  priority: z.preprocess(
    (val) => (val === "" || val === undefined || val === null) ? 0 : Number(val),
    z.number().int().min(0).max(100).optional().default(0)
  ),
});

// Admin Check helper for view detail protection
async function isAdmin() {
  try {
    const sessionUser = await verifySession();
    if (!sessionUser) return false;
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      include: { staffRole: { include: { permissions: true } } }
    });
    if (!user) return false;
    if (user.role === 'OWNER' || user.role === 'ADMIN') return true;
    if (!user.staffRole) return false;
    const permission = user.staffRole.permissions.find(p => p.section.toUpperCase() === 'SETTINGS');
    return !!(permission && (permission.canView || permission.canEdit));
  } catch {
    return false;
  }
}

/**
 * PUBLIC: Fetch all published articles with optional category filtering and search.
 */
export async function getArticles(categoryFilter?: string, searchQuery?: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      status: "PUBLISHED"
    };

    if (categoryFilter && categoryFilter !== "Все") {
      whereClause.category = categoryFilter;
    }

    if (searchQuery) {
      whereClause.OR = [
        { title: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } }
      ];
    }

    const articles = await prisma.article.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc"
      }
    });

    // Extract unique categories for filter tabs/dropdowns
    const allPublished = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { category: true }
    });
    const categories = Array.from(new Set(allPublished.map(a => a.category)));

    return { success: true, articles, categories };
  } catch (error) {
    console.error("Failed to get articles:", error);
    return { success: false, articles: [], categories: [], error: "Не удалось загрузить статьи" };
  }
}

/**
 * PUBLIC: Fetch article details by slug and increment view count.
 */
export async function getArticleBySlug(slug: string) {
  try {
    const article = await prisma.article.findUnique({
      where: { slug }
    });

    if (!article) {
      return { success: false, error: "Статья не найдена" };
    }

    const isUserAdmin = await isAdmin();

    // If DRAFT, only admins/owners are allowed to see it
    if (article.status === "DRAFT" && !isUserAdmin) {
      return { success: false, error: "Статья находится в черновиках" };
    }

    // Increment viewCount asynchronously/simply
    const updatedArticle = await prisma.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } }
    });

    return { success: true, article: updatedArticle };
  } catch (error) {
    console.error("Failed to get article by slug:", error);
    return { success: false, error: "Ошибка при получении статьи" };
  }
}

/**
 * PUBLIC: Fetch 3 related articles from the same category, excluding the current one.
 */
export async function getRelatedArticles(currentArticleId: string, category: string) {
  try {
    const articles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        category: category,
        id: { not: currentArticleId }
      },
      take: 3,
      orderBy: {
        createdAt: "desc"
      }
    });
    return { success: true, articles };
  } catch (error) {
    console.error("Failed to fetch related articles:", error);
    return { success: false, articles: [], error: "Не удалось загрузить похожие статьи" };
  }
}

/**
 * PUBLIC: Fetch all published articles grouped by target tree categories.
 */
export async function getGroupedArticlesForTree() {
  try {
    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, slug: true, title: true, category: true },
      orderBy: { createdAt: "desc" }
    });

    const grouped: Record<string, typeof articles> = {
      "Безопасность соцсетей": [],
      "Продвижение и Органика": [],
      "Биллинг и Лимиты": []
    };

    articles.forEach(a => {
      if (grouped[a.category]) {
        grouped[a.category].push(a);
      } else {
        if (!grouped[a.category]) {
          grouped[a.category] = [];
        }
        grouped[a.category].push(a);
      }
    });

    return { success: true, grouped };
  } catch (error) {
    console.error("Failed to get grouped articles:", error);
    return { success: false, grouped: {} };
  }
}

/**
 * PUBLIC: Get up to 3 recommended active services matching the article's category.
 * Calculates retail unit pricing strictly matching standard SMMplan markup guidelines:
 * pricePerUnitRub = applyBeautifulRounding(s.rate * s.markup * usdToRub) / 1000
 */
export async function getRecommendedServicesForArticle(articleId: string) {
  try {
    const article = await prisma.article.findUnique({
      where: { id: articleId }
    });

    if (!article) return [];

    const usdToRub = await SettingsProvider.getExchangeRateUSD();

    const services = await prisma.service.findMany({
      where: {
        isActive: true,
        isQuarantined: false,
        category: {
          name: {
            contains: article.category,
            mode: "insensitive"
          }
        }
      },
      take: 3,
      include: {
        category: true
      }
    });

    return services.map(s => {
      const exchangeRate = s.providerCurrency === 'RUB' ? 1.0 : usdToRub;
      const pricePerUnitRub = applyBeautifulRounding(s.rate * s.markup * exchangeRate) / 1000;
      return {
        id: s.id,
        name: s.name,
        pricePerUnitRub,
        categoryName: s.category.name
      };
    });
  } catch (error) {
    console.error("Failed to get recommended services:", error);
    return [];
  }
}

/**
 * ADMIN: Get all articles (DRAFT & PUBLISHED) for the list view table.
 */
export async function getAllArticlesAdmin() {
  return requireStaffPermission('settings', 'view', async () => {
    try {
      const articles = await prisma.article.findMany({
        orderBy: {
          createdAt: "desc"
        }
      });
      return { success: true, articles };
    } catch (error) {
      console.error("Failed to fetch admin articles list:", error);
      return { success: false, articles: [], error: "Ошибка при получении списка статей" };
    }
  });
}

/**
 * ADMIN: Fetch article by ID for editing.
 */
export async function getArticleById(id: string) {
  return requireStaffPermission('settings', 'view', async () => {
    try {
      const article = await prisma.article.findUnique({
        where: { id }
      });
      if (!article) {
        return { success: false, error: "Статья не найдена" };
      }
      return { success: true, article };
    } catch (error) {
      console.error("Failed to get article by id:", error);
      return { success: false, error: "Ошибка при получении статьи" };
    }
  });
}

/**
 * ADMIN: Create new knowledge article. Protected by role constraints.
 */
export async function createArticle(data: {
  title: string;
  slug: string;
  description: string;
  content: string;
  status: "DRAFT" | "PUBLISHED";
  category: string;
  authorName?: string;
  authorRole?: string;
  priority?: number;
}) {
  return requireStaffPermission('settings', 'edit', async () => {
    const parsed = articleSchema.safeParse(data);
    if (!parsed.success) {
      return { 
        success: false, 
        error: "Некорректно заполнены поля формы", 
        errors: parsed.error.flatten().fieldErrors 
      };
    }

    try {
      const article = await prisma.article.create({
        data: parsed.data
      });

      revalidatePath("/knowledge");
      revalidatePath(`/knowledge/${article.slug}`);
      revalidatePath("/admin/knowledge");

      return { success: true, article };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Failed to create article:", error);
      if (error.code === "P2002") {
        return { success: false, error: "Статья с таким адресом (slug) уже существует" };
      }
      return { success: false, error: "Не удалось сохранить статью в базе данных" };
    }
  });
}

/**
 * ADMIN: Update existing article by ID.
 */
export async function updateArticle(id: string, data: {
  title: string;
  slug: string;
  description: string;
  content: string;
  status: "DRAFT" | "PUBLISHED";
  category: string;
  authorName?: string;
  authorRole?: string;
  priority?: number;
}) {
  return requireStaffPermission('settings', 'edit', async () => {
    const parsed = articleSchema.safeParse(data);
    if (!parsed.success) {
      return { 
        success: false, 
        error: "Некорректно заполнены поля формы", 
        errors: parsed.error.flatten().fieldErrors 
      };
    }

    try {
      const oldArticle = await prisma.article.findUnique({
        where: { id }
      });

      const article = await prisma.article.update({
        where: { id },
        data: parsed.data
      });

      revalidatePath("/knowledge");
      revalidatePath(`/knowledge/${article.slug}`);
      if (oldArticle && oldArticle.slug !== article.slug) {
        revalidatePath(`/knowledge/${oldArticle.slug}`);
      }
      revalidatePath("/admin/knowledge");

      return { success: true, article };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Failed to update article:", error);
      if (error.code === "P2002") {
        return { success: false, error: "Статья с таким адресом (slug) уже существует" };
      }
      return { success: false, error: "Не удалось сохранить изменения в базе данных" };
    }
  });
}

/**
 * ADMIN: Delete article by ID.
 */
export async function deleteArticle(id: string) {
  return requireStaffPermission('settings', 'edit', async () => {
    try {
      const article = await prisma.article.delete({
        where: { id }
      });

      revalidatePath("/knowledge");
      revalidatePath(`/knowledge/${article.slug}`);
      revalidatePath("/admin/knowledge");

      return { success: true };
    } catch (error) {
      console.error("Failed to delete article:", error);
      return { success: false, error: "Не удалось удалить статью из базы данных" };
    }
  });
}
