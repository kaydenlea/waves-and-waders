"use client";
import React, { useState, useEffect, useMemo } from "react";
import dayjs, { Dayjs } from "dayjs";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ForecastData } from "@/lib/supabase";

// Weather icons (WMO mapping)
import {
  WiDaySunny,
  WiCloudy,
  WiFog,
  WiRain,
  WiShowers,
  WiSnow,
  WiThunderstorm,
  WiSleet,
} from "react-icons/wi";

interface DatePickerProps {
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  forecastData?: ForecastData[];
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

interface DayData {
  date: Dayjs;
  hasData: boolean;
  avgSurfHeight: number;
  qualityColor: string;
  weatherCode: number | null;
}

const DatePicker = ({
  selectedDate = new Date(),
  onDateChange,
  forecastData = [],
  minDate = new Date(),
  maxDate,
  className,
}: DatePickerProps) => {
  const today = dayjs();
  const [api, setApi] = useState<CarouselApi>();
  const [internalSelectedDate, setInternalSelectedDate] = useState<Dayjs>(
    dayjs(selectedDate)
  );

  // Helpers
  const round1 = (v: number) => Math.round(v * 10) / 10;

  const weatherIconByCode = (code: number | null | undefined) => {
    if (code == null) return <WiDaySunny size={16} color="#f59e0b" />;
    if (code === 0) return <WiDaySunny size={16} color="#f59e0b" />;
    if ([1, 2, 3].includes(code)) return <WiCloudy size={16} color="#6b7280" />;
    if ([45, 48].includes(code)) return <WiFog size={16} color="#94a3b8" />;
    if ([51, 53, 55].includes(code)) return <WiRain size={16} color="#60a5fa" />;
    if ([56, 57, 66, 67].includes(code)) return <WiSleet size={16} color="#38bdf8" />;
    if ([61, 63, 65].includes(code)) return <WiRain size={16} color="#3b82f6" />;
    if ([71, 73, 75, 77, 85, 86].includes(code)) return <WiSnow size={16} color="#93c5fd" />;
    if ([80, 81, 82].includes(code)) return <WiShowers size={16} color="#60a5fa" />;
    if (code === 95) return <WiThunderstorm size={16} color="#f59e0b" />;
    if ([96, 99].includes(code)) return <WiThunderstorm size={16} color="#eab308" />;
    return <WiDaySunny size={16} color="#f59e0b" />;
  };

  const dominantCode = (codes: number[]): number | null => {
    if (codes.length === 0) return null;
    const freq = new Map<number, number>();
    for (const c of codes) freq.set(c, (freq.get(c) ?? 0) + 1);
    let best = codes[0], bestN = 0;
    for (const [c, n] of freq) if (n > bestN) { best = c; bestN = n; }
    return best;
  };

  const getSurfQualityColor = (avgHeight: number): string => {
    if (avgHeight < 1) return "bg-red-400";
    if (avgHeight < 2) return "bg-orange-400";
    if (avgHeight < 4) return "bg-yellow-400";
    if (avgHeight < 6) return "bg-green-400";
    if (avgHeight < 10) return "bg-blue-400";
    return "bg-purple-400";
  };

  // Calculate max date (default to 7 days out if not provided)
  const calculatedMaxDate =
    maxDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const daysBetween = dayjs(calculatedMaxDate).diff(dayjs(minDate), "day") + 1;
  const totalDays = Math.min(daysBetween, 30);

  // Days array
  const days = Array.from({ length: totalDays }, (_, i) =>
    dayjs(minDate).add(i, "day")
  );

  // Group forecasts by date
  const forecastByDate = useMemo(() => {
    const dataMap = new Map<string, ForecastData[]>();
    forecastData.forEach((f) => {
      const key = dayjs(f.timestamp).format("YYYY-MM-DD");
      if (!dataMap.has(key)) dataMap.set(key, []);
      dataMap.get(key)!.push(f);
    });
    return dataMap;
  }, [forecastData]);

  // Build per-day summaries (avg surf + dominant weather code)
  const processedDays: DayData[] = useMemo(() => {
    return days.map((day) => {
      const key = day.format("YYYY-MM-DD");
      const dayForecasts = forecastByDate.get(key) || [];

      if (dayForecasts.length === 0) {
        return {
          date: day,
          hasData: false,
          avgSurfHeight: 0,
          qualityColor: "bg-gray-300",
          weatherCode: null,
        };
      }
      
      // Average surf height (use heightMax as your daily signal)
      const heights = dayForecasts
        .map((f) => f.surf.heightMax)
        .filter((h): h is number => h !== null);
      const avg = heights.length
        ? heights.reduce((a, b) => a + b, 0) / heights.length
        : 0;

      // Dominant weather code for the day
      const codes = dayForecasts
        .map((f) => f.conditions.weather)
        .filter((w): w is number => w !== null);
      const code = dominantCode(codes);

      return {
        date: day,
        hasData: true,
        avgSurfHeight: avg,
        qualityColor: getSurfQualityColor(avg),
        weatherCode: code,
      };
    });
  }, [days, forecastByDate]);

  // Keep internal selection in sync
  useEffect(() => {
    setInternalSelectedDate(dayjs(selectedDate));
  }, [selectedDate]);

  const scrollBy = 4;
  const handleNext = () => {
    if (!api) return;
    const next = Math.min(
      api.selectedScrollSnap() + scrollBy,
      api.scrollSnapList().length - 1
    );
    api.scrollTo(next);
  };
  
  const handlePrev = () => {
    if (!api) return;
    const prev = Math.max(api.selectedScrollSnap() - scrollBy, 0);
    api.scrollTo(prev);
  };
  
  const handleDateSelect = (d: Dayjs) => {
    setInternalSelectedDate(d);
    onDateChange?.(d.toDate());
  };

  return (
    <div className={cn("flex w-full flex-col", className)}>
      <div className="relative w-full bg-background px-2 py-2 rounded-t-sm drop-shadow-sm border border-border">
        <Carousel
          opts={{ align: "start", loop: false, dragFree: true }}
          setApi={setApi}
          className="w-full"
        >
          <CarouselPrevious onClick={handlePrev} />
          <CarouselContent className="-ml-2">
            {processedDays.map((dayData, index) => {
              const isSelected = internalSelectedDate.isSame(dayData.date, "day");
              const isToday = dayData.date.isSame(today, "day");
              const isPast = dayData.date.isBefore(today, "day");

              return (
                <CarouselItem
                  key={index}
                  className={cn(
                    "pl-2 shrink-0",
                    // Updated responsive basis classes from origin/main
                    "basis-1/3 @min-md:basis-1/5 @min-2xl:basis-1/7 @min-4xl:basis-1/10"
                  )}
                >
                  <button
                    onClick={() => handleDateSelect(dayData.date)}
                    disabled={isPast}
                    className={cn(
                      "w-full h-full flex flex-col items-center justify-between",
                      "rounded-md border border-border bg-white/70",
                      "py-2 px-2 gap-1.5 text-center transition-all",
                      // Updated selection styles from origin/main
                      isSelected 
                        ? "bg-highlight-1 border border-border" 
                        : "hover:bg-highlight-2",
                      isPast && "opacity-50 cursor-not-allowed",
                      isToday && "bg-blue-50",
                      !dayData.hasData && "opacity-75"
                    )}
                    title={dayData.date.format("dddd, MMM D")}
                    aria-label={`Select ${dayData.date.format("MMMM D")}`}
                  >
                    <span
                      className={cn(
                        "font-semibold text-[0.7rem] leading-4 whitespace-nowrap",
                        isToday && "text-blue-600"
                      )}
                    >
                      {isToday ? "Today" : dayData.date.format("ddd")},{" "}
                      {dayData.date.format("M/D")}
                    </span>

                    {/* Quality color bar - updated width from origin/main */}
                    <span
                      className={cn(
                        "inline-block rounded-full",
                        "w-10 h-1", // Updated from w-12 md:w-16 to match origin/main
                        dayData.qualityColor
                      )}
                    />

                    {/* Surf average (rounded to 0.1 ft) */}
                    <span
                      className={cn(
                        "text-md font-semibold leading-tight mb-1", // Added mb-1 from origin/main
                        !dayData.hasData && "text-gray-400"
                      )}
                    >
                      {dayData.hasData ? (
                        <>
                          {round1(dayData.avgSurfHeight).toFixed(1)}
                          <span className="text-xs font-normal">ft</span>
                        </>
                      ) : (
                        <>
                          2-3<span className="text-xs font-normal">ft</span>
                        </>
                      )}
                    </span>

                    {/* Weather icon from code */}
                    <div className="flex items-center justify-center">
                      {weatherIconByCode(dayData.weatherCode)}
                      {!dayData.hasData && (
                        <span className="text-xs text-gray-400 ml-1">No data</span>
                      )}
                    </div>
                  </button>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselNext onClick={handleNext} />
        </Carousel>
      </div>

      {/* Status - keeping your backend logic */}
      <div className="px-2 py-1 text-xs text-gray-500 bg-gray-50 border-x border-b border-border rounded-b-sm">
        {forecastData.length > 0
          ? `${forecastData.length} forecast data points loaded`
          : "No forecast data available"}
      </div>
    </div>
  );
};

export default DatePicker;