import { db as prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { draftMode } from "next/headers";
import parse, { DOMNode, Element } from "html-react-parser";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ServiceCard } from "@/components/landing/order-engine/ServiceCard";

export const revalidate = 3600; // Ревалидация раз в час (ISR)

interface PageProps {
  params: Promise<{ slug: string }>;
}

// 1. Оптимизация SEO: Генерация метаданных
export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params;
  const post = await prisma.contentItem.findUnique({
    where: { slug: resolvedParams.slug },
    select: { title: true, metaTitle: true, metaDescription: true, coverImage: true },
  });

  if (!post) return { title: "Страница не найдена" };

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || "",
    openGraph: {
      title: post.metaTitle || post.title,
      images: post.coverImage ? [post.coverImage] : [],
    },
  };
}

// 2. Islands Architecture (Фаза 4: Гидрация кастомных React компонентов)
const parserOptions = {
  replace: (domNode: DOMNode) => {
    if (domNode instanceof Element && domNode.attribs) {
      // Ищем BlockNote кастомные виджеты (плейсхолдеры)
      if (domNode.attribs["data-custom-type"] === "service" && domNode.attribs["data-id"]) {
        // Рендерим живой Client Component (виджет услуги)
        // В реальном приложении ServiceCard должен уметь грузить данные по ID
        return (
          <div className="my-8 p-4 border border-primary/20 rounded-xl bg-primary/5">
            <h3 className="text-lg font-bold text-primary mb-2">🔥 Рекомендуемая услуга</h3>
            <p className="text-sm text-muted-foreground mb-4">
              ID услуги: {domNode.attribs["data-id"]} (в будущем здесь будет карточка заказа)
            </p>
            {/* <ServiceCard serviceId={Number(domNode.attribs["data-id"])} /> */}
          </div>
        );
      }
    }
  },
};

export default async function CMSPage({ params }: PageProps) {
  const resolvedParams = await params;
  const draft = await draftMode();
  const isDraft = draft.isEnabled;

  // Ищем статью. В Draft Mode игнорируем кэш.
  const post = await prisma.contentItem.findUnique({
    where: { slug: resolvedParams.slug },
  });

  if (!post) {
    notFound();
  }

  // Если не опубликована и мы НЕ в Draft Mode — отдаем 404
  if (!post.isPublished && !isDraft) {
    notFound();
  }

  let finalHtml = post.contentHtml || "";

  // Если мы в Draft Mode, контент мог быть изменен (JSON сохранен, а HTML еще не сгенерирован)
  // Поэтому парсим актуальный JSON на лету
  if (isDraft && post.contentJson) {
    const { ServerBlockNoteEditor } = await import("@blocknote/server-util");
    const editor = ServerBlockNoteEditor.create();
    try {
      const blocks = JSON.parse(post.contentJson);
      finalHtml = await editor.blocksToHTMLLossy(blocks);
    } catch (e) {
      console.error("Draft parsing error", e);
      finalHtml = "<p>Ошибка предпросмотра черновика</p>";
    }
  }

  return (
    <main className="min-h-screen bg-background pt-24 pb-16">
      {/* Draft Mode Alert */}
      {isDraft && (
        <div className="fixed top-0 left-0 w-full bg-warning text-warning-foreground text-center py-2 z-50 flex items-center justify-center gap-4">
          <span className="font-semibold text-sm">Внимание: Вы просматриваете черновик (Draft Mode)</span>
          <Button asChild size="sm" intent="outline">
            <Link href={`/api/draft/disable?slug=${post.slug}`}>Выйти</Link>
          </Button>
        </div>
      )}

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-12 text-center">
          {post.categoryId && (
            <span className="text-primary font-medium tracking-wider uppercase text-sm mb-4 block">
              Smmplan Academy
            </span>
          )}
          <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight mb-4">
            {post.title}
          </h1>
          {post.metaDescription && (
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {post.metaDescription}
            </p>
          )}
          <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
            {post.authorName && <span>✍️ {post.authorName}</span>}
            {post.publishedAt && (
              <span>📅 {post.publishedAt.toLocaleDateString("ru-RU")}</span>
            )}
            {post.readTimeMinutes && <span>⏱ {post.readTimeMinutes} мин.</span>}
          </div>
        </header>

        {post.coverImage && (
          <div className="mb-12 rounded-2xl overflow-hidden shadow-2xl border border-divider">
            <img 
              src={post.coverImage} 
              alt={post.title} 
              className="w-full h-auto object-cover max-h-[500px]"
            />
          </div>
        )}

        {/* 
          Безопасный рендеринг: мы используем html-react-parser вместо dangerouslySetInnerHTML.
          Это защищает от XSS (в комбинации с серверной генерацией) и позволяет внедрять React-компоненты.
          (Скрытый Риск №1 из Премортема).
        */}
        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary hover:prose-a:text-primary/80 transition-colors">
          {parse(finalHtml, parserOptions)}
        </div>
      </article>
    </main>
  );
}
