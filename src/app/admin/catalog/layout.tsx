import { ReactNode } from 'react';
import { enforcePageRole } from '@/lib/server/rbac';

export default async function CatalogLayout({ children }: { children: ReactNode }) {
  await enforcePageRole(['OWNER', 'ADMIN', 'MANAGER']);
  return children;
}
