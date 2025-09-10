"use client";

import dynamic from "next/dynamic";
import React from "react";

type Props = { beachId?: string };

const ForecastWaveEnergyChart = dynamic<React.ComponentProps<any>>(
  () => import("../../graphs/ForecastWaveEnergyChart"),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);

export const LazyLoadForecastWaveEnergy: React.FC<Props> = (props) => {
  return <ForecastWaveEnergyChart {...props} />;
};
