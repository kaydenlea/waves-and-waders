"use client";

import dynamic from "next/dynamic";

export const LazyLoadCardsSection = dynamic(
  () => import("@/components/visuals/AnimatedCardsSection"),
  {
    ssr: false,
    loading: () => (
      <div className="ml-20 animate-pulse bg-highlight-3 rounded-2xl h-100 w-105" />
    ),
  }
);
