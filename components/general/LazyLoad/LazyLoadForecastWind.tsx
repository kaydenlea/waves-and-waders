"use client";

import dynamic from "next/dynamic";
import React from "react";

type Props = { beachId?: string };

const ForecastWindChart = dynamic<React.ComponentProps<any>>(
  () => import("../../graphs/ForecastWindChart"),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);

export const LazyLoadForecastWind: React.FC<Props> = (props) => {
  return <ForecastWindChart {...props} />;
};
