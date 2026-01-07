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
    let timeoutId: number | null = null;
    let ticking = false;
    let active = false;

    const setScrolling = () => {
      if (!active) {
        document.body.dataset.wwScrolling = "1";
        active = true;
      }
      if (timeoutId != null) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        delete document.body.dataset.wwScrolling;
        active = false;
        timeoutId = null;
      }, 160);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        setScrolling();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timeoutId != null) window.clearTimeout(timeoutId);
      delete document.body.dataset.wwScrolling;
    };
  }, []);

  return null;
}
