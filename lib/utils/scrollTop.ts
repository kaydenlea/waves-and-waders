"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { clearCachedHourSliderTrackGradient } from "@/lib/ui/hourSliderTrackCache";
import { getSheetScrollElement } from "@/lib/ui/sheetScroll";

function scrollToTopNow() {
  if (typeof window === "undefined") return;
  if (typeof document !== "undefined") {
    document.documentElement?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }
  try {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  } catch {
    window.scrollTo(0, 0);
  }

  // Map pages can render an internal bottom-sheet scroller; keep it in sync.
  const sheet = getSheetScrollElement();
  if (sheet) {
    try {
      sheet.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      sheet.scrollTop = 0;
    }
  }
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

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("load", onLoad);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("scroll", onScroll);
      if (timeoutId != null) window.clearTimeout(timeoutId);
      if (rafId != null) window.cancelAnimationFrame(rafId);
      delete document.body.dataset.wwScrolling;
    };
  }, []);

  return null;
}
