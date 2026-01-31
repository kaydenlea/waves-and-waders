"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { SharedSunSegments } from "@/components/graphs/sharedSunSegments";

type Props = { beachId?: string; date?: Date; sunSegments?: SharedSunSegments; parentLoading?: boolean };

const WaveEnergyLazy = dynamic<Props>(
  () => import("../../graphs/WaveEnergyChart"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-highlight-5 rounded-2xl h-[250px] @min-3xl:h-[280px] @min-4xl:h-[300px] w-full" />
    ),
  }
);

export const LazyLoadEnergy: React.FC<Props> = (props) => {
  return <WaveEnergyLazy {...props} />;
};
