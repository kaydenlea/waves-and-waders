"use client";

import * as React from "react";

function getViewportHeightPx() {
  if (typeof window === "undefined") return null;
  const vv = window.visualViewport;
  const height = vv?.height ?? window.innerHeight;
  return Number.isFinite(height) && height > 0 ? height : null;
}

export default function ViewportVars() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    let rafId: number | null = null;

    const apply = () => {
      const heightPx = getViewportHeightPx();
      if (!heightPx) return;
      // 1vh equivalent in px based on the *visual* viewport (handles iOS Safari toolbars).
      root.style.setProperty("--ww-vh", `${heightPx * 0.01}px`);
    };

    const schedule = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        apply();
      });
    };

    apply();

    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule, {
      passive: true,
    });
    // iOS Safari can change visualViewport.height during scroll as the URL bar hides/shows.
    window.visualViewport?.addEventListener("scroll", schedule, {
      passive: true,
    });

    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      if (rafId != null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return null;
}

