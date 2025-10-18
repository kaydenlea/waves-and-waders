"use client";

import dynamic from "next/dynamic";

export const LazyLoadSummary = dynamic(() => import("../../visuals/Summary"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-highlight-5 rounded-2xl touch-pan-y h-[270px] w-full" />
  ),
});
