"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

import {
  FORECAST_PREVIEW_CARDS,
  type ForecastPreviewImage,
} from "@/components/visuals/ForecastPreviewCards";
import ForecastPreviewFrame from "@/components/visuals/ForecastPreviewFrame";

type SlideImage = {
  light: ForecastPreviewImage["light"];
  dark: ForecastPreviewImage["dark"];
};

type Slide = {
  key: string;
  title: string;
  helper?: string;
  image: SlideImage;
};

const SLIDES: Slide[] = FORECAST_PREVIEW_CARDS.map((card) => ({
  key: card.key,
  title: card.title,
  helper: card.description,
  image: card.image,
}));

export default function DashboardPersonalizationCarousel() {
  const reducedMotion = useReducedMotion();
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  const [activeIndex, setActiveIndex] = React.useState(0);
  const active = SLIDES[activeIndex] ?? SLIDES[0]!;

  const [isHovered, setIsHovered] = React.useState(false);
  const [isInteracting, setIsInteracting] = React.useState(false);
  const [inView, setInView] = React.useState(true);
  const [isPageVisible, setIsPageVisible] = React.useState(true);

  const autoRotateMs = 6500;
  const interactionTimeoutRef = React.useRef<number | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const resumeTimeoutRef = React.useRef<number | null>(null);
  const lastFrameRef = React.useRef<number | null>(null);
  const elapsedRef = React.useRef(0);

  const clearInteractionTimeout = React.useCallback(() => {
    if (interactionTimeoutRef.current == null) return;
    window.clearTimeout(interactionTimeoutRef.current);
    interactionTimeoutRef.current = null;
  }, []);

  const setInteractingFor = React.useCallback(
    (ms: number) => {
      if (typeof window === "undefined") return;
      setIsInteracting(true);
      clearInteractionTimeout();
      interactionTimeoutRef.current = window.setTimeout(() => {
        setIsInteracting(false);
        interactionTimeoutRef.current = null;
      }, ms);
    },
    [clearInteractionTimeout]
  );

  const go = React.useCallback((next: number) => {
    const clamped = ((next % SLIDES.length) + SLIDES.length) % SLIDES.length;
    setActiveIndex(clamped);
  }, []);

  const goWithReset = React.useCallback(
    (next: number) => {
      go(next);
      setInteractingFor(1800);
    },
    [go, setInteractingFor]
  );

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => setIsPageVisible(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const node = rootRef.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setInView(Boolean(entry?.isIntersecting));
      },
      { root: null, rootMargin: "0px", threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const autoRotateEnabled =
    !reducedMotion && inView && isPageVisible && !isHovered && !isInteracting;

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

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (SLIDES.length <= 1) return;

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
      const pct = Math.min(1, elapsedRef.current / autoRotateMs);

      if (pct >= 1) {
        elapsedRef.current = 0;
        lastFrameRef.current = ts;
        setActiveIndex((prev) => (prev + 1) % SLIDES.length);
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => stopLoop();
  }, [autoRotateEnabled, autoRotateMs, stopLoop]);

  React.useEffect(() => {
    return () => {
      clearInteractionTimeout();
      stopLoop();
    };
  }, [clearInteractionTimeout, stopLoop]);

  React.useEffect(() => {
    resetCycle();
  }, [activeIndex, resetCycle]);

  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative h-full w-full outline-none",
        "focus-visible:ring-2 focus-visible:ring-foreground/20"
      )}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Dashboard personalization demo"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          goWithReset(activeIndex - 1);
          resetCycle();
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          goWithReset(activeIndex + 1);
          resetCycle();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={(event) => {
        const t = event.touches?.[0];
        if (!t) return;
        touchStartRef.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(event) => {
        const start = touchStartRef.current;
        touchStartRef.current = null;
        const t = event.changedTouches?.[0];
        if (!start || !t) return;
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) < 40) return;
        if (Math.abs(dx) < Math.abs(dy) * 1.2) return;
        setInteractingFor(2200);
        if (dx < 0) goWithReset(activeIndex + 1);
        else goWithReset(activeIndex - 1);
        resetCycle();
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active.key}
          className="absolute inset-0"
          initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
          }
        >
          <div
            className="h-full w-full"
            onPointerDownCapture={() => {
              setInteractingFor(2200);
              resetCycle();
            }}
            onTouchStartCapture={() => {
              setInteractingFor(2200);
              resetCycle();
            }}
          >
            <ForecastPreviewFrame
              title={active.title}
              description={active.helper ?? ""}
              image={active.image}
              sizes="(max-width: 640px) 92vw, (max-width: 1280px) 60vw, 48vw"
              onPrev={() => {
                goWithReset(activeIndex - 1);
                resetCycle();
              }}
              onNext={() => {
                goWithReset(activeIndex + 1);
                resetCycle();
              }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
