"use client";

import dynamic from "next/dynamic";

export const LazyLoadForecastWaveEnergy = dynamic(
  () => import("../../graphs/ForecastWaveEnergyChart"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-highlight-5 rounded-2xl h-[300px] w-full" />
    ),
  }
);
