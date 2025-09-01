"use client";

import dynamic from "next/dynamic";

export const LazyLoadDashboard = dynamic(() => import("../Dashboard"), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});
