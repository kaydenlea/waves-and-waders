"use client";

import dynamic from "next/dynamic";

export const LazyLoadTidePreview = dynamic(
  () => import("../../graphs/TidePreview"),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);
