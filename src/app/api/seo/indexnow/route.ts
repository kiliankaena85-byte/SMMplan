/**
 * (c) 2024-2026 SMMplan / OmniSMM. All rights reserved.
 * 
 * IndexNow Trigger Endpoint.
 * Submits single or batch URLs to Yandex IndexNow for instant search engine indexing.
 */

import { NextResponse } from 'next/server';
import { IndexNowService } from '@/services/seo/indexnow.service';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    // 1. Authenticate via Bearer INTERNAL_API_SECRET or Admin Session
    const authHeader = req.headers.get('authorization');
    const secret = process.env.INTERNAL_API_SECRET;
    let isAuthorized = false;

    if (secret && authHeader) {
      const expectedAuth = `Bearer ${secret}`;
      const authBuf = Buffer.from(authHeader);
      const expectedBuf = Buffer.from(expectedAuth);

      if (authBuf.length === expectedBuf.length && crypto.timingSafeEqual(authBuf, expectedBuf)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const session = await verifySession();
      if (session?.userId) {
        const user = await db.user.findUnique({
          where: { id: session.userId },
          select: { role: true },
        });
        if (user && (user.role === 'OWNER' || user.role === 'ADMIN')) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse & Validate Payload
    const body = await req.json().catch(() => ({}));
    const { host, urls } = body;

    if (!host || typeof host !== 'string') {
      return NextResponse.json({ success: false, message: 'Missing or invalid "host" field.' }, { status: 400 });
    }

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ success: false, message: 'Missing or empty "urls" array.' }, { status: 400 });
    }

    // 3. Submit to IndexNow
    const result = await IndexNowService.submitUrls({
      host,
      urls,
    });

    logger.info('[API/IndexNow] Processed submission request', {
      host,
      submittedCount: result.submittedCount,
      success: result.success,
    });

    return NextResponse.json({
      success: result.success,
      submittedCount: result.submittedCount,
      yandexStatus: result.yandexStatus,
      indexNowStatus: result.indexNowStatus,
      error: result.error,
    });
  } catch (error: any) {
    logger.error('[API/IndexNow] Internal error handling request', { error: error?.message || error });
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
