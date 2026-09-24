import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/services/security/security-alert.service', () => ({
  SecurityAlertService: {
    record: vi.fn().mockResolvedValue({ id: 'evt-1' }),
  },
}));

describe('AUTH-02: CSP Report Telemetry Hardening', () => {
  let POST: (req: NextRequest) => Promise<Response>;
  let SecurityAlertService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const route = await import('@/app/api/telemetry/csp-report/route');
    const alertServiceModule = await import('@/services/security/security-alert.service');
    POST = route.POST;
    SecurityAlertService = alertServiceModule.SecurityAlertService;
  });

  it('rejects oversized payload > 10000 bytes with 400 ignored', async () => {
    const hugeBody = JSON.stringify({ data: 'A'.repeat(12000) });
    const req = new NextRequest('http://localhost:3000/api/telemetry/csp-report', {
      method: 'POST',
      body: hugeBody,
      headers: { 'x-real-ip': '198.51.100.1' },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe('ignored');
    expect(SecurityAlertService.record).not.toHaveBeenCalled();
  });

  it('accepts and records a valid CSP report', async () => {
    const body = JSON.stringify({
      'csp-report': {
        'document-uri': 'https://smmplan.pro/dashboard',
        'blocked-uri': 'http://evil.com/malicious.js',
        'violated-directive': 'script-src',
      },
    });

    const req = new NextRequest('http://localhost:3000/api/telemetry/csp-report', {
      method: 'POST',
      body,
      headers: {
        'x-real-ip': '198.51.100.2',
        'user-agent': 'Mozilla/5.0 TestBrowser',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('received');
    expect(SecurityAlertService.record).toHaveBeenCalledTimes(1);
    expect(SecurityAlertService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'CSP_VIOLATION',
        severity: 'WARNING',
        ip: '198.51.100.2',
        details: expect.objectContaining({
          blockedUri: 'http://evil.com/malicious.js',
          violatedDirective: 'script-src',
        }),
      })
    );
  });

  it('deduplicates identical reports from the same IP within 60s', async () => {
    const body = JSON.stringify({
      'csp-report': {
        'document-uri': 'https://smmplan.pro/dashboard',
        'blocked-uri': 'http://evil.com/dup.js',
        'violated-directive': 'script-src',
      },
    });

    const req1 = new NextRequest('http://localhost:3000/api/telemetry/csp-report', {
      method: 'POST',
      body,
      headers: { 'x-real-ip': '198.51.100.3' },
    });

    const res1 = await POST(req1);
    expect(res1.status).toBe(200);
    expect(await res1.json()).toEqual({ status: 'received' });
    expect(SecurityAlertService.record).toHaveBeenCalledTimes(1);

    // Immediate duplicate
    const req2 = new NextRequest('http://localhost:3000/api/telemetry/csp-report', {
      method: 'POST',
      body,
      headers: { 'x-real-ip': '198.51.100.3' },
    });

    const res2 = await POST(req2);
    expect(res2.status).toBe(200);
    expect(await res2.json()).toEqual({ status: 'deduplicated' });
    // Still 1 record, second was not inserted
    expect(SecurityAlertService.record).toHaveBeenCalledTimes(1);
  });

  it('rate limits when IP exceeds 30 reports per minute', async () => {
    const testIp = '198.51.100.4';

    for (let i = 0; i < 30; i++) {
      const body = JSON.stringify({
        'csp-report': {
          'document-uri': `https://smmplan.pro/page-${i}`,
          'blocked-uri': `http://evil.com/script-${i}.js`,
          'violated-directive': 'script-src',
        },
      });
      const req = new NextRequest('http://localhost:3000/api/telemetry/csp-report', {
        method: 'POST',
        body,
        headers: { 'x-real-ip': testIp },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    }

    // 31st request should be rate-limited
    const floodReq = new NextRequest('http://localhost:3000/api/telemetry/csp-report', {
      method: 'POST',
      body: JSON.stringify({ 'csp-report': { 'blocked-uri': 'http://evil.com/flood.js' } }),
      headers: { 'x-real-ip': testIp },
    });

    const floodRes = await POST(floodReq);
    expect(floodRes.status).toBe(429);
    const floodJson = await floodRes.json();
    expect(floodJson.status).toBe('rate_limited');
  });
});
