"use client";

import dynamic from "next/dynamic";

export const LazyLoadCardsSection = dynamic(
  () => import("@/components/visuals/AnimatedCardsSection"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full">
        <div className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-highlight-5 shadow-lg shadow-black/10 ring-1 ring-black/5">
          <div className="aspect-[16/10] min-h-[22rem]" />
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-highlight-5 via-highlight-3/40 to-highlight-5 motion-reduce:animate-none" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(37,99,235,0.12),transparent_50%)]" />
        </div>
      </div>
    ),
  }
);
