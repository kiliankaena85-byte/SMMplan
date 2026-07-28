import { LovableDashboardShell } from '@/components/dashboard/lovable/LovableDashboardShell';
import { FluxDashboardHome } from '@/components/dashboard/lovable/FluxDashboardHome';
import { LovableNewOrderWorkspace } from '@/components/dashboard/LovableNewOrderWorkspace';
import { LovableOrdersView } from '@/components/dashboard/lovable/LovableOrdersView';
import { ITenantDashboardStrategy } from '../types';

export const FluxTenantStrategy: ITenantDashboardStrategy = {
  ShellLayout: LovableDashboardShell as unknown as ITenantDashboardStrategy['ShellLayout'],
  HomeView: FluxDashboardHome as unknown as ITenantDashboardStrategy['HomeView'],
  NewOrderView: LovableNewOrderWorkspace as unknown as ITenantDashboardStrategy['NewOrderView'],
  OrdersView: LovableOrdersView as unknown as ITenantDashboardStrategy['OrdersView'],
};

export default FluxTenantStrategy;
