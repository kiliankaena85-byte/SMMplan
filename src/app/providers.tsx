'use client';
import { HeroUIProvider } from '@heroui/system';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="sky-dark" themes={['light', 'dark', 'sky-light', 'sky-dark', 'emerald-light', 'emerald-dark', 'violet-light', 'violet-dark']}>
      <HeroUIProvider>{children}</HeroUIProvider>
    </NextThemesProvider>
  );
}
