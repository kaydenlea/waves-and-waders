"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import {
  Sun,
  Cloud as CloudIcon,
  CloudSun,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Snowflake,
} from "lucide-react";
import {
  fetchBeachForecast,
  fetchForecastRange,
  type ForecastData,
} from "@/lib/supabase";
import { useDateContext } from "../context/DateContext";
import { useMapFilters } from "../context/MapFilterContext";

type DatePickerProps = {
  beachId: string;
  className?: string;
  value?: Date | null; // controlled selected date (optional)
  onSelect?: (date: Date) => void; // notify parent on selection
  forecast?: boolean;
};

type DaySummary = {
  date: Dayjs;
  min: number | null;
  max: number | null;
  code: number | null;
};

const getWeatherIcon = (code: number | null, size?: number) => {
  const iconSize = size ? size : 20;
  const strokeWidth = 2.5;
  if (code == null)
    return (
      <CloudIcon size={iconSize} color="#bdbdbdff" strokeWidth={strokeWidth} />
    );
  // WMO code groupings per spec
  if (code === 0)
    return <Sun size={iconSize} strokeWidth={3} color="#f79e55ff" />; // Clear
  if ([1, 2, 3].includes(code))
    return (
      <CloudSun size={iconSize} color="#bdbdbdff" strokeWidth={strokeWidth} />
    ); // Partly cloudy/overcast
  if ([45, 48].includes(code))
    return (
      <CloudIcon size={iconSize} color="#bdbdbdff" strokeWidth={strokeWidth} />
    ); // Fog
  if ([51, 53, 55].includes(code))
    return (
      <CloudDrizzle
        size={iconSize}
        color="#66a3ffff"
        strokeWidth={strokeWidth}
      />
    ); // Drizzle
  if ([56, 57].includes(code))
    return (
      <CloudDrizzle
        size={iconSize}
        color="#66a3ffff"
        strokeWidth={strokeWidth}
      />
    ); // Freezing drizzle
  if ([61, 63, 65].includes(code))
    return (
      <CloudRain size={iconSize} color="#66a3ffff" strokeWidth={strokeWidth} />
    ); // Rain
  if ([66, 67].includes(code))
    return (
      <CloudRain size={iconSize} color="#66a3ffff" strokeWidth={strokeWidth} />
    ); // Freezing rain
  if ([71, 73, 75].includes(code))
    return (
      <Snowflake size={iconSize} color="#8ecaffff" strokeWidth={strokeWidth} />
    ); // Snow
  if (code === 77)
    return (
      <Snowflake size={iconSize} color="#8ecaffff" strokeWidth={strokeWidth} />
    ); // Snow grains
  if ([80, 81, 82].includes(code))
    return (
      <CloudRain size={iconSize} color="#66a3ffff" strokeWidth={strokeWidth} />
    ); // Showers
  if ([85, 86].includes(code))
    return (
      <Snowflake size={iconSize} color="#8ecaffff" strokeWidth={strokeWidth} />
    ); // Snow showers
  if ([95, 96, 99].includes(code))
    return (
      <CloudLightning
        size={iconSize}
        color="#ff8d6bff"
        strokeWidth={strokeWidth}
      />
    ); // Thunderstorm/hail
  return (
    <CloudIcon size={iconSize} color="#bdbdbdff" strokeWidth={strokeWidth} />
  );
};

const DatePicker = ({
  className,
  beachId,
  value,
  onSelect,
  forecast = false,
}: DatePickerProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [summaries, setSummaries] = useState<Record<string, DaySummary>>({});
  const [orderedKeys, setOrderedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { setSelectedDays, setSurfRange } = useDateContext();
  const { setSurfIntensityForDate } = useMapFilters();

  const scrollBy = 3;

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

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!beachId) return;
      setLoading(true);
      try {
        // Determine available range in DB for this beach
        const range = await fetchForecastRange(beachId);
        let data: ForecastData[] = [];
        if (range) {
          const start = new Date(range.start);
          const end = new Date(range.end);
          data = await fetchBeachForecast(beachId, start, end);
        } else {
          // Fallback: wide window around now
          const now = new Date();
          const start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          const end = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
          data = await fetchBeachForecast(beachId, start, end);
        }

        // Group by local YYYY-MM-DD using a robust timestamp parse
        const groups: Record<string, DaySummary> = {};
        const codeCounts: Record<string, Record<number, number>> = {};
        const toISO = (ts: string) => {
          let s = (ts || "").trim();
          if (!s) return s;
          if (!s.includes("T")) {
            // Replace only first space between date and time with 'T'
            const firstSpace = s.indexOf(" ");
            if (firstSpace > 0) {
              s =
                s.substring(0, firstSpace) + "T" + s.substring(firstSpace + 1);
            }
          }
          // Normalize timezone suffix variants
          s = s
            .replace(" +00:00", "Z")
            .replace(" +00", "Z")
            .replace("+00:00", "Z")
            .replace("+00", "Z");
          return s;
        };

        // Track all min and max values per day for averaging
        const minValues: Record<string, number[]> = {};
        const maxValues: Record<string, number[]> = {};

        for (const row of data) {
          // Normalize timestamp string to ISO-8601 so Date/Dayjs can parse reliably
          const iso = toISO(row.timestamp);
          const d = dayjs(iso);
          const key = d.format("YYYY-MM-DD");
          const minH = row.surf.heightMin;
          const maxH = row.surf.heightMax;
          const code = row.conditions.weather ?? null;
          if (!groups[key]) {
            groups[key] = {
              date: d.startOf("day"),
              min: null,
              max: null,
              code: null,
            };
            codeCounts[key] = {};
            minValues[key] = [];
            maxValues[key] = [];
          }
          if (typeof minH === "number" && !Number.isNaN(minH)) {
            minValues[key].push(minH);
          }
          if (typeof maxH === "number" && !Number.isNaN(maxH)) {
            maxValues[key].push(maxH);
          }
          if (code != null) {
            codeCounts[key][code] = (codeCounts[key][code] ?? 0) + 1;
          }
        }

        // Calculate average min and max for each day
        for (const key of Object.keys(groups)) {
          const mins = minValues[key] || [];
          const maxs = maxValues[key] || [];

          if (mins.length > 0) {
            const avgMin =
              mins.reduce((sum, val) => sum + val, 0) / mins.length;
            groups[key].min = avgMin;
          }

          if (maxs.length > 0) {
            const avgMax =
              maxs.reduce((sum, val) => sum + val, 0) / maxs.length;
            groups[key].max = avgMax;
          }
        }
        // Determine dominant code per day
        for (const key of Object.keys(groups)) {
          const counts = codeCounts[key] || {};
          let best: number | null = null;
          let bestCount = -1;
          for (const k of Object.keys(counts)) {
            const n = counts[Number(k)];
            if (n > bestCount) {
              best = Number(k);
              bestCount = n;
            }
          }
          groups[key].code = best;
        }
        if (active) {
          // Order keys ascending and cap to first seven entries to avoid overcrowding.
          const keys = Object.keys(groups).sort();
          // Hide days that are fully in the past once the Pacific day rolls over.
          const pacificTodayKey = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Los_Angeles",
          }).format(new Date());
          const upcomingKeys = keys.filter((key) => key >= pacificTodayKey);
          const visibleKeys =
            upcomingKeys.length > 0 ? upcomingKeys : keys.slice(-7);
          const limitedKeys = visibleKeys.slice(0, 7);
          const limitedGroups: Record<string, DaySummary> = {};
          for (const key of limitedKeys) {
            limitedGroups[key] = groups[key];
          }
          setSummaries(limitedGroups);
          setOrderedKeys(limitedKeys);
          // initialize selection: prefer controlled value; else first key
          if (value instanceof Date) {
            setSelectedDate(dayjs(value).startOf("day"));
          } else if (!selectedDate && limitedKeys.length > 0) {
            const first = limitedGroups[limitedKeys[0]].date;
            setSelectedDate(first);
            // notify parent so external consumers (Summary) can react
            onSelect?.(first.toDate());
          }
        }
      } catch (e) {
        console.error("Failed to load daily summaries", e);
        if (active) {
          setSummaries({});
          setOrderedKeys([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [beachId, value]);

  // Keep internal selection in sync with controlled value
  useEffect(() => {
    if (value instanceof Date) {
      const next = dayjs(value).startOf("day");
      if (!selectedDate || !selectedDate.isSame(next, "day")) {
        setSelectedDate(next);
      }
    }
  }, [value]);

  // const [startIdx, setStartIdx] = useState<number>(0);
  // const [endIdx, setEndIdx] = useState<number>(0);
  let startIdx: number = 0;
  let endIdx: number;

  orderedKeys.forEach((key, index) => {
    const summary = summaries[key];
    const day = summary?.date ?? dayjs(key);
    const controlledSelected = value
      ? day.isSame(dayjs(value), "day")
      : undefined;
    const isSelected =
      controlledSelected ??
      (selectedDate ? selectedDate.isSame(day, "day") : index === 0);
    if (isSelected) {
      startIdx = index;
      return;
    }
  });
  if (startIdx + 3 > orderedKeys.length - 1) {
    endIdx = startIdx;
    startIdx -= 3;
  } else {
    endIdx = startIdx + 3;
  }

  useEffect(() => {
    const daysRange: Date[] = [];
    orderedKeys.forEach((key, index) => {
      if (startIdx <= index && index <= endIdx) {
        const summary = summaries[key];
        const day = summary?.date ?? dayjs(key);
        daysRange.push(day.toDate());
      }
    });
    setSelectedDays(daysRange);

    // Update surf intensity and surf range for the selected date
    if (selectedDate) {
      const key = selectedDate.format("YYYY-MM-DD");
      const summary = summaries[key];
      setSurfIntensityForDate(summary?.max ?? null);
      console.log("OVERVIEW DATA summary", summary);
      // Calculate surf range using the same logic as display
      const max = summary?.max ?? null;
      const minWithFallback =
        summary?.min ?? (max != null && max <= 1 ? 0 : null);

      if (minWithFallback != null && max != null) {
        let minRounded = Math.round(minWithFallback);
        let maxRounded = Math.round(max);
        // Ensure min <= max
        if (minRounded > maxRounded) {
          [minRounded, maxRounded] = [maxRounded, minRounded];
        }
        // If they're equal, subtract 1 from min
        if (minRounded === maxRounded) {
          minRounded = Math.max(0, maxRounded - 1);
        }
        setSurfRange(`${minRounded}-${maxRounded}`);
      } else {
        setSurfRange(null);
      }
    }
  }, [value, selectedDate, summaries]);

  return (
    <div
      className={cn(
        "relative w-full bg-highlight-4 px-2 py-2 rounded-t-xl shadow-even border border-border",
        className
      )}
    >
      {orderedKeys.length === 0 && (
        <div className="w-full py-12 text-center text-sm text-muted-foreground">
          {loading ? "Loading forecast days..." : "No forecast data available."}
        </div>
      )}
      {orderedKeys.length > 0 && (
        <Carousel
          opts={{ align: "start", loop: false, dragFree: true }}
          setApi={setApi}
          className="w-full flex items-center gap-1"
        >
          <CarouselPrevious onClick={handlePrev} />
          <CarouselContent className="mx-1">
            {orderedKeys.map((key, index) => {
              const summary = summaries[key];
              const day = summary?.date ?? dayjs(key);
              const controlledSelected = value
                ? day.isSame(dayjs(value), "day")
                : undefined;
              const isSelected =
                controlledSelected ??
                (selectedDate ? selectedDate.isSame(day, "day") : index === 0);
              const max = summary?.max ?? null;
              const minWithFallback =
                summary?.min ?? (max != null && max <= 1 ? 0 : null);
              const hasRange = minWithFallback != null && max != null;
              const code = summary?.code ?? null;
              const weather = getWeatherIcon(code);
              const weatherSmall = getWeatherIcon(code, 17);

              // Use rounded max for color to match displayed range
              const maxRounded = max != null ? Math.round(max) : null;
              const color = !hasRange
                ? "bg-highlight-3"
                : maxRounded! >= 6
                ? "bg-red-400"
                : maxRounded! >= 3
                ? "bg-orange-400"
                : "bg-green-400";
              let itemStyle = "bg-highlight-4 rounded-md";
              if (typeof startIdx === "number" && forecast) {
                if (startIdx === index) {
                  itemStyle =
                    "bg-highlight-7 rounded-l-md border-y-border border-y-2 border-l-border border-l-2";
                } else if (index === endIdx) {
                  itemStyle =
                    "bg-highlight-7 rounded-r-md border-y-border border-y-2 border-r-border border-r-2";
                } else if (startIdx <= index && index <= endIdx) {
                  itemStyle = "bg-highlight-7 border-y-border border-y-2";
                }
              }
              return (
                <CarouselItem
                  key={index}
                  className={cn(
                    "basis-1/3 @min-lg:basis-1/4 @min-2xl:basis-1/5 @min-3xl:basis-1/6 @min-4xl:basis-1/7 flex justify-center"
                  )}
                >
                  <button
                    onClick={() => {
                      setSelectedDate(day);
                      onSelect?.(day.toDate());
                    }}
                    className={cn(
                      "flex flex-col items-center w-full py-2 text-center text-sm font-medium transition-colors hover:bg-highlight-5/60",
                      !forecast && "rounded-md",
                      !forecast &&
                        isSelected &&
                        "bg-highlight-7 border-border border-2",
                      forecast && itemStyle
                    )}
                  >
                    <span className="font-semibold text-[0.65rem] @min-sm:text-xs whitespace-nowrap">
                      {day.format("ddd")}, {day.format("M/D")}
                    </span>
                    <span
                      className={cn(
                        "inline-block w-12 @min-sm:w-16 h-1 rounded-full",
                        color
                      )}
                    />
                    <div className="mt-2 mb-1 hidden @min-lg:block">
                      {weather}
                    </div>
                    <div className="mt-2 mb-1 hidden @min-sm:block @min-lg:hidden">
                      {weatherSmall}
                    </div>
                    <span className="text-base @min-lg:text-base font-semibold mt-2 @min-sm:mt-0">
                      {hasRange ? (
                        <>
                          {(() => {
                            let minRounded = Math.round(minWithFallback!);
                            let maxRounded = Math.round(max!);
                            // Ensure min <= max
                            if (minRounded > maxRounded) {
                              [minRounded, maxRounded] = [
                                maxRounded,
                                minRounded,
                              ];
                            }
                            // If they're equal, subtract 1 from min
                            if (minRounded === maxRounded) {
                              minRounded = Math.max(0, maxRounded - 1);
                            }
                            return `${minRounded}-${maxRounded}`;
                          })()}
                          <span className="text-xs font-normal">ft</span>
                        </>
                      ) : (
                        <>
                          --
                          <span className="text-xs font-normal">ft</span>
                        </>
                      )}
                    </span>
                  </button>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselNext onClick={handleNext} />
        </Carousel>
      )}
    </div>
  );
};

export default DatePicker;
