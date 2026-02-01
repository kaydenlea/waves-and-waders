"use client";

import dynamic from "next/dynamic";
import React, { useEffect } from "react";
import { ForecastChartSkeleton } from "@/components/graphs/ForecastChartSkeleton";

type Props = {
  beachId?: string;
  date?: Date;
  days?: Date[];
  suppressSkeleton?: boolean;
};

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

const ForecastTideChartNoSkeleton = dynamic<ForecastTideChartProps>(
  forecastTideImport,
  {
    ssr: false,
    // While editing we suppress the in-chart skeleton to avoid flicker during grabs,
    // but we still need a stable placeholder height while the dynamic chunk loads.
    loading: () => (
      <div className="w-full" style={{ height: 300 }}>
        <ForecastChartSkeleton className="h-full w-full" />
      </div>
    ),
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

  return props.suppressSkeleton ? (
    <ForecastTideChartNoSkeleton {...props} />
  ) : (
    <ForecastTideChart {...props} />
  );
};
