"use client";

import * as React from "react";

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
    let lastTextEntryFocusTs = 0;
    let lastKeyboardOpenTs = 0;
    let keyboardWasReduced = false;

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

      const vv = window.visualViewport;
      const vvHeight = vv?.height ?? innerH;
      const vvTop = vv?.offsetTop ?? 0;
      const bottomUi = Math.max(0, innerH - (vvHeight + vvTop));
      const now = window.performance?.now?.() ?? Date.now();

      const activeEl = document.activeElement as HTMLElement | null;
      const activeIsTextEntry =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.isContentEditable;

      if (activeIsTextEntry) lastTextEntryFocusTs = now;
      const recentTextEntry = now - lastTextEntryFocusTs < 1500;

      // Keyboard heuristic: when the visual viewport is significantly reduced.
      // Avoid treating this transient reduction as "browser chrome" space.
      const keyboardViewportReduced = bottomUi > 160 && vvHeight < innerH - 80;
      const keyboardLikelyOpen =
        keyboardViewportReduced && (activeIsTextEntry || recentTextEntry);

      if (keyboardLikelyOpen) lastKeyboardOpenTs = now;

      // iOS Safari can sometimes leave `visualViewport.height` in a reduced state after the
      // keyboard dismisses (especially after scrolling). If the viewport still looks reduced
      // but we haven't had a focused text entry recently, treat it as "stuck" and recover.
      const keyboardStuckLikely =
        keyboardViewportReduced &&
        !keyboardLikelyOpen &&
        now - lastKeyboardOpenTs > 800;
      const keyboardReducedEffective =
        keyboardViewportReduced && !keyboardStuckLikely;

      // On iOS Safari, `visualViewport.height` can get "stuck" after the keyboard
      // dismisses (remaining smaller than the actual visible viewport). When the
      // keyboard is likely open, trust the smaller visual viewport; otherwise use
      // the larger layout viewport height so the page snaps back correctly.
      const heightPxRaw =
        vv != null
          ? keyboardReducedEffective
            ? vvHeight
            : Math.max(innerH, vvHeight)
          : innerH;
      const heightPx =
        Number.isFinite(heightPxRaw) && heightPxRaw > 0 ? heightPxRaw : null;
      if (!heightPx) return;

      // 1vh equivalent in px based on the effective viewport height.
      root.style.setProperty("--ww-vh", `${heightPx * 0.01}px`);

      root.style.setProperty(
        "--ww-keyboard-inset",
        `${keyboardReducedEffective ? bottomUi : 0}px`,
      );

      if (!keyboardViewportReduced && bottomUi > maxBottomUiPx) {
        maxBottomUiPx = bottomUi;
      }
      root.style.setProperty("--ww-bottom-ui", `${maxBottomUiPx}px`);

      if (keyboardReducedEffective) {
        keyboardWasReduced = true;
      } else if (keyboardWasReduced) {
        keyboardWasReduced = false;
        stableViewportHeightPx = null;
      }

      // `.ww-stable-viewport` uses `100svh` as a fallback, but on some mobile browsers the
      // "small viewport" can get stuck after the on-screen keyboard has been shown.
      // Track a stable viewport height in px that ignores keyboard-induced resizes.
      if (!keyboardReducedEffective) {
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
      root.style.removeProperty("--ww-keyboard-inset");
    };
  }, []);

  return null;
}
