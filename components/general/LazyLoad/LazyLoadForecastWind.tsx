"use client";

import dynamic from "next/dynamic";
import React from "react";
import { ForecastChartSkeleton } from "@/components/graphs/ForecastChartSkeleton";

type Props = { beachId?: string; days?: Date[] | null };

const ForecastWindChart = dynamic<Props>(
  () => import("../../graphs/ForecastWindChart"),
  {
    ssr: false,
    loading: () => <ForecastChartSkeleton />,
  }
);

export const LazyLoadForecastWind: React.FC<Props> = (props) => {
  return <ForecastWindChart {...props} />;
};
