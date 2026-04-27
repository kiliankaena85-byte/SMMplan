'use client';
import { HeroUIProvider } from '@heroui/system';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScrollProvider>
      <HeroUIProvider>{children}</HeroUIProvider>
    </SmoothScrollProvider>
  );
}
