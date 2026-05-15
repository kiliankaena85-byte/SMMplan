"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Palette } from "lucide-react";

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

  const themes = [
    { name: "sky", color: "bg-sky-600" },
    { name: "emerald", color: "bg-emerald-600" },
    { name: "violet", color: "bg-violet-600" },
  ];

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-card/80 backdrop-blur-md border border-border/50 p-2 rounded-full shadow-lg">
      <div className="p-2 text-muted-foreground">
        <Palette className="w-5 h-5" />
      </div>
      <div className="flex gap-2">
        {themes.map((t) => (
          <button
            key={t.name}
            onClick={() => setTheme(t.name)}
            className={`w-6 h-6 rounded-full transition-transform ${t.color} ${theme === t.name ? 'scale-125 ring-2 ring-offset-2 ring-foreground/20' : 'hover:scale-110'}`}
            title={`Switch to ${t.name} theme`}
            aria-label={`Switch to ${t.name} theme`}
          />
        ))}
      </div>
    </div>
  );
}
