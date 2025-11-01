import React from "react";
import { cn } from "@/lib/utils";

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
  "hourly stats": {
    icon: <CircleGauge size={16} className="text-orange-800" />,
    bgColor: "bg-orange-100",
  },
  swell: {
    icon: <Shell size={16} className="text-blue-900" />,
    bgColor: "bg-blue-200",
  },
  tide: {
    icon: <Waves size={16} className="text-blue-500" />,
    bgColor: "bg-blue-100",
  },
  "wave energy": {
    icon: <Atom size={16} className="text-red-400" />,
    bgColor: "bg-red-100",
  },
};

const VisualWrapper = ({
  children,
  label,
  unit,
  extraPadding,
}: {
  children: React.ReactNode;
  label: string;
  unit?: string;
  extraPadding?: boolean;
}) => {
  const lowerCaseLabel = label.toLowerCase();
  const iconDef = iconMap[lowerCaseLabel] ?? {
    icon: <CircleGauge size={16} className="text-gray-600" />,
    bgColor: "bg-gray-100",
  };
  return (
    <figure className="relative flex-1">
      <div className="bg-highlight-4 border border-border/40 rounded-2xl shadow-sm h-full w-full">
        <div className="p-2">
          <div className="p-1 rounded-xl bg-highlight-6 w-full shadow-even">
            <header className="p-1 flex justify-between gap-1 items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "rounded-full flex items-center justify-center p-1 border border-border",
                    iconDef.bgColor
                  )}
                >
                  {iconDef.icon}
                </div>
                <h3 className="leading-none font-semibold text-lg">{label}</h3>
              </div>
              {unit && (
                <span className="flex items-center px-2 py-1 rounded-md bg-highlight-4 text-xs sm:text-sm shadow-sm font-medium whitespace-nowrap">
                  {unit}
                </span>
              )}
            </header>
          </div>
        </div>
        <div
          className={cn(
            "px-2 py-4 overflow-x-hidden touch-pan-y",
            extraPadding && "px-4"
          )}
        >
          {children}
        </div>
      </div>
    </figure>
  );
};

export default VisualWrapper;
