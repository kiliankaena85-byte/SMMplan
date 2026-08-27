import React from 'react';
import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/server/rbac';
import { RecommendationsClient } from './recommendations-client';
import { Sparkles } from 'lucide-react';

export const metadata = {
  title: 'AI Ценовая Оптимизация — SMMpanel 1.0',
  description: 'Автоматический аудит маржинальности и рекомендации по ценам',
};

export default async function AdminAiRecommendationsPage(props: {
  searchParams: Promise<{ snapshotId?: string }>;
}) {
  const authResult = await requireStaffPermission('CATALOG', 'view', async (admin) => {
    const searchParams = await props.searchParams;
    const currentTenant = admin.tenantId || 'smmplan';

    // 1. Fetch available snapshots
    const allSnapshots = await db.economicOptimizationSnapshot.findMany({
      where: { tenantId: currentTenant },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        totalLeakageRub: true,
        leakingServicesCount: true,
        status: true,
      },
    });

    const targetSnapshotId = searchParams.snapshotId || allSnapshots[0]?.id;

    let targetSnapshotData = null;
    if (targetSnapshotId) {
      const snap = await db.economicOptimizationSnapshot.findUnique({
        where: { id: targetSnapshotId },
        include: {
          recommendations: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  category: { select: { name: true } },
                },
              },
            },
            orderBy: { projectedMonthlyGainRub: 'desc' },
          },
        },
      });

      if (snap) {
        targetSnapshotData = {
          id: snap.id,
          tenantId: snap.tenantId,
          totalLeakageRub: snap.totalLeakageRub,
          leakingServicesCount: snap.leakingServicesCount,
          executiveSummary: snap.executiveSummary,
          status: snap.status,
          createdAt: snap.createdAt.toISOString(),
          recommendations: snap.recommendations.map((r) => ({
            id: r.id,
            serviceId: r.serviceId,
            serviceName: r.service.name,
            categoryName: r.service.category?.name,
            currentPriceRub: r.currentPriceRub,
            proposedPriceRub: r.proposedPriceRub,
            currentMarkup: r.currentMarkup,
            proposedMarkup: r.proposedMarkup,
            projectedMonthlyGainRub: r.projectedMonthlyGainRub,
            confidenceScore: r.confidenceScore,
            status: r.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_APPLIED',
            rejectionReason: r.rejectionReason,
          })),
        };
      }
    }

    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              SMMpanel 1.0 Data Intelligence
            </div>
            <h1 className="text-2xl font-bold text-foreground mt-1">
              AI Ценовая Оптимизация & Устранение Демпинга
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ежедневный аудит эластичности каталога и автоматические расчеты маржинальности
            </p>
          </div>
        </div>

        <RecommendationsClient
          initialSnapshot={targetSnapshotData}
          allSnapshots={allSnapshots.map((s) => ({
            id: s.id,
            createdAt: s.createdAt.toISOString(),
            totalLeakageRub: s.totalLeakageRub,
            leakingServicesCount: s.leakingServicesCount,
            status: s.status,
          }))}
        />
      </div>
    );
  });

  if (authResult && typeof authResult === 'object' && 'success' in authResult && !authResult.success) {
    return (
      <div className="p-8 text-center text-rose-500 font-medium">
        {authResult.error || 'Доступ запрещен'}
      </div>
    );
  }

  return authResult as React.ReactNode;
}
