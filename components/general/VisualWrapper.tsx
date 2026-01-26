'use client';

import React from "react";
import { cn } from "@/lib/utils";
import { ChartLoadingCover } from "../graphs/ChartLoadingCover";

import {
  Atom,
  CircleGauge,
  Droplets,
  MoonStar,
  Shell,
  Sun,
  Waves,
  Wind,
  MapPin,
  ChartNoAxesCombined,
} from "lucide-react";



const iconMap: Record<string, { icon: React.ReactNode; bgColor: string }> = {
  map: {
    icon: <MapPin size={16} className="text-green-700" />,
    bgColor: "bg-green-100",
  },
  wind: {
    icon: <Wind size={16} className="text-gray-700" />,
    bgColor: "bg-gray-50",
  },
  surf: {
    icon: <Droplets size={16} className="text-blue-400" />,
    bgColor: "bg-blue-100",
  },
  weather: {
    icon: <Sun size={16} className="text-orange-500" />,
    bgColor: "bg-orange-100",
  },
  moon: {
    icon: <MoonStar size={16} className="text-purple-600" />,
    bgColor: "bg-purple-100",
  },
  daily: {
    icon: <ChartNoAxesCombined size={16} className="text-green-600" />,
    bgColor: "bg-green-50",
  },
  swell: {
    icon: <Shell size={16} className="text-blue-900" />,
    bgColor: "bg-blue-200",
  },
  tide: {
    icon: <Waves size={16} className="text-blue-500" />,
    bgColor: "bg-blue-100",
  },
  energy: {
    icon: <Atom size={16} className="text-red-400" />,
    bgColor: "bg-red-100",
  },
};

const VisualWrapper = ({
  children,
  label,
  unit,
  extraPadding,
  headerContent,
  loading,
}: {
  children: React.ReactNode;
  label: string;
  unit?: string;
  extraPadding?: boolean;
  headerContent?: React.ReactNode;
  loading?: boolean;
}) => {
  const lowerCaseLabel = label.toLowerCase();
  const iconDef = iconMap[lowerCaseLabel] ?? {
    icon: <CircleGauge size={16} className="text-gray-600" />,
    bgColor: "bg-gray-100",
  };
  return (
    <figure className="relative flex-1">
      <div className="bg-highlight-4 border border-border/40 rounded-2xl shadow-even h-full w-full">
        <div className="p-1.5">
          <div className="p-2 rounded-xl w-full">
            <header className="@container p-1 flex justify-between gap-1 items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "rounded-full flex items-center justify-center p-1 border border-border",
                    iconDef.bgColor
                  )}
                  data-ww-widget-icon
                >
                  {iconDef.icon}
                </div>
                <h3 className="leading-none font-semibold text-lg">{label}</h3>
                {headerContent && unit ? (
                  <span className="hidden @min-xs:block -ml-0.5 text-xs py-1 px-2 rounded-md bg-highlight-5 font-medium">
                    {unit}
                  </span>
                ) : null}
              </div>
              <div className="flex gap-2">
                {headerContent ??
                  (unit ? (
                    <span className="flex items-center px-3 py-1.5 rounded-md bg-highlight-5 text-xs sm:text-sm font-medium whitespace-nowrap">
                      {unit}
                    </span>
                  ) : null)}
              </div>
            </header>
          </div>
        </div>
        <div
          className={cn(
            "px-2 pb-3 pt-3 -mt-4.5 overflow-x-clip touch-pan-y relative",
            label !== "Current" &&
              label !== "Historical" &&
              label !== "Forecast" &&
              label !== "Hourly Stats" &&
              "-mt-4",
            extraPadding && "px-4"
          )}
        >
          <div className="relative">
            <ChartLoadingCover
              show={Boolean(loading)}
              message={`Loading ${label.toLowerCase()} data`}
              className="rounded-2xl"
            />
            <div
              className={cn(
                loading
                  ? "opacity-0 pointer-events-none"
                  : "opacity-100 transition-opacity duration-200 motion-reduce:transition-none"
              )}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
};

export default VisualWrapper;
