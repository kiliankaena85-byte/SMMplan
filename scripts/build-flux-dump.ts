import fs from 'fs';
import path from 'path';

const filesToInclude = [
  'src/tenants/registry.ts',
  'src/tenants/flux/strategy.ts',
  'src/lib/tenant-resolver-edge.ts',
  'src/lib/navigation.ts',
  'src/types/flux.ts',
  'src/utils/status-helpers.ts',
  'src/hooks/useOrderWizard.ts',
  'src/app/globals.css',
  'src/components/ab-test/FluxOrderClient.tsx',
  'src/components/ab-test/FluxTrustBar.tsx',
  'src/components/ab-test/FluxWhyUs.tsx',
  'src/components/ab-test/FluxReviews.tsx',
  'src/components/ab-test/FluxFAQ.tsx',
  'src/components/landing/Header.tsx',
  'src/components/landing/MegaFooter.tsx',
  'src/components/dashboard/flux/FluxDashboardShell.tsx',
  'src/components/dashboard/flux/FluxDashboardHome.tsx',
  'src/components/dashboard/flux/FluxOrdersView.tsx',
  'src/components/dashboard/flux/FluxDashboardOrderWizard.tsx',
  'src/components/dashboard/FluxOrdersKanban.tsx',
  'src/components/dashboard/FluxOrdersList.tsx',
];

const rootDir = process.cwd();
const outputFile = path.join(rootDir, 'FLUX_FULL_FRONTEND_PACKAGE.md');

let output = `# 📦 FULL Flux Frontend Source Code Handoff Package

Этот документ содержит **ПОЛНЫЙ ИСХОДНЫЙ КОД ФРОНТЕНДА FLUX (без сокращений)** для Next.js 16 / React 19 / Tailwind CSS 4.
Скопируйте данный файл целиком и передайте другому AI-агенту (Cursor, Claude Code, Gemini, Copilot).

---

## 📑 Оглавление файлов в пакете:\n`;

filesToInclude.forEach((relPath, index) => {
  output += `${index + 1}. \`${relPath}\`\n`;
});

output += `\n---\n\n`;

filesToInclude.forEach((relPath, index) => {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${relPath}`);
    return;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const ext = path.extname(relPath).replace('.', '');
  const lang = ext === 'css' ? 'css' : 'typescript';

  output += `### ${index + 1}. \`${relPath}\`\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\n---\n\n`;
});

fs.writeFileSync(outputFile, output, 'utf8');
const stats = fs.statSync(outputFile);
console.log(`Successfully generated ${outputFile} (${stats.size} bytes, ${filesToInclude.length} files)`);
