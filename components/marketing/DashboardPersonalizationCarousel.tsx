"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

import editOverviewLight from "@/public/demo_pictures/edit_overview_light.png";
import editOverviewDark from "@/public/demo_pictures/edit_overview_dark.png";
import overviewLight1 from "@/public/demo_pictures/overview_light_1.png";
import overviewDark1 from "@/public/demo_pictures/overview_dark_1.png";

type SlideImage = {
  light: typeof overviewLight1;
  dark: typeof overviewDark1;
};

type Slide = {
  key: string;
  title: string;
  helper?: string;
  image: SlideImage;
};

const SLIDES: Slide[] = [
  {
    key: "edit-overview",
    title: "Enter Edit dashboard",
    helper: "Rearrange and toggle widgets.",
    image: { light: editOverviewLight, dark: editOverviewDark },
  },
  {
    key: "overview-layout-1",
    title: "Example layout",
    helper: "A clean, quick-glance setup.",
    image: { light: overviewLight1, dark: overviewDark1 },
  },
];

function CarouselMediaFrame({
  alt,
  image,
  sizes = "(max-width: 640px) 100vw, (max-width: 1280px) 60vw, 50vw",
  onInteract,
}: {
  alt: string;
  image: SlideImage;
  sizes?: string;
  onInteract?: () => void;
}) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl",
        "aspect-[16/10]",
        "flex items-center justify-center"
      )}
      onPointerDownCapture={onInteract}
      onTouchStartCapture={onInteract}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/10 pointer-events-none" />

      <div className="relative h-full w-full">
        <Image
          src={image.light}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover object-top dark:hidden"
          placeholder="blur"
          quality={95}
        />
        <Image
          src={image.dark}
          alt={alt}
          fill
          sizes={sizes}
          className="hidden object-cover object-top dark:block"
          placeholder="blur"
          quality={95}
        />
      </div>
    </div>
  );
}

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

  const [progress, setProgress] = React.useState(0);

  const stopLoop = React.useCallback(() => {
    if (typeof window === "undefined") return;
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastFrameRef.current = null;
  }, []);

  const resetCycle = React.useCallback(() => {
    elapsedRef.current = 0;
    lastFrameRef.current = null;
    setProgress(0);
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

      const last = lastFrameRef.current ?? ts;
      const dt = ts - last;
      lastFrameRef.current = ts;

      elapsedRef.current += dt;
      const pct = Math.min(1, elapsedRef.current / autoRotateMs);
      setProgress(pct * 100);

      if (pct >= 1) {
        elapsedRef.current = 0;
        lastFrameRef.current = ts;
        setProgress(0);
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
        "relative h-full w-full bg-background-2 outline-none",
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
      <div className="relative flex w-full flex-col p-3 pb-16 sm:p-4 sm:pb-16">
        <div className="flex items-start justify-between gap-3 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            </div>
            <span className="ml-2 rounded-full border border-border/50 bg-highlight-5/60 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-foreground/80">
              Demo
            </span>
          </div>

          <div className="min-w-0 text-right">
            <div className="text-sm font-semibold text-foreground truncate max-w-[16rem] sm:max-w-[22rem]">
              {active.title}
            </div>
            {active.helper ? (
              <div className="text-xs font-medium text-muted-foreground truncate max-w-[16rem] sm:max-w-[22rem]">
                {active.helper}
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active.key}
              initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
              }
            >
              <CarouselMediaFrame
                alt={active.title}
                image={active.image}
                onInteract={() => {
                  setInteractingFor(2200);
                  resetCycle();
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-2 px-3 pb-3">
        <button
          type="button"
          onClick={() => {
            goWithReset(activeIndex - 1);
            resetCycle();
          }}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-sm backdrop-blur",
            "transition-colors motion-reduce:transition-none hover:bg-highlight-5",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          )}
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
          {SLIDES.map((slide, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={slide.key}
                type="button"
                onClick={() => {
                  goWithReset(idx);
                  resetCycle();
                }}
                className={cn(
                  "relative h-2.5 overflow-hidden rounded-full border border-border/60 bg-background/70 backdrop-blur",
                  "transition-all motion-reduce:transition-none",
                  isActive ? "w-12" : "w-2.5 hover:bg-highlight-5"
                )}
                aria-label={`Go to slide ${idx + 1}`}
                aria-current={isActive ? "true" : undefined}
              >
                {isActive ? (
                  <span
                    className="absolute inset-y-0 left-0 bg-foreground/70"
                    style={{ width: `${progress}%` }}
                    aria-hidden
                  />
                ) : null}
                <span className="sr-only">{slide.title}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            goWithReset(activeIndex + 1);
            resetCycle();
          }}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-sm backdrop-blur",
            "transition-colors motion-reduce:transition-none hover:bg-highlight-5",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          )}
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
