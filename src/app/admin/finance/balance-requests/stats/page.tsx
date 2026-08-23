import { BalanceAdjustmentStatsClient } from './balance-requests-stats-client';

export const metadata = {
  title: 'Статистика корректировок баланса | SMMpanel 1.0',
};

export default function BalanceAdjustmentStatsPage() {
  return <BalanceAdjustmentStatsClient />;
}
