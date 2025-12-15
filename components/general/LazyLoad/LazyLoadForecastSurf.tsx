"use client";

import dynamic from "next/dynamic";
import React from "react";
import { ForecastChartSkeleton } from "@/components/graphs/ForecastChartSkeleton";

type Props = { beachId?: string; days?: Date[] | null };

const ForecastSurfChart = dynamic<React.ComponentProps<any>>(
  () => import("../../graphs/ForecastSurfChart"),
  {
    ssr: false,
    loading: () => <ForecastChartSkeleton />,
  }
);

export const LazyLoadForecastSurf: React.FC<Props> = (props) => {
  return <ForecastSurfChart {...props} />;
};
