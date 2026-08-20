import fs from 'fs';
import path from 'path';
import { enforceSectionAccess } from '@/lib/server/rbac';
import { AcademyClient } from './academy-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Академия саппорта & Тренажер | SMMplan',
};

function mdToHtml(md: string): string {
  // Convert standard Markdown formatting to styled HTML elements matching our design tokens
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Headings with IDs for anchors
  html = html.replace(/^### (.*?)$/gm, (_, p1) => {
    const id = p1.toLowerCase().replace(/[^a-zа-я0-9]+/g, '-');
    return `<h3 id="${id}" class="text-sm font-bold mt-4 mb-2 text-foreground flex items-center gap-1.5">${p1}</h3>`;
  });
  html = html.replace(/^## (.*?)$/gm, (_, p1) => {
    const id = p1.toLowerCase().replace(/[^a-zа-я0-9]+/g, '-');
    return `<h2 id="${id}" class="text-base font-black mt-6 mb-3 border-b border-border pb-1 text-foreground uppercase tracking-wider">${p1}</h2>`;
  });
  html = html.replace(/^# (.*?)$/gm, (_, p1) => {
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
    <AcademyClient
      manualHtml={parsedHtml}
      sidebarItems={sidebarItems}
    />
  );
}
