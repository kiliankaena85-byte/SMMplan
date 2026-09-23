import React from 'react';
import { stormDetectorService } from '@/services/admin/storm-detector.service';
import { StormRadarClient } from './StormRadarClient';

interface Props {
  tenantFilter?: string;
  windowHours?: number;
}

export async function StormRadarWidget({ tenantFilter, windowHours = 72 }: Props) {
  const report = await stormDetectorService.auditServiceStorms({ windowHours, tenantId: tenantFilter });
  return <StormRadarClient report={report} />;
}
