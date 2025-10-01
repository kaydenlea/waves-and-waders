"use client";

import dynamic from "next/dynamic";

export const LazyLoadSpotlightCard = dynamic(
  () => import("@/components/visuals/SpotlightCard"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse rounded-3xl border border-border bg-highlight-3 overflow-hidden p-8 w-full flex-1 min-h-80" />
    ),
  }
);
