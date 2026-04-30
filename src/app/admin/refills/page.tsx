import { db } from '@/lib/db';
import { Card, CardContent } from '@/components/admin/hero-ui';
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
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 bg-slate-50/50 min-h-full pb-10">
      <AdminPageHeader
        icon={RefreshCw}
        title="Докрутки (Refills)"
        description={`Всего: ${totalCount} • Ожидают: ${pendingCount} • Выполнены: ${completedCount}`}
      />

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-xl w-max border border-slate-200">
        <Link 
          href="/admin/orders" 
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
            "text-slate-500 hover:text-slate-700 hover:bg-white/50"
          )}
        >
          <Package className="w-4 h-4" />
          Заказы
        </Link>
        <Link 
          href="/admin/refills" 
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all",
            "bg-white text-indigo-600 shadow-sm border border-slate-200"
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
              className="px-4 py-2 text-sm border border-slate-200 rounded-md bg-white outline-none focus:ring-2 focus:ring-primary focus:border-primary">
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Refill ID</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Заказ</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Клиент</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Услуга</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Статус</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right hidden lg:table-cell">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {refills.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs font-bold text-slate-900">#{r.numericId}</td>
                    <td className="py-4 px-4">
                      <Link href={`/admin/orders?q=${r.order.numericId}`}
                        className="text-sky-600 hover:text-sky-800 text-xs font-mono font-bold">
                        #{r.order.numericId}
                      </Link>
                    </td>
                    <td className="py-4 px-4 text-xs font-mono text-slate-500 hidden sm:table-cell">{r.order.user.email}</td>
                    <td className="py-4 px-4 text-xs font-semibold text-slate-800 max-w-[200px] truncate">{r.order.service.name}</td>
                    <td className="py-4 px-4 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase font-bold rounded-md border ${
                        r.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        r.status === 'ERROR' || r.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        'bg-sky-50 text-sky-700 border-sky-100'
                      }`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[11px] text-slate-500 text-right font-medium hidden lg:table-cell">
                      {r.createdAt.toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
                {refills.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">Нет заявок на докрутку</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
