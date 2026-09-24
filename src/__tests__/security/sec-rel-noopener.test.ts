import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('dist') && !file.includes('__tests__')) {
        results = results.concat(walk(file));
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

describe('SEC-06 / HYG-01: Reverse Tabnabbing Protection (rel="noopener noreferrer")', () => {
  it('enforces rel="noopener noreferrer" on all <a ... target="_blank"> and <Link ... target="_blank"> tags', () => {
    const srcDir = path.resolve(process.cwd(), 'src');
    const files = walk(srcDir);
    const violations: { file: string; tag: string }[] = [];

    const tagRegex = /<(?:a|Link)\b([\s\S]*?)>/gi;

    files.forEach(f => {
      const content = fs.readFileSync(f, 'utf8');
      let match;
      while ((match = tagRegex.exec(content)) !== null) {
        const fullTag = match[0];
        const attributes = match[1];
        if (/target\s*=\s*["']_blank["']/i.test(attributes)) {
          if (!/rel\s*=\s*["'][^"']*(?:noopener|noreferrer)[^"']*["']/i.test(attributes)) {
            violations.push({
              file: path.relative(process.cwd(), f),
              tag: fullTag.replace(/\s+/g, ' '),
            });
          }
        }
      }
    });

    expect(
      violations,
      `Found ${violations.length} tags with target="_blank" missing rel="noopener noreferrer":\n${violations
        .map(v => `${v.file}: ${v.tag}`)
        .join('\n')}`
    ).toEqual([]);
  });
});
