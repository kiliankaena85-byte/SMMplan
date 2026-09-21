'use server';

import { db as prisma } from "@/lib/db";
import { requireStaffPermission } from "@/lib/server/rbac";
import { verifySession } from "@/lib/session";
import { applyBeautifulRounding } from "@/lib/financial-constants";
import { SettingsProvider } from "@/lib/settings";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { pillarPages, glossaryTerms, clusterArticles } from "@/data/seo";
import { IndexNowService } from "@/services/seo/indexnow.service";
import { absoluteCanonical } from "@/lib/seo-helpers";

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
    const permission = user.staffRole.permissions.find(p => {
      const sec = p.section.toUpperCase();
      return sec === 'CONTENT' || sec === 'SETTINGS';
    });
    return !!(permission && (permission.canView || permission.canEdit));
  } catch {
    return false;
  }
}

/**
 * @public Fetch all published articles with optional category filtering and search.
 */
export async function getArticles(
  categoryFilter?: string,
  searchQuery?: string,
  options?: { includeStatic?: boolean; tenantId?: string }
) {
  try {
    const whereClause: Prisma.ArticleWhereInput = {
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

    let allArticles = [...articles];

    if (options?.includeStatic) {
      const isFlux = options?.tenantId === 'flux' || options?.tenantId === 'smmflux';
      const fallbackAuthorName = isFlux ? "Команда SMMflux" : "Команда SMMplan";
      const fallbackAuthorRole = isFlux ? "Экспертная редакция SMMflux" : "Экспертная редакция SMMplan";

      const staticPillars = pillarPages.map((pillar) => ({
        id: `static-${pillar.slug}`,
        slug: pillar.slug,
        title: pillar.title,
        description: pillar.excerpt,
        content: pillar.contentHtml,
        status: "PUBLISHED" as const,
        category: pillar.category,
        viewCount: 154,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-02-01T00:00:00.000Z"),
        authorName: fallbackAuthorName,
        authorRole: fallbackAuthorRole,
        priority: 10,
      }));

      const filteredStatic = staticPillars.filter((p) => {
        if (categoryFilter && categoryFilter !== "Все" && p.category !== categoryFilter) {
          return false;
        }
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
        }
        return true;
      });

      const existingSlugs = new Set(articles.map((a) => a.slug));
      for (const p of filteredStatic) {
        if (!existingSlugs.has(p.slug)) {
          allArticles.push(p as any);
        }
      }
    }

    // Extract unique categories for filter tabs/dropdowns
    const allPublished = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { category: true }
    });
    const categoriesSet = new Set(allPublished.map(a => a.category));
    if (options?.includeStatic) {
      pillarPages.forEach(p => categoriesSet.add(p.category));
    }
    const categories = Array.from(categoriesSet);

    return { success: true, articles: allArticles, categories };
  } catch (error) {
    console.error("Failed to get articles:", error);
    return { success: false, articles: [], categories: [], error: "Не удалось загрузить статьи" };
  }
}

/**
 * @public Fetch article details by slug and increment view count.
 */
export async function getArticleBySlug(slug: string, tenantId?: string) {
  try {
    const article = await prisma.article.findUnique({
      where: { slug }
    });

    const isFlux = tenantId === 'flux' || tenantId === 'smmflux';
    const fallbackAuthorName = isFlux ? "Команда SMMflux" : "Команда SMMplan";
    const fallbackAuthorRole = isFlux ? "Экспертная редакция SMMflux" : "Экспертная редакция SMMplan";

    if (!article) {
      // Fallback: check static SEO pillars and glossary
      const pillar = pillarPages.find(p => p.slug === slug);
      if (pillar) {
        return {
          success: true,
          article: {
            id: `static-${pillar.slug}`,
            slug: pillar.slug,
            title: pillar.title,
            description: pillar.excerpt,
            content: pillar.contentHtml,
            status: "PUBLISHED" as const,
            category: pillar.category,
            viewCount: 154,
            createdAt: new Date(),
            updatedAt: new Date(),
            authorName: fallbackAuthorName,
            authorRole: fallbackAuthorRole,
            priority: 10,
          }
        };
      }

      const cluster = clusterArticles.find(c => c.slug === slug);
      if (cluster) {
        return {
          success: true,
          article: {
            id: `static-${cluster.slug}`,
            slug: cluster.slug,
            title: cluster.title,
            description: cluster.excerpt,
            content: cluster.contentHtml,
            status: "PUBLISHED" as const,
            category: cluster.category,
            viewCount: 112,
            createdAt: new Date(),
            updatedAt: new Date(),
            authorName: fallbackAuthorName,
            authorRole: fallbackAuthorRole,
            priority: 5,
          }
        };
      }

      const glossary = glossaryTerms.find(g => g.slug === slug || g.slug === `glossary/${slug}`);
      if (glossary) {
        return {
          success: true,
          article: {
            id: `static-${glossary.slug}`,
            slug: glossary.slug,
            title: glossary.term,
            description: glossary.definition,
            content: glossary.contentHtml,
            status: "PUBLISHED" as const,
            category: "Словарь SMM",
            viewCount: 98,
            createdAt: new Date(),
            updatedAt: new Date(),
            authorName: "Команда SMMplan",
            authorRole: "Редакция SMMplan",
            priority: 5,
          }
        };
      }

      return { success: false, error: "Статья не найдена" };
    }

    const isUserAdmin = await isAdmin();

    // If DRAFT, only admins/owners are allowed to see it
    if (article.status === "DRAFT" && !isUserAdmin) {
      return { success: false, error: "Статья находится в черновиках" };
    }

    // Increment viewCount asynchronously/simply
    try {
      const updatedArticle = await prisma.article.update({
        where: { id: article.id },
        data: { viewCount: { increment: 1 } }
      });
      return { success: true, article: updatedArticle };
    } catch {
      return { success: true, article };
    }
  } catch (error) {
    console.error("Failed to get article by slug:", error);

    // Emergency Fallback on DB exception
    const pillar = pillarPages.find(p => p.slug === slug);
    if (pillar) {
      return {
        success: true,
        article: {
          id: `static-${pillar.slug}`,
          slug: pillar.slug,
          title: pillar.title,
          description: pillar.excerpt,
          content: pillar.contentHtml,
          status: "PUBLISHED" as const,
          category: pillar.category,
          viewCount: 154,
          createdAt: new Date(),
          updatedAt: new Date(),
          authorName: "Команда SMMplan",
          authorRole: "Редакция SMMplan",
          priority: 10,
        }
      };
    }

    const glossary = glossaryTerms.find(g => g.slug === slug || g.slug === `glossary/${slug}`);
    if (glossary) {
      return {
        success: true,
        article: {
          id: `static-${glossary.slug}`,
          slug: glossary.slug,
          title: glossary.term,
          description: glossary.definition,
          content: glossary.contentHtml,
          status: "PUBLISHED" as const,
          category: "Словарь SMM",
          viewCount: 98,
          createdAt: new Date(),
          updatedAt: new Date(),
          authorName: "Команда SMMplan",
          authorRole: "Редакция SMMplan",
          priority: 5,
        }
      };
    }

    return { success: false, error: "Ошибка при получении статьи" };
  }
}

/**
 * @public Fetch 3 related articles from the same category, excluding the current one.
 */
export async function getRelatedArticles(
  currentArticleId: string, 
  category: string,
  options?: { includeStatic?: boolean }
) {
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

    const combined = [...articles];
    if (options?.includeStatic && combined.length < 3) {
      const currentSlug = currentArticleId.startsWith("static-") 
        ? currentArticleId.replace("static-", "") 
        : "";

      const staticMatches = pillarPages
        .filter(p => p.slug !== currentSlug)
        .sort((a, b) => (a.category === category ? -1 : 1) - (b.category === category ? -1 : 1))
        .slice(0, 3 - combined.length)
        .map(p => ({
          id: `static-${p.slug}`,
          slug: p.slug,
          title: p.title,
          category: p.category,
          viewCount: 124,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-02-01T00:00:00.000Z"),
        }));

      for (const m of staticMatches) {
        if (!combined.some(c => c.slug === m.slug)) {
          combined.push(m as any);
        }
      }
    }

    return { success: true, articles: combined };
  } catch (error) {
    console.error("Failed to fetch related articles:", error);
    return { success: false, articles: [], error: "Не удалось загрузить похожие статьи" };
  }
}

/**
 * @public Fetch all published articles grouped by target tree categories.
 */
export async function getGroupedArticlesForTree(options?: { includeStatic?: boolean }) {
  try {
    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, slug: true, title: true, category: true },
      orderBy: { createdAt: "desc" }
    });

    const combinedArticles = [...articles];
    if (options?.includeStatic) {
      const existingSlugs = new Set(articles.map((a) => a.slug));
      for (const pillar of pillarPages) {
        if (!existingSlugs.has(pillar.slug)) {
          combinedArticles.push({
            id: `static-${pillar.slug}`,
            slug: pillar.slug,
            title: pillar.title,
            category: pillar.category,
          });
        }
      }
    }

    const grouped: Record<string, typeof combinedArticles> = {
      "Безопасность соцсетей": [],
      "Продвижение и Органика": [],
      "Биллинг и Лимиты": [],
      "Блогерам и Авторам": [],
      "Маркетологам и KPI": [],
      "SMM-агентствам и B2B": [],
    };

    combinedArticles.forEach(a => {
      if (!grouped[a.category]) {
        grouped[a.category] = [];
      }
      grouped[a.category].push(a);
    });

    return { success: true, grouped };
  } catch (error) {
    console.error("Failed to get grouped articles:", error);
    return { success: false, grouped: {} };
  }
}

/**
 * @public Enqueue knowledge base URLs for instant search indexing via IndexNow.
 */
export async function enqueueKnowledgeUrlsAction(slugs: string[]) {
  try {
    if (!Array.isArray(slugs) || slugs.length === 0) {
      return { success: false, count: 0, error: 'Список slug не должен быть пустым' };
    }

    const smmplanUrls: string[] = [];
    const smmfluxUrls: string[] = [];

    for (const slug of slugs) {
      smmplanUrls.push(absoluteCanonical('smmplan', `/knowledge/${slug}`));
      smmfluxUrls.push(absoluteCanonical('flux', `/knowledge/${slug}`));
    }

    await Promise.allSettled([
      IndexNowService.enqueueUrls({
        host: 'smmplan.pro',
        urls: smmplanUrls,
      }),
      IndexNowService.enqueueUrls({
        host: 'smmflux.ru',
        urls: smmfluxUrls,
      }),
    ]);

    return { success: true, count: slugs.length };
  } catch (error) {
    console.error('Failed to enqueue knowledge URLs to IndexNow:', error);
    return { success: false, count: 0, error: 'Ошибка постановки в очередь IndexNow' };
  }
}


/**
 * @public Get up to 3 recommended active services matching the article's category.
 * Calculates retail unit pricing strictly matching standard SMMplan markup guidelines:
 * pricePerUnitRub = applyBeautifulRounding(s.rate * s.markup * usdToRub) / 1000
 */
export async function getRecommendedServicesForArticle(articleId: string) {
  try {
    let categoryName = "";
    let networkSlug = "";

    if (articleId.startsWith("static-")) {
      const slug = articleId.replace("static-", "");
      const pillar = pillarPages.find(p => p.slug === slug);
      if (pillar) {
        categoryName = pillar.category;
        networkSlug = pillar.network;
      } else {
        const cluster = clusterArticles.find(c => c.slug === slug);
        if (cluster) {
          categoryName = cluster.category;
          const parent = pillarPages.find(p => p.slug === cluster.parentPillar);
          if (parent) networkSlug = parent.network;
        }
      }
    } else {
      const article = await prisma.article.findUnique({
        where: { id: articleId }
      });
      if (article) {
        categoryName = article.category;
      }
    }

    if (!categoryName && !networkSlug) return [];

    const usdToRub = await SettingsProvider.getExchangeRateUSD();

    // 1. Try category name match
    let services = categoryName ? await prisma.service.findMany({
      where: {
        isActive: true,
        isQuarantined: false,
        category: {
          name: {
            contains: categoryName,
            mode: "insensitive"
          }
        }
      },
      take: 3,
      include: {
        category: true
      }
    }) : [];

    // 2. If no services matched category name, try network match if available
    if (services.length === 0 && networkSlug && networkSlug !== 'general') {
      services = await prisma.service.findMany({
        where: {
          isActive: true,
          isQuarantined: false,
          category: {
            network: {
              slug: networkSlug
            }
          }
        },
        take: 3,
        include: {
          category: true
        }
      });
    }

    // 3. Fallback to active services if still empty
    if (services.length === 0) {
      services = await prisma.service.findMany({
        where: {
          isActive: true,
          isQuarantined: false,
        },
        take: 3,
        include: {
          category: true
        }
      });
    }

    return services.map(s => {
      const exchangeRate = s.providerCurrency === 'RUB' ? 1.0 : usdToRub;
      const pricePer1kRub = applyBeautifulRounding(s.rate * s.markup * exchangeRate);
      const pricePerUnitRub = pricePer1kRub / 1000;
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
  return requireStaffPermission('content', 'edit', async () => {
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

      if (article.status === 'PUBLISHED') {
        const smmplanUrl = absoluteCanonical('smmplan', `/knowledge/${article.slug}`);
        const smmfluxUrl = absoluteCanonical('flux', `/knowledge/${article.slug}`);

        IndexNowService.enqueueUrls({
          host: 'smmplan.pro',
          urls: [smmplanUrl],
        }).catch((err) => {
          console.warn('[IndexNow] Background enqueuing failed for smmplan.pro', err);
        });

        IndexNowService.enqueueUrls({
          host: 'smmflux.ru',
          urls: [smmfluxUrl],
        }).catch((err) => {
          console.warn('[IndexNow] Background enqueuing failed for smmflux.ru', err);
        });
      }

      return { success: true, article };
    } catch (error: unknown) {
      console.error("Failed to create article:", error);
      const err = error as { code?: string };
      if (err?.code === "P2002") {
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
  return requireStaffPermission('content', 'edit', async () => {
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

      if (article.status === 'PUBLISHED') {
        const smmplanUrl = absoluteCanonical('smmplan', `/knowledge/${article.slug}`);
        const smmfluxUrl = absoluteCanonical('flux', `/knowledge/${article.slug}`);

        IndexNowService.enqueueUrls({
          host: 'smmplan.pro',
          urls: [smmplanUrl],
        }).catch((err) => {
          console.warn('[IndexNow] Background enqueuing failed for smmplan.pro', err);
        });

        IndexNowService.enqueueUrls({
          host: 'smmflux.ru',
          urls: [smmfluxUrl],
        }).catch((err) => {
          console.warn('[IndexNow] Background enqueuing failed for smmflux.ru', err);
        });
      }

      return { success: true, article };
    } catch (error: unknown) {
      console.error("Failed to update article:", error);
      const err = error as { code?: string };
      if (err?.code === "P2002") {
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
  return requireStaffPermission('content', 'edit', async () => {
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
