"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { clearCachedHourSliderTrackGradient } from "@/lib/ui/hourSliderTrackCache";
import {
  addScrollListener,
  getActiveScrollContainer,
  notifyScrollOwnerChanged,
  scrollToTop,
} from "@/lib/utils/activeScroll";

function scrollToTopNow() {
  if (typeof window === "undefined") return;
  const container = getActiveScrollContainer();
  scrollToTop(container);
}

function forceScrollToTop(frames = 3) {
  scrollToTopNow();
  let remaining = Math.max(0, frames - 1);
  const tick = () => {
    if (remaining <= 0) return;
    remaining -= 1;
    scrollToTopNow();
    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
  window.setTimeout(scrollToTopNow, 60);
}

export function ScrollToTopOnRouteChange() {
  const pathname = usePathname();
  const prev = useRef<string>("");

  useEffect(() => {
    // Mobile browsers (notably iOS Safari) can aggressively restore scroll position on reload
    // or BFCache. Opt out so our app's navigation behavior is consistent.
    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
    } catch {
      // ignore
    }
  }, []);

  useLayoutEffect(() => {
    // Always scroll to top on route change, unless after editing dashboard.
    if (!prev.current.endsWith("/edit")) forceScrollToTop();
    clearCachedHourSliderTrackGradient();
    prev.current = pathname;
    // The active scroller can change across routes (e.g. map pages on mobile).
    notifyScrollOwnerChanged();
  }, [pathname]);

  useEffect(() => {
    // Some mobile browsers restore scroll *after* React effects; reinforce scroll-to-top on load/show.
    const onLoad = () => {
      if (!prev.current.endsWith("/edit")) forceScrollToTop(5);
    };
    const onPageShow = () => {
      if (!prev.current.endsWith("/edit")) forceScrollToTop(5);
    };

    window.addEventListener("load", onLoad);
    window.addEventListener("pageshow", onPageShow);

    const SCROLL_IDLE_MS = 160;
    let timeoutId: number | null = null;
    let rafId: number | null = null;
    let active = false;
    let lastScrollAt = 0;
    let removeScrollListener: (() => void) | null = null;

    const stopScrolling = () => {
      delete document.body.dataset.wwScrolling;
      active = false;
      timeoutId = null;
    };

    const checkIdle = () => {
      const elapsed = window.performance.now() - lastScrollAt;
      if (elapsed < SCROLL_IDLE_MS) {
        timeoutId = window.setTimeout(checkIdle, SCROLL_IDLE_MS - elapsed);
        return;
      }
      stopScrolling();
    };

    const onScroll = () => {
      lastScrollAt = window.performance.now();
      if (rafId == null) {
        rafId = window.requestAnimationFrame(() => {
          rafId = null;
          if (!active) {
            document.body.dataset.wwScrolling = "1";
            active = true;
          }
          if (timeoutId == null) {
            timeoutId = window.setTimeout(checkIdle, SCROLL_IDLE_MS);
          }
        });
      }
    };

    const bind = () => {
      removeScrollListener?.();
      removeScrollListener = addScrollListener(getActiveScrollContainer(), onScroll, {
        passive: true,
      });
    };

    bind();
    window.addEventListener("ww-scroll-owner-changed", bind);
    return () => {
      window.removeEventListener("load", onLoad);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("ww-scroll-owner-changed", bind);
      removeScrollListener?.();
      if (timeoutId != null) window.clearTimeout(timeoutId);
      if (rafId != null) window.cancelAnimationFrame(rafId);
      delete document.body.dataset.wwScrolling;
    };
  }, []);

  return null;
}
