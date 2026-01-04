"use client";

import dynamic from "next/dynamic";
import React from "react";
import { ForecastChartSkeleton } from "@/components/graphs/ForecastChartSkeleton";

type Props = { beachId?: string; days?: Date[] | null };

type ForecastSwellChartProps = React.ComponentProps<
  typeof import("../../graphs/ForecastSwellChart").default
>;

const ForecastSwellChart = dynamic<ForecastSwellChartProps>(
  () => import("../../graphs/ForecastSwellChart"),
  {
    ssr: false,
    loading: () => <ForecastChartSkeleton />,
  }
);

export const LazyLoadForecastSwell: React.FC<Props> = (props) => {
  return <ForecastSwellChart {...props} />;
};
