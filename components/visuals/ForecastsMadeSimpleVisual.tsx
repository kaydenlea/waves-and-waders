"use client";

import * as React from "react";
import { useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

import {
  FORECAST_PREVIEW_CARDS,
} from "@/components/visuals/ForecastPreviewCards";
import ForecastPreviewFrame from "@/components/visuals/ForecastPreviewFrame";

const CARDS = FORECAST_PREVIEW_CARDS;

function useInView(
  ref: React.RefObject<HTMLElement | null>,
  rootMargin = "200px 0px"
) {
  const [inView, setInView] = React.useState(true);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const node = ref.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => setInView(Boolean(entries[0]?.isIntersecting)),
      { root: null, rootMargin, threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin]);
  return inView;
}

export default function ForecastsMadeSimpleVisual({
  className,
  rootMargin,
}: {
  className?: string;
  rootMargin?: string;
}) {
  const reducedMotion = useReducedMotion();
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(rootRef, rootMargin);

  const [shouldRender, setShouldRender] = React.useState(false);
  React.useEffect(() => {
    if (!inView) return;
    setShouldRender(true);
  }, [inView]);

  const [isHovered, setIsHovered] = React.useState(false);
  const [isInteracting, setIsInteracting] = React.useState(false);
  const [isPageVisible, setIsPageVisible] = React.useState(true);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => setIsPageVisible(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const autoRotateMs = 6500;
  const [activeIndex, setActiveIndex] = React.useState(0);

  const rafRef = React.useRef<number | null>(null);
  const resumeTimeoutRef = React.useRef<number | null>(null);
  const lastFrameRef = React.useRef<number | null>(null);
  const elapsedRef = React.useRef(0);
  const interactionTimeoutRef = React.useRef<number | null>(null);

  const stopLoop = React.useCallback(() => {
    if (typeof window === "undefined") return;
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (resumeTimeoutRef.current != null) {
      window.clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    lastFrameRef.current = null;
  }, []);

  const resetCycle = React.useCallback(() => {
    elapsedRef.current = 0;
    lastFrameRef.current = null;
  }, []);

  const setInteractingFor = React.useCallback((ms: number) => {
    if (typeof window === "undefined") return;
    setIsInteracting(true);
    if (interactionTimeoutRef.current != null) {
      window.clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = window.setTimeout(() => {
      interactionTimeoutRef.current = null;
      setIsInteracting(false);
    }, ms);
  }, []);

  const autoRotateEnabled =
    shouldRender &&
    inView &&
    isPageVisible &&
    !reducedMotion &&
    !isHovered &&
    !isInteracting &&
    CARDS.length > 1;

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!autoRotateEnabled) {
      stopLoop();
      return;
    }

    const tick = (ts: number) => {
      if (!autoRotateEnabled) return;

      // Perf: avoid frequent React updates during active scroll.
      if (document.body.dataset.wwScrolling === "1") {
        lastFrameRef.current = ts;
        if (rafRef.current != null) {
          window.cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        if (resumeTimeoutRef.current == null) {
          const scheduleResume = () => {
            resumeTimeoutRef.current = window.setTimeout(() => {
              resumeTimeoutRef.current = null;
              if (!autoRotateEnabled) return;
              if (document.body.dataset.wwScrolling === "1") {
                scheduleResume();
                return;
              }
              rafRef.current = window.requestAnimationFrame(tick);
            }, 180);
          };
          scheduleResume();
        }
        return;
      }

      const last = lastFrameRef.current ?? ts;
      const dt = ts - last;
      lastFrameRef.current = ts;
      elapsedRef.current += dt;

      if (elapsedRef.current >= autoRotateMs) {
        elapsedRef.current = 0;
        lastFrameRef.current = ts;
        setActiveIndex((prev) => (prev + 1) % CARDS.length);
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => stopLoop();
  }, [autoRotateEnabled, autoRotateMs, stopLoop]);

  React.useEffect(() => resetCycle(), [activeIndex, resetCycle]);

  React.useEffect(() => {
    return () => {
      if (
        typeof window !== "undefined" &&
        interactionTimeoutRef.current != null
      ) {
        window.clearTimeout(interactionTimeoutRef.current);
        interactionTimeoutRef.current = null;
      }
      stopLoop();
    };
  }, [stopLoop]);

  const go = React.useCallback(
    (next: number) => {
      const clamped = ((next % CARDS.length) + CARDS.length) % CARDS.length;
      setActiveIndex(clamped);
      setInteractingFor(1800);
      resetCycle();
    },
    [resetCycle, setInteractingFor]
  );

  const sizes = "(max-width: 640px) 92vw, (max-width: 1280px) 60vw, 48vw";

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative w-full outline-none",
        "focus-visible:ring-2 focus-visible:ring-foreground/20",
        className
      )}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Forecasts made simple demo"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDownCapture={() => {
        setInteractingFor(2200);
        resetCycle();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(activeIndex - 1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          go(activeIndex + 1);
        }
      }}
    >
      <div className="relative aspect-[16/10] min-h-[18rem] sm:min-h-[20rem] w-full">
        {!shouldRender ? (
          <div className="absolute inset-0 overflow-hidden rounded-2xl border border-border/60 bg-highlight-5 shadow-lg shadow-black/10 ring-1 ring-black/5">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-highlight-5 via-highlight-3/40 to-highlight-5 motion-reduce:animate-none" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(37,99,235,0.12),transparent_50%)]" />
          </div>
        ) : (
          <>
            {CARDS.map((card, idx) => {
              const dist = (idx - activeIndex + CARDS.length) % CARDS.length;
              if (dist > 2) return null;
              const pos = dist; // 0 = front
              const x = pos * 14;
              const y = pos * 14;
              const scale = 1 - pos * 0.032;
              const opacity = pos === 2 ? 0.72 : pos === 1 ? 0.9 : 1;
              const z = 30 - pos;
              return (
                <div
                  key={card.key}
                  className={cn(
                    "absolute inset-0 origin-bottom-left transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    "motion-reduce:transition-none rounded-2xl"
                  )}
                  style={{
                    transform: `translate(${x}px, ${y}px) scale(${scale})`,
                    opacity,
                    zIndex: z,
                    pointerEvents: pos === 0 ? "auto" : "none",
                  }}
                  aria-hidden={pos !== 0}
                >
                  <ForecastPreviewFrame
                    title={card.title}
                    description={card.description}
                    image={card.image}
                    sizes={sizes}
                    onPrev={() => go(activeIndex - 1)}
                    onNext={() => go(activeIndex + 1)}
                  />
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
