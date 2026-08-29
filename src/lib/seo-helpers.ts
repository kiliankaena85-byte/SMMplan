export function normalizeTenantId(tenantId: string | null | undefined): string {
  if (!tenantId) return 'smmplan';
  const tid = tenantId.toLowerCase().trim();
  if (tid === 'flux' || tid === 'lovable' || tid === 'smmflux') return 'flux';
  return tid;
}

export function getTenantHost(tenantId: string): string {
  if (process.env.APP_HOST) {
    return process.env.APP_HOST;
  }
  if (process.env.APP_URL && (process.env.APP_URL.includes('test.') || process.env.APP_URL.includes('localhost'))) {
    try {
      return new URL(process.env.APP_URL).host;
    } catch {
      // fallback
    }
  }
  switch (normalizeTenantId(tenantId)) {
    case 'flux':
    case 'smmflux': return 'smmflux.ru';
    default: return 'smmplan.pro';
  }
}

export function getTenantSiteName(tenantId: string): string {
  switch (normalizeTenantId(tenantId)) {
    case 'flux':
    case 'smmflux': return 'SMMflux';
    default: return 'SMMplan';
  }
}

export function absoluteCanonical(tenantId: string, path: string): string {
  const host = getTenantHost(tenantId);
  // Ensure path starts with a single slash and avoids double slashes
  const cleanPath = '/' + path.replace(/^\/+/, '');
  return `https://${host}${cleanPath}`;
}
