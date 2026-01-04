"use client";

import dynamic from "next/dynamic";
import React, { useEffect } from "react";
import { ForecastChartSkeleton } from "@/components/graphs/ForecastChartSkeleton";

type Props = { beachId?: string; date?: Date; days?: Date[] };

// Preload the chunk as soon as this module loads
const forecastTideImport = () => import("../../graphs/ForecastTideChart");

type ForecastTideChartProps = React.ComponentProps<
  typeof import("../../graphs/ForecastTideChart").default
>;

const ForecastTideChart = dynamic<ForecastTideChartProps>(
  forecastTideImport,
  {
    ssr: false,
    loading: () => <ForecastChartSkeleton />,
  }
);

// Preload on module initialization
if (typeof window !== "undefined") {
  forecastTideImport();
}

export const LazyLoadForecastTide: React.FC<Props> = (props) => {
  // Also trigger preload on mount as a fallback
  useEffect(() => {
    forecastTideImport();
  }, []);

  return <ForecastTideChart {...props} />;
};
