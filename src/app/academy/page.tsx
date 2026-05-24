import { db } from '@/lib/db';
import Link from 'next/link';
import { BookOpen, Clock, Eye, GraduationCap, ChevronRight, Zap } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Академия SMM & База знаний | Smmplan',
  description: 'Экспертные руководства, лайфхаки и инструкции по безопасному продвижению в Telegram, Instagram, VK. Узнайте, как копировать ссылки и обходить списания.',
};

export default async function AcademyPage() {
  // Query all active published academy lessons
  const lessons = await db.contentItem.findMany({
    where: {
      type: 'ACADEMY_LESSON',
      isPublished: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-x-clip">
      {/* ── Soft fintech backdrop glow ── */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-background pointer-events-none z-0 select-none overflow-hidden" />
      <div className="absolute top-0 inset-x-0 h-[600px] z-[-1] pointer-events-none overflow-hidden premium-grid-backdrop opacity-40" />

      {/* ── Header Header ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border/50 shadow-[0_4px_30px_rgba(0,0,0,0.01)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-sm">
              <Zap className="w-4 h-4 text-primary fill-current" />
            </div>
            <span className="text-xl font-extrabold tracking-normal text-foreground">Smmplan <span className="text-primary text-xs font-black px-2 py-0.5 rounded bg-primary/10 ml-1.5 uppercase">Академия</span></span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors border border-border/60 hover:bg-muted/30 px-4 py-2 rounded-full"
          >
            На главную
          </Link>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-12 md:py-16 relative z-10">
        
        {/* Title Hub */}
        <div className="text-center space-y-4 mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase tracking-widest font-black select-none">
            <GraduationCap className="w-3.5 h-3.5" />
            База знаний
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-none">
            Управляйте <span className="text-primary">алгоритмами</span> продвижения
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground font-medium max-w-xl mx-auto">
            Экспертные руководства, пошаговые инструкции по копированию ссылок, лимитам соцсетей и лайфхакам B2B-реселлеров.
          </p>
        </div>

        {/* ── LESSONS DIRECTORY GRID ── */}
        {lessons.length === 0 ? (
          
          /* Empty placeholder banner (fintech styled) */
          <div className="flex flex-col items-center justify-center gap-5 border-2 border-dashed border-border/50 bg-gradient-to-b from-content2/80 to-content1 rounded-[2.5rem] min-h-[380px] p-8 max-w-2xl mx-auto select-none">
            <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10 animate-pulse">
              <BookOpen className="w-8 h-8 text-primary/60" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-extrabold text-foreground">Академия наполняется знаниями</h3>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed mx-auto">
                Наши SMM-эксперты прямо сейчас готовят руководства по оформлению заказов, обходу алгоритмов списаний Telegram/VK и тонкостям B2B-накрутки. Заглядывайте сюда чаще!
              </p>
            </div>
            <Link
              href="/"
              className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90 transition-all duration-200 shadow-md shadow-primary/20 active:scale-95"
            >
              Запустить продвижение
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          
          /* Modern Card Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson) => (
              <article 
                key={lesson.id}
                className="group flex flex-col bg-card border border-border/60 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/[0.02] hover:-translate-y-1 rounded-[2rem] overflow-hidden transition-all duration-300 relative h-full flex-1"
              >
                {/* Visual card header (colored strip or cover image) */}
                <div className="h-4 bg-gradient-to-r from-primary/20 to-primary/5 select-none" />

                <div className="p-6 flex-1 flex flex-col pt-5">
                  <div className="flex items-center justify-between gap-3 mb-3 text-[10px] font-bold text-muted-foreground select-none uppercase tracking-wider">
                    {lesson.category?.name ? (
                      <span className="text-primary font-extrabold px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                        {lesson.category.name}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-muted">Руководство</span>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{lesson.readTimeMinutes || 3} мин</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-extrabold text-foreground group-hover:text-primary transition-colors leading-snug mb-3">
                    <Link href={`/academy/${lesson.slug}`} className="hover:underline">
                      {lesson.title}
                    </Link>
                  </h3>

                  <p className="text-xs font-semibold text-muted-foreground leading-relaxed mb-6 line-clamp-3">
                    {lesson.excerpt || 'Подробное методическое руководство по настройке накрутки в социальных сетях.'}
                  </p>

                  <div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground select-none">
                    <span className="font-bold flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 opacity-60" />
                      {lesson.viewCount || 0} просмотров
                    </span>
                    <Link
                      href={`/academy/${lesson.slug}`}
                      className="flex items-center gap-1 font-extrabold text-primary group-hover:gap-1.5 transition-all"
                    >
                      <span>Читать статью</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border/60 py-10 text-center select-none text-xs text-muted-foreground mt-24">
        <p>© {new Date().getFullYear()} Smmplan Academy. Все права защищены.</p>
        <p className="mt-1 text-[10px] text-muted-foreground/60">Экспертные SMM-руководства для физлиц и реселлеров.</p>
      </footer>
    </div>
  );
}
