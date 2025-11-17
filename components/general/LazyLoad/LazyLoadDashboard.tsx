"use client";

import dynamic from "next/dynamic";
import type { DashboardType } from "../dashboardLayout";

export const LazyLoadDashboard = dynamic<{ type?: DashboardType }>(
  () => import("../Dashboard"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-highlight-5 rounded-2xl h-screen w-full" />
    ),
  }
);
