"use client";

import dynamic from "next/dynamic";
import React from "react";
import { ForecastChartSkeleton } from "@/components/graphs/ForecastChartSkeleton";

type Props = { beachId?: string; days?: Date[] | null };

const ForecastWaveEnergyChart = dynamic<React.ComponentProps<any>>(
  () => import("../../graphs/ForecastWaveEnergyChart"),
  {
    ssr: false,
    loading: () => <ForecastChartSkeleton />,
  }
);

export const LazyLoadForecastWaveEnergy: React.FC<Props> = (props) => {
  return <ForecastWaveEnergyChart {...props} />;
};
