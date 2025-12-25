"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, SunMoon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppMenuItem } from "@/components/ui/app-menu";

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
        className="hover:bg-highlight-5 p-2 rounded-2xl flex flex-col items-center gap-1 @min-[350px]:min-w-15"
      >
        {/* {theme === "light" ? (
          <Sun className="w-5 h-5 -mt-0.5" />
        ) : (
          <Moon className="w-5 h-5 -mt-0.5" />
        )} */}
        <SunMoon className="w-6 h-6 @min-[350px]:w-5 @min-[350px]:h-5 -mt-0.5" />
        <span className="text-xs sr-only @min-[350px]:not-sr-only">Mode</span>
      </button>
    );
  }
  if (switchMode) {
    const labelTheme = theme ?? "system";
    return (
      <AppMenuItem
        className={cn("@min-5xl:hidden", className)}
        onSelect={() => setTheme(theme === "light" ? "dark" : "light")}
      >
        {theme === "light" ? (
          <Sun className="w-5 h-5 -mt-0.5" />
        ) : theme === "dark" ? (
          <Moon className="w-5 h-5 -mt-0.5" />
        ) : (
          <SunMoon className="w-5 h-5 -mt-0.5" />
        )}
        <span>
          <span className="capitalize">{labelTheme}</span> mode
        </span>
      </AppMenuItem>
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
