"use client";

import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useRef } from "react";
import { acquireScrollLock } from "@/lib/scrollLock";

type ScrollBoundaryMainProps = ComponentPropsWithoutRef<"main"> & {
  lockBodyScroll?: boolean;
};

const MOBILE_SCROLL_MEDIA = "(max-width: 911px)";

function isVerticallyScrollable(el: HTMLElement) {
  return el.scrollHeight > el.clientHeight + 1;
}

function findScrollableAncestor(
  start: HTMLElement | null,
  boundary: HTMLElement
): HTMLElement {
  let node: HTMLElement | null = start;
  while (node && node !== boundary) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      isVerticallyScrollable(node)
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return boundary;
}

export function ScrollBoundaryMain({
  lockBodyScroll = true,
  className,
  children,
  ...props
}: ScrollBoundaryMainProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const touchStartYRef = useRef(0);
  const touchScrollContainerRef = useRef<HTMLElement | null>(null);
  const keyboardPaddingStyle = useRef<React.CSSProperties>({
    paddingBottom:
      "calc(env(safe-area-inset-bottom, 0px) + var(--ww-keyboard-inset, 0px))",
    scrollPaddingBottom:
      "calc(env(safe-area-inset-bottom, 0px) + var(--ww-keyboard-inset, 0px))",
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (typeof window !== "undefined") {
      const mq = window.matchMedia?.(MOBILE_SCROLL_MEDIA);
      if (mq && !mq.matches) return;
    }

    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      const scroller = findScrollableAncestor(target, el);
      if (!isVerticallyScrollable(scroller)) {
        e.preventDefault();
        return;
      }

      const atTop = scroller.scrollTop <= 0;
      const atBottom =
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;

      if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
        e.preventDefault();
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartYRef.current = e.touches[0]?.clientY ?? 0;
      const target = e.target as HTMLElement | null;
      touchScrollContainerRef.current = findScrollableAncestor(target, el);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const scroller = touchScrollContainerRef.current ?? el;
      if (!isVerticallyScrollable(scroller)) {
        e.preventDefault();
        return;
      }

      const y = e.touches[0]?.clientY ?? 0;
      const dy = y - touchStartYRef.current;
      if (dy === 0) return;

      const atTop = scroller.scrollTop <= 0;
      const atBottom =
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;

      if ((dy > 0 && atTop) || (dy < 0 && atBottom)) {
        e.preventDefault();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  useEffect(() => {
    if (!lockBodyScroll) return;
    if (typeof window === "undefined") return;

    const mq = window.matchMedia?.(MOBILE_SCROLL_MEDIA);
    if (!mq) return acquireScrollLock();

    let release: (() => void) | null = null;

    const sync = () => {
      if (!mq.matches) {
        release?.();
        release = null;
        return;
      }
      if (!release) release = acquireScrollLock();
    };

    sync();
    mq.addEventListener?.("change", sync);
    return () => {
      mq.removeEventListener?.("change", sync);
      release?.();
      release = null;
    };
  }, [lockBodyScroll]);

  return (
    <main
      ref={containerRef}
      className={cn(
        // Only use an internal scroll container on narrow/mobile.
        // This prevents iOS overscroll/rubber-band from exposing the fixed map beneath content.
        "max-[911px]:h-[var(--ww-100vh,100svh)] max-[911px]:overflow-y-auto max-[911px]:overflow-x-hidden max-[911px]:overscroll-none",
        className
      )}
      data-ww-scroll-container="1"
      style={keyboardPaddingStyle.current}
      {...props}
    >
      {children}
    </main>
  );
}
