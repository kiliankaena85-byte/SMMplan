import * as fs from 'fs';
import * as path from 'path';

interface FileMetrics {
  path: string;
  lines: number;
  isComponent: boolean;
}

const srcDir = path.resolve(__dirname, '../src');
const allFiles: FileMetrics[] = [];

function scanDirectory(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n').length;
      const relPath = path.relative(path.resolve(__dirname, '..'), fullPath).replace(/\\/g, '/');
      const isComponent = relPath.startsWith('src/components/');
      
      allFiles.push({ path: relPath, lines, isComponent });
    }
  }
}

try {
  scanDirectory(srcDir);
  
  const totalFiles = allFiles.length;
  const oversizedFiles = allFiles.filter(f => !f.isComponent && f.lines > 300).sort((a, b) => b.lines - a.lines);
  const oversizedComponents = allFiles.filter(f => f.isComponent && f.lines > 150).sort((a, b) => b.lines - a.lines);
  const averageLines = Math.round(allFiles.reduce((acc, f) => acc + f.lines, 0) / totalFiles);

  console.log(JSON.stringify({
    totalFiles,
    averageLines,
    oversizedFilesCount: oversizedFiles.length,
    oversizedComponentsCount: oversizedComponents.length,
    topOversizedFiles: oversizedFiles.slice(0, 10),
    topOversizedComponents: oversizedComponents.slice(0, 10),
  }, null, 2));
} catch (e: any) {
  console.error('Error scanning files:', e.message);
}
