/**
 * (c) 2024-2026 SMMplan / OmniSMM. All rights reserved.
 * 
 * IndexNow Key Verification Endpoint.
 * Search engine crawlers (Yandex, Bing) fetch this endpoint to verify domain ownership.
 */

import { NextResponse } from 'next/server';
import { IndexNowService } from '@/services/seo/indexnow.service';

export async function GET() {
  const key = IndexNowService.getKey();

  return new NextResponse(key, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
