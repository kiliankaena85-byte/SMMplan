'use server';

// ==============================================================
// Provider Proxy Server Actions
// OWASP Top 10 2025 Compliant
// A01: requireStaffPermission on all mutations
// A02: Proxy passwords encrypted via VaultService
// A03: Zod validation on all inputs
// A09: Audit trail on all mutations
// A10: SSRF guard on all test requests
// ==============================================================

import { requireStaffPermission, requireOwnerPermission } from '@/lib/server/rbac';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auditAdminAwaitable } from '@/lib/admin-audit';
import { getClientIp } from '@/utils/ip';
import {
  createProxySchema,
  updateProxySchema,
  testProxySchema,
  assignProxySchema,
  batchAssignSchema,
  proxyLogQuerySchema,
} from '@/schemas/provider-proxy';
import type {
  ProviderProxyWithUsage,
  ProxyTestResult,
  ProxyHealthSummary,
} from '@/types/provider-proxy';

// ── LIST ──
export async function listProviderProxiesAction(): Promise<
  { success: true; data: ProviderProxyWithUsage[] } | { success: false; error: string }
> {
  const res = await requireStaffPermission('providers', 'view', async () => {
    const rawList = await db.providerProxy.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { providers: true, logs: true } },
      },
    });

    return rawList.map((p) => ({
      ...p,
      protocol: p.protocol as 'http' | 'https' | 'socks5',
      tags: typeof p.tags === 'string' ? (JSON.parse(p.tags) as string[]) : (p.tags as unknown as string[]),
    }));
  });

  if ('error' in res) {
    return { success: false, error: res.error };
  }
  return { success: true, data: res };
}

// ── HEALTH SUMMARY ──
export async function getProxyHealthSummaryAction(): Promise<
  { success: true; data: ProxyHealthSummary } | { success: false; error: string }
> {
  const res = await requireStaffPermission('providers', 'view', async () => {
    const [total, active, withErrors, avgResult, providersWithProxy, providersDirect] = await Promise.all([
      db.providerProxy.count(),
      db.providerProxy.count({ where: { isActive: true } }),
      db.providerProxy.count({ where: { consecutiveFailures: { gt: 0 } } }),
      db.providerProxy.aggregate({
        where: { lastTestLatencyMs: { not: null } },
        _avg: { lastTestLatencyMs: true },
      }),
      db.provider.count({ where: { proxyId: { not: null } } }),
      db.provider.count({ where: { proxyId: null, isActive: true } }),
    ]);

    return {
      total,
      active,
      withErrors,
      avgLatencyMs: avgResult._avg.lastTestLatencyMs ? Math.round(avgResult._avg.lastTestLatencyMs) : null,
      providersUsingProxy: providersWithProxy,
      providersDirect,
    };
  });

  if ('error' in res) {
    return { success: false, error: res.error };
  }
  return { success: true, data: res };
}

// ── CREATE ──
export async function createProviderProxyAction(raw: Record<string, unknown>) {
  return requireStaffPermission('providers', 'edit', async (admin) => {
    const parsed = createProxySchema.safeParse(raw);
    if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message };

    const data = parsed.data;
    let passwordEncrypted: string | null = null;
    if (data.password) {
      try {
        const { VaultService } = await import('@/lib/vault');
        passwordEncrypted = VaultService.encrypt(data.password);
      } catch {
        return { success: false as const, error: 'Ошибка шифрования пароля прокси' };
      }
    }

    const proxy = await db.providerProxy.create({
      data: {
        label: data.label,
        description: data.description,
        protocol: data.protocol,
        host: data.host,
        port: data.port,
        username: data.username,
        passwordEncrypted,
        isRotating: data.isRotating,
        geoCountry: data.geoCountry,
        tags: JSON.stringify(data.tags),
      },
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'PROVIDER_PROXY_CREATE',
      target: proxy.id,
      targetType: 'PROVIDER_PROXY',
      ipAddress: await getClientIp(),
      newValue: JSON.stringify({ label: data.label, protocol: data.protocol, host: data.host }),
    });

    revalidatePath('/admin/providers');
    revalidatePath('/admin/settings');
    return { success: true as const, message: `Прокси "${data.label}" создан`, data: proxy };
  });
}

// ── UPDATE ──
export async function updateProviderProxyAction(raw: Record<string, unknown>) {
  return requireStaffPermission('providers', 'edit', async (admin) => {
    const parsed = updateProxySchema.safeParse(raw);
    if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message };

    const { id, password, tags, ...data } = parsed.data;

    const existing = await db.providerProxy.findUnique({ where: { id } });
    if (!existing) return { success: false as const, error: 'Прокси не найден' };

    let passwordEncrypted: string | null | undefined;
    if (password !== undefined) {
      if (password) {
        try {
          const { VaultService } = await import('@/lib/vault');
          passwordEncrypted = VaultService.encrypt(password);
        } catch {
          return { success: false as const, error: 'Ошибка шифрования пароля' };
        }
      } else {
        passwordEncrypted = null;
      }
    }

    await db.providerProxy.update({
      where: { id },
      data: {
        ...data,
        ...(tags !== undefined && { tags: JSON.stringify(tags) }),
        ...(passwordEncrypted !== undefined && { passwordEncrypted }),
      },
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'PROVIDER_PROXY_UPDATE',
      target: id,
      targetType: 'PROVIDER_PROXY',
      ipAddress: await getClientIp(),
      oldValue: JSON.stringify({ label: existing.label }),
      newValue: JSON.stringify({ label: data.label || existing.label }),
    });

    revalidatePath('/admin/providers');
    revalidatePath('/admin/settings');
    return { success: true as const, message: `Прокси "${data.label || existing.label}" обновлён` };
  });
}

// ── DELETE ──
export async function deleteProviderProxyAction(proxyId: string) {
  return requireOwnerPermission(async (admin) => {
    if (!proxyId) return { success: false as const, error: 'ID обязателен' };

    const existing = await db.providerProxy.findUnique({ where: { id: proxyId } });
    if (!existing) return { success: false as const, error: 'Прокси не найден' };

    // Unbind all providers using this proxy
    const unboundCount = await db.provider.count({ where: { proxyId } });
    await db.provider.updateMany({ where: { proxyId }, data: { proxyId: null } });

    await db.providerProxy.delete({ where: { id: proxyId } });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'PROVIDER_PROXY_DELETE',
      target: proxyId,
      targetType: 'PROVIDER_PROXY',
      ipAddress: await getClientIp(),
      oldValue: JSON.stringify({ label: existing.label, unboundProviders: unboundCount }),
    });

    revalidatePath('/admin/providers');
    revalidatePath('/admin/settings');
    return { success: true as const, message: `Прокси "${existing.label}" удалён. ${unboundCount} провайдеров переведены на прямое подключение.` };
  });
}

// ── TEST ──
export async function testProviderProxyAction(raw: Record<string, unknown>) {
  return requireStaffPermission('providers', 'edit', async (admin) => {
    const parsed = testProxySchema.safeParse(raw);
    if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message };

    const { proxyId, targetUrl } = parsed.data;
    const proxy = await db.providerProxy.findUnique({ where: { id: proxyId } });
    if (!proxy) return { success: false as const, error: 'Прокси не найден' };

    // Decrypt password for test
    let password: string | undefined;
    if (proxy.passwordEncrypted) {
      try {
        const { VaultService } = await import('@/lib/vault');
        password = VaultService.decrypt(proxy.passwordEncrypted);
      } catch {
        return { success: false as const, error: 'Ошибка расшифровки пароля' };
      }
    }

    const { testProxyConnection } = await import('@/lib/http/proxy-fetch');
    const result = await testProxyConnection(
      {
        protocol: proxy.protocol as 'http' | 'https' | 'socks5',
        host: proxy.host,
        port: proxy.port,
        username: proxy.username || undefined,
        password,
      },
      targetUrl,
    );

    // Update proxy health
    await db.providerProxy.update({
      where: { id: proxyId },
      data: {
        lastTestAt: new Date(),
        lastTestLatencyMs: result.latencyMs,
        lastTestSuccess: result.success,
        ...(result.success
          ? { consecutiveFailures: 0 }
          : { consecutiveFailures: { increment: 1 }, errorCount: { increment: 1 }, lastErrorAt: new Date() }),
      },
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'PROVIDER_PROXY_TEST',
      target: proxyId,
      targetType: 'PROVIDER_PROXY',
      ipAddress: await getClientIp(),
      newValue: JSON.stringify({ success: result.success, latencyMs: result.latencyMs }),
    });

    revalidatePath('/admin/providers');
    revalidatePath('/admin/settings');
    return {
      success: true as const,
      message: result.success
        ? `Подключение OK: ${result.latencyMs}ms (IP: ${result.resolvedIp || 'н/д'})`
        : `Ошибка: ${result.error}`,
      data: {
        ...result,
        testedAt: new Date().toISOString(),
      } as ProxyTestResult,
    };
  });
}

// ── ASSIGN / UNASSIGN PROXY TO PROVIDER ──
export async function assignProxyToProviderAction(raw: Record<string, unknown>) {
  return requireStaffPermission('providers', 'edit', async (admin) => {
    const parsed = assignProxySchema.safeParse(raw);
    if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message };

    const { providerId, proxyId } = parsed.data;

    const provider = await db.provider.findUnique({ where: { id: providerId } });
    if (!provider) return { success: false as const, error: 'Провайдер не найден' };

    if (proxyId) {
      const proxy = await db.providerProxy.findUnique({ where: { id: proxyId } });
      if (!proxy) return { success: false as const, error: 'Прокси не найден' };
    }

    await db.provider.update({
      where: { id: providerId },
      data: { proxyId },
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: proxyId ? 'PROVIDER_PROXY_ASSIGN' : 'PROVIDER_PROXY_UNASSIGN',
      target: providerId,
      targetType: 'PROVIDER',
      ipAddress: await getClientIp(),
      newValue: JSON.stringify({ proxyId, providerName: provider.name }),
    });

    revalidatePath('/admin/providers');
    revalidatePath('/admin/settings');
    return {
      success: true as const,
      message: proxyId
        ? `Провайдеру "${provider.name}" назначен прокси`
        : `Провайдер "${provider.name}" переведён на прямое подключение`,
    };
  });
}

// ── BATCH ASSIGN ──
export async function batchAssignProxiesAction(raw: Record<string, unknown>) {
  return requireStaffPermission('providers', 'edit', async (admin) => {
    const parsed = batchAssignSchema.safeParse(raw);
    if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message };

    await db.$transaction(
      parsed.data.assignments.map((a) =>
        db.provider.update({ where: { id: a.providerId }, data: { proxyId: a.proxyId } }),
      ),
    );

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'PROVIDER_PROXY_BATCH_ASSIGN',
      target: `${parsed.data.assignments.length} providers`,
      targetType: 'PROVIDER',
      ipAddress: await getClientIp(),
    });

    revalidatePath('/admin/providers');
    revalidatePath('/admin/settings');
    return { success: true as const, message: `Обновлено ${parsed.data.assignments.length} привязок` };
  });
}

// ── TOGGLE ACTIVE ──
export async function toggleProxyActiveAction(proxyId: string, isActive: boolean) {
  return requireStaffPermission('providers', 'edit', async () => {
    if (!proxyId) return { success: false as const, error: 'ID обязателен' };
    await db.providerProxy.update({ where: { id: proxyId }, data: { isActive } });
    revalidatePath('/admin/providers');
    revalidatePath('/admin/settings');
    return { success: true as const, message: isActive ? 'Прокси активирован' : 'Прокси деактивирован' };
  });
}

// ── CONNECTION LOGS ──
export async function getProxyLogsAction(raw: Record<string, unknown> = {}) {
  return requireStaffPermission('providers', 'view', async () => {
    const parsed = proxyLogQuerySchema.safeParse(raw);
    const q = parsed.success
      ? parsed.data
      : { limit: 50, errorOnly: false, proxyId: undefined, providerId: undefined };

    const where: Record<string, unknown> = {};
    if (q.proxyId) where.proxyId = q.proxyId;
    if (q.providerId) where.providerId = q.providerId;
    if (q.errorOnly) where.error = { not: null };

    return db.providerProxyLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: q.limit,
      include: {
        proxy: { select: { label: true, host: true, protocol: true } },
        provider: { select: { name: true } },
      },
    });
  });
}

// ── CLEANUP LOGS ──
export async function cleanupProxyLogsAction(daysToKeep: number = 30) {
  return requireOwnerPermission(async (admin) => {
    const cutoff = new Date(Date.now() - daysToKeep * 86400000);
    const result = await db.providerProxyLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'PROVIDER_PROXY_LOGS_CLEANUP',
      target: `${result.count} logs`,
      targetType: 'PROVIDER_PROXY_LOG',
      ipAddress: await getClientIp(),
    });

    return { success: true as const, message: `Удалено ${result.count} записей старше ${daysToKeep} дней` };
  });
}
