"use client";

import dynamic from "next/dynamic";

export const LazyLoadDashboard = dynamic(
  () => import("../Dashboard").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-highlight-5 rounded-2xl h-screen w-full" />
    ),
  }
);
