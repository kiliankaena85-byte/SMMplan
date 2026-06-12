import { ReactNode } from 'react';
import { enforceSectionAccess } from '@/lib/server/rbac';

export default async function ProvidersLayout({ children }: { children: ReactNode }) {
  await enforceSectionAccess('catalog');
  return children;
}
