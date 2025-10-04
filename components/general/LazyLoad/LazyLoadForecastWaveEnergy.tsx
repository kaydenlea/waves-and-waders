"use client";

import dynamic from "next/dynamic";
import React from "react";

type Props = { beachId?: string };

const ForecastWaveEnergyChart = dynamic<React.ComponentProps<any>>(
  () => import("../../graphs/ForecastWaveEnergyChart"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-highlight-5 rounded-2xl h-[300px] w-full" />
    ),
  }
);

export const LazyLoadForecastWaveEnergy: React.FC<Props> = (props) => {
  return <ForecastWaveEnergyChart {...props} />;
};
