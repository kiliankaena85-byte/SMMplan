import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';
import { NetworkAwareProvider } from '@/components/providers/NetworkAwareProvider';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Smmplan — продвижение в социальных сетях',
    template: '%s | Smmplan',
  },
  description:
    'Накрутка подписчиков, лайков, просмотров для Instagram, TikTok, VK, YouTube. Быстрый старт, надежные исполнители, поддержка 24/7.',
  keywords: ['smm', 'накрутка', 'подписчики', 'лайки', 'продвижение', 'instagram', 'tiktok', 'youtube', 'vk'],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Smmplan',
    title: 'Smmplan — продвижение в социальных сетях',
    description:
      'Накрутка подписчиков, лайков, просмотров. Быстрый старт, профессиональное выполнение, поддержка 24/7.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smmplan — продвижение в социальных сетях',
    description: 'B2B платформа продвижения: накрутка подписчиков, лайков, просмотров.',
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL
      ? `https://${process.env.NEXT_PUBLIC_APP_URL}`
      : 'http://localhost:3000'
  ),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="font-sans antialiased">
        <Providers>
          <NetworkAwareProvider>
            {children}
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
