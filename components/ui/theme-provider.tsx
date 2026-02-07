"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeColorSync />
      {children}
    </NextThemesProvider>
  );
}

const LIGHT_THEME_COLOR = "#ffffff";
const DARK_THEME_COLOR = "#0b1220";

function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  React.useLayoutEffect(() => {
    if (typeof document === "undefined") return;

    const color =
      resolvedTheme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;

    const metas = document.querySelectorAll<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );

    // Next.js may emit multiple `theme-color` metas (e.g. with media queries).
    // Update them all so the browser UI color follows the user's in-app theme.
    metas.forEach((meta) => meta.setAttribute("content", color));
  }, [resolvedTheme]);

  return null;
}
