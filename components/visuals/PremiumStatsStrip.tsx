"use client";

import * as React from "react";
import {
  Filter,
  Layers,
  LayoutDashboard,
  MapPin,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type PremiumStat = {
  id: "beaches" | "amenityFilters" | "filterGroups" | "dashboardWidgets";
  label: string;
  helper?: string;
  value: number;
};

const ICONS: Record<PremiumStat["id"], LucideIcon> = {
  beaches: MapPin,
  amenityFilters: Filter,
  filterGroups: Layers,
  dashboardWidgets: LayoutDashboard,
};

function easeOutCubic(t: number) {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

function formatInteger(value: number) {
  return Intl.NumberFormat("en-US").format(Math.round(value));
}

function useInViewOnce<T extends Element>(
  options?: IntersectionObserverInit
) {
  const ref = React.useRef<T | null>(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    if (inView) return;
    const node = ref.current;
    if (!node) return;
    if (typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      setInView(true);
      observer.disconnect();
    }, options);

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, options]);

  return { ref, inView } as const;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(Boolean(media.matches));
    onChange();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  return reduced;
}

function AnimatedOverlayNumber({
  value,
  play,
  durationMs = 820,
}: {
  value: number;
  play: boolean;
  durationMs?: number;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [overlayValue, setOverlayValue] = React.useState(0);
  const [overlayVisible, setOverlayVisible] = React.useState(false);

  React.useEffect(() => {
    if (!play || prefersReducedMotion) return;
    let rafId = 0;
    let timeoutId: number | null = null;
    const start = performance.now();

    setOverlayVisible(true);
    setOverlayValue(0);

    const tick = (now: number) => {
      const t = (now - start) / durationMs;
      const eased = easeOutCubic(t);
      const next = Math.round(value * eased);
      setOverlayValue(next);
      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }
      setOverlayValue(value);
      timeoutId = window.setTimeout(() => setOverlayVisible(false), 140);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [durationMs, play, prefersReducedMotion, value]);

  const finalText = formatInteger(value);

  return (
    <span className="relative inline-grid tabular-nums">
      <span
        className={cn(
          "col-start-1 row-start-1 transition-opacity duration-200 motion-reduce:transition-none",
          overlayVisible ? "opacity-0" : "opacity-100"
        )}
      >
        {finalText}
      </span>
      <span
        aria-hidden
        className={cn(
          "col-start-1 row-start-1 transition-opacity duration-200 motion-reduce:hidden",
          overlayVisible ? "opacity-100" : "opacity-0"
        )}
      >
        {formatInteger(overlayValue)}
      </span>
    </span>
  );
}

export default function PremiumStatsStrip({
  stats,
  className,
}: {
  stats: PremiumStat[];
  className?: string;
}) {
  const inViewOptions = React.useMemo<IntersectionObserverInit>(
    () => ({
      rootMargin: "0px 0px -20% 0px",
      threshold: 0,
    }),
    []
  );
  const { ref, inView } = useInViewOnce<HTMLDivElement>(inViewOptions);

  return (
    <div
      ref={ref}
      className={cn(
        "h-full",
        "rounded-2xl border border-border/60 bg-background/40 shadow-sm ring-1 ring-black/5",
        "supports-[backdrop-filter]:bg-background/30 supports-[backdrop-filter]:backdrop-blur",
        className
      )}
    >
      <dl className="grid h-full grid-cols-2 divide-x divide-y divide-border/40 overflow-hidden sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-4 lg:divide-x-0">
        {stats.map((stat) => {
          const Icon = ICONS[stat.id];
          return (
            <div key={stat.id} className="flex flex-col justify-between p-5 sm:p-6">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                <Icon className="h-4 w-4 text-sky-600/70" aria-hidden />
                <span>{stat.label}</span>
              </dt>
              {stat.helper ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.helper}
                </p>
              ) : null}
              <dd className="mt-5 text-3xl font-semibold leading-none tracking-tight text-foreground sm:text-4xl">
                <AnimatedOverlayNumber value={stat.value} play={inView} />
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
