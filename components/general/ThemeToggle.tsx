"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { SunMoon } from "lucide-react";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  return (
    <button
      aria-label="theme toggle"
      className="icon-button px-3.5 hide-button"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <SunMoon className="icon-md" />
    </button>
  );
};

export default ThemeToggle;
