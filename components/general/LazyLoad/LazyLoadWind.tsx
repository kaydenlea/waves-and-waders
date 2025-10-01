"use client";

import dynamic from "next/dynamic";

export const LazyLoadWind = dynamic(() => import("../../graphs/WindChart"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-highlight-5 rounded-2xl touch-pan-y @min-lg:aspect-auto h-[200px] @min-lg:h-[300px] w-full" />
  ),
});
