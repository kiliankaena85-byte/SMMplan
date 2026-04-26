import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

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
    'Накрутка подписчиков, лайков, просмотров для Instagram, TikTok, VK, YouTube. Быстрый старт, гарантия, поддержка 24/7.',
  keywords: ['smm', 'накрутка', 'подписчики', 'лайки', 'продвижение', 'instagram', 'tiktok', 'youtube', 'vk'],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Smmplan',
    title: 'Smmplan — продвижение в социальных сетях',
    description:
      'Накрутка подписчиков, лайков, просмотров. Быстрый старт, гарантия качества, поддержка 24/7.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smmplan — продвижение в социальных сетях',
    description: 'Накрутка подписчиков, лайков, просмотров. Гарантия результата.',
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
        <Providers>{children}</Providers>
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
      </body>
    </html>
  );
}
