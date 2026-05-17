import { requireStaffPermission } from "@/lib/server/rbac";
import { db } from "@/lib/db";
import { EnrichmentClientTable } from "./client-table";
import Link from "next/link";

export default async function CatalogEnrichmentPage() {
  await requireStaffPermission('CATALOG', 'view', async () => {});

  // Fetch all services that have a provider (i.e. they are synced/imported)
  const services = await db.service.findMany({
    where: {
      providerId: { not: null },
      isActive: true,
    },
    include: {
      provider: {
        select: {
          name: true,
          apiUrl: true,
        },
      },
    },
    orderBy: {
      numericId: "asc",
    },
  });

  return (
    <div className="flex flex-col gap-6 p-6 w-full animate-in fade-in duration-500 bg-muted/50/50 min-h-full">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/admin" className="hover:text-foreground transition-colors">Админ-панель</Link>
          <span>/</span>
          <Link href="/admin/catalog" className="hover:text-foreground transition-colors">Каталог</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Обогащение</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Обогащение Каталога
            </h1>
            <p className="text-muted-foreground mt-1">
              Массовое добавление описаний к услугам провайдеров.
            </p>
          </div>
        </div>
      </div>

      <EnrichmentClientTable initialData={services} />
    </div>
  );
}
