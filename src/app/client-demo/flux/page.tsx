import React from 'react';
import { SmmFluxDashboard } from '../components/dashboards';

export const metadata = {
  title: 'SMMflux — Личный кабинет клиента (Full Screen)',
  description: 'Приложение SMMflux Aurora App',
};

export default function FullScreenFluxPage() {
  return <SmmFluxDashboard isPreviewMode={false} />;
}
