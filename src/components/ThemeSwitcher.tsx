"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Palette } from "lucide-react";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const currentTheme = theme || 'sky-dark';
  const isDark = currentTheme.includes('dark') || currentTheme === 'dark';
  const currentAccent = currentTheme.includes('emerald') ? 'emerald' : currentTheme.includes('violet') ? 'violet' : 'sky';

  const setMode = (mode: "light" | "dark") => {
    setTheme(`${currentAccent}-${mode}`);
  };

  const setAccent = (accent: "sky" | "emerald" | "violet") => {
    const mode = isDark ? 'dark' : 'light';
    setTheme(`${accent}-${mode}`);
  };

  const accents = [
    { name: "sky", color: "bg-sky-600" },
    { name: "emerald", color: "bg-emerald-600" },
    { name: "violet", color: "bg-violet-600" },
  ];

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 bg-card/80 backdrop-blur-md border border-border/50 p-2 rounded-full shadow-lg">
      <div className="flex gap-1 items-center bg-muted/50 p-1 rounded-full">
        <button
          onClick={() => setMode('light')}
          className={`p-1.5 rounded-full transition-colors ${!isDark ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          title="Light Mode"
        >
          <Sun className="w-4 h-4" />
        </button>
        <button
          onClick={() => setMode('dark')}
          className={`p-1.5 rounded-full transition-colors ${isDark ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          title="Dark Mode"
        >
          <Moon className="w-4 h-4" />
        </button>
      </div>
      
      <div className="w-[1px] h-6 bg-border/50" />
      
      <div className="flex gap-2 pr-1">
        {accents.map((t) => (
          <button
            key={t.name}
            onClick={() => setAccent(t.name as "sky" | "emerald" | "violet")}
            className={`w-5 h-5 rounded-full transition-transform ${t.color} ${currentAccent === t.name ? 'scale-125 ring-2 ring-offset-2 ring-foreground/20' : 'hover:scale-110'}`}
            title={`Switch to ${t.name} accent`}
            aria-label={`Switch to ${t.name} accent`}
          />
        ))}
      </div>
    </div>
  );
}
