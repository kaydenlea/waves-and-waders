"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { clearCachedHourSliderTrackGradient } from "@/lib/ui/hourSliderTrackCache";

export function ScrollToTopOnRouteChange() {
  const pathname = usePathname();
  const prev = useRef<string>("");
  useEffect(() => {
    // always scroll to top on route change, unless after editing dashboard
    if (!prev.current.endsWith("/edit"))
      window.scrollTo({ top: 0, behavior: "auto" });
    clearCachedHourSliderTrackGradient();
    prev.current = pathname;
  }, [pathname]);

  useEffect(() => {
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
      window.removeEventListener("scroll", onScroll);
      if (timeoutId != null) window.clearTimeout(timeoutId);
      if (rafId != null) window.cancelAnimationFrame(rafId);
      delete document.body.dataset.wwScrolling;
    };
  }, []);

  return null;
}
