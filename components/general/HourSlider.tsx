"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { ForecastData } from "@/lib/supabase";

interface HourSliderProps {
  selectedHour?: number;
  onHourChange?: (hour: number) => void;
  forecastData?: ForecastData[];
  selectedDate?: Date;
  className?: string;
  showDataIndicators?: boolean;
}

interface HourData {
  hour: number;
  hasData: boolean;
  surfHeight: number | null;
  quality: "flat" | "poor" | "fair" | "good" | "epic" | "huge";
}

const HourSlider = ({
  selectedHour = new Date().getHours(),
  onHourChange,
  forecastData = [],
  selectedDate = new Date(),
  className,
  showDataIndicators = true,
}: HourSliderProps) => {
  const [internalValue, setInternalValue] = useState([selectedHour]);

  useEffect(() => {
    setInternalValue([selectedHour]);
  }, [selectedHour]);

  const dayForecastData = useMemo(() => {
    if (!forecastData.length) return [];
    const targetDateStr = selectedDate.toDateString();
    return forecastData.filter((forecast) => {
      const forecastDate = new Date(forecast.timestamp);
      return forecastDate.toDateString() === targetDateStr;
    });
  }, [forecastData, selectedDate]);

  const hourData = useMemo((): HourData[] => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map((hour) => {
      const hourForecast = dayForecastData.find((forecast) => {
        const forecastHour = new Date(forecast.timestamp).getHours();
        return forecastHour === hour;
      });

      let quality: HourData["quality"] = "flat";
      let surfHeight: number | null = null;

      if (hourForecast) {
        surfHeight = hourForecast.surf.heightMax;
        if (surfHeight !== null) {
          if (surfHeight < 1) quality = "flat";
          else if (surfHeight < 2) quality = "poor";
          else if (surfHeight < 4) quality = "fair";
          else if (surfHeight < 8) quality = "good";
          else if (surfHeight < 12) quality = "epic";
          else quality = "huge";
        }
      }

      return {
        hour,
        hasData: !!hourForecast,
        surfHeight,
        quality,
      };
    });
  }, [dayForecastData]);

  const availableHours = hourData.filter((h) => h.hasData).map((h) => h.hour);

  const formatHour = (hour: number): string => {
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${displayHour} ${ampm}`;
  };

  const getQualityColor = (quality: HourData["quality"]): string => {
    const colorMap = {
      flat: "bg-red-400",
      poor: "bg-orange-400",
      fair: "bg-yellow-400",
      good: "bg-green-400",
      epic: "bg-blue-400",
      huge: "bg-purple-400",
    };
    return colorMap[quality] || "bg-gray-300";
  };

  const handleSliderChange = (newValue: number[]) => {
    const hour = newValue[0];
    setInternalValue(newValue);
    onHourChange?.(hour);
  };

  const currentHourData = hourData.find((h) => h.hour === internalValue[0]);
  const currentTime = new Date();
  const isToday = selectedDate.toDateString() === currentTime.toDateString();
  const isPastHour = isToday && internalValue[0] < currentTime.getHours();

  // Quick hour selection buttons (6 fixed anchors)
  const quickHours = [6, 9, 12, 15, 18, 21];

  return (
    <div
      className={cn(
        // Updated spacing and padding from origin/main
        "space-y-1 flex flex-col gap-2 relative p-2.5 bg-background border-x border-b border-border shadow-md rounded-b-sm",
        className
      )}
    >
      {/* Header with current time and data status - simplified layout */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={cn("text-md font-medium", isPastHour && "text-gray-500")}>
            {formatHour(internalValue[0])}
            {isToday && internalValue[0] === currentTime.getHours() && (
              <span className="ml-2 text-sm text-green-600 font-normal">Now</span>
            )}
          </h3>

          {currentHourData?.hasData && currentHourData.surfHeight !== null ? (
            <p className="text-sm text-gray-600">
              {currentHourData.surfHeight.toFixed(1)}ft • {currentHourData.quality}
              {isPastHour && " (past)"}
            </p>
          ) : (
            <p className="text-sm text-gray-400">No data available</p>
          )}
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500">{availableHours.length}/24 hours</p>
          <p className="text-xs text-gray-500">
            {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <Slider
          min={0}
          max={23}
          step={1}
          value={internalValue}
          onValueChange={handleSliderChange}
          className="z-1" // Updated from z-10 to match origin/main
        />

        {/* Hour data indicators - improved positioning */}
        {showDataIndicators && (
          <div className="w-full flex justify-between pl-1.5 pr-2.5">
            {hourData.map((hour, index) => (
              <div key={hour.hour} className="relative">
                <div
                  className={cn(
                    "absolute bottom-6 h-3 w-1 rounded-full transition-all",
                    hour.hasData ? getQualityColor(hour.quality) : "bg-gray-300",
                    hour.hour === internalValue[0] && "ring-2 ring-blue-500 ring-offset-1"
                  )}
                  title={
                    hour.hasData
                      ? `${formatHour(hour.hour)}: ${hour.surfHeight?.toFixed(1)}ft (${hour.quality})`
                      : `${formatHour(hour.hour)}: No data`
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick select buttons - keeping your comprehensive logic */}
      <div className="mt-1">
        <div className="text-xs text-gray-500 mb-1">Quick select</div>
        <div className="grid grid-cols-6 gap-2">
          {quickHours.map((hour) => {
            const hourInfo = hourData.find((h) => h.hour === hour);
            const isAvailable = !!hourInfo?.hasData;
            const isSelected = hour === internalValue[0];

            return (
              <button
                key={hour}
                onClick={() => handleSliderChange([hour])}
                disabled={!isAvailable}
                className={cn(
                  "w-full h-8 rounded text-xs font-medium transition-colors",
                  "flex items-center justify-center",
                  isSelected && "bg-blue-500 text-white",
                  !isSelected && isAvailable && "bg-gray-100 hover:bg-gray-200",
                  !isAvailable && "bg-gray-50 text-gray-400 cursor-not-allowed"
                )}
                title={
                  isAvailable
                    ? `${formatHour(hour)}: ${hourInfo?.surfHeight?.toFixed(1)}ft`
                    : `${formatHour(hour)}: No data`
                }
              >
                <span className="tabular-nums">
                  {(() => {
                    const [num, mer] = formatHour(hour).split(" ");
                    return `${num}${mer[0].toLowerCase()}`;
                  })()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hour scale labels */}
      <div className="flex justify-between text-xs text-gray-400 px-1">
        <span>12 AM</span>
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>11 PM</span>
      </div>

      {/* Warning for missing data */}
      {dayForecastData.length === 0 && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <p className="text-yellow-800">
            ⚠️ No forecast data available for {selectedDate.toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default HourSlider;