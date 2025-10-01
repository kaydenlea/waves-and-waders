"use client";

import dynamic from "next/dynamic";
import VisualFallback from "@/components/visuals/VisualFallback";

export const LazyLoadLogoLoop = dynamic(
  () => import("@/components/visuals/LogoLoop"),
  {
    ssr: false,
    loading: () => (
      <div className="min-w-180 flex items-center pt-14 pb-2.5 gap-5 overflow-hidden">
        <div className="animate-pulse space-x-2 rounded-full border border-border bg-background/20 shadow-sm px-3 py-2 backdrop-blur-md inline-flex items-center h-11 w-75" />
        <div className="animate-pulse space-x-2 rounded-full border border-border bg-background/20 shadow-sm px-3 py-2 backdrop-blur-md inline-flex items-center h-11 w-75" />
        <div className="animate-pulse space-x-2 rounded-full border border-border bg-background/20 shadow-sm px-3 py-2 backdrop-blur-md inline-flex items-center h-11 w-75" />
        <div className="animate-pulse space-x-2 rounded-full border border-border bg-background/20 shadow-sm px-3 py-2 backdrop-blur-md inline-flex items-center h-11 w-75" />
      </div>
    ),
  }
);
