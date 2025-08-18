"use client";

import * as React from "react";
import { CgDarkMode } from "react-icons/cg";
import { useTheme } from "next-themes";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  return (
    <button
      aria-label="theme toggle"
      className="icon-button px-3.5 hide-button"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <CgDarkMode className="icon-md" />
    </button>
  );
};

export default ThemeToggle;
