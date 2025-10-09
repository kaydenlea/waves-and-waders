"use client";

import dynamic from "next/dynamic";
import React from "react";

type Props = { beachId?: string; days?: Date[] | null };

const ForecastSurfChart = dynamic<React.ComponentProps<any>>(
  () => import("../../graphs/ForecastSurfChart"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-highlight-5 rounded-2xl h-[300px] w-full" />
    ),
  }
);

export const LazyLoadForecastSurf: React.FC<Props> = (props) => {
  return <ForecastSurfChart {...props} />;
};
