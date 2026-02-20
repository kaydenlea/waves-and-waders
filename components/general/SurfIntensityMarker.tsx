"use client";

import { useMapSurfIntensityData } from "../context/MapFilterContext";
import {
  getSurfIntensityBand,
  getSurfIntensityColorCss,
} from "@/lib/forecast/surfIntensity";

const SurfIntensityMarker = () => {
  const { surfIntensityForDate } = useMapSurfIntensityData();
  const surfIntensity = surfIntensityForDate;
  const ready =
    typeof surfIntensity === "number" && Number.isFinite(surfIntensity);
  const color = getSurfIntensityColorCss(getSurfIntensityBand(surfIntensity));

  if (!ready) {
    return (
      <div
        className="relative h-4 w-4 shrink-0"
        role="status"
        aria-label="Loading surf intensity"
      >
        <div className="absolute inset-0 rounded-full bg-background/40 dark:bg-background/20" />
        <div className="absolute inset-0 rounded-full border-2 border-border/70 border-t-foreground/80 dark:border-border/80 dark:border-t-foreground/90 motion-safe:animate-spin motion-reduce:animate-none" />
        <span className="sr-only">Loading surf intensity</span>
      </div>
    );
  }

  return (
    <div
      className="h-4 w-4 rounded-full shrink-0 transition-colors duration-200 motion-reduce:transition-none"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
};

export default SurfIntensityMarker;
