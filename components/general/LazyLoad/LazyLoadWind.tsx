"use client";

import dynamic from "next/dynamic";

export const LazyLoadWind = dynamic(() => import("../../graphs/WindChart"), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});
