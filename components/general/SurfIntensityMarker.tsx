"use client";

import { useMapData } from "../context/MapFilterContext";
import {
  getSurfIntensityBand,
  getSurfIntensityColorCss,
} from "@/lib/forecast/surfIntensity";

const SurfIntensityMarker = () => {
  const { surfIntensityForDate } = useMapData();
  const surfIntensity = surfIntensityForDate;
  const color = getSurfIntensityColorCss(getSurfIntensityBand(surfIntensity));
  return (
    <div
      className="h-4 w-4 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
};

export default SurfIntensityMarker;
