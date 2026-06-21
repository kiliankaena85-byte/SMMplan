import { db as prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { SettingsProvider } from "@/lib/settings";
import parse from "html-react-parser";
import { draftMode } from "next/headers";

export async function LegalPageContent({ slug }: { slug: string }) {
  const draft = await draftMode();
  const isDraft = draft.isEnabled;

  const post = await prisma.contentItem.findUnique({
    where: { slug },
  });

  if (!post) {
    notFound();
  }

  if (!post.isPublished && !isDraft) {
    notFound();
  }

  // Get dynamic settings
  const settings = await SettingsProvider.getContactAndLegalSettings();
  const companyName = settings.COMPANY_NAME || 'ИП / ООО';
  const inn = settings.COMPANY_INN || 'Укажите ИНН';
  const ogrnip = settings.COMPANY_OGRNIP || 'Укажите ОГРНИП';
  const address = settings.COMPANY_ADDRESS || 'г. Москва';
  const email = settings.SUPPORT_EMAIL || 'support@smmplan.pro';
  const privacyEmail = settings.PRIVACY_EMAIL || 'privacy@smmplan.pro';
  const siteName = settings.SITE_NAME || 'SMMplan';

  let finalHtml = post.contentHtml || "";

  // Parse draft JSON if in draft mode
  if (isDraft && post.contentJson) {
    const { ServerBlockNoteEditor } = await import("@blocknote/server-util");
    const editor = ServerBlockNoteEditor.create();
    try {
      const blocks = JSON.parse(post.contentJson);
      finalHtml = await editor.blocksToHTMLLossy(blocks);
    } catch (e) {
      console.error("Draft parsing error", e);
    }
  }

  // Replace placeholders
  finalHtml = finalHtml
    .replace(/{{COMPANY_NAME}}/g, companyName)
    .replace(/{{COMPANY_INN}}/g, inn)
    .replace(/{{COMPANY_OGRNIP}}/g, ogrnip)
    .replace(/{{COMPANY_ADDRESS}}/g, address)
    .replace(/{{SUPPORT_EMAIL}}/g, email)
    .replace(/{{SUPPORT_EMAIL}}/g, email) // ensure fallback
    .replace(/{{PRIVACY_EMAIL}}/g, privacyEmail)
    .replace(/{{SITE_NAME}}/g, siteName);

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      {isDraft && (
        <div className="fixed top-0 left-0 w-full bg-warning text-warning-foreground text-center py-2 z-50 flex items-center justify-center gap-4">
          <span className="font-semibold text-sm">Внимание: Вы просматриваете черновик (Draft Mode)</span>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
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
                {post.title}
              </h1>
            </div>
          ) : (
            <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-8">
              {post.title}
            </h1>
          )}
          
          <div className="space-y-6 text-muted-foreground leading-relaxed text-sm">
            {parse(finalHtml)}
          </div>
        </article>
      </div>
    </div>
  );
}
