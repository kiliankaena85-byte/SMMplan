import { accountingService } from '@/services/financial/accounting.service';
import { adminOrderService } from '@/services/admin/order.service';
import { adminUserService } from '@/services/admin/user.service';
import { adminTicketService } from '@/services/admin/ticket.service';
import { adminCatalogService } from '@/services/admin/catalog.service';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { OrdersChart } from './orders-chart';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Check, Clock, ChevronDown, Bell, Search, Settings, Home, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/admin/hero-ui';
import { AdminPageHeader } from '@/components/admin/page-header';
import { RecentAuditTable } from './recent-audit-table';
import { ProviderLiquidityWidget } from './ProviderLiquidityWidget';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await verifySession();
  const user = session ? await db.user.findUnique({ where: { id: session.userId } }) : null;

  const [metrics, orderStats, userStats, ticketStats, catalogStats, recentAudit, timeseries] = await Promise.all([
    accountingService.getMetrics(),
    adminOrderService.getOrderStats(),
    adminUserService.getUserStats(),
    adminTicketService.getTicketStats(),
    adminCatalogService.getCatalogStats(),
    db.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    adminOrderService.getOrdersTimeseries(30),
  ]);

  const revenueGross = metrics.revenueGross;
  const profitNet = metrics.profitNet;
  let marginPercentage = metrics.marginPercentage;
  const totalLiability = userStats.totalLiability;
  
  const oStats = { ...orderStats };
  const uStats = { ...userStats };
  const cStats = { ...catalogStats };
  const tStats = { ...ticketStats };

  // Из-за удаления моковых данных, нам нужно явно защитить 'marginPercentage' от NaN
  if (isNaN(marginPercentage) || !isFinite(marginPercentage)) {
    marginPercentage = 0;
  }

  const netPosition = Number(revenueGross) - Number(totalLiability);
  const netPositionStr = (netPosition / 100).toLocaleString('ru-RU');

  // Real database calculations for YooKassa 3% gross payment commissions
  const yookassaGross = await db.payment.aggregate({
    _sum: { amount: true },
    where: {
      gateway: 'yookassa',
      status: 'SUCCEEDED'
    }
  }).then(res => Number(res._sum.amount || 0));
  const checkoutCommission = Math.round(yookassaGross * 0.03);

  // Cumulative sebiстоимость (providerCost) of successful orders
  const cumulativeProviderCost = await db.order.aggregate({
    _sum: { providerCost: true },
    where: {
      status: { in: ['COMPLETED', 'PARTIAL', 'IN_PROGRESS', 'PROVISIONING', 'CANCELING'] }
    }
  }).then(res => Number(res._sum.providerCost || 0));

  const profitMargin = metrics.revenueNet > 0 ? (metrics.profitNet / metrics.revenueNet) * 100 : 0;
  
  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500 ease-out sm:px-2 md:px-0 bg-background min-h-full pb-10">
      
      <AdminPageHeader
        icon={Home}
        title={`Доброе утро, ${user?.email?.split('@')[0] || 'Администратор'}`}
        description="Отслеживайте финансовые потоки, заказы и нагрузку платформы."
      />

      <SystemHealthBanner />

      {/* ── High-density Premium Financial Analytics 5-Card Block ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-6">
        
        {/* Card 1: Выручка */}
        <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-success/40 hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-success to-success opacity-80" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-muted-foreground text-[10px] font-black uppercase tracking-wider">Поступило (Выручка)</span>
            <span className="text-success text-xs font-bold bg-success/10 px-2 py-0.5 rounded-full shadow-sm">Gross</span>
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums tracking-tight">
            {((metrics.revenueGross) / 100).toLocaleString('ru-RU')} ₽
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 font-medium">Все успешные платежи в системе</p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-success/5 rounded-full blur-2xl group-hover:bg-success/10 transition-colors pointer-events-none" />
        </div>

        {/* Card 2: Комиссии */}
        <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-warning/40 hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-warning to-warning opacity-80" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-muted-foreground text-[10px] font-black uppercase tracking-wider">Комиссии кассы</span>
            <span className="text-warning text-xs font-bold bg-warning/10 px-2 py-0.5 rounded-full shadow-sm">3% YooKassa</span>
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums tracking-tight">
            {(checkoutCommission / 100).toLocaleString('ru-RU')} ₽
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 font-medium">Комиссионные расходы эквайринга</p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-warning/5 rounded-full blur-2xl group-hover:bg-warning/10 transition-colors pointer-events-none" />
        </div>

        {/* Card 3: Закупки */}
        <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-danger/40 hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-danger to-danger opacity-80" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-muted-foreground text-[10px] font-black uppercase tracking-wider">Закупки (Расход)</span>
            <span className="text-danger text-xs font-bold bg-danger/10 px-2 py-0.5 rounded-full shadow-sm">COGS</span>
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums tracking-tight">
            {(cumulativeProviderCost / 100).toLocaleString('ru-RU')} ₽
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 font-medium">Себестоимость у провайдеров API</p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-danger/5 rounded-full blur-2xl group-hover:bg-danger/10 transition-colors pointer-events-none" />
        </div>

        {/* Card 4: Расчетный налог */}
        <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/40 hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-primary opacity-80" />
          <div className="flex justify-between items-start mb-3">
            <span className="text-muted-foreground text-[10px] font-black uppercase tracking-wider">Расчетный налог</span>
            <span className="text-primary text-xs font-bold bg-primary/10 px-2 py-0.5 rounded-full shadow-sm">
              {metrics.usnScheme === 'INCOME' ? 'УСН Доходы' : 'УСН Доходы-Расход'}
            </span>
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums tracking-tight">
            {(metrics.taxes / 100).toLocaleString('ru-RU')} ₽
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground">
              УСН платится ежеквартально до 28 числа.
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
        </div>

        {/* Card 5: Чистая прибыль */}
        <div className={`bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 relative overflow-hidden group ${
          metrics.profitNet <= 0 
            ? 'hover:border-danger/40' 
            : profitMargin < 15 
              ? 'hover:border-warning/40' 
              : 'hover:border-success/40'
        }`}>
          <div className={`absolute top-0 left-0 w-1 h-full opacity-80 ${
            metrics.profitNet <= 0 
              ? 'bg-gradient-to-b from-danger to-danger' 
              : profitMargin < 15 
                ? 'bg-gradient-to-b from-warning to-warning' 
                : 'bg-gradient-to-b from-success to-success'
          }`} />
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider opacity-80">Чистая прибыль</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full shadow-sm ${
              metrics.profitNet <= 0 
                ? 'bg-danger/10 text-danger' 
                : profitMargin < 15 
                  ? 'bg-warning/10 text-warning' 
                  : 'bg-success/10 text-success'
            }`}>
              {profitMargin.toFixed(1)}% маржа
            </span>
          </div>
          <div className="text-2xl font-black tabular-nums tracking-tight">
            {(metrics.profitNet / 100).toLocaleString('ru-RU')} ₽
          </div>
          <p className="text-[11px] opacity-80 mt-2 font-medium">
            {metrics.profitNet <= 0 
              ? 'Критический убыток! Расходы превышают доходы' 
              : profitMargin < 15 
                ? 'Низкая маржинальность (высокие расходы)' 
                : 'Стабильная и высокая доходность'}
          </p>
          <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-2xl transition-colors pointer-events-none ${
              metrics.profitNet <= 0 
                ? 'bg-danger/5 group-hover:bg-danger/10' 
                : profitMargin < 15 
                  ? 'bg-warning/5 group-hover:bg-warning/10' 
                  : 'bg-success/5 group-hover:bg-success/10'
            }`} />
        </div>

      </div>

      {revenueGross === 0 && oStats.total === 0 && (
         <div className="bg-sky-50 border border-sky-200 text-sky-800 rounded-2xl p-5 mb-6 flex items-start gap-4">
            <div className="p-2 bg-sky-100 rounded-full text-sky-600">
               <span className="text-xl">🚀</span>
            </div>
            <div>
               <h3 className="font-bold text-base mb-1">Система успешно запущена и готова к работе!</h3>
               <p className="text-sm opacity-90 mb-3">База данных функционирует корректно, но заказов пока нет. Финансовые графики отображают нулевые значения.</p>
               <div className="flex gap-3 mt-1">
                  <Link href="/admin/catalog" className="text-xs font-bold text-sky-700 bg-sky-200/50 hover:bg-sky-200 px-3 py-1.5 rounded-lg transition-colors">
                     Наполнить каталог
                  </Link>
                  <code className="text-xs font-mono text-sky-600 bg-sky-200/30 px-3 py-1.5 rounded-lg">npx prisma db seed</code>
               </div>
            </div>
         </div>
      )}

      {/* Grid Layout - Asymmetric 12-col B2B Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* === ЛЕВАЯ КОЛОНКА (Макро-Показатели) === */}
        <div className="lg:col-span-8 space-y-6">
           
           {/* Total Balance Card */}
           <div className="bg-card/60 backdrop-blur-md text-card-foreground rounded-2xl p-6 lg:p-7 shadow-sm border border-border/50 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:border-primary/30 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors pointer-events-none -translate-y-1/2 translate-x-1/3" />
             <div className="relative z-10">
               <div className="flex items-center justify-between mb-4">
                 <span className="text-muted-foreground text-sm font-semibold tracking-wide">Чистые активы</span>
                 <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50 text-xs font-bold text-foreground shadow-sm">
                   <span className="w-3 h-3 rounded-full overflow-hidden bg-slate-800 border border-slate-700"></span> RUB <ChevronDown className="w-3 h-3 text-muted-foreground" />
                 </div>
               </div>
            <div className="text-4xl font-extrabold text-foreground tabular-nums tracking-tight">
              {netPositionStr} ₽
            </div>
            <div className="mt-2 text-xs font-medium text-success bg-success/10 w-max px-2.5 py-1 rounded-md mb-8 shadow-sm">
              Капитал за вычетом балансов юзеров
            </div>
            
            <div className="flex gap-3 mb-8 w-full">
               <Link href="/admin/finance" className="flex-1">
                 <Button className="w-full bg-primary/90 backdrop-blur-sm text-primary-foreground font-semibold rounded-xl text-sm h-11 shadow-sm hover:bg-primary transition-all hover:scale-[1.02]">
                    Финансы
                 </Button>
               </Link>
               <Link href="/admin/settings" className="flex-1">
                 <Button className="w-full bg-background/80 backdrop-blur-sm border border-border text-foreground font-semibold rounded-xl text-sm h-11 hover:bg-muted/80 shadow-sm transition-all hover:scale-[1.02]">
                    Настройки
                 </Button>
               </Link>
            </div>
          </div>
          
          <div className="relative z-10 pt-4 border-t border-border/50">
            <div className="text-xs font-semibold text-muted-foreground mb-3">ФИНАНСОВЫЙ БАЛАНС</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-background/50 backdrop-blur-sm p-3 rounded-xl border border-border/50 transition-all hover:border-success/30 hover:bg-success/5">
                <div className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center justify-between">Все пополнения <span className="w-1.5 h-1.5 rounded-full bg-success"></span></div>
                <div className="font-bold text-foreground text-sm tabular-nums tracking-tight">{(Number(revenueGross) / 100).toLocaleString('ru-RU')} ₽</div>
              </div>
              <div className="bg-background/50 backdrop-blur-sm p-3 rounded-xl border border-border/50 transition-all hover:border-amber-500/30 hover:bg-warning/5">
                <div className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center justify-between">Обязательства <span className="w-1.5 h-1.5 rounded-full bg-warning"></span></div>
                <div className="font-bold text-foreground text-sm tabular-nums tracking-tight">{(Number(totalLiability) / 100).toLocaleString('ru-RU')} ₽</div>
              </div>
              <div className="bg-background/50 backdrop-blur-sm p-3 rounded-xl border border-border/50 transition-all hover:border-primary/30 hover:bg-primary/5">
                 <div className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center justify-between">Чистая прибыль <span className="w-1.5 h-1.5 rounded-full bg-primary/50"></span></div>
                 <div className="font-bold text-foreground text-sm tabular-nums tracking-tight">{(profitNet / 100).toLocaleString('ru-RU')} ₽</div>
               </div>
             </div>
           </div>
         </div>

         {/* Orders Dynamics Chart */}
         <div className="bg-card/60 backdrop-blur-md text-card-foreground rounded-2xl p-6 lg:p-7 shadow-sm border border-border/50 transition-all duration-300 hover:shadow-lg">
           <div className="flex justify-between items-start mb-1">
             <h3 className="font-bold text-foreground">Динамика заказов (30 дней)</h3>
           </div>
           <p className="text-xs text-muted-foreground font-medium mb-2">Срез по Выполненным, Отмененным и Неоплаченным заказам</p>
           <div className="mt-4">
             <OrdersChart data={timeseries} />
           </div>
         </div>

         {/* Recent Activities Table */}
         <div className="bg-card/60 backdrop-blur-md text-card-foreground rounded-2xl p-6 shadow-sm border border-border/50 transition-all duration-300 hover:shadow-lg">
           <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-foreground">Журнал безопасности (Audit Log)</h3>
             <Link href="/admin/settings?tab=audit" className="flex items-center gap-2 bg-background/80 hover:bg-muted px-3 py-1.5 rounded-full border border-border/50 text-xs font-bold text-muted-foreground shadow-sm transition-all hover:scale-[1.02]">
               Полный журнал
             </Link>
           </div>

           <RecentAuditTable logs={recentAudit} />
         </div>

        </div> {/* END ЛЕВАЯ КОЛОНКА */}

        {/* === ПРАВАЯ КОЛОНКА (Оперативный Action Sidebar) === */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           
           {/* KPI 2x2 Grid */}
           <div className="grid grid-cols-2 gap-4">
             <Link href="/admin/orders?status=IN_PROGRESS" className="bg-card/60 backdrop-blur-md text-card-foreground rounded-2xl p-5 shadow-sm border border-border/50 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 group">
               <div className="flex justify-between items-start mb-6">
                 <span className="text-muted-foreground text-sm font-medium">В работе</span>
                 <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                   <Clock className="w-4 h-4 text-primary" />
                 </div>
               </div>
               <div className="mt-auto">
                 <div className="text-3xl font-black tracking-tight mb-1 text-foreground">{oStats.inProgress.toLocaleString('ru-RU')}</div>
                 <div className="text-[11px] font-medium text-muted-foreground">В очереди: {oStats.pending}</div>
               </div>
             </Link>
             
             <Link href="/admin/orders?status=ERROR" className="bg-destructive text-primary-foreground rounded-2xl p-5 shadow-[0_8px_24px_rgb(244,63,94,0.25)] flex flex-col hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
               <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors pointer-events-none" />
               <div className="flex justify-between items-start mb-6 relative z-10">
                 <span className="text-danger-foreground text-sm font-medium">Ошибки</span>
                 <div className="w-8 h-8 rounded-full bg-background/20 flex items-center justify-center group-hover:bg-background/30 group-hover:scale-110 transition-all">
                   <Settings className="w-4 h-4 text-primary-foreground" />
                 </div>
               </div>
               <div className="mt-auto relative z-10">
                 <div className="text-3xl font-black tracking-tight mb-1">{oStats.error}</div>
                 <div className="text-[11px] font-medium text-danger-foreground">Требуют внимания</div>
               </div>
             </Link>

             <Link href="/admin/clients" className="bg-card/60 backdrop-blur-md text-card-foreground rounded-2xl p-5 shadow-sm border border-border/50 flex flex-col hover:shadow-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 group">
               <div className="flex justify-between items-start mb-6">
                 <span className="text-muted-foreground text-sm font-medium">Клиенты</span>
                 <div className="w-8 h-8 rounded-full bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all flex items-center justify-center">
                   <span className="text-primary font-bold">👤</span>
                 </div>
               </div>
               <div className="mt-auto">
                 <div className="text-3xl font-black tracking-tight text-foreground mb-1">{uStats.total.toLocaleString('ru-RU')}</div>
                 <div className="text-[11px] font-medium text-muted-foreground">Активных: {uStats.active}</div>
               </div>
             </Link>

             <Link href="/admin/catalog" className="bg-card/60 backdrop-blur-md text-card-foreground rounded-2xl p-5 shadow-sm border border-border/50 flex flex-col hover:shadow-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 group">
               <div className="flex justify-between items-start mb-6">
                 <span className="text-muted-foreground text-sm font-medium">Каталог</span>
                 <div className="w-8 h-8 rounded-full bg-success/10 group-hover:bg-success/20 group-hover:scale-110 transition-all flex items-center justify-center">
                   <span className="text-success font-bold">📦</span>
                 </div>
               </div>
               <div className="mt-auto">
                 <div className="text-3xl font-black tracking-tight text-foreground mb-1">{cStats.activeServices}</div>
                 <div className="text-[11px] font-medium text-muted-foreground">Доступно: {cStats.totalServices}</div>
               </div>
             </Link>
           </div>
           
           <ProviderLiquidityWidget />

           <div className="bg-card/60 backdrop-blur-md text-card-foreground rounded-2xl p-6 shadow-sm border border-border/50 transition-all duration-300 hover:shadow-lg">
             <h3 className="font-bold text-foreground mb-1">Маржинальность</h3>
             <p className="text-[11px] text-muted-foreground mb-6 font-medium">Отношение прибыли к выручке</p>
             
             <div className="flex justify-between text-sm font-bold text-foreground mb-3">
               <span className="tracking-tight">{marginPercentage.toFixed(1)}%</span>
               <span className="text-muted-foreground font-medium">Цель: 35%</span>
             </div>
             
             <div className="w-full bg-background border border-border/50 rounded-full h-2.5 mb-2 overflow-hidden shadow-inner">
               <div 
                 className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${
                   marginPercentage < 15 ? 'bg-amber-500' : 'bg-primary'
                 }`}
                 style={{ width: `${Math.min(100, Math.max(0, marginPercentage || 0))}%` }}
               ></div>
             </div>
           </div>

           <Link href="/admin/tickets" className="bg-card/60 backdrop-blur-md text-card-foreground transition-all duration-300 hover:-translate-y-1 rounded-2xl p-6 shadow-sm border border-border/50 flex flex-col hover:shadow-lg group">
             <div className="flex justify-between items-center mb-5">
               <h3 className="font-bold text-foreground flex items-center gap-2">
                 <Bell className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors"/> 
                 Поддержка
               </h3>
               {tStats.open > 0 && <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-1 rounded-md shadow-sm">{tStats.open} в очереди</span>}
             </div>
             <div className="flex flex-col bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50 group-hover:border-primary/20 transition-colors">
                <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Всего обращений</div>
                <div className="font-mono text-2xl font-black tracking-tight text-foreground">{tStats.total}</div>
             </div>
           </Link>

        </div> {/* END ПРАВАЯ КОЛОНКА */}

      </div>
    </div>
  );
}

async function SystemHealthBanner() {
  const healthData = await db.service.groupBy({
    by: ['isQuarantined', 'cooldownReason'],
    _count: true,
    where: {
      OR: [
        { isQuarantined: true },
        { cooldownReason: 'ZOMBIE_AUTO_DISABLED' },
        { cooldownUntil: { gt: new Date() }, cooldownReason: { not: 'ZOMBIE_AUTO_DISABLED' } },
      ]
    }
  });

  if (healthData.length === 0) return null;

  let quarantineCount = 0;
  let zombieCount = 0;
  let apiBlockCount = 0;

  for (const row of healthData) {
    if (row.isQuarantined) {
      quarantineCount += row._count;
    } else if (row.cooldownReason === 'ZOMBIE_AUTO_DISABLED') {
      zombieCount += row._count;
    } else if (row.cooldownReason) {
      apiBlockCount += row._count;
    }
  }

  if (quarantineCount === 0 && zombieCount === 0 && apiBlockCount === 0) return null;

  return (
    <div className="bg-gradient-to-r from-danger/10 via-danger/5 to-transparent border border-danger/20 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-danger/10 rounded-xl text-danger shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-danger-foreground text-base mb-1">Обнаружены аномалии в каталоге</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-danger/80">
            {quarantineCount > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning" /> {quarantineCount} ценовых скачков</span>}
            {zombieCount > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger" /> {zombieCount} зомби-услуг</span>}
            {apiBlockCount > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning" /> {apiBlockCount} блокировок API</span>}
          </div>
        </div>
      </div>
      <Link href="/admin/catalog/quarantine" className="shrink-0 bg-danger text-danger-foreground hover:bg-danger/90 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors">
        Перейти в Центр аномалий
      </Link>
    </div>
  );
}



