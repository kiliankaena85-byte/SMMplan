import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const url = request.nextUrl.pathname;
    
    // Bypass middleware for admin, api health, edge-config, and static assets
    if (url.startsWith('/admin') || url.startsWith('/api/health') || url.startsWith('/api/edge-config') || url.startsWith('/maintenance')) {
        return NextResponse.next();
    }

    try {
        const origin = request.nextUrl.origin;
        // Fetch maintenance mode from internal API (which connects to Redis)
        const res = await fetch(`${origin}/api/edge-config`, {
            headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
            next: { revalidate: 10 } // Cache for 10 seconds to minimize latency
        });
        
        if (res.ok) {
            const data = await res.json();
            if (data.maintenanceMode) {
                // Rewrite to maintenance page
                return NextResponse.rewrite(new URL('/maintenance', request.url));
            }
        }
    } catch (e) {
        // Fail open if internal API or Redis is down
        console.error('[Middleware] Failed to check maintenance mode', e);
    }

    return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
