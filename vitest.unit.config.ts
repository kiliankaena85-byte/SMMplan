import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: [],
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    include: [
      'src/__tests__/financial/financial-security-audit.test.ts',
      'src/__tests__/catalog-pagination-offset.test.ts',
      'src/__tests__/admin-switchers-security.test.ts',
      'src/__tests__/ai-draft-caching-speed.test.ts',
      'src/__tests__/orders-clients-pagination.test.ts',
      'src/__tests__/dark-mode-audit.test.ts',
      'src/__tests__/maintenance-screens.test.ts',
      'src/__tests__/table-density.test.ts',
      'src/__tests__/categories-unit.test.ts',
      'src/__tests__/orders-pagination-speed.test.ts',
      'src/__tests__/auto-map-poll-category.test.ts',
    ],
  }
});
