import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET(req: Request) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const maintenanceMode = await redis.get('settings:maintenanceMode');
        return NextResponse.json({ maintenanceMode: maintenanceMode === 'true' });
    } catch (e) {
        return NextResponse.json({ maintenanceMode: false }, { status: 500 });
    }
}
