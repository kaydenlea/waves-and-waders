"use client";

import { Slider } from "@/components/ui/slider";
import dynamic from "next/dynamic";
import { getCachedHourSliderTrackGradient } from "@/lib/ui/hourSliderTrackCache";

export const LazyLoadHourSlider = dynamic(() => import("../HourSlider"), {
  ssr: false,
  loading: () => (
    <Slider
      min={0}
      max={21}
      step={3}
      className="animate-pulse"
      trackStyle={{
        backgroundImage:
          getCachedHourSliderTrackGradient() ??
          "linear-gradient(90deg, var(--ww-surf-intensity-unknown) 0%, var(--ww-surf-intensity-unknown) 100%)",
        backgroundColor: "var(--ww-surf-intensity-unknown)",
      }}
    />
    // <div className="animate-pulse w-full bg-highlight-4 py-1 rounded-full border border-border" />
  ),
});
