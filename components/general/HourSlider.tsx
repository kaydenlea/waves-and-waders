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
  isInterval: boolean; // True if this is an actual 3-hour interval
  nearestInterval?: number; // The closest 3-hour interval
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
    
    console.log('=== HOUR SLIDER DEBUG ===');
    console.log('Selected date string:', targetDateStr);
    console.log('Total forecast data:', forecastData.length);
    console.log('All forecast timestamps:');
    forecastData.forEach((f, i) => {
      const date = new Date(f.timestamp);
      console.log(`${i}: ${f.timestamp} -> ${date.toDateString()} ${date.getHours()}:00`);
    });
    
    const filtered = forecastData.filter((forecast) => {
      const forecastDate = new Date(forecast.timestamp);
      const matches = forecastDate.toDateString() === targetDateStr;
      if (matches) {
        console.log(`MATCH: ${forecast.timestamp} -> hour ${forecastDate.getHours()}`);
      }
      return matches;
    });
    
    console.log('Filtered day forecast data:', filtered.length);
    console.log('Filtered hours:', filtered.map(f => new Date(f.timestamp).getHours()));
    console.log('========================');
    
    return filtered;
  }, [forecastData, selectedDate]);

  // Get the actual 3-hour intervals available
  const actualIntervals = useMemo(() => {
    return dayForecastData.map(forecast => new Date(forecast.timestamp).getHours());
  }, [dayForecastData]);

  // Find closest 3-hour interval for any given hour
  const getClosest3HourInterval = (hour: number): number => {
    if (actualIntervals.length === 0) return Math.floor(hour / 3) * 3;
    
    let closest = actualIntervals[0];
    let minDiff = Math.abs(closest - hour);
    
    for (const interval of actualIntervals) {
      const diff = Math.abs(interval - hour);
      if (diff < minDiff) {
        minDiff = diff;
        closest = interval;
      }
    }
    
    return closest;
  };

  const hourData = useMemo((): HourData[] => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map((hour) => {
      const isInterval = actualIntervals.includes(hour);
      const nearestInterval = getClosest3HourInterval(hour);
      
      // Get forecast data for this hour (either exact match or nearest interval)
      const hourForecast = dayForecastData.find((forecast) => {
        const forecastHour = new Date(forecast.timestamp).getHours();
        return isInterval ? forecastHour === hour : forecastHour === nearestInterval;
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
        isInterval,
        nearestInterval,
      };
    });
  }, [dayForecastData, actualIntervals]);

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

  // Quick hour selection buttons - prefer 3-hour intervals
  const quickHours = actualIntervals.length > 0 ? 
    actualIntervals.slice(0, 6) : // Use actual intervals if available
    [0, 3, 6, 9, 12, 15, 18, 21].filter(h => h <= 23).slice(0, 6); // Standard 3-hour intervals

  return (
    <div
      className={cn(
        "space-y-1 flex flex-col gap-2 relative p-2.5 bg-background border-x border-b border-border shadow-md rounded-b-sm",
        className
      )}
    >
      {/* Header with current time and data status - enhanced for 3-hour intervals */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={cn("text-md font-medium", isPastHour && "text-gray-500")}>
            {formatHour(internalValue[0])}
            {isToday && internalValue[0] === currentTime.getHours() && (
              <span className="ml-2 text-sm text-green-600 font-normal">Now</span>
            )}
            {currentHourData && !currentHourData.isInterval && currentHourData.nearestInterval !== undefined && (
              <span className="ml-2 text-xs text-blue-600 font-normal">
                (~{formatHour(currentHourData.nearestInterval)})
              </span>
            )}
          </h3>

          {currentHourData?.hasData && currentHourData.surfHeight !== null ? (
            <p className="text-sm text-gray-600">
              {currentHourData.surfHeight.toFixed(1)}ft • {currentHourData.quality}
              {isPastHour && " (past)"}
              {!currentHourData.isInterval && " (interpolated)"}
            </p>
          ) : (
            <p className="text-sm text-gray-400">No data available</p>
          )}
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500">{actualIntervals.length} intervals</p>
          <p className="text-xs text-gray-500">
            {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* 3-hour interval info */}
      {actualIntervals.length > 0 && (
        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
          3-hour intervals: {actualIntervals.map(h => formatHour(h)).join(", ")}
        </div>
      )}

      {/* Slider */}
      <div className="relative">
        <Slider
          min={0}
          max={23}
          step={1}
          value={internalValue}
          onValueChange={handleSliderChange}
          className="z-1"
        />

        {/* Hour data indicators - enhanced for 3-hour intervals */}
        {showDataIndicators && (
          <div className="w-full flex justify-between pl-1.5 pr-2.5">
            {hourData.map((hour, index) => (
              <div key={hour.hour} className="relative">
                <div
                  className={cn(
                    "absolute bottom-6 h-3 w-1 rounded-full transition-all",
                    hour.hasData ? getQualityColor(hour.quality) : "bg-gray-300",
                    hour.hour === internalValue[0] && "ring-2 ring-blue-500 ring-offset-1",
                    // Make actual intervals more prominent
                    hour.isInterval && "w-1.5 h-4 bottom-5",
                    // Make non-intervals more subtle
                    !hour.isInterval && hour.hasData && "opacity-60"
                  )}
                  title={
                    hour.hasData
                      ? `${formatHour(hour.hour)}: ${hour.surfHeight?.toFixed(1)}ft (${hour.quality})${
                          hour.isInterval ? " - 3hr interval" : " - interpolated"
                        }`
                      : `${formatHour(hour.hour)}: No data`
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick select buttons - enhanced for 3-hour intervals */}
      <div className="mt-1">
        <div className="text-xs text-gray-500 mb-1">
          Quick select {actualIntervals.length > 0 ? "(3-hour intervals)" : ""}
        </div>
        <div className="grid grid-cols-6 gap-2">
          {quickHours.map((hour) => {
            const hourInfo = hourData.find((h) => h.hour === hour);
            const isAvailable = !!hourInfo?.hasData;
            const isSelected = hour === internalValue[0];
            const isActualInterval = actualIntervals.includes(hour);

            return (
              <button
                key={hour}
                onClick={() => handleSliderChange([hour])}
                disabled={!isAvailable}
                className={cn(
                  "w-full h-8 rounded text-xs font-medium transition-colors",
                  "flex items-center justify-center relative",
                  isSelected && "bg-blue-500 text-white",
                  !isSelected && isAvailable && "bg-gray-100 hover:bg-gray-200",
                  !isAvailable && "bg-gray-50 text-gray-400 cursor-not-allowed",
                  // Highlight actual intervals
                  isActualInterval && !isSelected && "border-2 border-blue-300"
                )}
                title={
                  isAvailable
                    ? `${formatHour(hour)}: ${hourInfo?.surfHeight?.toFixed(1)}ft${
                        isActualInterval ? " (3hr interval)" : " (interpolated)"
                      }`
                    : `${formatHour(hour)}: No data`
                }
              >
                <span className="tabular-nums">
                  {(() => {
                    const [num, mer] = formatHour(hour).split(" ");
                    return `${num}${mer[0].toLowerCase()}`;
                  })()}
                </span>
                {/* Small dot indicator for actual intervals */}
                {isActualInterval && (
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                )}
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

      {/* Enhanced status messages for 3-hour intervals */}
      {dayForecastData.length === 0 && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <p className="text-yellow-800">
            No forecast data available for {selectedDate.toLocaleDateString()}
          </p>
        </div>
      )}
      
      {dayForecastData.length > 0 && dayForecastData.length < 8 && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="text-blue-800">
            Partial data: {dayForecastData.length} of 8 expected 3-hour intervals
          </p>
        </div>
      )}
    </div>
  );
};

export default HourSlider;