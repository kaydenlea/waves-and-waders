"use client";

import dynamic from "next/dynamic";

export const LazyLoadEnergy = dynamic(
  () => import("../../graphs/WaveEnergyChart"),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);
