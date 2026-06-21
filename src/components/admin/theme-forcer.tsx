'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export function AdminThemeForcer() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (theme && theme.includes('dark')) {
        const lightTheme = theme.replace('-dark', '-light').replace('dark', 'light');
        setTheme(lightTheme);
      } else if (theme === 'dark') {
        setTheme('light');
      }
    }
  }, [theme, setTheme]);

  return null;
}
