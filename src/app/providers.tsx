'use client';
import { HeroUIProvider } from '@heroui/system';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

// Фикс для React 19 + next-themes (подавляет ложное DEV-предупреждение о <script> теге)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag while rendering React component')) return;
    orig.apply(console, args);
  };
}
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="sky-dark" themes={['light', 'dark', 'sky-light', 'sky-dark', 'emerald-light', 'emerald-dark', 'violet-light', 'violet-dark']}>
      <HeroUIProvider>{children}</HeroUIProvider>
    </NextThemesProvider>
  );
}
