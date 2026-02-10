"use client";

import { useEffect } from "react";

// Prevent iOS Safari "rubber band" overscroll from leaving the page visually offset
// (blank space at the top/bottom) after aggressive swipes.
//
// CSS `overscroll-behavior` helps on many browsers, but iOS Safari can still overscroll
// past scroll bounds. This handler prevents default only at the top/bottom edges and
// respects nested scroll containers (sheets, menus, carousels, etc.).
export default function GlobalOverscrollLock() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof document === "undefined") return;

    const isCoarseTouch =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    if (!isCoarseTouch) return;

    const scrollingEl =
      (document.scrollingElement as HTMLElement | null) ??
      (document.documentElement as HTMLElement | null);
    if (!scrollingEl) return;

    let startY = 0;
    let startX = 0;
    let snapTimer: number | null = null;
    let snapRaf: number | null = null;

    const scheduleSnapBack = () => {
      if (snapRaf != null) return;
      snapRaf = window.requestAnimationFrame(() => {
        snapRaf = null;

        const maxScrollY = Math.max(
          0,
          (scrollingEl.scrollHeight || 0) - (scrollingEl.clientHeight || 0),
        );
        if (maxScrollY <= 0) return;

        // iOS can leave the document visually offset even when `scrollTop` is 0/max.
        // Use body bounds as the signal for visible blank space.
        const body = document.body;
        if (!body) return;
        const rect = body.getBoundingClientRect();
        const topGap = rect.top;
        const bottomGap = window.innerHeight - rect.bottom;

        if (topGap > 0.5) {
          try {
            window.scrollTo(0, 0);
          } catch {
            window.scrollTo(0, 0);
          }
          return;
        }

        if (bottomGap > 0.5) {
          try {
            window.scrollTo(0, maxScrollY);
          } catch {
            window.scrollTo(0, maxScrollY);
          }
        }
      });
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startY = e.touches[0]?.clientY ?? 0;
      startX = e.touches[0]?.clientX ?? 0;
    };

    const findNestedScrollableAncestor = (target: EventTarget | null) => {
      if (!target || !(target instanceof HTMLElement)) return null;
      let el: HTMLElement | null = target;
      while (el && el !== document.body && el !== scrollingEl) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        const canScrollY =
          (overflowY === "auto" || overflowY === "scroll") &&
          el.scrollHeight - el.clientHeight > 1;
        if (canScrollY) return el;
        el = el.parentElement;
      }
      return null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (!e.cancelable) return;

      const x = e.touches[0]?.clientX ?? 0;
      const y = e.touches[0]?.clientY ?? 0;
      const dy = y - startY;
      const dx = x - startX;

      if (dy === 0) return;

      // Don't interfere with primarily horizontal gestures (carousels, sliders).
      if (Math.abs(dx) > Math.abs(dy)) return;

      const nestedScroller = findNestedScrollableAncestor(e.target);
      if (nestedScroller) {
        const atTop = nestedScroller.scrollTop <= 0;
        const atBottom =
          nestedScroller.scrollTop + nestedScroller.clientHeight >=
          nestedScroller.scrollHeight - 1;
        if ((dy > 0 && atTop) || (dy < 0 && atBottom)) e.preventDefault();
        return;
      }

      const atTop = scrollingEl.scrollTop <= 0;
      const atBottom =
        scrollingEl.scrollTop + scrollingEl.clientHeight >=
        scrollingEl.scrollHeight - 1;
      if ((dy > 0 && atTop) || (dy < 0 && atBottom)) e.preventDefault();
    };

    const onTouchEnd = () => scheduleSnapBack();

    const onScroll = () => {
      if (snapTimer != null) window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => {
        snapTimer = null;
        scheduleSnapBack();
      }, 120);
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("scroll", onScroll);
      if (snapTimer != null) window.clearTimeout(snapTimer);
      if (snapRaf != null) window.cancelAnimationFrame(snapRaf);
    };
  }, []);

  return null;
}

