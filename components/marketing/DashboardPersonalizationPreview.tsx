"use client";

import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";

const loadDashboardPersonalizationCarousel = () =>
  import("@/components/marketing/DashboardPersonalizationCarousel");

// Start fetching the chunk as soon as this component's module is evaluated so the
// section can reveal real content (no visible skeleton swap) even on fast scroll.
if (typeof window !== "undefined") {
  void loadDashboardPersonalizationCarousel();
}

const DashboardPersonalizationCarousel = dynamic(
  loadDashboardPersonalizationCarousel,
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
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate z-0 w-full min-w-0 max-w-full",
        className
      )}
    >
      <div
        aria-hidden
        className="aspect-[16/10] min-h-[20rem] max-[639px]:min-h-[22rem] w-full"
      />
      <div className="absolute inset-0">
        <DashboardPersonalizationCarousel />
      </div>
    </div>
  );
}
