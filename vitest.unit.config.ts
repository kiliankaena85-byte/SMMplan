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
    ],
  }
});
