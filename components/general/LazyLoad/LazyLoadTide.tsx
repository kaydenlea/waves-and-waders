"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { SharedSunSegments } from "@/components/graphs/sharedSunSegments";

type Props = {
  beachId?: string;
  date?: Date;
  chartData?: any;
  sunSegments?: SharedSunSegments;
};

const TideChartLazy = dynamic<Props>(() => import("../../graphs/TideChart"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-highlight-5 rounded-2xl h-[250px] w-full" />
  ),
});

export const LazyLoadTide: React.FC<Props> = (props) => {
  return <TideChartLazy {...props} />;
};
