"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { SharedSunSegments } from "@/components/graphs/sharedSunSegments";

type Props = { beachId?: string; date?: Date; sunSegments?: SharedSunSegments };

const WaveEnergyLazy = dynamic<Props>(
  () => import("../../graphs/WaveEnergyChart"),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);

export const LazyLoadEnergy: React.FC<Props> = (props) => {
  return <WaveEnergyLazy {...props} />;
};
