import React from 'react';
import { SmmPlanDashboard } from '../components/dashboards';

export const metadata = {
  title: 'SMMplan — Личный кабинет клиента (Full Screen)',
  description: 'Терминал профессионала SMMplan',
};

export default function FullScreenPlanPage() {
  return <SmmPlanDashboard isPreviewMode={false} />;
}
