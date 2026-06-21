import fs from 'fs';
import path from 'path';
import parse from 'html-react-parser';
import Link from 'next/link';
import { Book, ArrowLeft } from 'lucide-react';
import { enforceSectionAccess } from '@/lib/server/rbac';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Руководство оператора | SMMplan',
};

function mdToHtml(md: string): string {
  // Convert standard Markdown formatting to styled HTML elements matching our design tokens
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Headings with IDs for anchors
  html = html.replace(/^### (.*?)$/gm, (match, p1) => {
    const id = p1.toLowerCase().replace(/[^a-zа-я0-9]+/g, '-');
    return `<h3 id="${id}" class="text-sm font-bold mt-4 mb-2 text-foreground flex items-center gap-1.5">${p1}</h3>`;
  });
  html = html.replace(/^## (.*?)$/gm, (match, p1) => {
    const id = p1.toLowerCase().replace(/[^a-zа-я0-9]+/g, '-');
    return `<h2 id="${id}" class="text-base font-black mt-6 mb-3 border-b border-border pb-1 text-foreground uppercase tracking-wider">${p1}</h2>`;
  });
  html = html.replace(/^# (.*?)$/gm, (match, p1) => {
    const id = p1.toLowerCase().replace(/[^a-zа-я0-9]+/g, '-');
    return `<h1 id="${id}" class="text-xl font-black mt-8 mb-4 text-foreground border-l-4 border-primary pl-3">${p1}</h1>`;
  });

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-muted/80 p-4 rounded-xl overflow-x-auto my-4 text-[11px] font-mono border border-border leading-relaxed text-muted-foreground"><code>$1</code></pre>');
  
  // Inline code
  html = html.replace(/`(.*?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px] text-primary border border-border/50 font-bold">$1</code>');

  // List items
  html = html.replace(/^- (.*?)$/gm, '<li class="ml-4 list-disc text-muted-foreground mb-1 font-medium text-xs">$1</li>');

  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary hover:underline font-bold">$1</a>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="border-border my-6" />');

  // Split into paragraphs by double newlines
  const blocks = html.split(/\n\n+/);
  const parsedBlocks = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<li') || trimmed.startsWith('<hr') || trimmed.startsWith('<ul') || trimmed.startsWith('<table')) {
      return trimmed;
    }
    return `<p class="text-muted-foreground text-xs leading-relaxed mb-3 font-medium">${trimmed.replace(/\n/g, '<br/>')}</p>`;
  });

  return parsedBlocks.join('\n');
}

export default async function AdminManualPage() {
  await enforceSectionAccess('settings');

  const manualPath = path.join(process.cwd(), 'project-docs', 'support_training_manual.md');
  let manualContent: string;
  try {
    manualContent = fs.readFileSync(manualPath, 'utf8');
  } catch {
    manualContent = '# Ошибка\nНе удалось загрузить руководство. Файл не найден.';
  }

  // Parse lines to build a table of contents / sidebar links
  const lines = manualContent.split('\n');
  const sidebarItems: { id: string; title: string; level: number }[] = [];
  
  lines.forEach(line => {
    if (line.startsWith('# ')) {
      const title = line.replace('# ', '').trim();
      const id = title.toLowerCase().replace(/[^a-zа-я0-9]+/g, '-');
      sidebarItems.push({ id, title, level: 1 });
    } else if (line.startsWith('## ')) {
      const title = line.replace('## ', '').trim();
      const id = title.toLowerCase().replace(/[^a-zа-я0-9]+/g, '-');
      sidebarItems.push({ id, title, level: 2 });
    }
  });

  const parsedHtml = mdToHtml(manualContent);

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out min-h-full pb-10">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> На дашборд
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Book className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-foreground">Руководство оператора SMMplan</h1>
              <p className="text-xs text-muted-foreground">Вся база знаний по архитектуре, процессам и регламенту поддержки</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-1 bg-card border border-border/80 rounded-2xl p-4 sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto">
          <h2 className="text-xs font-black uppercase text-muted-foreground mb-3 tracking-wider">Содержание</h2>
          <nav className="space-y-1">
            {sidebarItems.map((item, idx) => (
              <a
                key={idx}
                href={`#${item.id}`}
                className={`block text-xs py-1.5 rounded-lg font-bold transition-all duration-200 ${
                  item.level === 1
                    ? 'text-foreground hover:text-primary pl-0'
                    : 'text-muted-foreground hover:text-primary pl-3 font-semibold'
                }`}
              >
                {item.level === 1 ? '📘 ' : '• '}{item.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-3 bg-card border border-border/80 rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="prose dark:prose-invert max-w-none prose-xs">
            {parse(parsedHtml)}
          </div>
        </main>
      </div>
    </div>
  );
}
