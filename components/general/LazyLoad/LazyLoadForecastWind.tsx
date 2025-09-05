"use client";

import dynamic from "next/dynamic";

export const LazyLoadForecastWind = dynamic(
  () => import("../../graphs/ForecastWindChart"),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);
