import { ReactNode } from 'react';
import { enforcePageRole } from '@/lib/server/rbac';

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  await enforcePageRole(['OWNER', 'ADMIN', 'MANAGER']);
  return children;
}
