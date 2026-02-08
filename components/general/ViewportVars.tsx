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
    let maxBottomUiPx = 0;
    let lastInnerSize: { w: number; h: number } | null = null;
    let stableViewportHeightPx: number | null = null;

    const apply = () => {
      const innerW = window.innerWidth;
      const innerH = window.innerHeight;
      if (
        lastInnerSize == null ||
        Math.abs(innerW - lastInnerSize.w) > 120 ||
        Math.abs(innerH - lastInnerSize.h) > 120
      ) {
        maxBottomUiPx = 0;
        stableViewportHeightPx = null;
        lastInnerSize = { w: innerW, h: innerH };
      }

      const heightPx = getViewportHeightPx();
      if (!heightPx) return;
      // 1vh equivalent in px based on the *visual* viewport (handles iOS Safari toolbars).
      root.style.setProperty("--ww-vh", `${heightPx * 0.01}px`);

      const vv = window.visualViewport;
      const vvHeight = vv?.height ?? innerH;
      const vvTop = vv?.offsetTop ?? 0;
      const bottomUi = Math.max(0, innerH - (vvHeight + vvTop));

      const activeEl = document.activeElement as HTMLElement | null;
      const activeIsTextEntry =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.isContentEditable;

      // Keyboard heuristic: when the visual viewport is significantly reduced.
      // Avoid treating this transient reduction as "browser chrome" space.
      const keyboardViewportReduced = bottomUi > 160 && vvHeight < innerH - 80;
      const keyboardLikelyOpen = activeIsTextEntry && keyboardViewportReduced;

      if (!keyboardViewportReduced && bottomUi > maxBottomUiPx) {
        maxBottomUiPx = bottomUi;
      }
      root.style.setProperty("--ww-bottom-ui", `${maxBottomUiPx}px`);

      // `.ww-stable-viewport` uses `100svh` as a fallback, but on some mobile browsers the
      // "small viewport" can get stuck after the on-screen keyboard has been shown.
      // Track a stable viewport height in px that ignores keyboard-induced resizes.
      if (!keyboardLikelyOpen) {
        stableViewportHeightPx =
          stableViewportHeightPx == null
            ? heightPx
            : Math.min(stableViewportHeightPx, heightPx);
        root.style.setProperty(
          "--ww-stable-100vh",
          `${stableViewportHeightPx}px`,
        );
      }

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
    window.addEventListener("focusin", schedule, { passive: true });
    window.addEventListener("focusout", schedule, { passive: true });

    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("focusin", schedule);
      window.removeEventListener("focusout", schedule);
      if (rafId != null) window.cancelAnimationFrame(rafId);
      if (clearChangingTimer != null) window.clearTimeout(clearChangingTimer);
      delete root.dataset.wwViewportChanging;
      root.style.removeProperty("--ww-stable-100vh");
    };
  }, []);

  return null;
}
