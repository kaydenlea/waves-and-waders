"use client";

import dynamic from "next/dynamic";

export const LazyLoadTidePreview = dynamic(
  () => import("../../graphs/TidePreview"),
  {
    ssr: false,
    loading: () => (
      // <div className="animate-pulse bg-highlight-5 h-[30px] my-[15px] w-full rounded-4xl" />
      <div className="animate-pulse rounded-2xl touch-pan-y h-[40px] my-[10px] w-full" />
    ),
  }
);
