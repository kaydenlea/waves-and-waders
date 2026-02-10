"use client";

import { useEffect, useRef } from "react";

const SCROLL_IDLE_MS = 160;
const FAST_SCROLL_PX_PER_S = 2200;

export default function ScrollPerfHandler() {
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const lastYRef = useRef<number | null>(null);
  const lastTRef = useRef<number | null>(null);
  const fastRef = useRef(false);

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
        body.removeAttribute("data-ww-fast-scroll");
        fastRef.current = false;
        activeRef.current = false;
        timerRef.current = null;
      }, SCROLL_IDLE_MS);
    };

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        const now = window.performance?.now?.() ?? Date.now();
        const y = window.scrollY ?? 0;
        const lastY = lastYRef.current;
        const lastT = lastTRef.current;
        if (lastY != null && lastT != null) {
          const dt = Math.max(1, now - lastT);
          const v = (Math.abs(y - lastY) / dt) * 1000;
          const nextFast = v >= FAST_SCROLL_PX_PER_S;
          if (fastRef.current !== nextFast) {
            fastRef.current = nextFast;
            if (nextFast) body.setAttribute("data-ww-fast-scroll", "1");
            else body.removeAttribute("data-ww-fast-scroll");
          }
        }
        lastYRef.current = y;
        lastTRef.current = now;
        setScrolling();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
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
      body.removeAttribute("data-ww-fast-scroll");
      activeRef.current = false;
      fastRef.current = false;
      lastYRef.current = null;
      lastTRef.current = null;
    };
  }, []);

  return null;
}
