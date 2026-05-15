'use client';
import { HeroUIProvider } from '@heroui/system';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="data-theme" defaultTheme="sky" themes={['sky', 'emerald', 'violet']}>
      <HeroUIProvider>{children}</HeroUIProvider>
    </NextThemesProvider>
  );
}
