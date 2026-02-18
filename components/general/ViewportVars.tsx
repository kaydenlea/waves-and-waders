"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export default function ViewportVars() {
  const pathname = usePathname();

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
    let baselineVvHeightPx: number | null = null;

    const apply = () => {
      // While the search overlay is open, keep the underlying page layout stable.
      // The overlay measures `visualViewport` directly, but the background pages
      // (especially map views) should not resize/shift with the on-screen keyboard.
      if (
        root.dataset.wwSearchOverlay === "1" ||
        root.dataset.wwSearchOverlayClosing === "1"
      ) {
        root.style.setProperty("--ww-keyboard-inset", "0px");
        return;
      }

      const innerW = window.innerWidth;
      const innerH = window.innerHeight;
      if (
        lastInnerSize == null ||
        Math.abs(innerW - lastInnerSize.w) > 120 ||
        Math.abs(innerH - lastInnerSize.h) > 120
      ) {
        maxBottomUiPx = 0;
        stableViewportHeightPx = null;
        baselineVvHeightPx = null;
        lastInnerSize = { w: innerW, h: innerH };
      }

      const vv = window.visualViewport;
      const vvHeight = vv?.height ?? innerH;
      const vvTop = vv?.offsetTop ?? 0;
      const bottomUi = Math.max(0, innerH - (vvHeight + vvTop));
      const now = window.performance?.now?.() ?? Date.now();

      // Safety: `--ww-bottom-ui` is intended to represent browser chrome, not the keyboard.
      // If it ever gets contaminated by keyboard-sized values, immediately drop it.
      if (maxBottomUiPx > 180) maxBottomUiPx = 0;

      const activeEl = document.activeElement as HTMLElement | null;
      const activeIsTextEntry =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.isContentEditable;

      if (activeIsTextEntry) lastTextEntryFocusTs = now;
      const recentTextEntry = now - lastTextEntryFocusTs < 1500;

      // Establish a baseline visual viewport height from non-keyboard states.
      // This is more reliable than `document.activeElement` across navigations.
      const baseline = baselineVvHeightPx ?? vvHeight;
      baselineVvHeightPx = Math.max(baseline, vvHeight);

      // Keyboard heuristic: when the visual viewport is significantly reduced.
      // Use a baseline-based threshold so we don't accidentally "lock in" a reduced
      // viewport as the stable height after keyboard dismiss + scroll + navigation.
      const keyboardViewportReduced =
        bottomUi > 160 &&
        (bottomUi > 240 ||
          vvHeight < Math.min(innerH, baselineVvHeightPx) - 60 ||
          vvHeight < innerH - 120);

      const keyboardLikelyOpen =
        keyboardViewportReduced && (activeIsTextEntry || recentTextEntry);
      if (keyboardLikelyOpen) lastKeyboardOpenTs = now;

      // iOS Safari can leave `visualViewport.height` stuck small after dismissal.
      // If we still look reduced but the keyboard hasn't been likely-open recently,
      // treat it as "stuck" and recover to the layout height/baseline.
      const keyboardStuckLikely =
        keyboardViewportReduced && now - lastKeyboardOpenTs > 900;
      const keyboardReducedEffective =
        keyboardViewportReduced && !keyboardStuckLikely;

      root.dataset.wwKeyboardOpen = keyboardReducedEffective ? "1" : "0";

      // On iOS Safari, `visualViewport.height` can get "stuck" after the keyboard
      // dismisses (remaining smaller than the actual visible viewport). When the
      // keyboard is likely open, trust the smaller visual viewport; otherwise use
      // the larger layout viewport height so the page snaps back correctly.
      const heightPxRaw =
        vv != null
          ? keyboardReducedEffective
            ? vvHeight
            : keyboardStuckLikely
              ? Math.max(innerH, baselineVvHeightPx)
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

      // Only track bottom browser chrome sizes (keyboard is much larger).
      if (
        !keyboardViewportReduced &&
        bottomUi <= 160 &&
        bottomUi > maxBottomUiPx
      ) {
        maxBottomUiPx = bottomUi;
      }
      // While the keyboard is open, mobile browsers typically hide the bottom UI.
      // If we keep reserving `--ww-bottom-ui` during that state, pages that size
      // themselves using this var can end up with a visible empty gap.
      root.style.setProperty(
        "--ww-bottom-ui",
        `${keyboardReducedEffective ? 0 : maxBottomUiPx}px`,
      );

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
      delete root.dataset.wwKeyboardOpen;
      root.style.removeProperty("--ww-stable-100vh");
      root.style.removeProperty("--ww-keyboard-inset");
      root.style.removeProperty("--ww-bottom-ui");
      root.style.removeProperty("--ww-vh");
    };
  }, [pathname]);

  return null;
}
