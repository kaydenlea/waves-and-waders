"use client";

import dynamic from "next/dynamic";

export const LazyLoadTide = dynamic(() => import("../../graphs/TideChart"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-highlight-5 rounded-2xl h-[250px] w-full" />
  ),
});
