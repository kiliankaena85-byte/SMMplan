import { ReactNode } from 'react';
import { enforceSectionAccess } from '@/lib/server/rbac';

export default async function IntelLayout({ children }: { children: ReactNode }) {
  await enforceSectionAccess('analytics');
  return children;
}
