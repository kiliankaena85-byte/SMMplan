import { db } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, Clock, Eye, GraduationCap, ChevronLeft, Calendar, UserCircle, ShoppingCart } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface AcademyArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: AcademyArticlePageProps) {
  const { slug } = await params;
  const article = await db.contentItem.findUnique({
    where: { slug, type: 'ACADEMY_LESSON', isPublished: true },
  });

  if (!article) {
    return {
      title: 'Статья не найдена | Smmplan Academy',
    };
  }

  return {
    title: `${article.title} | Академия Smmplan`,
    description: article.excerpt || article.metaDescription || `Методическое руководство: ${article.title}. Безопасное SMM-продвижение.`,
  };
}

export default async function AcademyArticlePage({ params }: AcademyArticlePageProps) {
  const { slug } = await params;

  // Retrieve individual lesson
  const article = await db.contentItem.findUnique({
    where: {
      slug,
      type: 'ACADEMY_LESSON',
      isPublished: true,
    },
    include: {
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!article) {
    notFound();
  }

  // Increment view count asynchronously in the background
  db.contentItem.update({
    where: { id: article.id },
    data: { viewCount: { increment: 1 } }
  }).catch(err => console.error('[Academy API] Failed to increment view count:', err));

  const publishDate = article.publishedAt || article.createdAt;
  const readingTime = article.readTimeMinutes || 3;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative">
      
      {/* Structural Schema.org TechArticle Metadata for advanced indexing */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "headline": article.title,
            "description": article.excerpt || article.metaTitle,
            "inLanguage": "ru",
            "author": {
              "@type": "Person",
              "name": article.authorName || "Эксперт Smmplan"
            },
            "datePublished": publishDate.toISOString(),
            "dateModified": article.updatedAt.toISOString(),
            "articleSection": article.category?.name || "SMM",
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://smmplan.pro/academy/${article.slug}`
            }
          }),
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/academy" className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Назад в Академию</span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-extrabold text-primary hover:text-primary-foreground hover:bg-primary/10 border border-primary/20 px-4 py-2 rounded-full transition-all"
          >
            Заказать накрутку
          </Link>
        </div>
      </header>

      {/* ── Main content (Typography Prose) ── */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-10 md:py-14">
        
        {/* Article header */}
        <div className="border-b border-border/50 pb-8 mb-8 space-y-5">
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest select-none">
            {article.category?.name && (
              <span className="text-primary font-black px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                {article.category.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{readingTime} мин на чтение</span>
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{article.viewCount + 1} просмотров</span>
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="text-sm font-semibold text-muted-foreground leading-relaxed italic border-l-2 border-primary/30 pl-4 py-0.5 bg-muted/20 rounded-r-lg">
              {article.excerpt}
            </p>
          )}

          {/* Author metadata bar */}
          <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground select-none">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <UserCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-foreground">{article.authorName || 'Автор Академии Smmplan'}</p>
              <div className="flex items-center gap-1 mt-0.5 font-semibold text-[10px] tracking-wide uppercase">
                <Calendar className="w-3 h-3 text-muted-foreground/60" />
                <span>
                  {publishDate.toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── ARTICLE HTML RENDER (Tailwind Typography Prose) ── */}
        <article className="prose dark:prose-invert max-w-none prose-base sm:prose-lg leading-relaxed prose-headings:font-extrabold prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:font-black prose-emerald prose-img:rounded-3xl prose-img:border prose-img:border-border/60">
          {article.contentHtml ? (
            <div dangerouslySetInnerHTML={{ __html: article.contentHtml }} />
          ) : (
            <p className="text-muted-foreground font-semibold">Статья находится на доработке и скоро будет доступна.</p>
          )}
        </article>

        {/* ── CONVERSION BOTTOM CALL TO ACTION (CTA) ── */}
        <div className="bg-primary/5 border border-primary/15 rounded-3xl p-6 md:p-8 text-center space-y-4 mt-16 shadow-inner select-none relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <h3 className="text-xl font-extrabold text-foreground">💡 Готовы применить знания на практике?</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto font-medium">
            Запустите продвижение ваших каналов или постов за 1 минуту прямо сейчас. Мгновенный автоматический старт без регистрации!
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
            <Link
              href="/"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
            >
              <ShoppingCart className="w-4 h-4" />
              Оформить заказ
            </Link>
            <Link
              href="/academy"
              className="flex items-center gap-2 px-6 py-3 bg-content2 hover:bg-content3 border border-border/60 rounded-full text-sm font-bold text-foreground transition-all active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              Другие статьи
            </Link>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border/60 py-8 text-center select-none text-xs text-muted-foreground mt-20">
        <p>© {new Date().getFullYear()} Smmplan Academy. Все права защищены.</p>
      </footer>
    </div>
  );
}
