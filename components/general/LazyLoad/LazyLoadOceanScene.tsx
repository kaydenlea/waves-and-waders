"use client";

import dynamic from "next/dynamic";
import VisualFallback from "@/components/visuals/VisualFallback";

export const LazyLoadOceanScene = dynamic(
  () => import("@/components/visuals/OceanScene"),
  {
    ssr: false,
    // loading: () => <VisualFallback />,
    loading: () => <div className="absolute">Loading...</div>,
  }
);
