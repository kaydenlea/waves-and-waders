"use client";

import dynamic from "next/dynamic";
import React from "react";

type Props = { beachId?: string; date?: Date };

const ForecastTideChart = dynamic<React.ComponentProps<any>>(
  () => import("../../graphs/ForecastTideChart"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-highlight-5 rounded-2xl h-[300px] w-full" />
    ),
  }
);

export const LazyLoadForecastTide: React.FC<Props> = (props) => {
  return <ForecastTideChart {...props} />;
};
