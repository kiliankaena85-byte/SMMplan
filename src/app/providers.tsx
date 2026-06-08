'use client';
import { HeroUIProvider } from '@heroui/system';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

// Фикс для next-themes (поддержка пробелов в именах классов для кастомных темных тем в classList)
if (typeof window !== 'undefined') {
  const patchClassList = (proto: DOMTokenList, method: 'add' | 'remove') => {
    const original = proto[method];
    proto[method] = function (...args: string[]) {
      const processed: string[] = [];
      for (const arg of args) {
        if (typeof arg === 'string' && arg.includes(' ')) {
          processed.push(...arg.split(/\s+/).filter(Boolean));
        } else {
          processed.push(arg);
        }
      }
      return original.apply(this, processed);
    };
  };
  patchClassList(DOMTokenList.prototype, 'add');
  patchClassList(DOMTokenList.prototype, 'remove');
}

// Фикс для React 19 + next-themes (подавляет ложные DEV-предупреждения на клиенте и сервере)
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    const firstArg = args[0];
    if (typeof firstArg === 'string') {
      if (firstArg.includes('Encountered a script tag while rendering React component')) return;
      if (firstArg.includes('MaxListenersExceededWarning') || firstArg.includes('EventEmitter memory leak detected')) return;
    }
    orig.apply(console, args);
  };
}
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="telegram-light" 
      themes={['light', 'dark', 'sky-light', 'sky-dark', 'emerald-light', 'emerald-dark', 'violet-light', 'violet-dark', 'warm-light', 'warm-dark', 'telegram-light', 'telegram-dark']}
      value={{
        'light': 'light',
        'dark': 'dark',
        'sky-light': 'sky-light',
        'sky-dark': 'dark sky-dark',
        'emerald-light': 'emerald-light',
        'emerald-dark': 'dark emerald-dark',
        'violet-light': 'violet-light',
        'violet-dark': 'dark violet-dark',
        'warm-light': 'warm-light',
        'warm-dark': 'dark warm-dark',
        'telegram-light': 'telegram-light',
        'telegram-dark': 'dark telegram-dark'
      }}
    >
      <HeroUIProvider>{children}</HeroUIProvider>
    </NextThemesProvider>
  );
}
