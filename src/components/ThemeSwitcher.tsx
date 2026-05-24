"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, GripVertical } from "lucide-react";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Draggable State (using x as 'left' and y as 'top' for perfect 1:1 mouse tracking)
  const [position, setPosition] = useState({ x: 0, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 }); // relative mouse offset inside widget at drag start

  // Initialize position to top-right on mount
  useEffect(() => {
    setMounted(true);
    setPosition({ x: window.innerWidth - 230, y: 16 });
  }, []);

  // Handle Window Resize to keep the widget on screen
  useEffect(() => {
    if (!mounted) return;
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(window.innerWidth - 230, prev.x),
        y: Math.min(window.innerHeight - 60, prev.y)
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mounted]);

  // Handle Mouse Drag Start
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag with left click
    if (e.button !== 0) return;
    
    // Don't drag if clicking buttons inside the widget
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    
    const rect = e.currentTarget.getBoundingClientRect();
    setRel({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    e.preventDefault();
  };

  // Handle Touch Drag Start (Mobile/Tablet support)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.targetTouches.length !== 1) return;
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    
    const touch = e.targetTouches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    
    setRel({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
  };

  // Drag listeners
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newLeft = e.clientX - rel.x;
      const newTop = e.clientY - rel.y;

      // Keep it within screen boundaries (with 8px padding)
      const clampedLeft = Math.max(8, Math.min(window.innerWidth - 220, newLeft));
      const clampedTop = Math.max(8, Math.min(window.innerHeight - 60, newTop));

      setPosition({ x: clampedLeft, y: clampedTop });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      
      const newLeft = touch.clientX - rel.x;
      const newTop = touch.clientY - rel.y;

      const clampedLeft = Math.max(8, Math.min(window.innerWidth - 220, newLeft));
      const clampedTop = Math.max(8, Math.min(window.innerHeight - 60, newTop));

      setPosition({ x: clampedLeft, y: clampedTop });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging, rel]);

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
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
      className={`hidden md:flex fixed z-50 items-center gap-2.5 bg-card/85 backdrop-blur-md border border-border/50 p-2 rounded-full shadow-lg select-none ${
        isDragging 
          ? 'cursor-grabbing scale-[1.02] shadow-2xl border-primary/50' 
          : 'cursor-grab hover:shadow-xl hover:border-border transition-all duration-200'
      }`}
    >
      {/* Visual Drag Handle Icon */}
      <div className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors pl-1 shrink-0">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      <div className="flex gap-1 items-center bg-muted/50 p-1 rounded-full shrink-0">
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
      
      <div className="w-[1px] h-6 bg-border/50 shrink-0" />
      
      <div className="flex gap-2 pr-1 shrink-0">
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
