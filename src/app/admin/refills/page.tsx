import { db } from '@/lib/db';
import { Card, CardContent, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/admin/hero-ui';
import Link from 'next/link';
import { Package, RefreshCw } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/page-header';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  REJECTED: 'Отклонён',
  ERROR: 'Ошибка',
};

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminRefillsPage({ searchParams }: Props) {
  const params = await searchParams;
  const statusFilter = params.status || 'ALL';

  const where: Record<string, unknown> = {};
  if (statusFilter !== 'ALL') {
    where.status = statusFilter;
  }

  const [refills, stats] = await Promise.all([
    db.refill.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        order: {
          select: {
            numericId: true,
            link: true,
            quantity: true,
            user: { select: { email: true } },
            service: { select: { name: true } },
          },
        },
      },
    }),
    db.refill.aggregate({
      _count: {
        id: true,
      },
      where: { status: 'PENDING' }, // example for pending
    })
  ]);

  const totalCount = await db.refill.count();
  const pendingCount = await db.refill.count({ where: { status: 'PENDING' } });
  const completedCount = await db.refill.count({ where: { status: 'COMPLETED' } });

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 bg-muted/50/50 min-h-full pb-10">
      <AdminPageHeader
        icon={RefreshCw}
        title="Докрутки (Refills)"
        description={`Всего: ${totalCount} • Ожидают: ${pendingCount} • Выполнены: ${completedCount}`}
      />

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-max border border-border">
        <Link 
          href="/admin/orders" 
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
            "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          <Package className="w-4 h-4" />
          Заказы
        </Link>
        <Link 
          href="/admin/refills" 
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all",
            "bg-background text-primary shadow-sm border border-border"
          )}
        >
          <RefreshCw className="w-4 h-4" />
          Докрутки
        </Link>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex gap-4">
            <select name="status" defaultValue={statusFilter}
              className="px-4 py-2 text-sm border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary focus:border-primary">
              <option value="ALL">Все статусы</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button type="submit" className="px-6 py-2 text-sm font-semibold text-white bg-slate-900 shadow-sm rounded-md hover:bg-slate-800 transition-colors">
              Фильтр
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Refills Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="w-full">
            <Table aria-label="Заявки на докрутку (Refills)">
              <TableHeader>
                <TableColumn>REFILL ID</TableColumn>
                <TableColumn>ЗАКАЗ</TableColumn>
                <TableColumn>КЛИЕНТ</TableColumn>
                <TableColumn>УСЛУГА</TableColumn>
                <TableColumn className="text-right">СТАТУС</TableColumn>
                <TableColumn className="text-right">ДАТА</TableColumn>
              </TableHeader>
              <TableBody renderEmptyState={() => "Нет заявок на докрутку"}>
                {refills.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <span className="font-mono text-xs font-bold text-foreground">#{r.numericId}</span>
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/orders?q=${r.order.numericId}`} className="text-primary hover:underline text-xs font-mono font-bold">
                        #{r.order.numericId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground">{r.order.user.email}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold text-foreground max-w-[200px] truncate block">{r.order.service.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase font-bold rounded-md border ${
                        r.status === 'COMPLETED' ? 'bg-success/10 text-emerald-700 border-emerald-100' :
                        r.status === 'ERROR' || r.status === 'REJECTED' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {r.createdAt.toLocaleDateString('ru-RU')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

