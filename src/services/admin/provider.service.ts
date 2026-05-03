import { db } from '@/lib/db';

// ── DTOs ──────────────────────────────────────────────────────────────────────

/** Safe public DTO — never includes encrypted apiKey */
export type ProviderListDTO = {
  id: string;
  name: string;
  apiUrl: string;
  isActive: boolean;
  balanceCurrency: string;
  serviceCount: number;
  avgResponseMs: number;
  errorCount5m: number;
  lastSuccessAt: string | null;
  createdAt: string;
};

/** Detail DTO for edit form — includes metadata but NEVER the raw apiKey */
export type ProviderDetailDTO = {
  id: string;
  name: string;
  apiUrl: string;
  isActive: boolean;
  balanceCurrency: string;
  httpMethod: string;
  requestType: string;
  headersJson: string;   // stringified JSON for textarea display
  hasApiKey: boolean;    // true = key is set; the key itself is never exposed
};

// ── Service ───────────────────────────────────────────────────────────────────

export class AdminProviderService {
  /**
   * List all providers — safe DTO, no apiKey.
   */
  async listProviders(): Promise<ProviderListDTO[]> {
    const rows = await db.provider.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        apiUrl: true,
        isActive: true,
        balanceCurrency: true,
        avgResponseMs: true,
        errorCount5m: true,
        lastSuccessAt: true,
        createdAt: true,
        _count: { select: { services: true } },
      },
    });

    return rows.map(p => ({
      id: p.id,
      name: p.name,
      apiUrl: p.apiUrl,
      isActive: p.isActive,
      balanceCurrency: p.balanceCurrency,
      serviceCount: p._count.services,
      avgResponseMs: p.avgResponseMs,
      errorCount5m: p.errorCount5m,
      lastSuccessAt: p.lastSuccessAt ? p.lastSuccessAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  /**
   * Get provider detail for the edit form.
   * NEVER exposes the raw encrypted apiKey to the client.
   */
  async getProviderDetail(providerId: string): Promise<ProviderDetailDTO | null> {
    const p = await db.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        name: true,
        apiUrl: true,
        isActive: true,
        balanceCurrency: true,
        apiKey: true,        // needed only to check if set
        metadata: true,
      },
    });

    if (!p) return null;

    // metadata is JsonValue — cast safely
    const meta = (p.metadata as Record<string, unknown> | null) ?? {};

    return {
      id: p.id,
      name: p.name,
      apiUrl: p.apiUrl,
      isActive: p.isActive,
      balanceCurrency: p.balanceCurrency,
      httpMethod: (meta.httpMethod as string) || 'POST',
      requestType: (meta.requestType as string) || 'form',
      headersJson: meta.headers
        ? JSON.stringify(meta.headers, null, 2)
        : '{\n  "User-Agent": "Smmplan/1.0"\n}',
      hasApiKey: Boolean(p.apiKey && p.apiKey.length > 0),
    };
  }

  /**
   * Get category list for import wizard.
   */
  async listCategories() {
    const rows = await db.category.findMany({
      orderBy: [{ network: { slug: 'asc' } }, { sort: 'asc' }],
      include: { network: true },
    });
    return rows;
  }
}

export const adminProviderService = new AdminProviderService();
