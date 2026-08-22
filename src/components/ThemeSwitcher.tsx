'use client';

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const currentTheme = theme || 'sky-dark';
  const isDark = currentTheme.includes('dark') || currentTheme === 'dark';
  const currentAccent = currentTheme.includes('emerald') ? 'emerald' : currentTheme.includes('violet') ? 'violet' : currentTheme.includes('warm') ? 'warm' : currentTheme.includes('telegram') ? 'telegram' : 'sky';

  const setMode = (mode: "light" | "dark") => {
    setTheme(`${currentAccent}-${mode}`);
  };

  const setAccent = (accent: "sky" | "emerald" | "violet" | "warm" | "telegram") => {
    const mode = isDark ? 'dark' : 'light';
    setTheme(`${accent}-${mode}`);
  };

  const accents = [
    { name: "sky", color: "bg-sky-600" },
    { name: "emerald", color: "bg-emerald-600" },
    { name: "violet", color: "bg-violet-600" },
    { name: "warm", color: "bg-amber-600" },
    { name: "telegram", color: "bg-[#3390EC]" },
  ];

  return (
    <div
      className="flex items-center gap-2.5 bg-card/85 backdrop-blur-md border border-border/50 p-2 rounded-full shadow-lg select-none w-fit mx-auto transition-all duration-200 hover:shadow-xl hover:border-border"
    >
      <div className="flex gap-1 items-center bg-muted/50 p-1 rounded-full shrink-0">
        <button
          onClick={() => setMode('light')}
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${!isDark ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          title="Light Mode"
          aria-label="Светлая тема"
        >
          <Sun className="w-4 h-4" />
        </button>
        <button
          onClick={() => setMode('dark')}
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${isDark ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          title="Dark Mode"
          aria-label="Темная тема"
        >
          <Moon className="w-4 h-4" />
        </button>
      </div>
      
      <div className="w-[1px] h-6 bg-border/50 shrink-0" />
      
      <div className="flex gap-2 pr-1 shrink-0">
        {accents.map((t) => (
          <button
            key={t.name}
            onClick={() => setAccent(t.name as "sky" | "emerald" | "violet" | "warm" | "telegram")}
            className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${t.color} ${currentAccent === t.name ? 'scale-125 ring-2 ring-offset-2 ring-foreground/20' : 'hover:scale-110'}`}
            title={`Switch to ${t.name} accent`}
            aria-label={`Switch to ${t.name} accent`}
          />
        ))}
      </div>
    </div>
  );
}
