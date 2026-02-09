"use client";

import { useEffect, useRef } from "react";

const SCROLL_IDLE_MS = 160;

export default function ScrollPerfHandler() {
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    const body = document.body;
    if (!body) return;

    const setScrolling = () => {
      if (!activeRef.current) {
        body.setAttribute("data-ww-scrolling", "1");
        activeRef.current = true;
      }
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        body.removeAttribute("data-ww-scrolling");
        activeRef.current = false;
        timerRef.current = null;
      }, SCROLL_IDLE_MS);
    };

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        setScrolling();
      });
    };

    // Listen in capture phase so we also catch internal scroll containers (e.g. mobile map pages).
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("scroll", onScroll);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      body.removeAttribute("data-ww-scrolling");
      activeRef.current = false;
    };
  }, []);

  return null;
}
