import { LovableDashboardShell } from '@/components/dashboard/lovable/LovableDashboardShell';
import { LovableDashboardHome } from '@/components/dashboard/lovable/LovableDashboardHome';
import { LovableNewOrderWorkspace } from '@/components/dashboard/LovableNewOrderWorkspace';
import { LovableOrdersView } from '@/components/dashboard/lovable/LovableOrdersView';
import { ITenantDashboardStrategy } from '../types';

export const LovableTenantStrategy: ITenantDashboardStrategy = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ShellLayout: LovableDashboardShell as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HomeView: LovableDashboardHome as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  NewOrderView: LovableNewOrderWorkspace as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  OrdersView: LovableOrdersView as any,
};

export default LovableTenantStrategy;
