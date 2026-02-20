"use client";

import * as React from "react";
import {
  getSurfIntensityBand,
  getSurfIntensityColorCss,
} from "@/lib/forecast/surfIntensity";

const SurfIntensityMarker = ({
  intensityFt,
}: {
  intensityFt: number | null | undefined;
}) => {
  const surfIntensity =
    typeof intensityFt === "number" && Number.isFinite(intensityFt)
      ? intensityFt
      : null;
  const color = React.useMemo(
    () => getSurfIntensityColorCss(getSurfIntensityBand(surfIntensity)),
    [surfIntensity],
  );

  if (surfIntensity == null) {
    return (
      <span
        aria-label="Loading surf intensity"
        className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted/30 ring-1 ring-border/60"
      >
        <span
          aria-hidden="true"
          className="absolute -inset-0.5 rounded-full border-2 border-muted-foreground/30 border-t-transparent animate-spin"
        />
      </span>
    );
  }
  return (
    <span
      className="inline-block h-4 w-4 shrink-0 rounded-full shadow-sm"
      style={{ backgroundColor: color }}
    />
  );
};

export default SurfIntensityMarker;
