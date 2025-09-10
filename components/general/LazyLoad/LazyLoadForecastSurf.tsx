"use client";

import dynamic from "next/dynamic";
import React from "react";

type Props = { beachId?: string };

const ForecastSurfChart = dynamic<React.ComponentProps<any>>(
  () => import("../../graphs/ForecastSurfChart"),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);

export const LazyLoadForecastSurf: React.FC<Props> = (props) => {
  return <ForecastSurfChart {...props} />;
};
