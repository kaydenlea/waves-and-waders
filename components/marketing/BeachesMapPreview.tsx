"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Map } from "lucide-react";

import { cn } from "@/lib/utils";

const BeachesLeafletMap = dynamic(
  () => import("@/components/visuals/LeafletMap"),
  {
    ssr: false,
  }
);

type Props = {
  className?: string;
  frameClassName?: string;
  rootMargin?: string;
};

function Skeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-highlight-5">
      <div className="h-full w-full animate-pulse bg-gradient-to-br from-highlight-5 via-highlight-3/40 to-highlight-5 motion-reduce:animate-none" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(37,99,235,0.12),transparent_50%)]" />
    </div>
  );
}

export default function BeachesMapPreview({
  className,
  frameClassName,
  rootMargin = "240px 0px",
}: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = React.useState(false);
  const [showGestureHint, setShowGestureHint] = React.useState(true);

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
    <div className={cn("w-full", className)}>
      <div
        ref={containerRef}
        className={cn(
          "relative isolate z-0 overflow-hidden rounded-2xl border border-border/60 bg-highlight-5 max-w-full",
          "shadow-lg shadow-black/10 ring-1 ring-black/5",
          "h-[clamp(17rem,58vw,22rem)] sm:h-[clamp(18rem,50vw,24rem)] lg:h-full",
          "min-w-0",
          frameClassName
        )}
        onClickCapture={() => setShowGestureHint(false)}
        onWheelCapture={(event) => {
          if (event.ctrlKey) setShowGestureHint(false);
        }}
      >
        <div className="absolute inset-0">
          {shouldLoad ? (
            <BeachesLeafletMap variant="embed" ui="preview" />
          ) : (
            <Skeleton />
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1200] flex items-start justify-between gap-3 p-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/30 px-3 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur">
            <Map className="h-4 w-4 text-sky-600" aria-hidden />
            <span className="font-semibold">Beaches</span>
            <Link
              href="/beaches"
              prefetch={false}
              className={cn(
                "pointer-events-auto rounded-full border border-border/60 bg-highlight-5/60 px-2 py-1 text-[11px] font-semibold tracking-wide text-foreground/90",
                "transition-colors motion-reduce:transition-none hover:bg-highlight-5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              )}
            >
              Open
            </Link>
          </div>
        </div>

        {showGestureHint && (
          <div className="pointer-events-none absolute inset-0 z-[1200] grid place-items-center">
            <div className="absolute inset-0 bg-background/10 backdrop-blur-[1px]" />
            <div className="relative mx-4 max-w-[34rem] rounded-2xl border border-border/60 bg-background/85 px-4 py-3 text-center text-xs font-medium text-foreground/85 shadow-sm backdrop-blur">
              <span className="font-semibold">Ctrl</span> + scroll to zoom.
              <span className="hidden sm:inline"> Pinch on trackpad.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
