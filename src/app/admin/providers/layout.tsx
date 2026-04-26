import { ReactNode } from 'react';
import { enforcePageRole } from '@/lib/server/rbac';

export default async function ProvidersLayout({ children }: { children: ReactNode }) {
  await enforcePageRole(['OWNER', 'ADMIN']);
  return children;
}
