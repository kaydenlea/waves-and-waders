"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { SunMoon } from "lucide-react";
import { cn } from "@/lib/utils";

const ThemeToggle = ({ className }: { className?: string }) => {
  const { theme, setTheme } = useTheme();
  return (
    <button
      aria-label="theme toggle"
      className={cn("icon-button p-3 hover:bg-highlight-3", className)}
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <SunMoon className="icon-md" />
    </button>
  );
};

export default ThemeToggle;
