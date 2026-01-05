"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

import nearbyLight from "@/public/demo_pictures/nearby_beaches_light.png";
import nearbyDark from "@/public/demo_pictures/nearby_beaches_dark.png";
import savedLight from "@/public/demo_pictures/saved_beaches_light.png";
import savedDark from "@/public/demo_pictures/saved_beaches_dark.png";
import overviewLight from "@/public/demo_pictures/overview_light.png";
import overviewDark from "@/public/demo_pictures/overview_dark.png";

type ThemedImage = {
  light: typeof nearbyLight;
  dark: typeof nearbyDark;
};

type Card = {
  key: string;
  title: string;
  description: string;
  image: ThemedImage;
};

const CARDS: Card[] = [
  {
    key: "nearby",
    title: "Nearby beaches",
    description: "Discover the right spot fast.",
    image: { light: nearbyLight, dark: nearbyDark },
  },
  {
    key: "saved",
    title: "Saved beaches",
    description: "Jump straight to favorites.",
    image: { light: savedLight, dark: savedDark },
  },
  {
    key: "overview",
    title: "At-a-glance overview",
    description: "Scan conditions, time, and direction in seconds.",
    image: { light: overviewLight, dark: overviewDark },
  },
];

function AppFrame({
  title,
  description,
  image,
  sizes,
}: {
  title: string;
  description: string;
  image: ThemedImage;
  sizes: string;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border/60 bg-background shadow-lg shadow-black/10 ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-background/70 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <span className="ml-2 rounded-full border border-border/50 bg-highlight-5/60 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-foreground/80">
            Preview
          </span>
        </div>
        <div className="min-w-0 text-right">
          <div className="truncate text-sm font-semibold text-foreground">
            {title}
          </div>
          <div className="truncate text-xs font-medium text-muted-foreground">
            {description}
          </div>
        </div>
      </div>

      <div className="relative h-[calc(100%-3.25rem)] w-full bg-background">
        <div className="absolute inset-0 p-3 sm:p-4">
          <div className="relative h-full w-full overflow-hidden rounded-xl border border-border/40 bg-background shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-b from-background/15 via-transparent to-background/15 pointer-events-none" />
            <Image
              src={image.light}
              alt=""
              fill
              sizes={sizes}
              className="object-cover object-top dark:hidden"
              placeholder="blur"
            />
            <Image
              src={image.dark}
              alt=""
              fill
              sizes={sizes}
              className="hidden object-cover object-top dark:block"
              placeholder="blur"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [progress, setProgress] = React.useState(0);

  const rafRef = React.useRef<number | null>(null);
  const lastFrameRef = React.useRef<number | null>(null);
  const elapsedRef = React.useRef(0);
  const interactionTimeoutRef = React.useRef<number | null>(null);

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
                    "motion-reduce:transition-none"
                  )}
                  style={{
                    transform: `translate(${x}px, ${y}px) scale(${scale})`,
                    opacity,
                    zIndex: z,
                    pointerEvents: pos === 0 ? "auto" : "none",
                  }}
                  aria-hidden={pos !== 0}
                >
                  <AppFrame
                    title={card.title}
                    description={card.description}
                    image={card.image}
                    sizes={sizes}
                  />
                </div>
              );
            })}
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 px-3 pb-3">
          <div className="pointer-events-none absolute left-1/2 top-0 h-1.5 w-40 -translate-x-1/2 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full bg-foreground/40 transition-[width] duration-150 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
              aria-hidden
            />
          </div>
          <button
            type="button"
            onClick={() => go(activeIndex - 1)}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-sm backdrop-blur",
              "transition-colors motion-reduce:transition-none hover:bg-highlight-5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
            )}
            aria-label="Previous card"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
            {CARDS.map((card, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => go(idx)}
                  className={cn(
                    "relative h-2.5 overflow-hidden rounded-full border border-border/60 bg-background/70 backdrop-blur",
                    "transition-all motion-reduce:transition-none",
                    isActive ? "w-12" : "w-2.5 hover:bg-highlight-5"
                  )}
                  aria-label={`Show ${card.title}`}
                  aria-current={isActive ? "true" : undefined}
                >
                  {isActive ? (
                    <span
                      className="absolute inset-y-0 left-0 bg-foreground/70"
                      style={{ width: `${progress}%` }}
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => go(activeIndex + 1)}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-sm backdrop-blur",
              "transition-colors motion-reduce:transition-none hover:bg-highlight-5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
            )}
            aria-label="Next card"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
