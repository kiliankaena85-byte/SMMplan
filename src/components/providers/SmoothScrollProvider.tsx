"use client";

import { ReactLenis } from '@studio-freight/react-lenis';
import { ReactNode } from 'react';

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  // Lenis smooth scroll wraps our application to give it a physical momentum scrolling feel
  return (
    <ReactLenis root options={{ lerp: 0.05, duration: 1.5, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
