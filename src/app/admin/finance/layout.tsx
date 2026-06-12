import { ReactNode } from 'react';
import { enforceSectionAccess } from '@/lib/server/rbac';

export default async function FinanceLayout({ children }: { children: ReactNode }) {
  await enforceSectionAccess('finance');
  return children;
}
