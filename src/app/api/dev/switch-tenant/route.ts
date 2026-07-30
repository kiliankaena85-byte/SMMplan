import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_ROUTES !== 'true') {
    return new Response('Not Found', { status: 404 });
  }
  
  const session = await verifySession();
  
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const { searchParams } = new URL(req.url);
  const targetTenant = searchParams.get('to') || 'lovable';

  try {
    await db.user.update({
      where: { id: session.userId },
      data: { tenantId: targetTenant },
    });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2002') {
      // Find the current user to get their email
      const currentUser = await db.user.findUnique({ where: { id: session.userId } });
      if (currentUser && currentUser.email) {
        // Move the colliding account out of the way
        await db.user.update({
          where: {
            email_tenantId: {
              email: currentUser.email,
              tenantId: targetTenant,
            }
          },
          data: {
            email: currentUser.email + '_duplicate_' + Date.now(),
          }
        });
        // Try again
        await db.user.update({
          where: { id: session.userId },
          data: { tenantId: targetTenant },
        });
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to switch tenant:', error);
    return new NextResponse('Failed to switch tenant. ' + errorMessage, { status: 400 });
  }

  return NextResponse.redirect(new URL('/dashboard', req.url));
}
