"use client";

import * as React from "react";

export default function ScrollPerformanceController() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    let rafId: number | null = null;
    let clearTimer: number | null = null;
    let active = false;

    const setActive = (next: boolean) => {
      if (active === next) return;
      active = next;
      if (next) {
        document.body.dataset.wwScrolling = "1";
      } else {
        delete document.body.dataset.wwScrolling;
      }
    };

    const scheduleClear = () => {
      if (clearTimer != null) window.clearTimeout(clearTimer);
      clearTimer = window.setTimeout(() => {
        clearTimer = null;
        setActive(false);
      }, 180);
    };

    const onScrollActivity = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        setActive(true);
        scheduleClear();
      });
    };

    window.addEventListener("scroll", onScrollActivity, { passive: true });
    window.addEventListener("wheel", onScrollActivity, { passive: true });
    window.addEventListener("touchmove", onScrollActivity, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScrollActivity);
      window.removeEventListener("wheel", onScrollActivity);
      window.removeEventListener("touchmove", onScrollActivity);
      if (rafId != null) window.cancelAnimationFrame(rafId);
      if (clearTimer != null) window.clearTimeout(clearTimer);
      setActive(false);
    };
  }, []);

  return null;
}

