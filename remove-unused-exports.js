const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'knip-report2.txt');
const report = fs.readFileSync(reportPath, 'utf8');

const lines = report.split('\n');
let mode = null;

const filesToExports = {};

for (const line of lines) {
  if (line.startsWith('Unused exports') || line.startsWith('Unused exported types')) {
    mode = 'exports';
    continue;
  }
  if (line.startsWith('Unused files') || line.startsWith('Unused dependencies') || line.startsWith('Unused devDependencies') || line.startsWith('Unlisted dependencies') || line.startsWith('Unresolved imports')) {
    mode = null;
    continue;
  }
  
  if (mode === 'exports' && line.trim()) {
    // line format: exportName   type?   path:line:col
    // e.g.: OrderService                 class     src/services/core/order.service.ts:22:14
    // e.g.: updateMarkupAction           function  src/actions/admin/catalog.ts:13:23
    const match = line.match(/^([a-zA-Z0-9_]+)\s+(?:[a-z]+\s+)?([a-zA-Z0-9_./-]+):(\d+):\d+/);
    if (match) {
      const exportName = match[1];
      const filePath = match[2];
      const lineNum = parseInt(match[3], 10);
      
      if (!filesToExports[filePath]) {
        filesToExports[filePath] = [];
      }
      filesToExports[filePath].push({ name: exportName, line: lineNum });
    }
  }
}

for (const [filePath, exports] of Object.entries(filesToExports)) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) continue;
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const fileLines = content.split('\n');
  
  for (const exp of exports) {
    const lineIdx = exp.line - 1;
    if (lineIdx >= 0 && lineIdx < fileLines.length) {
      // We want to remove 'export ' or 'export default ' from the line
      // Or if it's a type/interface, 'export type ', 'export interface '
      fileLines[lineIdx] = fileLines[lineIdx].replace(/\bexport\s+(default\s+)?/, '');
    }
  }
  
  fs.writeFileSync(fullPath, fileLines.join('\n'), 'utf8');
  console.log(`Removed ${exports.length} exports from ${filePath}`);
}

console.log('Done export cleanup.');
