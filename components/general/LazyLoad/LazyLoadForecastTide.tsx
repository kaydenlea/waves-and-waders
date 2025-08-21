"use client";

import dynamic from "next/dynamic";

export const LazyLoadForecastTide = dynamic(
  () => import("../../graphs/ForecastTideChart"),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);
