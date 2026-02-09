"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMapUI } from "../context/MapFilterContext";

export default function PathStyleWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const {
    showMap,
    contentCollapsed,
    setContentCollapsed,
    contentRevealRequestId,
  } = useMapUI();
  const beachPage = pathname.endsWith("/beaches");
  const editPage = pathname.endsWith("/edit");
  const overviewPage = pathname.includes("/overview");
  const effectiveEditPage = editPage;
  const shouldLockOverscroll = beachPage || overviewPage;
  const disableMobileGpuTransform = beachPage || overviewPage;
  const enforceContentPeek = beachPage || overviewPage;
  // Keep SSR markup consistent with the first client render to avoid hydration mismatches.
  const [smallScreen, setSmallScreen] = useState(false);
  const atTopRef = useRef(true);
  const lastScrollEventAtRef = useRef(0);
  const lastReachedTopAtRef = useRef(0);
  const [finePointer, setFinePointer] = useState(false);
  const gestureStartYRef = useRef<number | null>(null);
  const gestureStartXRef = useRef<number | null>(null);
  const gestureLockedUntilEndRef = useRef(false);
  const gestureArmedRef = useRef(false);
  const [pullOffsetPx, setPullOffsetPx] = useState(0);
  const [pulling, setPulling] = useState(false);
  const lastHandledRevealRequestRef = useRef(0);
  const lastInitializedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldLockOverscroll) return;
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const body = document.body;
    html.dataset.wwMapOverscrollLock = "1";
    body.dataset.wwMapOverscrollLock = "1";
    return () => {
      delete html.dataset.wwMapOverscrollLock;
      delete body.dataset.wwMapOverscrollLock;
    };
  }, [shouldLockOverscroll]);

  // iOS Safari can still "rubber band" past the scroll bounds during aggressive flicks
  // even with overscroll-behavior. Prevent it only at the top/bottom edges.
  useEffect(() => {
    if (!shouldLockOverscroll) return;
    if (typeof window === "undefined") return;
    if (typeof document === "undefined") return;
    // if (window.innerWidth >= 911) return;

    const scrollingEl = document.scrollingElement as HTMLElement | null;
    if (!scrollingEl) return;

    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startY = e.touches[0]?.clientY ?? 0;
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
      const y = e.touches[0]?.clientY ?? 0;
      const dy = y - startY;
      if (dy === 0) return;

      const nestedScroller = findNestedScrollableAncestor(e.target);
      if (nestedScroller) {
        const atTop = nestedScroller.scrollTop <= 0;
        const atBottom =
          nestedScroller.scrollTop + nestedScroller.clientHeight >=
          nestedScroller.scrollHeight - 1;
        if ((dy > 0 && atTop) || (dy < 0 && atBottom)) {
          e.preventDefault();
        }
        return;
      }

      const atTop = scrollingEl.scrollTop <= 0;
      const atBottom =
        scrollingEl.scrollTop + scrollingEl.clientHeight >=
        scrollingEl.scrollHeight - 1;

      if ((dy > 0 && atTop) || (dy < 0 && atBottom)) {
        e.preventDefault();
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, [shouldLockOverscroll]);

  useEffect(() => {
    if (!enforceContentPeek) return;
    if (typeof window === "undefined") return;

    const sync = () => {
      setSmallScreen(window.innerWidth < 911);
      const nextAtTop = window.scrollY <= 1;
      atTopRef.current = nextAtTop;
      const now = window.performance?.now?.() ?? Date.now();
      if (nextAtTop) lastReachedTopAtRef.current = now;
    };

    sync();
    const onResize = () => sync();
    const onScroll = () => {
      const now = window.performance?.now?.() ?? Date.now();
      lastScrollEventAtRef.current = now;
      const nextAtTop = window.scrollY <= 1;
      if (nextAtTop && !atTopRef.current) lastReachedTopAtRef.current = now;
      atTopRef.current = nextAtTop;
    };

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [enforceContentPeek]);

  useLayoutEffect(() => {
    if (!enforceContentPeek) return;
    if (typeof window === "undefined") return;
    setSmallScreen(window.innerWidth < 911);
  }, [enforceContentPeek]);

  useEffect(() => {
    if (!enforceContentPeek) return;
    if (typeof window === "undefined") return;
    if (typeof window.matchMedia !== "function") return;

    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFinePointer(Boolean(mq.matches));
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, [enforceContentPeek]);

  useEffect(() => {
    if (!enforceContentPeek) {
      lastInitializedPathRef.current = null;
      setContentCollapsed(false);
      return;
    }
    setPullOffsetPx(0);
    setPulling(false);
    gestureLockedUntilEndRef.current = false;
    gestureStartXRef.current = null;
    gestureStartYRef.current = null;
  }, [enforceContentPeek, setContentCollapsed]);

  useLayoutEffect(() => {
    if (!enforceContentPeek) return;
    if (typeof window === "undefined") return;

    const isMobile = window.innerWidth < 911;
    if (!isMobile) {
      setContentCollapsed(false);
      return;
    }

    // Always start collapsed on mobile whenever entering /beaches or /overview.
    // Use a layout effect so it never flashes open during reload/navigation.
    if (lastInitializedPathRef.current === pathname) return;
    lastInitializedPathRef.current = pathname;
    setContentCollapsed(true);
    try {
      window.scrollTo(0, 0);
    } catch {
      window.scrollTo(0, 0);
    }
  }, [enforceContentPeek, pathname, setContentCollapsed]);

  useLayoutEffect(() => {
    if (!enforceContentPeek) return;
    if (!smallScreen) return;
    if (contentCollapsed) return;
    if (typeof window === "undefined") return;
    if (typeof document === "undefined") return;
    if (contentRevealRequestId <= 0) return;
    if (lastHandledRevealRequestRef.current === contentRevealRequestId) return;
    lastHandledRevealRequestRef.current = contentRevealRequestId;

    // When expanding from a fully-collapsed (map-only) state, the spacer height
    // shrinks by the peek amount. Adjust scroll position in a layout effect so
    // the user doesn't see an intermediate "peek" jump before the smooth scroll.
    if (window.scrollY > 1) return;

    const rootFontSize = Number.parseFloat(
      window.getComputedStyle(document.documentElement).fontSize || "16",
    );
    const peekRem = 10;
    const peekPx = Math.max(
      0,
      Math.round((Number.isFinite(rootFontSize) ? rootFontSize : 16) * peekRem),
    );
    if (peekPx > 0) {
      try {
        window.scrollTo(0, peekPx);
      } catch {
        window.scrollTo(0, peekPx);
      }
    }
  }, [
    contentCollapsed,
    contentRevealRequestId,
    enforceContentPeek,
    smallScreen,
  ]);

  useEffect(() => {
    if (!enforceContentPeek) return;
    if (!smallScreen) return;
    if (typeof window === "undefined") return;
    if (typeof document === "undefined") return;

    const el = document.getElementById("content");
    if (!el) return;

    const thresholdPx = 70;

    const resetGesture = () => {
      gestureLockedUntilEndRef.current = false;
      gestureArmedRef.current = false;
      gestureStartXRef.current = null;
      gestureStartYRef.current = null;
      setPulling(false);
      setPullOffsetPx(0);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (contentCollapsed) return;
      if (window.scrollY > 1) return;
      if (e.touches.length !== 1) return;
      if (document.body.dataset.wwScrolling === "1") return;

      const now = window.performance?.now?.() ?? Date.now();
      const scrollIdleMs = now - (lastScrollEventAtRef.current || 0);
      const topIdleMs = now - (lastReachedTopAtRef.current || 0);

      // Prevent accidental collapse during aggressive flicks when the user
      // just arrived at the top; require a short "settle" at the peek.
      if (scrollIdleMs < 220 || topIdleMs < 220) return;

      const t = e.touches[0];
      gestureLockedUntilEndRef.current = false;
      gestureArmedRef.current = true;
      gestureStartXRef.current = t?.clientX ?? null;
      gestureStartYRef.current = t?.clientY ?? null;
      setPulling(true);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (gestureLockedUntilEndRef.current) {
        // Keep scroll locked until the user releases the touch; prevents dragging
        // the content back open during the same "collapse" gesture.
        e.preventDefault();
        return;
      }
      if (contentCollapsed) return;
      if (window.scrollY > 1) return;
      if (e.touches.length !== 1) return;
      if (!gestureArmedRef.current) return;

      const t = e.touches[0];
      const startX = gestureStartXRef.current;
      const startY = gestureStartYRef.current;
      if (startX == null || startY == null) return;

      const dx = (t?.clientX ?? startX) - startX;
      const dy = (t?.clientY ?? startY) - startY;

      if (dy <= 0) return;

      // At scroll-top, treat a downward pull on the content sheet as an explicit
      // "collapse to map" gesture instead of overscroll bounce.
      e.preventDefault();

      const maxOffset = 18;
      const nextOffset = Math.max(
        0,
        Math.min(maxOffset, Math.round(dy * 0.12)),
      );
      setPullOffsetPx(nextOffset);

      const verticalEnough = Math.abs(dy) > Math.abs(dx) * 1.2;
      if (verticalEnough && dy > thresholdPx) {
        setContentCollapsed(true);
        gestureLockedUntilEndRef.current = true;
        gestureArmedRef.current = false;
        setPulling(false);
        setPullOffsetPx(0);
        try {
          window.scrollTo({ top: 0 });
        } catch {
          window.scrollTo(0, 0);
        }
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", resetGesture, { passive: true });
    el.addEventListener("touchcancel", resetGesture, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", resetGesture);
      el.removeEventListener("touchcancel", resetGesture);
    };
  }, [contentCollapsed, enforceContentPeek, setContentCollapsed, smallScreen]);

  // Intentionally do not auto-expand content on scroll position changes.
  // On map-driven pages the default should remain map-only until the user explicitly reveals content.

  const cls = useMemo(() => {
    if (beachPage) {
      return "w-full @min-4xl:w-90 @min-[1400px]:min-w-180";
    }
    return "@min-4xl:flex-1 max-w-320 @min-[1450px]:min-w-235 @min-[1700px]:min-w-265 @min-[1850px]:min-w-300";
  }, [beachPage]);

  const mobileSpacerBaseHeight =
    "calc(var(--ww-100vh, 100dvh) + env(safe-area-inset-top, 0px) - 4.25rem - max(env(safe-area-inset-bottom, 0px), var(--ww-bottom-ui, 0px)))";
  const mobilePeekHeight = "10rem";

  const spacerHeightStyle =
    !effectiveEditPage && enforceContentPeek && smallScreen
      ? {
          height: contentCollapsed
            ? mobileSpacerBaseHeight
            : `calc(${mobileSpacerBaseHeight} - ${mobilePeekHeight})`,
        }
      : !effectiveEditPage && smallScreen
        ? { height: mobileSpacerBaseHeight }
        : undefined;

  const applyPullTransform =
    enforceContentPeek && smallScreen && (pulling || pullOffsetPx !== 0);
  const shouldForceWebkitMask =
    enforceContentPeek && smallScreen && !effectiveEditPage;

  return (
    <>
      <div
        className={cn(
          effectiveEditPage ? "h-0" : "h-[var(--ww-100vh,100dvh)] @min-4xl:h-0",
          "transition-[height] duration-200 ease-out motion-reduce:transition-none",
        )}
        style={spacerHeightStyle}
      />
      <article
        id="content"
        className={cn(
          "relative isolate overflow-clip touch-pan-y w-full px-2 @min-4xl:pt-4 bg-background border-t border-x border-border/70 @min-4xl:border-none mx-auto scroll-mt-32",
          // Preserve mobile rendering/perf behavior but avoid breaking `position: fixed`
          // descendants (e.g. floating “Show map” tab) on desktop.
          disableMobileGpuTransform ? "transform-none" : "transform-gpu",
          "@min-4xl:transform-none",
          // Keep drag overlays / floating edit controls above the footer.
          effectiveEditPage ? "z-auto" : "z-30",
          cls,
          !effectiveEditPage
            ? "rounded-t-4xl @min-4xl:rounded-t-none pt-10"
            : "pt-10",
          overviewPage && "ww-disable-backdrop",
          showMap && "@min-4xl:pr-3",
        )}
        style={{
          ...(shouldForceWebkitMask
            ? {
                WebkitMaskImage: "-webkit-radial-gradient(white, white)",
              }
            : {}),
          ...(applyPullTransform
            ? {
                transform: `translate3d(0, ${pullOffsetPx}px, 0)`,
                transition: pulling
                  ? "none"
                  : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
                willChange: "transform",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }
            : {}),
        }}
      >
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 bg-background",
            !effectiveEditPage
              ? "rounded-t-4xl @min-4xl:rounded-t-none"
              : undefined,
          )}
        />
        {!effectiveEditPage && (
          <>
            {enforceContentPeek &&
            smallScreen &&
            finePointer &&
            !contentCollapsed ? (
              <button
                type="button"
                aria-label="Collapse content"
                title="Collapse content"
                onClick={() => {
                  setContentCollapsed(true);
                  try {
                    window.scrollTo({ top: 0 });
                  } catch {
                    window.scrollTo(0, 0);
                  }
                }}
                className={cn(
                  "block @min-4xl:hidden absolute top-5 left-1/2 -translate-x-1/2",
                  "h-2 w-20 rounded-full",
                  "bg-muted-foreground/50 hover:bg-muted-foreground/70",
                  "transition-[transform,background-color] duration-150",
                  "hover:scale-[1.05] focus-visible:scale-[1.05]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  "cursor-pointer",
                )}
              />
            ) : (
              <div className="block @min-4xl:hidden absolute top-5 left-1/2 transform -translate-x-1/2 h-2 w-20 bg-muted-foreground/50 rounded-full" />
            )}
          </>
        )}
        {children}
      </article>
    </>
  );
}
