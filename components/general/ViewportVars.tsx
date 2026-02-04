"use client";

import * as React from "react";

function getViewportHeightPx() {
  if (typeof window === "undefined") return null;
  const vv = window.visualViewport;
  // On iOS, visualViewport can be smaller than the full layout viewport near
  // the notch/dynamic-island area. Use the larger of the two so sections don't
  // look clipped at the top edge.
  const height = Math.max(window.innerHeight, vv?.height ?? 0);
  return Number.isFinite(height) && height > 0 ? height : null;
}

export default function ViewportVars() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    let rafId: number | null = null;
    let clearChangingTimer: number | null = null;
    let lastHeightPx: number | null = null;

    const apply = () => {
      const heightPx = getViewportHeightPx();
      if (!heightPx) return;
      // 1vh equivalent in px based on the *visual* viewport (handles iOS Safari toolbars).
      root.style.setProperty("--ww-vh", `${heightPx * 0.01}px`);

      // When the browser UI (URL bar / bottom controls) hides/shows, visualViewport.height changes.
      // While that animation is happening, other UI (like our BottomNav auto-hide) should avoid
      // doing simultaneous direction-based show/hide transitions.
      if (lastHeightPx == null || Math.abs(heightPx - lastHeightPx) >= 1) {
        root.dataset.wwViewportChanging = "1";
        lastHeightPx = heightPx;
        if (clearChangingTimer != null) {
          window.clearTimeout(clearChangingTimer);
        }
        clearChangingTimer = window.setTimeout(() => {
          clearChangingTimer = null;
          delete root.dataset.wwViewportChanging;
        }, 220);
      }
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
      if (clearChangingTimer != null) window.clearTimeout(clearChangingTimer);
      delete root.dataset.wwViewportChanging;
    };
  }, []);

  return null;
}
