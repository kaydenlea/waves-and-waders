"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";

const DashboardPersonalizationCarousel = dynamic(
  () => import("@/components/marketing/DashboardPersonalizationCarousel"),
  { ssr: false, loading: () => <Skeleton /> }
);

function Skeleton() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl border border-border/60 bg-highlight-5 shadow-lg shadow-black/10 ring-1 ring-black/5">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-highlight-5 via-highlight-3/40 to-highlight-5 motion-reduce:animate-none" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(37,99,235,0.12),transparent_50%)]" />
    </div>
  );
}

export default function DashboardPersonalizationPreview({
  className,
  rootMargin = "800px 0px",
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
        observer.disconnect();
        setShouldLoad(true);
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
        "relative isolate z-0 w-full min-w-0 max-w-full",
        "aspect-[16/10] min-h-[18rem] sm:min-h-[20rem]",
        className
      )}
    >
      {shouldLoad ? <DashboardPersonalizationCarousel /> : <Skeleton />}
    </div>
  );
}
