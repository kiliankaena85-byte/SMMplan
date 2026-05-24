import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Lightweight vitest config for pure unit tests that don't need
 * database (Prisma) setup/teardown. ~100x faster than default config.
 */
export default defineConfig({
  test: {
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    testTimeout: 10000,
    setupFiles: [],
    globals: true,
    alias: {
      '@': path.resolve(__dirname, './src')
    },
  }
});
