"use client";

import dynamic from "next/dynamic";
import React from "react";

type Props = { beachId?: string; date?: Date };

const ForecastTideChart = dynamic<React.ComponentProps<any>>(
  () => import("../../graphs/ForecastTideChart"),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);

export const LazyLoadForecastTide: React.FC<Props> = (props) => {
  return <ForecastTideChart {...props} />;
};
