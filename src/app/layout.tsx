import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';
import { NetworkAwareProvider } from '@/components/providers/NetworkAwareProvider';
import { FloatingQADock } from '@/components/dev/FloatingQADock';
import { getTenantHost, normalizeTenantId } from '@/lib/seo-helpers';

import { headers } from 'next/headers';

export async function generateMetadata(): Promise<Metadata> {
  const reqHeaders = await headers();
  const tenantId = normalizeTenantId(reqHeaders.get('x-tenant-id'));
  const host = reqHeaders.get('host') || '';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const metadataBase = new URL(`${protocol}://${host}`);

  if (tenantId === 'flux' || tenantId === 'smmflux') {
    return {
      title: {
        default: 'SMMflux — Быстрое продвижение для бизнеса',
        template: '%s | SMMflux',
      },
      description: 'Быстрая накрутка и продвижение в социальных сетях для бизнеса. Фокус на качество и скорость.',
      keywords: ['smm', 'накрутка', 'продвижение', 'smmflux', 'быстрый старт'],
      openGraph: {
        type: 'website',
        locale: 'ru_RU',
        siteName: 'SMMflux',
        title: 'SMMflux — Быстрое продвижение для бизнеса',
        description: 'Быстрая накрутка и продвижение в социальных сетях для бизнеса. Фокус на качество и скорость.',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'SMMflux — Быстрое продвижение для бизнеса',
        description: 'Быстрая накрутка и продвижение в социальных сетях для бизнеса.',
      },
      robots: {
        index: true,
        follow: true,
      },
      metadataBase,
    };
  }

  return {
    title: {
      default: 'SMMplan — продвижение в социальных сетях',
      template: '%s | SMMplan',
    },
    description:
      'Продвижение подписчиков, лайков, просмотров для Instagram, TikTok, VK, YouTube. Быстрый старт, надежные исполнители, поддержка 9-21 МСК.',
    keywords: ['smm', 'продвижение', 'подписчики', 'лайки', 'instagram', 'tiktok', 'youtube', 'vk'],
    openGraph: {
      type: 'website',
      locale: 'ru_RU',
      siteName: 'SMMplan',
      title: 'SMMplan — продвижение в социальных сетях',
      description:
        'Продвижение подписчиков, лайков, просмотров. Быстрый старт, профессиональное выполнение, поддержка 9-21 МСК.',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'SMMplan — продвижение в социальных сетях',
      description: 'B2B платформа продвижения: продвижение подписчиков, лайков, просмотров.',
    },
    robots: {
      index: true,
      follow: true,
    },
    metadataBase,
  };
}

import { SettingsProvider } from '@/lib/settings';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { MaintenanceScreen } from '@/components/ui/MaintenanceScreen';
import { MaintenanceGuardian } from '@/components/providers/MaintenanceGuardian';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const reqHeaders = await headers();
  const pathname = reqHeaders.get('x-pathname') || '';
  
  const normalized = pathname.toLowerCase();
  const isExcluded = 
    normalized.startsWith('/admin') ||
    normalized.startsWith('/api') ||
    normalized === '/login' ||
    normalized.startsWith('/_next') ||
    normalized.includes('.');

  const settings = await SettingsProvider.get();
  const isMaintenanceMode = settings.maintenanceMode;
  
  let isStaff = false;
  
  if (isMaintenanceMode) {
    const session = await verifySession();
    if (session) {
      const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { role: true }
      });
      if (user && ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'].includes(user.role)) {
        isStaff = true;
      }
    }
  }

  const tenantId = normalizeTenantId(reqHeaders.get('x-tenant-id'));
  const isFlux = tenantId === 'flux' || tenantId === 'smmflux';
  const siteName = isFlux ? 'SMMflux' : (settings.siteName || 'SMMplan');
  const supportEmail = isFlux
    ? (settings.contactSupportEmail || 'support@smmflux.ru')
    : (settings.contactSupportEmail || 'support@smmplan.pro');

  const showMaintenance = isMaintenanceMode && !isStaff && !isExcluded;

  const supportTelegram = settings.contactTelegramBot || 'smmplan_support_bot';

  if (showMaintenance) {
    return (
      <html lang="ru" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        </head>
        <body className="font-sans antialiased bg-background text-foreground" suppressHydrationWarning>
          <MaintenanceScreen
            siteName={siteName}
            supportTelegram={supportTelegram}
            supportEmail={supportEmail}
          />
        </body>
      </html>
    );
  }

  return (
    <html lang="ru" data-tenant={tenantId} className={`theme-${tenantId}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": siteName,
              "url": `https://${getTenantHost(normalizeTenantId(reqHeaders.get('x-tenant-id')))}`,
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer support",
                "email": supportEmail,
                "availableLanguage": "Russian",
              },
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "RU",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": siteName,
              "url": `https://${getTenantHost(normalizeTenantId(reqHeaders.get('x-tenant-id')))}`,
            },
          ]).replace(/</g, '\\u003c') }}
        />
      </head>
      <body className={`font-sans antialiased bg-background text-foreground theme-${tenantId}`} data-tenant={tenantId} suppressHydrationWarning>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg z-[9999] font-semibold outline-none focus:ring-2 focus:ring-primary transition-all">
          Перейти к основному контенту
        </a>
        <Providers>
          <NetworkAwareProvider>
             <MaintenanceGuardian
               {...(isMaintenanceMode && !isStaff ? { m: true } : {})}
             >
               {children}
             </MaintenanceGuardian>
          </NetworkAwareProvider>
          {process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_QA_DOCK === 'true' && (
            <FloatingQADock />
          )}
        </Providers>
        <Toaster
          richColors
          closeButton
          duration={4000}
        />
      </body>
    </html>
  );
}
