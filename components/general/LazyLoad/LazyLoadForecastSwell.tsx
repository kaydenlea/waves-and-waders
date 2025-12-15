"use client";

import dynamic from "next/dynamic";
import React from "react";
import { ForecastChartSkeleton } from "@/components/graphs/ForecastChartSkeleton";

type Props = { beachId?: string; days?: Date[] | null };

const ForecastSwellChart = dynamic<React.ComponentProps<any>>(
  () => import("../../graphs/ForecastSwellChart"),
  {
    ssr: false,
    loading: () => <ForecastChartSkeleton />,
  }
);

export const LazyLoadForecastSwell: React.FC<Props> = (props) => {
  return <ForecastSwellChart {...props} />;
};
