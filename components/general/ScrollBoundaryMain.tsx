"use client";

import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useRef } from "react";

type ScrollBoundaryMainProps = ComponentPropsWithoutRef<"main"> & {
  lockBodyScroll?: boolean;
};

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
    if (typeof document === "undefined") return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;

    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
    };

    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [lockBodyScroll]);

  return (
    <main
      ref={containerRef}
      className={cn(
        "h-[100svh] supports-[height:100dvh]:h-[100dvh] overflow-y-auto overflow-x-hidden overscroll-none",
        className
      )}
      style={keyboardPaddingStyle.current}
      {...props}
    >
      {children}
    </main>
  );
}
