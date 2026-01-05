"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";

const DashboardPersonalizationCarousel = dynamic(
  () => import("@/components/marketing/DashboardPersonalizationCarousel"),
  { ssr: false }
);

function Skeleton() {
  return (
    <div className="absolute inset-0 bg-background-2 p-3 pb-16 sm:p-4 sm:pb-16">
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
        <div className="hidden sm:block text-right">
          <div className="h-4 w-44 rounded bg-foreground/10" />
          <div className="mt-2 h-3 w-36 rounded bg-foreground/10" />
        </div>
      </div>

      <div className="relative h-full w-full overflow-hidden rounded-xl border border-border/40 bg-background shadow-sm">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-highlight-5 via-highlight-3/40 to-highlight-5 motion-reduce:animate-none" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(37,99,235,0.12),transparent_50%)]" />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-2 px-3 pb-3">
        <div className="h-10 w-10 rounded-full border border-border/60 bg-background/70" />
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
          <div className="h-2.5 w-12 overflow-hidden rounded-full border border-border/60 bg-background/70" />
          <div className="h-2.5 w-2.5 rounded-full border border-border/60 bg-background/70" />
        </div>
        <div className="h-10 w-10 rounded-full border border-border/60 bg-background/70" />
      </div>
    </div>
  );
}

export default function DashboardPersonalizationPreview({
  className,
  rootMargin = "240px 0px",
}: {
  className?: string;
  rootMargin?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = React.useState(false);

  React.useEffect(() => {
    if (shouldLoad) return;
    if (typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { root: null, rootMargin, threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, shouldLoad]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative isolate z-0 w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-border/60 bg-highlight-5 shadow-lg shadow-black/10 ring-1 ring-black/5",
        "aspect-[16/10] min-h-[18rem] sm:min-h-[20rem]",
        className
      )}
    >
      {shouldLoad ? <DashboardPersonalizationCarousel /> : <Skeleton />}
    </div>
  );
}
