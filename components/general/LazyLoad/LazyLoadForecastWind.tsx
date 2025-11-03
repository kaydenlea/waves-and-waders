"use client";

import dynamic from "next/dynamic";
import React from "react";

type Props = { beachId?: string; days?: Date[] | null };

const ForecastWindChart = dynamic<Props>(
  () => import("../../graphs/ForecastWindChart"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-highlight-5 rounded-2xl h-[300px] w-full" />
    ),
  }
);

export const LazyLoadForecastWind: React.FC<Props> = (props) => {
  return <ForecastWindChart {...props} />;
};
