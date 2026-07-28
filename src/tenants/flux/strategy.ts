import { FluxDashboardShell } from '@/components/dashboard/flux/FluxDashboardShell';
import { FluxDashboardHome } from '@/components/dashboard/flux/FluxDashboardHome';
import { FluxNewOrderWorkspace } from '@/components/dashboard/FluxNewOrderWorkspace';
import { FluxOrdersView } from '@/components/dashboard/flux/FluxOrdersView';
import { ITenantDashboardStrategy } from '../types';

export const FluxTenantStrategy: ITenantDashboardStrategy = {
  ShellLayout: FluxDashboardShell as unknown as ITenantDashboardStrategy['ShellLayout'],
  HomeView: FluxDashboardHome as unknown as ITenantDashboardStrategy['HomeView'],
  NewOrderView: FluxNewOrderWorkspace as unknown as ITenantDashboardStrategy['NewOrderView'],
  OrdersView: FluxOrdersView as unknown as ITenantDashboardStrategy['OrdersView'],
};

export default FluxTenantStrategy;
