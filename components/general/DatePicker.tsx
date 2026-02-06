"use client";

import React, {
  startTransition,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
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
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Snowflake,
} from "lucide-react";
import MixedCloudSunIcon from "@/components/icons/MixedCloudSunIcon";
import { fetchBeachForecast, type ForecastData } from "@/lib/supabase";
import { fetchSurfIntensityAPI } from "@/lib/api";
import { useSurfIntensity } from "@/lib/hooks/useSurfIntensity";
import { usePacificTodayMs } from "@/lib/hooks/usePacificTodayMs";
import {
  getSurfIntensityBand,
  getSurfIntensityColorCss,
} from "@/lib/forecast/surfIntensity";
import { useDateContext } from "../context/DateContext";
import { useMapData } from "../context/MapFilterContext";
import { useClientPath } from "../context/PathContext";
import { acquireInteractionLock } from "@/lib/uiInteractionLock";

type DatePickerProps = {
  beachId: string;
  className?: string;
  value?: Date | null; // controlled selected date (optional)
  onSelect?: (date: Date) => void; // notify parent on selection
  forecast?: boolean;
  maxDays?: number;
  showNav?: boolean;
  itemsPerView?: 2 | 3;
  disableDrag?: boolean;
};

type DaySummary = {
  date: Dayjs;
  min: number | null;
  max: number | null;
  code: number | null;
};

const getWeatherIcon = (code: number | null, size?: number) => {
  const iconSize = size ? size : 16;
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
      <MixedCloudSunIcon
        size={iconSize}
        strokeWidth={strokeWidth}
        className="shrink-0"
      />
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
  forecast: forecastOverride,
  maxDays,
  showNav = true,
  itemsPerView,
  disableDrag = false,
}: // forecast = false,
DatePickerProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [useNativeDragScroll, setUseNativeDragScroll] = useState(false);
  const pacificTodayMs = usePacificTodayMs();

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    setUseNativeDragScroll(Boolean(el.closest?.("[data-ww-hero-deck]")));
  }, []);

  const { selectedTab } = useClientPath();
  const isHeroDeck = useNativeDragScroll;
  const effectiveForecast =
    typeof forecastOverride === "boolean"
      ? forecastOverride
      : !isHeroDeck && selectedTab === "forecast";
  const forecast = effectiveForecast;
  const [api, setApi] = useState<CarouselApi>();
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [summaries, setSummaries] = useState<Record<string, DaySummary>>({});
  const [orderedKeys, setOrderedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  // Cache forecast data to avoid refetching
  const forecastCacheRef = useRef<{
    beachId: string;
    pacificTodayKey: string;
    data: Record<string, DaySummary>;
    keys: string[];
  } | null>(null);

  const [surfIntensityByDate, setSurfIntensityByDate] = useState<
    Record<string, number>
  >({});

  // rAF handle for batching date selection propagation
  const dateSelectionFrameRef = useRef<number | null>(null);
  const interactionLockReleaseRef = useRef<(() => void) | null>(null);
  const carouselPointerDownRef = useRef(false);
  const carouselSawScrollRef = useRef(false);
  const carouselScrollingRef = useRef(false);

  const { setSelectedDays, setSurfRange } = useDateContext();
  const { setSurfIntensityForDate } = useMapData();

  const scrollBy = 3;

  // Reuse expensive formatters instead of recreating them per row
  const pacificFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    [],
  );
  const pacificNoonFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "2-digit",
        hour12: false,
      }),
    [],
  );
  const pacificDayKeyFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Los_Angeles",
      }),
    [],
  );
  const pacificTodayKey = useMemo(
    () => pacificDayKeyFormatter.format(new Date(pacificTodayMs)),
    [pacificDayKeyFormatter, pacificTodayMs],
  );

  const storageKey = useMemo(
    () => (beachId ? `date-picker-cache:${beachId}` : null),
    [beachId],
  );

  const ensureCarouselInteractionLock = useCallback(() => {
    if (!interactionLockReleaseRef.current) {
      interactionLockReleaseRef.current = acquireInteractionLock();
    }
  }, []);

  const onSelectRef = useRef<DatePickerProps["onSelect"]>(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const notifySelect = useCallback((day: Dayjs) => {
    const handler = onSelectRef.current;
    if (!handler) return;
    startTransition(() => {
      handler(day.toDate());
    });
  }, []);

  const releaseCarouselInteractionLock = useCallback(() => {
    interactionLockReleaseRef.current?.();
    interactionLockReleaseRef.current = null;
  }, []);

  const releaseCarouselInteractionLockIfIdle = useCallback(() => {
    if (carouselPointerDownRef.current) return;
    if (carouselScrollingRef.current) return;
    releaseCarouselInteractionLock();
  }, [releaseCarouselInteractionLock]);

  const beginCarouselMotionLock = useCallback(() => {
    carouselSawScrollRef.current = true;
    carouselScrollingRef.current = true;
    ensureCarouselInteractionLock();
  }, [ensureCarouselInteractionLock]);

  const handleNext = () => {
    if (!api) return;
    const nextIndex = Math.min(
      api.selectedScrollSnap() + scrollBy,
      api.scrollSnapList().length - 1,
    );
    beginCarouselMotionLock();
    api.scrollTo(nextIndex);
  };

  const handlePrev = () => {
    if (!api) return;
    const prevIndex = Math.max(api.selectedScrollSnap() - scrollBy, 0);
    beginCarouselMotionLock();
    api.scrollTo(prevIndex);
  };

  useEffect(() => {
    return () => {
      releaseCarouselInteractionLock();
    };
  }, [releaseCarouselInteractionLock]);

  useEffect(() => {
    if (!api) return;

    const handlePointerDown = () => {
      carouselPointerDownRef.current = true;
      carouselSawScrollRef.current = false;
      ensureCarouselInteractionLock();
    };

    const handlePointerUp = () => {
      carouselPointerDownRef.current = false;
      if (!carouselSawScrollRef.current) {
        carouselScrollingRef.current = false;
        releaseCarouselInteractionLockIfIdle();
      }
    };

    const handleScroll = () => {
      carouselSawScrollRef.current = true;
      carouselScrollingRef.current = true;
      ensureCarouselInteractionLock();
    };

    const handleSettle = () => {
      carouselScrollingRef.current = false;
      releaseCarouselInteractionLockIfIdle();
    };

    api.on("pointerDown", handlePointerDown);
    api.on("pointerUp", handlePointerUp);
    api.on("scroll", handleScroll);
    api.on("settle", handleSettle);
    api.on("reInit", handleSettle);

    return () => {
      api.off("pointerDown", handlePointerDown);
      api.off("pointerUp", handlePointerUp);
      api.off("scroll", handleScroll);
      api.off("settle", handleSettle);
      api.off("reInit", handleSettle);
    };
  }, [
    api,
    ensureCarouselInteractionLock,
    releaseCarouselInteractionLockIfIdle,
  ]);

  useEffect(() => {
    let active = true;

    const reviveSummaries = (raw: Record<string, DaySummary>) => {
      const next: Record<string, DaySummary> = {};
      Object.entries(raw).forEach(([key, summary]) => {
        next[key] = {
          ...summary,
          // sessionStorage strips Dayjs, so ensure we rehydrate
          date: dayjs((summary as DaySummary).date),
        };
      });
      return next;
    };

    const hydrateFromSession = () => {
      if (!storageKey) return null;
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as {
          data: Record<string, DaySummary>;
          keys: string[];
          pacificTodayKey?: string;
        };
        if (
          parsed?.data &&
          parsed?.keys?.length &&
          parsed.pacificTodayKey === pacificTodayKey
        ) {
          setSummaries(reviveSummaries(parsed.data));
          setOrderedKeys(parsed.keys);
          return { ...parsed, data: reviveSummaries(parsed.data) };
        }
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to read cached forecast", err);
        }
      }
      return null;
    };

    const cachedSessionData = hydrateFromSession();
    if (
      cachedSessionData &&
      !selectedDate &&
      !(value instanceof Date) &&
      cachedSessionData.keys.length > 0
    ) {
      const firstKey = cachedSessionData.keys[0];
      const first = cachedSessionData.data[firstKey]?.date ?? dayjs(firstKey);
      setSelectedDate(first);
      notifySelect(first);
    }

    const run = async () => {
      if (!beachId) return;

      // Check if we already have cached data for this beach
      if (
        forecastCacheRef.current?.beachId === beachId &&
        forecastCacheRef.current?.pacificTodayKey === pacificTodayKey
      ) {
        const cached = forecastCacheRef.current;
        setSummaries(cached.data);
        setOrderedKeys(cached.keys);

        // Initialize selection from cache
        if (value instanceof Date) {
          setSelectedDate(dayjs(value).startOf("day"));
        } else if (!selectedDate && cached.keys.length > 0) {
          const first = cached.data[cached.keys[0]].date;
          setSelectedDate(first);
          notifySelect(first);
        }
        return;
      }

      setLoading(true);
      try {
        // Fetch a wide enough window in one request (avoids extra range query)
        const now = new Date();
        const start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const end = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
        const data: ForecastData[] = await fetchBeachForecast(
          beachId,
          start,
          end,
        );

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
          const d = new Date(iso);

          // Get Pacific timezone date for grouping (DST-aware)
          const parts = pacificFormatter.formatToParts(d);
          const year = parts.find((p) => p.type === "year")?.value;
          const month = parts.find((p) => p.type === "month")?.value;
          const day = parts.find((p) => p.type === "day")?.value;
          const key = `${year}-${month}-${day}`;
          const minH = row.surf.heightMin;
          const maxH = row.surf.heightMax;
          const code = row.conditions.weather ?? null;
          if (!groups[key]) {
            // Create a dayjs date from the Pacific timezone date components
            const yearNum = parseInt(year || "0");
            const monthNum = parseInt(month || "1") - 1;
            const dayNum = parseInt(day || "1");

            // Create a Date for midnight in Pacific timezone
            const noonUTC = Date.UTC(yearNum, monthNum, dayNum, 12, 0, 0, 0);
            const noonDate = new Date(noonUTC);
            const pacificNoonHour = parseInt(
              pacificNoonFormatter.format(noonDate),
            );
            const offsetHours = pacificNoonHour - 12;
            const midnightUTC = new Date(
              Date.UTC(yearNum, monthNum, dayNum, -offsetHours, 0, 0, 0),
            );

            groups[key] = {
              date: dayjs(midnightUTC),
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

          // Cache the processed data
          forecastCacheRef.current = {
            beachId,
            pacificTodayKey,
            data: limitedGroups,
            keys: limitedKeys,
          };
          if (storageKey) {
            try {
              sessionStorage.setItem(
                storageKey,
                JSON.stringify({
                  data: limitedGroups,
                  keys: limitedKeys,
                  pacificTodayKey,
                }),
              );
            } catch (err) {
              if (process.env.NODE_ENV !== "production") {
                console.warn("Failed to cache forecast", err);
              }
            }
          }

          // initialize selection: prefer controlled value; else first key
          if (value instanceof Date) {
            setSelectedDate(dayjs(value).startOf("day"));
          } else if (!selectedDate && limitedKeys.length > 0) {
            const first = limitedGroups[limitedKeys[0]].date;
            setSelectedDate(first);
            // notify parent so external consumers (Summary) can react
            notifySelect(first);
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to load daily summaries", e);
        }
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
  }, [
    beachId,
    pacificFormatter,
    pacificNoonFormatter,
    storageKey,
    pacificTodayKey,
  ]);

  // Keep internal selection in sync with controlled value
  useLayoutEffect(() => {
    if (value instanceof Date) {
      const next = dayjs(value).startOf("day");
      if (!selectedDate || !selectedDate.isSame(next, "day")) {
        setSelectedDate(next);
      }
    }
  }, [value, selectedDate]);

  // const [startIdx, setStartIdx] = useState<number>(0);
  // const [endIdx, setEndIdx] = useState<number>(0);
  let startIdx: number = 0;
  let endIdx: number = 0;

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
  if (!forecast) {
    endIdx = startIdx;
  } else if (startIdx + 3 > orderedKeys.length - 1) {
    endIdx = startIdx;
    startIdx -= 3;
  } else {
    endIdx = startIdx + 3;
  }
  const rangeStartIdx = Math.max(0, startIdx);
  const rangeEndIdx = Math.min(
    orderedKeys.length - 1,
    Math.max(endIdx, rangeStartIdx),
  );

  useEffect(() => {
    if (!beachId || orderedKeys.length === 0) return;
    const missing = orderedKeys.filter(
      (dateKey) => surfIntensityByDate[dateKey] == null,
    );
    if (!missing.length) return;

    let cancelled = false;
    const run = async () => {
      const updates: Record<string, number> = {};
      await Promise.all(
        missing.map(async (dateKey) => {
          try {
            const record = await fetchSurfIntensityAPI(
              new Date(`${dateKey}T00:00:00Z`),
            );
            const value = record[beachId];
            if (typeof value === "number" && Number.isFinite(value)) {
              updates[dateKey] = value;
            }
          } catch (error) {
            if (process.env.NODE_ENV !== "production") {
              console.warn(
                `Failed to fetch surf intensity for ${dateKey}`,
                error,
              );
            }
          }
        }),
      );
      if (!cancelled && Object.keys(updates).length) {
        setSurfIntensityByDate((prev) => ({ ...prev, ...updates }));
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [orderedKeys, beachId, surfIntensityByDate]);

  const selectedDateForIntensity = useMemo(() => {
    if (selectedDate) return selectedDate.toDate();
    return value instanceof Date ? value : null;
  }, [selectedDate, value]);

  const { data: selectedIntensityRecord } = useSurfIntensity(
    selectedDateForIntensity,
    Boolean(beachId && selectedDateForIntensity),
  );

  useEffect(() => {
    // Batch context updates to the next frame so the 4-day range changes feel instantaneous.
    if (dateSelectionFrameRef.current != null) {
      cancelAnimationFrame(dateSelectionFrameRef.current);
      dateSelectionFrameRef.current = null;
    }

    const datesEqual = (a: Date[] | null, b: Date[] | null) => {
      if (a === b) return true;
      if (!a || !b) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i].getTime() !== b[i].getTime()) return false;
      }
      return true;
    };

    dateSelectionFrameRef.current = requestAnimationFrame(() => {
      dateSelectionFrameRef.current = null;
      const daysRange: Date[] = [];
      orderedKeys.forEach((key, index) => {
        if (rangeStartIdx <= index && index <= rangeEndIdx) {
          const summary = summaries[key];
          const day = summary?.date ?? dayjs(key);
          daysRange.push(day.toDate());
        }
      });
      if (forecast && orderedKeys.length > 0) {
        setSelectedDays((prev) =>
          datesEqual(prev, daysRange) ? prev : daysRange,
        );
      }

      const targetKey = selectedDate
        ? selectedDate.format("YYYY-MM-DD")
        : value instanceof Date
          ? dayjs(value).format("YYYY-MM-DD")
          : null;

      if (targetKey) {
        const summary = summaries[targetKey];
        let intensity: number | null = null;
        const mapValue = surfIntensityByDate[targetKey];
        if (typeof mapValue === "number" && Number.isFinite(mapValue)) {
          intensity = mapValue;
        } else if (selectedIntensityRecord && beachId) {
          const fallback = selectedIntensityRecord[beachId];
          if (typeof fallback === "number" && Number.isFinite(fallback)) {
            intensity = fallback;
          }
        }
        setSurfIntensityForDate(intensity ?? null);

        const max = summary?.max ?? null;
        const minWithFallback =
          summary?.min ?? (max != null && max <= 1 ? 0 : null);

        if (minWithFallback != null && max != null) {
          let minRounded = Math.round(minWithFallback);
          let maxRounded = Math.round(max);
          if (minRounded > maxRounded) {
            [minRounded, maxRounded] = [maxRounded, minRounded];
          }
          if (minRounded === maxRounded) {
            minRounded = Math.max(0, maxRounded - 1);
          }
          const nextRange = `${minRounded}-${maxRounded}`;
          setSurfRange((prev) => (prev === nextRange ? prev : nextRange));
        } else {
          setSurfRange((prev) => (prev === null ? prev : null));
        }
      } else {
        setSurfIntensityForDate(null);
        setSurfRange(null);
      }
    });

    return () => {
      if (dateSelectionFrameRef.current != null) {
        cancelAnimationFrame(dateSelectionFrameRef.current);
        dateSelectionFrameRef.current = null;
      }
    };
  }, [
    value,
    selectedDate,
    summaries,
    surfIntensityByDate,
    selectedIntensityRecord,
    beachId,
    orderedKeys,
    rangeStartIdx,
    rangeEndIdx,
  ]);

  const effectiveShowNav = showNav && !useNativeDragScroll;
  const navButtonClassName = "rounded-full hidden sm:inline-flex";

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative w-full px-2 py-2 rounded-2xl touch-pan-x",
        className,
      )}
      style={{ touchAction: "pan-x" }}
    >
      {orderedKeys.length === 0 && (
        <div className="w-full py-7 text-center text-sm text-muted-foreground">
          {loading ? "Loading forecast days..." : "No forecast data available."}
        </div>
      )}
      {orderedKeys.length > 0 &&
        (() => {
          const keys = maxDays ? orderedKeys.slice(0, maxDays) : orderedKeys;

          const items = keys.map((key, index) => {
            const summary = summaries[key];
            const day = summary?.date ?? dayjs(key);
            const controlledSelected = value
              ? day.isSame(dayjs(value), "day")
              : undefined;
            const isSelected =
              controlledSelected ??
              (selectedDate ? selectedDate.isSame(day, "day") : index === 0);
            const isRangeStart = forecast && index === rangeStartIdx;
            const isRangeEnd = forecast && index === rangeEndIdx;
            const isInRange =
              forecast && rangeStartIdx <= index && index <= rangeEndIdx;
            const surfIntensity = surfIntensityByDate[key] ?? null;

            const max = summary?.max ?? null;
            const minWithFallback =
              summary?.min ?? (max != null && max <= 1 ? 0 : null);
            const hasRange = minWithFallback != null && max != null;
            const code = summary?.code ?? null;
            const weather = getWeatherIcon(code);

            const intensityColor = getSurfIntensityColorCss(
              getSurfIntensityBand(surfIntensity),
            );

            const rangeClasses = forecast
              ? isInRange
                ? cn(
                    "mx-0 bg-highlight-3/50 dark:bg-highlight-5/20",
                    "border-y border-border/30 dark:border-border/50",
                    "shadow-[0_1px_4px_rgba(0,0,0,0.10)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.20)]",
                    !isRangeStart && "border-l-0",
                    !isRangeEnd && "border-r-0",
                    isRangeStart && isRangeEnd && "rounded-xl mx-1",
                    isRangeStart && !isRangeEnd && "rounded-l-xl ml-1",
                    isRangeEnd && !isRangeStart && "rounded-r-xl mr-1",
                  )
                : cn(
                    "rounded-xl bg-background/70 dark:bg-highlight-4/60",
                    "border-1 border-border/15",
                    "shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
                  )
              : "bg-background dark:bg-highlight-4 rounded-xl";
            const buttonRounding = forecast ? "rounded-none" : "rounded-md";
            const selectedClasses = forecast
              ? cn(
                  "bg-highlight-6 dark:bg-highlight-5/40 hover:bg-highlight-6/95 dark:hover:bg-highlight-5/90",
                  "ring-inset ring-1 ring-foreground/20 dark:ring-foreground/25",
                  "shadow-[0_4px_14px_rgba(0,0,0,0.16)]",
                  "after:absolute after:inset-x-9 after:bottom-1 after:h-px after:rounded-full after:bg-foreground/25 dark:after:bg-foreground/35 after:content-['']",
                )
              : cn(
                  "bg-highlight-6 dark:bg-highlight-5/85 hover:bg-highlight-6/95 dark:hover:bg-highlight-5/90",
                  "ring-inset ring-2 ring-foreground/20 dark:ring-foreground/25",
                  "shadow-[0_4px_14px_rgba(0,0,0,0.16)]",
                  "after:absolute after:inset-x-9 after:bottom-1 after:h-px after:rounded-full after:bg-foreground/25 dark:after:bg-foreground/35 after:content-['']",
                );

            return (
              <CarouselItem
                key={index}
                className={cn(
                  itemsPerView === 3
                    ? "basis-1/3 flex justify-center"
                    : "basis-1/3 @min-[350px]:basis-1/3 @min-md:basis-1/4 @min-xl:basis-1/5 @min-2xl:basis-1/6 @min-3xl:basis-1/7 flex justify-center",
                )}
              >
                <button
                  onClick={() => {
                    setSelectedDate(day);
                    notifySelect(day);
                  }}
                  className={cn(
                    "relative mx-1 my-0.5 flex flex-col items-center w-full py-1.5 text-center text-sm font-medium dark:hover:bg-highlight-5/60 hover:bg-highlight-5/60 shadow-even border-1 border-border/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25 dark:focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    forecast ? "transition-none" : "transition-colors",
                    buttonRounding,
                    rangeClasses,
                    isSelected && selectedClasses,
                  )}
                >
                  <span className="font-semibold text-[0.7rem] @min-sm:text-[0.7rem] whitespace-nowrap">
                    {key === pacificTodayKey ? (
                      "Today"
                    ) : (
                      <>
                        <span className="hidden @min-sm:inline">{`${day.format(
                          "ddd",
                        )}, `}</span>
                        <span>{`${day.format("M/D")}`}</span>
                      </>
                    )}
                  </span>
                  <span
                    className={cn(
                      "inline-block w-12 @min-sm:w-16 h-1 rounded-full",
                    )}
                    style={{ backgroundColor: intensityColor }}
                  />
                  <div className="mt-1.5 mb-0.5">{weather}</div>
                  <span className="text-sm @min-lg:text-sm font-semibold">
                    {hasRange ? (
                      <>
                        {(() => {
                          let minRounded = Math.round(minWithFallback!);
                          let maxRounded = Math.round(max!);
                          if (minRounded > maxRounded) {
                            [minRounded, maxRounded] = [maxRounded, minRounded];
                          }
                          if (minRounded === maxRounded) {
                            minRounded = Math.max(0, maxRounded - 1);
                          }
                          return `${minRounded}-${maxRounded}`;
                        })()}
                        <span className="text-xs font-normal">ft</span>
                      </>
                    ) : (
                      <>
                        --<span className="text-xs font-normal">ft</span>
                      </>
                    )}
                  </span>
                </button>
              </CarouselItem>
            );
          });

          if (useNativeDragScroll) {
            return (
              <div className="w-full flex items-center gap-1">
                <div
                  className={cn(
                    "flex-1",
                    disableDrag
                      ? "overflow-hidden"
                      : "overflow-x-auto overscroll-y-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                  )}
                  style={{ touchAction: disableDrag ? "pan-y" : "pan-x" }}
                  onPointerDownCapture={() => ensureCarouselInteractionLock()}
                  onPointerUpCapture={() => releaseCarouselInteractionLock()}
                  onPointerCancelCapture={() =>
                    releaseCarouselInteractionLock()
                  }
                  onPointerLeave={() => releaseCarouselInteractionLockIfIdle()}
                >
                  <div className="flex mx-0">{items}</div>
                </div>
              </div>
            );
          }

          return (
            <Carousel
              opts={
                disableDrag
                  ? {
                      align: "start",
                      loop: false,
                      dragFree: false,
                      watchDrag: false,
                    }
                  : { align: "start", loop: false, dragFree: true }
              }
              setApi={setApi}
              className={cn(
                "w-full flex items-center gap-1",
                !disableDrag && "touch-pan-x",
              )}
              style={{ touchAction: disableDrag ? "pan-y" : "pan-x" }}
            >
              {effectiveShowNav ? (
                <CarouselPrevious
                  onClick={handlePrev}
                  className={navButtonClassName}
                />
              ) : null}
              <CarouselContent
                className={cn("mx-0", !disableDrag && "touch-pan-x")}
              >
                {items}
              </CarouselContent>
              {effectiveShowNav ? (
                <CarouselNext
                  onClick={handleNext}
                  className={navButtonClassName}
                />
              ) : null}
            </Carousel>
          );
        })()}
    </div>
  );
};

export default DatePicker;
