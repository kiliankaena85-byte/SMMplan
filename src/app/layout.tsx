import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';
import { NetworkAwareProvider } from '@/components/providers/NetworkAwareProvider';

import { headers } from 'next/headers';

export async function generateMetadata(): Promise<Metadata> {
  const reqHeaders = await headers();
  const host = reqHeaders.get('host') || '';
  const tenantId = host.includes('lovable') ? 'lovable' : 'smmplan';
  
  if (tenantId === 'lovable') {
    return {
      title: {
        default: 'Lovable — Premium Social Growth Platform',
        template: '%s | Lovable',
      },
      description: 'Grow your social presence with premium delivery and absolute privacy.',
      keywords: ['smm', 'growth', 'followers', 'likes', 'instagram', 'tiktok', 'youtube'],
      openGraph: {
        type: 'website',
        locale: 'en_US',
        siteName: 'Lovable',
        title: 'Lovable — Premium Social Growth Platform',
        description: 'Grow your social presence with premium delivery and absolute privacy.',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Lovable — Premium Social Growth Platform',
        description: 'Grow your social presence with premium delivery and absolute privacy.',
      },
      robots: {
        index: true,
        follow: true,
      },
      metadataBase: new URL(process.env.LOVABLE_APP_URL || 'https://lovable.pro'),
    };
  }

  return {
    title: {
      default: 'SMMplan — продвижение в социальных сетях',
      template: '%s | SMMplan',
    },
    description:
      'Продвижение подписчиков, лайков, просмотров для Instagram, TikTok, VK, YouTube. Быстрый старт, надежные исполнители, поддержка 9-21 МСК.',
    keywords: ['smm', 'продвижение', 'подписчики', 'лайки', 'продвижение', 'instagram', 'tiktok', 'youtube', 'vk'],
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
    metadataBase: new URL(
      process.env.WEBAPP_URL || process.env.NEXT_PUBLIC_APP_URL
        ? (process.env.WEBAPP_URL || process.env.NEXT_PUBLIC_APP_URL)?.startsWith('http')
          ? (process.env.WEBAPP_URL || process.env.NEXT_PUBLIC_APP_URL)!
          : `https://${process.env.WEBAPP_URL || process.env.NEXT_PUBLIC_APP_URL}`
        : 'https://smmplan.pro'
    ),
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

  const tenantId = reqHeaders.get('x-tenant-id') || 'smmplan';
  const isLovable = tenantId === 'lovable';
  const siteName = isLovable ? 'Lovable' : (settings.siteName || 'SMMplan');
  const supportTelegram = isLovable
    ? (process.env.LOVABLE_TELEGRAM_BOT || 'lovable_support_bot')
    : (settings.contactTelegramBot || 'smmplan_support_bot');
  const supportEmail = isLovable
    ? 'support@lovable.pro'
    : (settings.contactSupportEmail || 'support@smmplan.pro');

  const showMaintenance = isMaintenanceMode && !isStaff && !isExcluded;

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
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground" suppressHydrationWarning>
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
