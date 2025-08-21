"use client";

import dynamic from "next/dynamic";

export const LazyLoadSwell = dynamic(() => import("../../graphs/SwellChart"), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});
