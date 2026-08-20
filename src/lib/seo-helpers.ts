export function normalizeTenantId(tenantId: string | null | undefined): string {
  if (!tenantId) return 'smmplan';
  const tid = tenantId.toLowerCase().trim();
  if (tid === 'flux' || tid === 'lovable' || tid === 'smmflux') return 'flux';
  return tid;
}

export function getTenantHost(tenantId: string): string {
  switch (normalizeTenantId(tenantId)) {
    case 'flux':
    case 'smmflux': return 'smmflux.ru';
    case 'boost':
    case 'smmboost': return 'smmboost.ru';
    default: return 'smmplan.pro';
  }
}

export function getTenantSiteName(tenantId: string): string {
  switch (normalizeTenantId(tenantId)) {
    case 'flux':
    case 'smmflux': return 'SMMflux';
    case 'boost':
    case 'smmboost': return 'SMMboost';
    default: return 'SMMplan';
  }
}

export function absoluteCanonical(tenantId: string, path: string): string {
  const host = getTenantHost(tenantId);
  // Ensure path starts with a slash
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `https://${host}${safePath}`;
}
