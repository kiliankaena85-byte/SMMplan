import { LovableDashboardShell } from '@/components/dashboard/lovable/LovableDashboardShell';
import { LovableDashboardHome } from '@/components/dashboard/lovable/LovableDashboardHome';
import { LovableNewOrderWorkspace } from '@/components/dashboard/LovableNewOrderWorkspace';
import { LovableOrdersView } from '@/components/dashboard/lovable/LovableOrdersView';
import { ITenantDashboardStrategy } from '../types';

export const LovableTenantStrategy: ITenantDashboardStrategy = {
  ShellLayout: LovableDashboardShell as unknown as ITenantDashboardStrategy['ShellLayout'],
  HomeView: LovableDashboardHome as unknown as ITenantDashboardStrategy['HomeView'],
  NewOrderView: LovableNewOrderWorkspace as unknown as ITenantDashboardStrategy['NewOrderView'],
  OrdersView: LovableOrdersView as unknown as ITenantDashboardStrategy['OrdersView'],
};

export default LovableTenantStrategy;
