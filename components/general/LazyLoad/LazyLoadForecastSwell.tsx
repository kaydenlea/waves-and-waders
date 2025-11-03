"use client";

import dynamic from "next/dynamic";
import React from "react";

type Props = { beachId?: string; days?: Date[] | null };

const ForecastSwellChart = dynamic<React.ComponentProps<any>>(
  () => import("../../graphs/ForecastSwellChart"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-highlight-5 rounded-2xl h-[300px] w-full" />
    ),
  }
);

export const LazyLoadForecastSwell: React.FC<Props> = (props) => {
  return <ForecastSwellChart {...props} />;
};
