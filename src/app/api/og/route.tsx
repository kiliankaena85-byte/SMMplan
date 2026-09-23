import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { normalizeTenantId, getTenantSiteName } from '@/lib/seo-helpers';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawHost = req.headers.get('host') || req.headers.get('x-forwarded-host') || '';

    // Multi-tenant resolution with strict fallback
    const tenantParam = searchParams.get('tenant');
    const headerTenant = req.headers.get('x-tenant-id');
    const hostDerivedTenant = rawHost.includes('flux') ? 'flux' : 'smmplan';
    const tenantId = normalizeTenantId(tenantParam || headerTenant || hostDerivedTenant);
    const isFlux = tenantId === 'flux';
    const siteName = getTenantSiteName(tenantId);

    const title = searchParams.get('title') || 'Продвижение в соцсетях';
    const defaultSubtitle = isFlux
      ? 'Экспресс-витрина от 1 шт • Без паролей • Мгновенный автозапуск'
      : 'Оптовые тарифы от 1 штуки • REST API v2 • Моментальный автозапуск';
    const subtitle = searchParams.get('subtitle') || defaultSubtitle;
    const price = searchParams.get('price') || '0.01 ₽ / шт';
    const network = searchParams.get('network') || siteName;

    // Distinct Brand Colors & Assets (Anti-Mimicry Invariant)
    const brandLetter = isFlux ? 'F' : 'S';
    const brandGradient = isFlux
      ? 'linear-gradient(135deg, #06b6d4, #8b5cf6)'
      : 'linear-gradient(135deg, #3b82f6, #6366f1)';
    const badgeBg = isFlux ? 'rgba(6, 182, 212, 0.15)' : 'rgba(59, 130, 246, 0.15)';
    const badgeBorder = isFlux ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)';
    const badgeColor = isFlux ? '#22d3ee' : '#60a5fa';
    const accentPriceColor = isFlux ? '#38bdf8' : '#38bdf8';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            backgroundColor: isFlux ? '#0a0d18' : '#090d16',
            backgroundImage: isFlux
              ? 'radial-gradient(circle at 25px 25px, #172138 2%, transparent 0%), radial-gradient(circle at 75px 75px, #172138 2%, transparent 0%)'
              : 'radial-gradient(circle at 25px 25px, #1a2234 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1a2234 2%, transparent 0%)',
            backgroundSize: '100px 100px',
            padding: '60px 80px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: brandGradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '24px',
                }}
              >
                {brandLetter}
              </div>
              <span style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.02em' }}>
                {siteName}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: badgeBg,
                border: badgeBorder,
                padding: '8px 20px',
                borderRadius: '100px',
                color: badgeColor,
                fontSize: '20px',
                fontWeight: '700',
              }}
            >
              {network}
            </div>
          </div>

          {/* Body */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '900px' }}>
            <div
              style={{
                fontSize: '56px',
                fontWeight: '900',
                color: '#ffffff',
                lineHeight: '1.1',
                letterSpacing: '-0.03em',
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: '24px', color: '#94a3b8', lineHeight: '1.4', fontWeight: '500' }}>
              {subtitle}
            </div>
          </div>

          {/* Footer badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              paddingTop: '28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px', color: '#64748b' }}>Цены от</span>
              <span style={{ fontSize: '32px', fontWeight: '900', color: accentPriceColor, fontFamily: 'monospace' }}>
                {price}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#10b981', fontSize: '18px', fontWeight: 'bold' }}>
              <span>✓ {isFlux ? 'Мгновенный запуск' : 'Оптовые тарифы'}</span>
              <span>✓ Гарантия Refill</span>
              <span>✓ Чек 54-ФЗ</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(`Failed to generate the image: ${errorMsg}`, {
      status: 500,
    });
  }
}
