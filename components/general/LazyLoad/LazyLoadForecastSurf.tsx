"use client";

import dynamic from "next/dynamic";

export const LazyLoadForecastSurf = dynamic(
  () => import("../../graphs/ForecastSurfChart"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-highlight-5 rounded-2xl h-[300px] w-full" />
    ),
  }
);
