"use client";

import dynamic from "next/dynamic";

export const LazyLoadSurf = dynamic(() => import("../../graphs/SurfChart"), {
  ssr: false,
  loading: () => (
    // <div className="animate-pulse bg-highlight-5 rounded-2xl h-[250px] w-full" />
    <div className="animate-pulse bg-highlight-5 rounded-2xl touch-pan-y @min-lg:aspect-auto h-[200px] @min-lg:h-[300px] w-full" />
  ),
});
