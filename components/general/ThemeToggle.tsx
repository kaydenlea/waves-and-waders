"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, SunMoon } from "lucide-react";
import { cn } from "@/lib/utils";

const ThemeToggle = ({
  switchMode = false,
  bottomNavMode = false,
  className,
}: {
  bottomNavMode?: boolean;
  switchMode?: boolean;
  className?: string;
}) => {
  const { theme, setTheme } = useTheme();
  if (bottomNavMode) {
    return (
      <button
        aria-label="theme toggle"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        className="hover:bg-highlight-5 px-2 py-1.5 rounded-md flex flex-col items-center gap-1"
      >
        {/* {theme === "light" ? (
          <Sun className="w-5 h-5 -mt-0.5" />
        ) : (
          <Moon className="w-5 h-5 -mt-0.5" />
        )} */}
        <SunMoon className="w-5 h-5 -mt-0.5" />
        <span className="text-xs">Mode</span>
      </button>
    );
  }
  if (switchMode) {
    return (
      <button
        aria-label="theme toggle"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        className="block @min-4xl:hidden px-2 py-1.5 rounded-md flex items-center gap-2 hover:bg-highlight-5"
      >
        {theme === "light" ? (
          <Sun className="w-5 h-5 -mt-0.5" />
        ) : (
          <Moon className="w-5 h-5 -mt-0.5" />
        )}
        <span>
          <span className="capitalize">{theme}</span> mode
        </span>
      </button>
    );
  }
  return (
    <button
      aria-label="theme toggle"
      className={cn(
        "icon-button p-3 dark:bg-highlight-5 hover:bg-highlight-3 dark:hover:bg-highlight-3",
        className
      )}
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <SunMoon className="icon-md" />
    </button>
  );
};

export default ThemeToggle;
