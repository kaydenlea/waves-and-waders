"use client";

import dynamic from "next/dynamic";

export const LazyLoadScrollSection = dynamic(
  () => import("@/components/visuals/AnimatedScrollSection"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-highlight-3 h-125 w-full rounded-2xl" />
    ),
  }
);
