/**
 * @file TenantScope - Canonical Golden Path Primitive for Multi-Tenant Scoping & Enforcement.
 * @module TenantScope
 * 
 * JSDoc / Usage Guidelines:
 * ✅ DO THIS:
 *   const tenantId = requireTenantId(session);
 *   const orders = await db.order.findMany({ where: tenantWhere(session, { status: 'COMPLETED' }) });
 *   assertSameTenant(session, targetOrder);
 * 
 * ❌ NEVER DO THIS (Tenant Isolation Leak):
 *   const order = await db.order.findUnique({ where: { id: params.id } }); // ❌ Lacks tenant filter!
 */

export interface TenantSession {
  tenantId?: string;
  user?: {
    tenantId?: string;
  };
}

export function requireTenantId(session: TenantSession | null | undefined): string {
  const tenantId = session?.tenantId || session?.user?.tenantId;
  if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw new Error('SECURITY_TENANT_MISSING: Operation blocked - missing valid tenantId in session.');
  }
  return tenantId;
}

export function tenantWhere<T extends object>(session: TenantSession | null | undefined, baseWhere: T = {} as T): T & { tenantId: string } {
  const tenantId = requireTenantId(session);
  return {
    ...baseWhere,
    tenantId
  };
}

export function assertSameTenant(session: TenantSession | null | undefined, entity: { tenantId?: string } | null | undefined): void {
  const sessionTenantId = requireTenantId(session);
  if (!entity || !entity.tenantId || entity.tenantId !== sessionTenantId) {
    throw new Error(`SECURITY_TENANT_MISMATCH: Cross-tenant access blocked! Session tenant: ${sessionTenantId}, Entity tenant: ${entity?.tenantId || 'NONE'}`);
  }
}
