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
      'src/__tests__/p0-security-fixes.test.ts',
      'src/__tests__/actionable-error.test.ts',
      'src/__tests__/admin-stress/admin-panel-stress-and-resilience.test.ts',
      'src/__tests__/checkout-payments/checkout-resilience-and-bypass.test.ts',
      'src/__tests__/mobile-wizard-smoke.test.tsx',
      'src/__tests__/admin-nav-active.test.ts',
      'src/lib/__tests__/order-token-and-typo-guard.test.ts',
      'src/__tests__/financial/yookassa-signed-webhook-verification.test.ts',
      'src/__tests__/auth/logout-and-proxy-redirects.test.ts',
      'src/__tests__/auth/user-login-and-logout-resilience.test.ts',
      'src/lib/icons/__tests__/safe-svg.test.ts',
      'src/__tests__/order-actions-and-support-ops.test.ts',
      'src/__tests__/providers/balance-autoflush-resilience.test.ts',
      'src/__tests__/financial/ledger-and-transaction-type-filters.test.ts',
      'src/__tests__/catalog/category-slug-and-icon-hygiene.test.ts',
    ],
  }
});
