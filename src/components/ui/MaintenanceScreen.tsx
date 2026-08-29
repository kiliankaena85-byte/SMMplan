'use client';

import * as React from 'react';
import { PreLaunchHoldingScreen } from '../landing/PreLaunchHoldingScreen';

interface MaintenanceScreenProps {
  siteName?: string;
  supportTelegram?: string;
  supportEmail?: string;
}

export function MaintenanceScreen({
  siteName = 'SMMplan',
  supportTelegram = 'smmplan_support_bot',
  supportEmail = 'support@smmplan.pro',
}: MaintenanceScreenProps) {
  return (
    <PreLaunchHoldingScreen
      siteName={siteName}
      supportTelegram={supportTelegram}
      supportEmail={supportEmail}
    />
  );
}

