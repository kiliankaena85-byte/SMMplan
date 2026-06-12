import { ReactNode } from 'react';
import { enforceSectionAccess } from '@/lib/server/rbac';

export default async function PagesLayout({ children }: { children: ReactNode }) {
  await enforceSectionAccess('settings');
  return children;
}
