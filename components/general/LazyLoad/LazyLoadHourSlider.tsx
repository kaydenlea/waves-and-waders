"use client";

import { Slider } from "@/components/ui/slider";
import dynamic from "next/dynamic";

export const LazyLoadHourSlider = dynamic(() => import("../HourSlider"), {
  ssr: false,
  loading: () => (
    <Slider min={0} max={21} step={3} className="animate-pulse" />
    // <div className="animate-pulse w-full bg-highlight-4 py-1 rounded-full border border-border" />
  ),
});
