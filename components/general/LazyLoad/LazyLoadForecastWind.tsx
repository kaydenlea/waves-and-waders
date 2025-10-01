"use client";

import dynamic from "next/dynamic";

export const LazyLoadForecastWind = dynamic(
  () => import("../../graphs/ForecastWindChart"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-highlight-5 rounded-2xl h-[300px] w-full" />
    ),
  }
);
