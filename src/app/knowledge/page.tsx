import { getArticles, getGroupedArticlesForTree } from "@/actions/knowledge";
import Link from "next/link";
import { Metadata } from "next";
import { SearchAutocomplete } from "./components/SearchAutocomplete";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ category?: string; search?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const activeCategory = params.category || "Все";
  const searchQuery = params.search || "";
  
  let title = "База знаний & Блог | Smmplan";
  let description = "Полезные статьи, руководства по продвижению в социальных сетях, лайфхаки и обновления Smmplan.";
  
  if (activeCategory !== "Все") {
    title = `Статьи по теме ${activeCategory} | База знаний Smmplan`;
    description = `Инструкции и руководства в категории "${activeCategory}" для эффективной накрутки и продвижения.`;
  }
  
  if (searchQuery) {
    title = `Поиск: "${searchQuery}" | Блог Smmplan`;
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
    <div 
      data-theme="telegram-light" 
      className="telegram-light min-h-screen bg-background text-foreground py-12 px-4 flex flex-col items-center font-sans"
    >
      <div className="w-full max-w-6xl">
        {/* Main Title Section */}
        <header className="text-center mb-12">
          <Link 
            href="/" 
            className="inline-flex text-primary font-bold text-sm mb-3 uppercase tracking-wider min-h-[44px] px-4 py-2 items-center justify-center transition-all duration-200 hover:opacity-85 active:scale-[0.98]"
          >
            ← Вернуться на главную
          </Link>
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

        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* LEFT SIDEBAR: Category Tree Navigation */}
          <aside className="lg:col-span-1 space-y-6">
            
            {/* Desktop & Mobile Category Tree Card */}
            <div className="bg-card rounded-[10px] border border-border p-4 shadow-sm space-y-4">
              <h2 className="text-sm font-extrabold text-foreground tracking-wider uppercase border-b border-border/40 pb-2 flex items-center gap-2 select-none">
                📁 Разделы Базы Знаний
              </h2>
              
              {/* Category Tree Navigation Node List */}
              <nav className="space-y-2" aria-label="Категории статей">
                
                {/* 1. Reset / All Articles Link */}
                <Link 
                  href="/knowledge"
                  className={`w-full min-h-[44px] px-3 py-2 rounded-[5px] text-xs md:text-sm font-bold flex items-center gap-2 transition-all duration-200 hover:bg-muted ${
                    activeCategory === "Все" 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-current={activeCategory === "Все" ? "page" : undefined}
                >
                  📚 Все разделы и статьи
                </Link>

                {/* 2. Interactive Folders for Target Categories */}
                {Object.entries(groupedArticles).map(([catName, catArticles]) => {
                  const isSelected = activeCategory === catName;
                  
                  return (
                    <details 
                      key={catName} 
                      className="group space-y-1"
                      open={isSelected || catArticles.some(a => a.category === activeCategory)}
                    >
                      <summary className="w-full min-h-[44px] px-3 py-2 rounded-[5px] text-xs md:text-sm font-extrabold flex items-center justify-between cursor-pointer list-none transition-all duration-200 hover:bg-muted select-none text-foreground">
                        <span className="flex items-center gap-2">
                          📁 {catName}
                        </span>
                        <span className="text-[10px] text-muted-foreground transition-transform duration-200 group-open:rotate-90">
                          ▶
                        </span>
                      </summary>
                      
                      {/* Nested articles links inside tree folder */}
                      <div className="pl-4 border-l border-border ml-3 space-y-1 pt-1">
                        <Link 
                          href={`/knowledge?category=${encodeURIComponent(catName)}`}
                          className={`w-full min-h-[44px] px-3 py-2 rounded-[5px] text-xs font-bold flex items-center gap-2 transition-all duration-200 hover:bg-muted ${
                            isSelected 
                              ? "text-primary bg-primary/5" 
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          📄 Смотреть всё ({catArticles.length})
                        </Link>
                        
                        {catArticles.length === 0 ? (
                          <span className="block px-3 py-2 text-[11px] text-muted-foreground italic">
                            Нет статей
                          </span>
                        ) : (
                          catArticles.map((art) => (
                            <Link
                              key={art.id}
                              href={`/knowledge/${art.slug}`}
                              className="w-full min-h-[44px] px-3 py-2 rounded-[5px] text-xs flex items-center transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted leading-tight"
                            >
                              • {art.title}
                            </Link>
                          ))
                        )}
                      </div>
                    </details>
                  );
                })}
              </nav>
            </div>

            {/* Quick SMM Help (Sidebar helper widget) */}
            <div className="bg-card rounded-[10px] border border-border p-6 shadow-sm text-center space-y-3 hidden lg:block">
              <div className="text-3xl">🚀</div>
              <h3 className="text-md font-extrabold text-foreground">Нужна помощь?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Не можете определиться с выбором услуги или стратегии? Задайте вопрос в круглосуточную поддержку!
              </p>
              <Link 
                href="/support" 
                className="min-h-[44px] inline-flex w-full items-center justify-center px-4 py-2 bg-secondary text-secondary-foreground font-bold rounded-[10px] text-xs hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Написать в саппорт
              </Link>
            </div>

          </aside>

          {/* RIGHT SIDE: Main listing column */}
          <main className="lg:col-span-3 space-y-6">
            
            {/* Active Category Header info */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border rounded-[10px] p-4 shadow-sm select-none">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm font-medium">Активный раздел:</span>
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-[5px] text-xs font-bold uppercase tracking-wider">
                  {activeCategory}
                </span>
              </div>
              
              <div className="text-xs text-muted-foreground font-medium">
                Найдено публикаций: <span className="text-foreground font-bold">{articles.length}</span>
              </div>
            </div>

            {/* Empty State */}
            {articles.length === 0 && (
              <div className="w-full bg-card rounded-[10px] border border-border p-12 text-center shadow-sm">
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
                    className="inline-flex items-center justify-center min-h-[44px] mt-6 px-6 bg-primary text-primary-foreground rounded-[10px] font-semibold text-sm hover:opacity-95 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
                  >
                    Сбросить все фильтры
                  </Link>
                )}
              </div>
            )}

            {/* Symmetrical Grid of Articles */}
            {articles.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {articles.map((article) => {
                  const dateStr = new Date(article.createdAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  });

                  return (
                    <article 
                      key={article.id} 
                      className="bg-card rounded-[10px] border border-border overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
                    >
                      {/* Decorative card header */}
                      <div className="bg-primary/5 h-20 flex items-center px-6 border-b border-border">
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-[5px] text-[10px] font-bold uppercase tracking-wider">
                          {article.category}
                        </span>
                      </div>
                      
                      {/* Main content area */}
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <h2 className="text-lg md:text-xl font-extrabold text-foreground mb-3 tracking-tight line-clamp-2 leading-tight">
                            {article.title}
                          </h2>
                          <p className="text-muted-foreground text-xs md:text-sm line-clamp-3 mb-6 leading-relaxed">
                            {article.description}
                          </p>
                        </div>
                        
                        {/* Read More & Stats */}
                        <div className="flex items-center justify-between pt-4 border-t border-border/40">
                          <Link 
                            href={`/knowledge/${article.slug}`} 
                            className="text-primary font-bold text-sm min-h-[44px] flex items-center hover:opacity-80 active:scale-[0.98] transition-all"
                            aria-label={`Читать статью: ${article.title}`}
                          >
                            Читать далее →
                          </Link>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                            <span className="flex items-center gap-1 select-none">
                              👁️ {article.viewCount}
                            </span>
                            <span>•</span>
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
          </main>

        </div>
      </div>
    </div>
  );
}
