"use client";

import dynamic from "next/dynamic";

export const LazyLoadTide = dynamic(() => import("../../graphs/TideChart"), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});
