"use client";

import { useEffect, useState } from "react";

type ChartTheme = {
  dayShading: string;
  nightShading: string;
  hoverOpacity: number;
  shadingOpacity: number;
};

const defaultLight: ChartTheme = {
  // dayShading: "oklch(85% 0.12 90)",
  // nightShading: "oklch(75% 0.1 290)",
  dayShading: "#ffe58f7e",
  nightShading: "#ccc1ffce",
  hoverOpacity: 0.24,
  shadingOpacity: 0.35,
};

const defaultDark: ChartTheme = {
  dayShading: "#FFE58F",
  nightShading: "#ccc1ffff",
  hoverOpacity: 0.16,
  shadingOpacity: 0.2,
};

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(defaultDark);

  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? defaultDark : defaultLight);
    };

    updateTheme();

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  return theme;
}
