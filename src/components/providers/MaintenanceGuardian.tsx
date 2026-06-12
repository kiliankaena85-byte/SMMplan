'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MaintenanceScreen } from '../ui/MaintenanceScreen';

interface MaintenanceGuardianProps {
  children: React.ReactNode;
  initialIsMaintenance: boolean;
  siteName: string;
  supportTelegram: string;
  supportEmail: string;
}

export function MaintenanceGuardian({
  children,
  initialIsMaintenance,
  siteName,
  supportTelegram,
  supportEmail,
}: MaintenanceGuardianProps) {
  const pathname = usePathname();
  const [isMaintenance, setIsMaintenance] = useState(initialIsMaintenance);

  // Exclude admin, API, login, and static files
  const isExcluded = React.useMemo(() => {
    if (!pathname) return true;
    const normalized = pathname.toLowerCase();
    return (
      normalized.startsWith('/admin') ||
      normalized.startsWith('/api') ||
      normalized === '/login' ||
      normalized.startsWith('/_next') ||
      normalized.includes('.') // files with extensions (e.g. favicon.ico, logo.png)
    );
  }, [pathname]);

  useEffect(() => {
    if (isExcluded) return;

    const checkStatus = async () => {
      try {
        const res = await fetch('/api/maintenance-status');
        if (res.ok) {
          const data = await res.json();
          // Block if maintenance is active and user is NOT staff
          setIsMaintenance(data.isMaintenanceMode && !data.isStaff);
        }
      } catch (err) {
        console.warn('[MaintenanceGuardian] Failed to fetch maintenance status:', err);
      }
    };

    // Check immediately on route change
    checkStatus();

    // Poll every 60 seconds for idle tabs
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, [pathname, isExcluded]);

  if (!isExcluded && isMaintenance) {
    return (
      <MaintenanceScreen
        siteName={siteName}
        supportTelegram={supportTelegram}
        supportEmail={supportEmail}
      />
    );
  }

  return <>{children}</>;
}
