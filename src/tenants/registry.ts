import { ITenantDashboardStrategy } from './types';

// Map of registered tenant loaders for Dynamic Lazy Loading (Code-Splitting F4 protection)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry = new Map<string, () => Promise<{ default: ITenantDashboardStrategy<any, any> }>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerTenant(id: string, loader: () => Promise<{ default: ITenantDashboardStrategy<any, any> }>) {
  if (registry.has(id)) {
    return;
  }
  registry.set(id, loader);
}

export function getTenantLoader(id: string) {
  return registry.get(id);
}

// Initial registrations (Open-Closed Self-Registration)
registerTenant('smmplan', () => import('./smmplan/strategy'));
registerTenant('lovable', () => import('./lovable/strategy'));
