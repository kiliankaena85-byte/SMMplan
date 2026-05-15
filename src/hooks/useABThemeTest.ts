"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export function useABThemeTest() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    // Only run this logic on the client
    if (typeof window === "undefined") return;

    // Check if the user is already assigned a theme
    const hasAssignedTheme = localStorage.getItem("smmplan-ab-theme");

    if (!hasAssignedTheme) {
      // 33% probability for each theme
      const themes = ["sky", "emerald", "violet"];
      const randomTheme = themes[Math.floor(Math.random() * themes.length)];
      
      setTheme(randomTheme);
      localStorage.setItem("smmplan-ab-theme", randomTheme);
      
      // We could fire an analytics event here
      console.log(`[A/B Test] Assigned user to theme: ${randomTheme}`);
    }
  }, [setTheme]);

  return { currentTheme: theme || resolvedTheme };
}
