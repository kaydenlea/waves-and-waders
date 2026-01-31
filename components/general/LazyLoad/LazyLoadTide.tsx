"use client";

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import type { SharedSunSegments } from "@/components/graphs/sharedSunSegments";

type Props = {
  beachId?: string;
  date?: Date;
  chartData?: Array<{ x: number; tide: number; isPeak?: number }>;
  sunSegments?: SharedSunSegments;
  parentLoading?: boolean;
};

// Preload the chunk as soon as this module loads
const tideChartImport = () => import("../../graphs/TideChart");

const TideChartLazy = dynamic<Props>(tideChartImport, {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-highlight-5 rounded-2xl h-[250px] @min-3xl:h-[280px] @min-4xl:h-[300px] w-full" />
  ),
});

// Preload on module initialization
if (typeof window !== "undefined") {
  tideChartImport();
}

export const LazyLoadTide: React.FC<Props> = (props) => {
  // Also trigger preload on mount as a fallback
  useEffect(() => {
    tideChartImport();
  }, []);

  return <TideChartLazy {...props} />;
};
