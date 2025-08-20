"use client";
import React, { useState, useEffect, useMemo } from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { FaCloud, FaCloudSunRain, FaSun } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { ForecastData } from "@/lib/supabase";

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
  surfHeight: string;
  weatherCondition: "sun" | "cloud" | "rain";
  qualityColor: string;
  hasData: boolean;
  avgSurfHeight: number;
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

  // Calculate max date (default to 7 days from now if not provided)
  const calculatedMaxDate =
    maxDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const daysBetween = dayjs(calculatedMaxDate).diff(dayjs(minDate), "day") + 1;
  const totalDays = Math.min(daysBetween, 30); // Cap at 30 days for performance

  // Generate days array
  const days = Array.from({ length: totalDays }, (_, i) =>
    dayjs(minDate).add(i, "day")
  );

  // Group forecast by day
  const forecastByDate = useMemo(() => {
    const dataMap = new Map<string, ForecastData[]>();
    forecastData.forEach((forecast) => {
      const dateKey = dayjs(forecast.timestamp).format("YYYY-MM-DD");
      if (!dataMap.has(dateKey)) dataMap.set(dateKey, []);
      dataMap.get(dateKey)!.push(forecast);
    });
    return dataMap;
  }, [forecastData]);

  // Weather mapping
  const getWeatherCondition = (
    weatherCode: number | null
  ): "sun" | "cloud" | "rain" => {
    if (!weatherCode) return "sun";
    if (weatherCode >= 50) return "rain"; // drizzle/rain
    if (weatherCode >= 20) return "cloud"; // cloudy/overcast
    return "sun";
  };

  // Surf quality color
  const getSurfQualityColor = (avgHeight: number): string => {
    if (avgHeight < 1) return "bg-red-400";
    if (avgHeight < 2) return "bg-orange-400";
    if (avgHeight < 4) return "bg-yellow-400";
    if (avgHeight < 6) return "bg-green-400";
    if (avgHeight < 10) return "bg-blue-400";
    return "bg-purple-400";
  };

  // Surf height display
  const formatSurfHeight = (heights: number[]): string => {
    if (heights.length === 0) return "0-1";
    const min = Math.min(...heights);
    const max = Math.max(...heights);
    if (min === max) return `${Math.round(min)}`;
    return `${Math.round(min)}-${Math.round(max)}`;
  };

  // Build per-day summaries
  const processedDays: DayData[] = useMemo(() => {
    return days.map((day) => {
      const dateKey = day.format("YYYY-MM-DD");
      const dayForecasts = forecastByDate.get(dateKey) || [];

      if (dayForecasts.length === 0) {
        return {
          date: day,
          surfHeight: "0-1",
          weatherCondition: "sun",
          qualityColor: "bg-gray-300",
          hasData: false,
          avgSurfHeight: 0,
        };
      }

      const surfHeights = dayForecasts
        .map((f) => f.surf.heightMax)
        .filter((h): h is number => h !== null);

      const weatherCodes = dayForecasts
        .map((f) => f.conditions.weather)
        .filter((w): w is number => w !== null);

      const avgSurfHeight =
        surfHeights.length > 0
          ? surfHeights.reduce((a, b) => a + b, 0) / surfHeights.length
          : 0;

      const weatherCondition =
        weatherCodes.length > 0
          ? getWeatherCondition(weatherCodes[0])
          : "sun";

      return {
        date: day,
        surfHeight: formatSurfHeight(surfHeights),
        weatherCondition,
        qualityColor: getSurfQualityColor(avgSurfHeight),
        hasData: true,
        avgSurfHeight,
      };
    });
  }, [days, forecastByDate]);

  // Keep internal selection in sync with prop
  useEffect(() => {
    setInternalSelectedDate(dayjs(selectedDate));
  }, [selectedDate]);

  const scrollBy = 4; // number of slides to advance

  const handleNext = () => {
    if (!api) return;
    const nextIndex = Math.min(
      api.selectedScrollSnap() + scrollBy,
      api.scrollSnapList().length - 1
    );
    api.scrollTo(nextIndex);
  };

  const handlePrev = () => {
    if (!api) return;
    const prevIndex = Math.max(api.selectedScrollSnap() - scrollBy, 0);
    api.scrollTo(prevIndex);
  };

  const handleDateSelect = (day: Dayjs) => {
    setInternalSelectedDate(day);
    onDateChange?.(day.toDate());
  };

  const getWeatherIcon = (condition: "sun" | "cloud" | "rain") => {
    switch (condition) {
      case "sun":
        return <FaSun size={16} color="#f79e55ff" />;
      case "rain":
        return <FaCloudSunRain size={16} color="#6b7280ff" />;
      case "cloud":
      default:
        return <FaCloud size={16} color="#bdbdbdff" />;
    }
  };

  return (
    <div className={cn("flex w-full flex-col", className)}>
      <div className="relative w-full bg-background px-2 py-2 rounded-t-sm drop-shadow-sm border border-border">
        <Carousel
          opts={{ align: "start", loop: false, dragFree: true }}
          setApi={setApi}
          className="w-full"
        >
          {/* Prev/Next overlay the track, they won't squish slides */}
          <CarouselPrevious onClick={handlePrev} />
          <CarouselContent className="-ml-2"> {/* gutter start */}
            {processedDays.map((dayData, index) => {
              const isSelected = internalSelectedDate.isSame(dayData.date, "day");
              const isToday = dayData.date.isSame(today, "day");
              const isPast = dayData.date.isBefore(today, "day");

              return (
                <CarouselItem
                  key={index}
                  className={cn(
                    "pl-2 shrink-0",                          // gutter + prevent shrink
                    "basis-[120px] sm:basis-[132px] md:basis-[148px] lg:basis-[164px]" // consistent width
                  )}
                >
                  <button
                    onClick={() => handleDateSelect(dayData.date)}
                    disabled={isPast}
                    className={cn(
                      "w-full h-full flex flex-col items-center justify-between",
                      "rounded-md border border-border bg-white/70",
                      "py-2 px-2 gap-1.5 text-center transition-all",
                      isSelected ? "ring-2 ring-blue-500" : "hover:ring-1 hover:ring-gray-300",
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

                    {/* Quality color bar */}
                    <span
                      className={cn(
                        "inline-block rounded-full",
                        "w-12 md:w-16 h-1",
                        dayData.qualityColor
                      )}
                    />

                    {/* Surf height */}
                    <span
                      className={cn(
                        "text-base md:text-lg font-semibold leading-tight",
                        !dayData.hasData && "text-gray-400"
                      )}
                    >
                      {dayData.surfHeight}
                      <span className="text-xs font-normal">ft</span>
                    </span>

                    {/* Weather */}
                    <div className="flex items-center justify-center">
                      {getWeatherIcon(dayData.weatherCondition)}
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

      {/* Data status indicator */}
      <div className="px-2 py-1 text-xs text-gray-500 bg-gray-50 border-x border-b border-border rounded-b-sm">
        {forecastData.length > 0
          ? `${forecastData.length} forecast data points loaded`
          : "No forecast data available"}
      </div>
    </div>
  );
};

export default DatePicker;
