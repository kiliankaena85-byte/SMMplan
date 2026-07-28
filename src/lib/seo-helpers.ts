export function normalizeTenantId(tenantId: string | null | undefined): string {
  if (!tenantId) return 'smmplan';
  const tid = tenantId.toLowerCase().trim();
  if (tid === 'flux') return 'smmflux';
  return tid;
}

export function getTenantHost(tenantId: string): string {
  switch (normalizeTenantId(tenantId)) {
    case 'smmflux': return 'smmflux.ru';
    case 'lovable': return 'lovable.pro';
    default: return 'smmplan.pro';
  }
}

export function getTenantSiteName(tenantId: string): string {
  switch (normalizeTenantId(tenantId)) {
    case 'smmflux': return 'SMMflux';
    case 'lovable': return 'Lovable';
    default: return 'SMMplan';
  }
}

export function absoluteCanonical(tenantId: string, path: string): string {
  const host = getTenantHost(tenantId);
  // Ensure path starts with a slash
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `https://${host}${safePath}`;
}
