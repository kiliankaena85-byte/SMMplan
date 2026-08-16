import { db } from '@/lib/db';
import { SettingsProvider } from '@/lib/settings';
import { getLegalFallback } from '@/data/legal-fallbacks';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import parse from 'html-react-parser';

interface LegalPageContentProps {
  slug: string;
}

export async function LegalPageContent({ slug }: LegalPageContentProps) {
  let title: string | null = null;
  let contentHtml: string | null = null;

  // 1. Пробуем из БД
  try {
    const post = await db.contentItem.findUnique({
      where: { slug },
      select: { title: true, contentHtml: true, isPublished: true },
    });
    if (post && post.isPublished && post.contentHtml) {
      title = post.title;
      contentHtml = post.contentHtml;
    }
  } catch {
    // БД недоступна — переходим к fallback
  }

  // 2. Fallback из статического файла
  if (!contentHtml) {
    const fallback = getLegalFallback(slug);
    if (fallback) {
      title = fallback.title;
      contentHtml = fallback.html;
    }
  }

  // 3. Ничего нет — 404
  if (!contentHtml) {
    notFound();
  }

  // 4. Замена {{тегов}} на реальные значения
  const settings = await SettingsProvider.getContactAndLegalSettings();
  const replacements: Record<string, string> = {
    '{{COMPANY_NAME}}': settings.COMPANY_NAME || 'Индивидуальный предприниматель Соколов Артём Андреевич',
    '{{COMPANY_INN}}': settings.COMPANY_INN || '695006320024',
    '{{COMPANY_OGRNIP}}': settings.COMPANY_OGRNIP || '320695200000000',
    '{{COMPANY_ADDRESS}}': settings.COMPANY_ADDRESS || 'Российская Федерация, Тверская область, г. Тверь',
    '{{SUPPORT_EMAIL}}': settings.SUPPORT_EMAIL || 'support@smmplan.pro',
    '{{PRIVACY_EMAIL}}': settings.PRIVACY_EMAIL || 'privacy@smmplan.pro',
    '{{SITE_NAME}}': settings.SITE_NAME || 'SMMplan',
    '{{TELEGRAM_BOT}}': settings.TELEGRAM_SUPPORT_BOT || '@smmplan_support_bot',
  };

  let rendered = contentHtml;
  for (const [tag, value] of Object.entries(replacements)) {
    rendered = rendered.replaceAll(tag, value);
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          На главную
        </Link>
        
        <article className="bg-card rounded-3xl shadow-sm border border-border p-8 md:p-12 prose dark:prose-invert max-w-none">
          {slug === 'refund' ? (
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border">
              <div className="w-12 h-12 bg-destructive/10 rounded-2xl flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-destructive" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight m-0">
                {title}
              </h1>
            </div>
          ) : (
            <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-8">
              {title}
            </h1>
          )}
          
          <div className="space-y-6 text-muted-foreground leading-relaxed text-sm">
            {parse(rendered)}
          </div>
        </article>
      </div>
    </div>
  );
}
