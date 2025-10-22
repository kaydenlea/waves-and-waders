"use client";

import dynamic from "next/dynamic";

export const LazyLoadHourSlider = dynamic(() => import("../HourSlider"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse w-full bg-highlight-4 px-2 py-10.5 rounded-full shadow-even border border-border" />
  ),
});
