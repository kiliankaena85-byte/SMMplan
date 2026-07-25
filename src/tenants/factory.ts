import { ITenantDashboardStrategy } from './types';
import { getTenantLoader } from './registry';

/**
 * Tenant View Factory (100% OCP Compliant)
 * Dynamically resolves the tenant dashboard strategy without editing this factory file.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTenantDashboardViews(tenantId: string): Promise<ITenantDashboardStrategy<any, any>> {
  const loader = getTenantLoader(tenantId);
  if (!loader) {
    console.warn(`[TenantFactory] Unregistered tenant requested: "${tenantId}". Loading neutral maintenance fallback.`);
    const fallbackModule = await import('./fallback/neutral-maintenance-strategy');
    return fallbackModule.default;
  }

  try {
    const tenantModule = await loader();
    return tenantModule.default;
  } catch (err) {
    console.error(`[TenantFactory] Failed to load tenant module for "${tenantId}":`, err);
    const fallbackModule = await import('./fallback/neutral-maintenance-strategy');
    return fallbackModule.default;
  }
}
