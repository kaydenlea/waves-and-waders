"use client";

import dynamic from "next/dynamic";
import React, { useEffect } from "react";

type Props = { beachId?: string; date?: Date; days?: Date[] };

// Preload the chunk as soon as this module loads
const forecastTideImport = () => import("../../graphs/ForecastTideChart");

const ForecastTideChart = dynamic<React.ComponentProps<any>>(
  forecastTideImport,
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-highlight-5 rounded-2xl h-[300px] w-full" />
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

  return <ForecastTideChart {...props} />;
};
