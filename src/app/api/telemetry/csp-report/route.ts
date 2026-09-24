export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { SecurityAlertService } from '@/services/security/security-alert.service';
import { rateLimit } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    // Enforce 10KB body size limit to prevent memory exhaustion
    if (!rawBody || rawBody.length > 10000) {
      return NextResponse.json({ status: 'ignored' }, { status: 400 });
    }

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ status: 'invalid_json' }, { status: 400 });
    }

    const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const reportData = (parsed['csp-report'] || parsed['body'] || parsed) as Record<string, unknown>;

    // 1. IP Rate Limiting: max 30 CSP reports per minute per IP
    const ipLimit = await rateLimit(`csp:ip:${ip}`, 30, 60);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { status: 'rate_limited', error: 'Too many reports from this IP' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.resetSeconds) } }
      );
    }

    const blockedUri = String(reportData['blocked-uri'] || reportData['blockedURL'] || '');
    const violatedDirective = String(reportData['violated-directive'] || reportData['effectiveDirective'] || '');
    const documentUri = String(reportData['document-uri'] || reportData['documentURL'] || '');

    // 2. Violation Deduplication: max 1 record per 60s for identical (IP + blockedUri + directive)
    const dedupSignature = `${ip}:${blockedUri.slice(0, 100)}:${violatedDirective.slice(0, 50)}`;
    const dedupLimit = await rateLimit(`csp:dedup:${dedupSignature}`, 1, 60);
    if (!dedupLimit.ok) {
      return NextResponse.json({ status: 'deduplicated' }, { status: 200 });
    }

    // Record unique CSP violation as WARNING
    await SecurityAlertService.record({
      event: 'CSP_VIOLATION',
      severity: 'WARNING',
      ip,
      tenantId: 'smmplan',
      details: {
        blockedUri,
        violatedDirective,
        documentUri,
        userAgent,
      },
    });

    return NextResponse.json({ status: 'received' }, { status: 200 });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
