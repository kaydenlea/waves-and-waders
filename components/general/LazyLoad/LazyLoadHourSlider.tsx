"use client";

import dynamic from "next/dynamic";

export const LazyLoadHourSlider = dynamic(() => import("../HourSlider"), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});
