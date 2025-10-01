"use client";

import dynamic from "next/dynamic";

export const LazyLoadHourSlider = dynamic(() => import("../HourSlider"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse h-19.5 w-full bg-highlight-4 px-2 py-3 rounded-b-xl shadow-even" />
  ),
});
