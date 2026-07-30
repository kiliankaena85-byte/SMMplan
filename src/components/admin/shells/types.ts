import { ReactNode } from 'react';

export interface AdminNavGroup {
  group: string;
  items: {
    href: string;
    icon: string;
    label: string;
    section?: string;
    badge?: number;
  }[];
}

export interface AdminShellProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
  roleInfo: { label: string; color: string };
  navigation: AdminNavGroup[];
  siteName: string;
  tenantId: string;
  isTestMode: boolean;
  children: ReactNode;
}
