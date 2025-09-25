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
import { fetchBeachForecast, fetchForecastRange, type ForecastData } from "@/lib/supabase";

type DatePickerProps = {
  beachId: string;
  className?: string;
  value?: Date | null; // controlled selected date (optional)
  onSelect?: (date: Date) => void; // notify parent on selection
};

type DaySummary = {
  date: Dayjs;
  min: number | null;
  max: number | null;
  code: number | null;
};

const getWeatherIcon = (code: number | null) => {
  if (code == null) return <CloudIcon size={16} color="#bdbdbdff" />;
  // WMO code groupings per spec
  if (code === 0) return <Sun size={16} strokeWidth={3} color="#f79e55ff" />; // Clear
  if ([1, 2, 3].includes(code)) return <CloudSun size={16} color="#bdbdbdff" />; // Partly cloudy/overcast
  if ([45, 48].includes(code)) return <CloudIcon size={16} color="#bdbdbdff" />; // Fog
  if ([51, 53, 55].includes(code)) return <CloudDrizzle size={16} color="#66a3ffff" />; // Drizzle
  if ([56, 57].includes(code)) return <CloudDrizzle size={16} color="#66a3ffff" />; // Freezing drizzle
  if ([61, 63, 65].includes(code)) return <CloudRain size={16} color="#66a3ffff" />; // Rain
  if ([66, 67].includes(code)) return <CloudRain size={16} color="#66a3ffff" />; // Freezing rain
  if ([71, 73, 75].includes(code)) return <Snowflake size={16} color="#8ecaffff" />; // Snow
  if (code === 77) return <Snowflake size={16} color="#8ecaffff" />; // Snow grains
  if ([80, 81, 82].includes(code)) return <CloudRain size={16} color="#66a3ffff" />; // Showers
  if ([85, 86].includes(code)) return <Snowflake size={16} color="#8ecaffff" />; // Snow showers
  if ([95, 96, 99].includes(code)) return <CloudLightning size={16} color="#ff8d6bff" />; // Thunderstorm/hail
  return <CloudIcon size={16} color="#bdbdbdff" />;
};

const DatePicker = ({ className, beachId, value, onSelect }: DatePickerProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [summaries, setSummaries] = useState<Record<string, DaySummary>>({});
  const [orderedKeys, setOrderedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const scrollBy = 3;

  const handleNext = () => {
    if (!api) return;
    const nextIndex = Math.min(api.selectedScrollSnap() + scrollBy, api.scrollSnapList().length - 1);
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
              s = s.substring(0, firstSpace) + "T" + s.substring(firstSpace + 1);
            }
          }
          // Normalize timezone suffix variants
          s = s.replace(" +00:00", "Z").replace(" +00", "Z").replace("+00:00", "Z").replace("+00", "Z");
          return s;
        };

        for (const row of data) {
          // Normalize timestamp string to ISO-8601 so Date/Dayjs can parse reliably
          const iso = toISO(row.timestamp);
          const d = dayjs(iso);
          const key = d.format("YYYY-MM-DD");
          const minH = row.surf.heightMin;
          const maxH = row.surf.heightMax;
          const code = row.conditions.weather ?? null;
          if (!groups[key]) {
            groups[key] = { date: d.startOf("day"), min: null, max: null, code: null };
            codeCounts[key] = {};
          }
          if (typeof minH === "number") {
            groups[key].min = groups[key].min == null ? minH : Math.min(groups[key].min, minH);
          }
          if (typeof maxH === "number") {
            groups[key].max = groups[key].max == null ? maxH : Math.max(groups[key].max, maxH);
          }
          if (code != null) {
            codeCounts[key][code] = (codeCounts[key][code] ?? 0) + 1;
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
          const limitedKeys = keys.slice(0, 7);
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
  return (
    <div
      className={cn(
        "relative w-full bg-highlight-4 px-2 py-3 rounded-t-xl drop-shadow-sm",
        className
      )}
    >
      {orderedKeys.length === 0 && (
        <div className="w-full py-6 text-center text-sm text-muted-foreground">
          {loading ? "Loading forecast days..." : "No forecast data available."}
        </div>
      )}
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
            const controlledSelected = value ? day.isSame(dayjs(value), "day") : undefined;
            const isSelected = controlledSelected ?? (selectedDate ? selectedDate.isSame(day, "day") : index === 0);
            const min = summary?.min ?? null;
            const max = summary?.max ?? null;
            const code = summary?.code ?? null;
            const weather = getWeatherIcon(code);
            const color = (min == null || max == null)
              ? "bg-highlight-3"
              : max >= 6
              ? "bg-red-400"
              : max >= 3
              ? "bg-orange-400"
              : "bg-green-400";
            return (
              <CarouselItem
                key={index}
                className={cn(
                  "basis-1/3 @min-md:basis-1/5 @min-2xl:basis-1/7 @min-4xl:basis-1/10 flex justify-center py-1 px-1"
                )}
              >
                <button
                  onClick={() => {
                    setSelectedDate(day);
                    onSelect?.(day.toDate());
                  }}
                  className={cn(
                    "flex flex-col items-center w-full py-1.5 rounded-sm text-center text-sm font-medium transition-colors",
                    isSelected
                      ? "bg-highlight-2 border border-border"
                      : "hover:bg-highlight-5"
                  )}
                >
                  <span className="font-semibold text-[0.65rem] whitespace-nowrap">
                    {day.format("ddd")}, {day.format("M/D")}
                  </span>
                  <span
                    className={cn("inline-block w-12 h-1 rounded-full", color)}
                  />
                  <span className="text-md font-semibold mb-1">
                    {min != null && max != null ? (
                      <>
                        {min.toFixed(0)}-{max.toFixed(0)}
                        <span className="text-xs font-normal">ft</span>
                      </>
                    ) : (
                      <>
                        --
                        <span className="text-xs font-normal">ft</span>
                      </>
                    )}
                  </span>
                  {weather}
                </button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselNext onClick={handleNext} />
      </Carousel>
    </div>
  );
};

export default DatePicker;


