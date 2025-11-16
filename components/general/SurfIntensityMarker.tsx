"use client";

import { cn } from "@/lib/utils";
import { useMapFilters } from "../context/MapFilterContext";

const SurfIntensityMarker = () => {
  const { surfIntensityForDate } = useMapFilters();
  const surfIntensity = surfIntensityForDate;
  const color =
    surfIntensity == null || surfIntensity < 0.1
      ? "bg-highlight-3"
      : surfIntensity >= 6
      ? "bg-red-400"
      : surfIntensity >= 3
      ? "bg-orange-400"
      : "bg-green-400";
  return <div className={cn("rounded-full w-4 h-4", color)} />;
};

export default SurfIntensityMarker;
