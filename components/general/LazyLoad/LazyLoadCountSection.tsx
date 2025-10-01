"use client";

import dynamic from "next/dynamic";

export const LazyLoadCountSection = dynamic(
  () => import("@/components/visuals/AnimatedCountSection"),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);
