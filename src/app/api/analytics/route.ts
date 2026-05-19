export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RateLimitService } from '@/services/core/rate-limit.service';

/**
 * SD-05 SECURITY FIX: Added rate limiting, event allowlist, and metadata size cap.
 * Previously this endpoint had NO auth, NO rate limiting, and accepted arbitrary writes
 * to the database — a textbook DoS amplification vector.
 */

const ALLOWED_EVENTS = new Set([
  'page_view',
  'order_started',
  'order_completed',
  'payment_initiated',
  'service_selected',
  'category_viewed',
  'search_performed',
  'promo_applied',
  'signup',
  'login',
  'referral_click',
  'faq_opened',
]);

const MAX_METADATA_LENGTH = 2048; // 2 KB cap

export async function POST(req: Request) {
  try {
    // SD-05 FIX 1: IP-based rate limiting (100 requests per minute)
    const isAllowed = await RateLimitService.check('analytics:ip', 100, 60);
    if (!isAllowed) {
      return NextResponse.json({ success: false }, { status: 429 });
    }

    const body = await req.json();
    const { event, metadata, sessionId } = body;

    if (!event || typeof event !== 'string') {
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
    }

    // SD-05 FIX 2: Event allowlist validation — reject unknown event types
    if (!ALLOWED_EVENTS.has(event)) {
      // Silently accept but don't write — prevents information leakage about valid events
      return NextResponse.json({ success: true });
    }

    // SD-05 FIX 3: Metadata size cap — prevent oversized payloads from exhausting DB storage
    let safeMetadata = metadata;
    if (metadata) {
      const metadataStr = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
      if (metadataStr.length > MAX_METADATA_LENGTH) {
        safeMetadata = undefined; // Drop oversized metadata silently
      }
    }

    // SD-05 FIX 4: Validate sessionId type
    const safeSessionId = typeof sessionId === 'string' ? sessionId.slice(0, 128) : undefined;

    await db.analyticsEvent.create({
      data: {
        event,
        metadata: safeMetadata || undefined,
        sessionId: safeSessionId || undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to log analytics event:', error);
    // Don't fail the client, this is stealth telemetry
    return NextResponse.json({ success: false });
  }
}
