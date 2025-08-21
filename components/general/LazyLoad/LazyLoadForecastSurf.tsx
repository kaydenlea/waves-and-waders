"use client";

import dynamic from "next/dynamic";

export const LazyLoadForecastSurf = dynamic(
  () => import("../../graphs/ForecastSurfChart"),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);
