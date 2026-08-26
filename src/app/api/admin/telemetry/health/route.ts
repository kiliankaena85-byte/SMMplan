import { NextResponse } from 'next/server';
import { SystemTelemetryService } from '@/services/telemetry/system-telemetry.service';

export async function GET() {
  try {
    const snapshot = await SystemTelemetryService.collectSnapshot();
    return NextResponse.json({
      timestamp: snapshot.timestamp,
      overallStatus: snapshot.overallStatus,
      activeAlerts: snapshot.activeAlerts,
      disk: snapshot.disk,
      memory: snapshot.memory,
      database: snapshot.database,
      queues: snapshot.queues,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message, activeAlerts: [] },
      { status: 500 }
    );
  }
}
