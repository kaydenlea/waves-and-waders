"use client";

import dynamic from "next/dynamic";

export const LazyLoadForecastWaveEnergy = dynamic(
  () => import("../../graphs/ForecastWaveEnergyChart"),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);
