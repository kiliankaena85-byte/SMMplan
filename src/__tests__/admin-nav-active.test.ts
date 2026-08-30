import { describe, it, expect } from 'vitest';
import { isNavTabActive } from '@/components/admin/navigation-data';

describe('Admin Navigation Active State (Best Match Rule)', () => {
  const mockAdminHrefs = [
    '/admin/dashboard',
    '/admin/orders',
    '/admin/catalog',
    '/admin/catalog/categories',
    '/admin/providers',
    '/admin/tickets',
    '/admin/clients',
    '/admin/finance',
    '/admin/finance/balance-requests',
    '/admin/analytics',
    '/admin/settings'
  ];

  it('should highlight ONLY Categories tab when visiting /admin/catalog/categories', () => {
    const isCatalogActive = isNavTabActive('/admin/catalog/categories', '/admin/catalog', mockAdminHrefs);
    const isCategoriesActive = isNavTabActive('/admin/catalog/categories', '/admin/catalog/categories', mockAdminHrefs);

    expect(isCategoriesActive).toBe(true);
    expect(isCatalogActive).toBe(false);
  });

  it('should highlight ONLY Catalog tab when visiting /admin/catalog', () => {
    const isCatalogActive = isNavTabActive('/admin/catalog', '/admin/catalog', mockAdminHrefs);
    const isCategoriesActive = isNavTabActive('/admin/catalog', '/admin/catalog/categories', mockAdminHrefs);

    expect(isCatalogActive).toBe(true);
    expect(isCategoriesActive).toBe(false);
  });

  it('should highlight Catalog tab when visiting nested catalog route (e.g. /admin/catalog/123 or /admin/catalog/new)', () => {
    const isCatalogActiveForDetail = isNavTabActive('/admin/catalog/123', '/admin/catalog', mockAdminHrefs);
    const isCategoriesActiveForDetail = isNavTabActive('/admin/catalog/123', '/admin/catalog/categories', mockAdminHrefs);

    expect(isCatalogActiveForDetail).toBe(true);
    expect(isCategoriesActiveForDetail).toBe(false);
  });

  it('should highlight ONLY Balance Requests tab when visiting /admin/finance/balance-requests', () => {
    const isFinanceActive = isNavTabActive('/admin/finance/balance-requests', '/admin/finance', mockAdminHrefs);
    const isBalanceRequestsActive = isNavTabActive('/admin/finance/balance-requests', '/admin/finance/balance-requests', mockAdminHrefs);

    expect(isBalanceRequestsActive).toBe(true);
    expect(isFinanceActive).toBe(false);
  });

  it('should highlight ONLY Finance tab when visiting /admin/finance', () => {
    const isFinanceActive = isNavTabActive('/admin/finance', '/admin/finance', mockAdminHrefs);
    const isBalanceRequestsActive = isNavTabActive('/admin/finance', '/admin/finance/balance-requests', mockAdminHrefs);

    expect(isFinanceActive).toBe(true);
    expect(isBalanceRequestsActive).toBe(false);
  });

  it('should highlight Dashboard ONLY on exact /admin/dashboard', () => {
    expect(isNavTabActive('/admin/dashboard', '/admin/dashboard', mockAdminHrefs)).toBe(true);
    expect(isNavTabActive('/admin/orders', '/admin/dashboard', mockAdminHrefs)).toBe(false);
    expect(isNavTabActive('/admin/catalog', '/admin/dashboard', mockAdminHrefs)).toBe(false);
  });

  it('should handle tab navigation with query params', () => {
    const headerTabs = [
      '/admin/settings',
      '/admin/settings?tab=telegram',
      '/admin/settings?tab=proxy'
    ];

    expect(isNavTabActive('/admin/settings', '/admin/settings', headerTabs)).toBe(true);
    expect(isNavTabActive('/admin/settings?tab=telegram', '/admin/settings?tab=telegram', headerTabs)).toBe(true);
  });
});
