import { getArticles, getGroupedArticlesForTree } from "@/actions/knowledge";
import Link from "next/link";
import { Metadata } from "next";
import { SearchAutocomplete } from "./components/SearchAutocomplete";
import { verifySession } from "@/lib/session";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { SettingsProvider } from "@/lib/settings";
import { Header } from "@/components/landing/Header";
import { MegaFooter } from "@/components/landing/MegaFooter";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ category?: string; search?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const activeCategory = params.category || "Все";
  const searchQuery = params.search || "";
  
  let title = "База знаний & Блог | SMMplan";
  let description = "Полезные статьи, руководства по продвижению в социальных сетях, лайфхаки и обновления SMMplan.";
  
  if (activeCategory !== "Все") {
    title = `Статьи по теме ${activeCategory} | База знаний SMMplan`;
    description = `Инструкции и руководства в категории "${activeCategory}" для эффективной продвижения и продвижения.`;
  }
  
  if (searchQuery) {
    title = `Поиск: "${searchQuery}" | Блог SMMplan`;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website"
    }
  };
}

export default async function KnowledgePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeCategory = params.category || "Все";
  const searchQuery = params.search || "";

  // Resolve user session and email
  const session = await verifySession();
  const userEmail = session?.userId 
    ? (await db.user.findUnique({ where: { id: session.userId }, select: { email: true } }))?.email 
    : undefined;

  const reqHeaders = await headers();
  const tenantId = reqHeaders.get("x-tenant-id") || "smmplan";

  // Resolve settings and siteName
  const settings = await SettingsProvider.getContactAndLegalSettings();
  const siteName = settings.SITE_NAME || "SMMplan";

  // 1. Fetch articles based on filter and search
  const result = await getArticles(activeCategory, searchQuery);
  const articles = result.success ? result.articles : [];

  // 2. Fetch grouped articles structure for tree navigation
  const treeResult = await getGroupedArticlesForTree();
  const groupedArticles = treeResult.success ? treeResult.grouped : {};

  // Always include "Все" at the beginning of flat categories for fallback/mobile tabs
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const categories = ["Все", ...Object.keys(groupedArticles)];

  // Utility to construct target URLs for filtering and searching
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getFilterUrl = (categoryName: string, searchVal: string) => {
    const queryParts: string[] = [];
    if (categoryName !== "Все") {
      queryParts.push(`category=${encodeURIComponent(categoryName)}`);
    }
    if (searchVal) {
      queryParts.push(`search=${encodeURIComponent(searchVal)}`);
    }
    return "/knowledge" + (queryParts.length > 0 ? `?${queryParts.join("&")}` : "");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative overflow-x-clip">
      
      {/* ── Abstract Soft Background ── */}
      <div className="absolute top-0 inset-x-0 h-[600px] z-[-1] pointer-events-none overflow-hidden premium-grid-backdrop" />
      <div className="absolute top-0 inset-x-0 h-[600px] z-[-1] pointer-events-none overflow-hidden bg-gradient-to-b from-primary/5 to-background" />

      {/* ── Секция 1: Шапка ── */}
      <Header initialEmail={userEmail} siteName={siteName} activePath="/knowledge" />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-12 relative z-10 flex flex-col items-center">
        <div className="w-full max-w-6xl">
          {/* Main Title Section */}
          <header className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
              База знаний & Блог
            </h1>
            <p className="text-md md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Ваш путеводитель по миру SMM-продвижения. Руководства, кейсы, рекомендации от лучших экспертов и регулярные обновления платформы.
            </p>
          </header>

          {/* Search Form (Centered) */}
          <section className="mb-10 max-w-lg mx-auto">
            <SearchAutocomplete initialSearch={searchQuery} activeCategory={activeCategory} />
          </section>

          {/* Horizontal Filter Tabs instead of Sidebar */}
          <div className="mb-10 w-full overflow-x-auto pb-4 hide-scrollbar">
            <nav className="flex items-center justify-center gap-3 w-max mx-auto px-4" aria-label="Категории статей">
              <Link 
                href="/knowledge"
                className={`min-h-[44px] px-6 py-2.5 rounded-full text-sm font-bold flex items-center justify-center transition-all duration-200 border ${
                  activeCategory === "Все" 
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20" 
                    : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted"
                }`}
              >
                Все статьи
              </Link>

              {Object.keys(groupedArticles).map((catName) => {
                const isSelected = activeCategory === catName;
                return (
                  <Link 
                    key={catName}
                    href={`/knowledge?category=${encodeURIComponent(catName)}`}
                    className={`min-h-[44px] px-6 py-2.5 rounded-full text-sm font-bold flex items-center justify-center transition-all duration-200 border ${
                      isSelected 
                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20" 
                        : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    {catName}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* RIGHT SIDE: Main listing column */}
          <div className="space-y-6 w-full max-w-6xl mx-auto">
            
            {/* Active Category Header info */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border/80 rounded-2xl p-4 shadow-sm select-none">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm font-medium">Активный раздел:</span>
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                  {activeCategory}
                </span>
              </div>
              
              <div className="text-xs text-muted-foreground font-medium">
                Найдено публикаций: <span className="text-foreground font-bold">{articles.length}</span>
              </div>
            </div>

            {/* Empty State */}
            {articles.length === 0 && (
              <div className="w-full bg-card rounded-2xl border border-border/80 p-12 text-center shadow-sm">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-foreground mb-2">Статьи не найдены</h3>
                <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
                  {searchQuery 
                    ? `По вашему запросу "${searchQuery}" ничего не найдено. Попробуйте изменить параметры поиска или фильтрации.`
                    : "В данной категории пока нет опубликованных статей. Загляните сюда чуть позже!"}
                </p>
                {(searchQuery || activeCategory !== "Все") && (
                  <Link 
                    href="/knowledge" 
                    className="inline-flex items-center justify-center min-h-[44px] mt-6 px-6 bg-primary text-primary-foreground rounded-full font-semibold text-sm hover:opacity-95 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
                  >
                    Сбросить все фильтры
                  </Link>
                )}
              </div>
            )}

            {/* Symmetrical Grid of Articles */}
            {articles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article) => {
                  const dateStr = new Date(article.createdAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  });

                  return (
                    <article 
                      key={article.id} 
                      className="group bg-card rounded-[1.5rem] border border-border/80 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                    >
                      {/* Decorative card header */}
                      <div className="bg-gradient-to-br from-primary/10 to-transparent h-24 flex items-start p-6 border-b border-border/50 relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                         </div>
                        <span className="bg-primary text-primary-foreground px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm z-10">
                          {article.category}
                        </span>
                      </div>
                      
                      {/* Main content area */}
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <h2 className="text-lg font-extrabold text-foreground mb-3 tracking-tight line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                            {article.title}
                          </h2>
                          <p className="text-muted-foreground text-xs md:text-sm line-clamp-3 mb-6 leading-relaxed">
                            {article.description}
                          </p>
                        </div>
                        
                        {/* Read More & Stats */}
                        <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-auto">
                          <Link 
                            href={`/knowledge/${article.slug}`} 
                            className="text-primary font-bold text-sm min-h-[44px] flex items-center hover:opacity-80 transition-all"
                            aria-label={`Читать статью: ${article.title}`}
                          >
                            Читать далее &rarr;
                          </Link>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                            <span className="flex items-center gap-1 select-none">
                              👁️ {article.viewCount}
                            </span>
                            <span>&bull;</span>
                            <time dateTime={article.createdAt.toString()}>
                              {dateStr}
                            </time>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ── Секция 3: Подвал ── */}
      <MegaFooter contactSettings={settings} tenantId={tenantId} />
    </div>
  );
}
