"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { SharedSunSegments } from "@/components/graphs/sharedSunSegments";

type Props = {
  beachId?: string;
  date?: Date;
  sunSegments?: SharedSunSegments;
};

const SurfChartLazy = dynamic<Props>(() => import("../../graphs/SurfChart"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-highlight-5 rounded-2xl touch-pan-y @min-lg:aspect-auto h-[200px] @min-lg:h-[300px] w-full" />
  ),
});

export const LazyLoadSurf: React.FC<Props> = (props) => {
  return <SurfChartLazy {...props} />;
};
