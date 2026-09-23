// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeSearchQuery } from '@/utils/search-normalizer';

describe('Providers Table & Form Decomposition Standards (SIL-2026)', () => {
  const rootDir = process.cwd();
  const providersDir = path.resolve(rootDir, 'src/app/admin/providers');
  const tableComponentsDir = path.resolve(providersDir, 'components/table');
  const componentsDir = path.resolve(providersDir, 'components');

  it('MUST keep client-table.tsx <= 200 lines', () => {
    const filePath = path.resolve(providersDir, 'client-table.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').length;
    expect(lines, `Expected client-table.tsx to be <= 200 lines, got ${lines}`).toBeLessThanOrEqual(200);
  });

  it('MUST keep all decomposed table components <= 200 lines', () => {
    expect(fs.existsSync(tableComponentsDir)).toBe(true);
    const tableFiles = [
      'providers-table-toolbar.tsx',
      'providers-table-row.tsx',
      'providers-table-mobile-card.tsx',
      'providers-table-desktop.tsx',
      'providers-table-empty.tsx',
      'provider-delete-dialog.tsx',
    ];

    for (const file of tableFiles) {
      const filePath = path.join(tableComponentsDir, file);
      expect(fs.existsSync(filePath), `Expected ${file} to exist in components/table/`).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').length;
      expect(lines, `Expected ${file} to be <= 200 lines, got ${lines}`).toBeLessThanOrEqual(200);
    }
  });

  it('MUST keep provider-form.tsx and its state hooks <= 200 lines', () => {
    const formFiles = [
      'provider-form.tsx',
      'useProviderFormState.ts',
      'useProviderMappingState.ts',
      'useProviderProbeState.ts',
    ];

    for (const file of formFiles) {
      const filePath = path.join(componentsDir, file);
      expect(fs.existsSync(filePath), `Expected ${file} to exist in components/`).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').length;
      expect(lines, `Expected ${file} to be <= 200 lines, got ${lines}`).toBeLessThanOrEqual(200);
    }
  });

  it('MUST redirect /admin/providers/keys to /admin/providers', async () => {
    const keysPagePath = path.resolve(providersDir, 'keys/page.tsx');
    expect(fs.existsSync(keysPagePath)).toBe(true);
    const content = fs.readFileSync(keysPagePath, 'utf-8');
    expect(content).toContain("redirect('/admin/providers')");
  });

  it('MUST correctly normalize search queries including #ID, №ID, ID: and clean strings', () => {
    expect(normalizeSearchQuery('#1643')).toBe('1643');
    expect(normalizeSearchQuery('№1643')).toBe('1643');
    expect(normalizeSearchQuery('ID: 1643')).toBe('1643');
    expect(normalizeSearchQuery('id 1643')).toBe('1643');
    expect(normalizeSearchQuery('# 2500')).toBe('2500');
    expect(normalizeSearchQuery('  Main Provider  ')).toBe('main provider');
    expect(normalizeSearchQuery('')).toBe('');
  });
});
