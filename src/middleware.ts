import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Map of legacy routes to new static routes
const legacyRedirects: Record<string, string> = {
  '/p/offer': '/legal/terms',
  '/p/terms': '/legal/terms',
  '/p/privacy': '/legal/privacy',
  '/p/refund': '/legal/refund',
  '/p/faq': '/#faq',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the exact pathname matches a legacy route
  const newPath = legacyRedirects[pathname];
  if (newPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = newPath;
    
    // If the new path has a hash (like /#faq), we must assign it to the hash property
    if (newPath.includes('#')) {
      const [pathPart, hashPart] = newPath.split('#');
      redirectUrl.pathname = pathPart;
      redirectUrl.hash = hashPart;
    }

    return NextResponse.redirect(redirectUrl, 301); // 301 Permanent Redirect
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
// We strictly limit the middleware to run ONLY on relevant paths to preserve performance.
// We exclude all static files, images, api routes, and Next.js internal paths.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
