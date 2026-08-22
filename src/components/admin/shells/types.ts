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
    user: { name?: string | null; email?: string | null; role?: string | null; [key: string]: unknown };
  roleInfo: { label: string; color: string };
  navigation: AdminNavGroup[];
  siteName: string;
  tenantId: string;
  isTestMode: boolean;
  children: ReactNode;
}
