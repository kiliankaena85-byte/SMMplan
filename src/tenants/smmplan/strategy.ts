import { ClassicDashboardShell } from '@/components/dashboard/classic/ClassicDashboardShell';
import { ClassicDashboardHome } from '@/components/dashboard/classic/ClassicDashboardHome';
import ClientPage from '@/app/dashboard/new-order/client-page';
import { ITenantDashboardStrategy } from '../types';

export const SmmplanTenantStrategy: ITenantDashboardStrategy = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ShellLayout: ClassicDashboardShell as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HomeView: ClassicDashboardHome as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  NewOrderView: ClientPage as any,
};

export default SmmplanTenantStrategy;
