"use client";

import React, {
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  MousePointer2 as ArrowIcon,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { fetchBeachByIdLoose, getWindDirection } from "@/lib/supabase";
import { cn, getPacificMidnightUTC } from "@/lib/utils";
import { getForecastCached } from "@/lib/dataCache";
import { syncToNearestThirdHour } from "@/components/graphs/chartSync";
import { useDateContext } from "@/components/context/DateContext";
import { useForecastChartContext } from "@/components/context/ForecastChartContext";
import HoverReferenceLine from "@/components/graphs/HoverReferenceLine";
import { useSunData } from "@/components/context/SunDataContext";
import { buildSunSegmentsForRange } from "@/components/graphs/sunSegments";
import { ChartLoadingCover } from "./ChartLoadingCover";
import {
  useForecastChartLoading,
  useForecastChartsLoadingState,
} from "../context/ForecastChartsLoadingContext";

const chartConfig = {
  primary: {
    label: "Primary",
    color: "#0077b6",
  },
  secondary: {
    label: "Secondary",
    color: "#48cae4",
  },
  tertiary: {
    label: "Tertiary",
    color: "#adf1ffff",
  },
} satisfies ChartConfig;

type SwellPoint = {
  hour: number;
  primary: number;
  secondary: number;
  tertiary: number;
  primaryDir?: number;
  secondaryDir?: number;
  tertiaryDir?: number;
};

type Props = { beachId?: string; days?: Date[] | null };

const HOURS_PER_DAY = 24;
const VISIBLE_DAYS = 4;
const MIN_DAY_PX = 275; // minimum pixels per day to keep UI usable

const ForecastSwellChart: React.FC<Props> = ({ beachId, days }) => {
  const { setPanFraction, subscribePan } = useForecastChartContext();
  const myId = React.useId();
  const { hour: selectedHour, setHoveredHour } = useDateContext();
  const { getSunData } = useSunData();
  const [loading, setLoading] = useState(true);
  const [sunReady, setSunReady] = useState(false);
  const [swellData, setSwellData] = useState<SwellPoint[]>([]);
  const [baseStartMs, setBaseStartMs] = useState<number | null>(null);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );

  // Scrollable state
  const [dayOffset, setDayOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isAtRightEdge, setIsAtRightEdge] = useState(false);
  const { selected: selectedDate } = useDateContext();

  // Normalize and sort incoming days so fetch windows stay aligned
  const normalizedDays = useMemo(() => {
    if (!days || days.length === 0) return null;
    return [...days]
      .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
  }, [days]);
  const displayDays = normalizedDays ?? days ?? null;

  // Pointer & animation refs
  const currentTranslateRef = useRef(0);
  const pointerStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startTranslate: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);

  // Derived dimensions - use normalized days length if available
  const totalFetchedDays = useMemo(() => {
    return normalizedDays && normalizedDays.length > 0
      ? normalizedDays.length
      : VISIBLE_DAYS;
  }, [normalizedDays]);
  const dayPx = useMemo(() => {
    if (!containerWidth) return MIN_DAY_PX;
    const fillPerDay = containerWidth / VISIBLE_DAYS;
    return Math.max(MIN_DAY_PX, Math.floor(fillPerDay));
  }, [containerWidth]);

  const chartInnerWidth = useMemo(
    () => totalFetchedDays * dayPx,
    [totalFetchedDays, dayPx]
  );

  const viewportWidth = useMemo(
    () => Math.min(containerWidth || 0, dayPx * VISIBLE_DAYS),
    [containerWidth, dayPx]
  );

  // helpers: clamp translate (px)
  const clampTranslatePx = useCallback(
    (px: number) => {
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      return Math.max(0, Math.min(px, maxTranslate));
    },
    [chartInnerWidth, viewportWidth]
  );

  // set transform imperatively
  const setInnerTranslatePx = useCallback(
    (px: number, withTransition = false) => {
      const node = innerRef.current;
      if (!node) return;
      if (withTransition) {
        node.style.transition = "transform 360ms cubic-bezier(.2,.9,.2,1)";
      } else {
        node.style.transition = "none";
      }
      node.style.transform = `translate3d(-${px}px,0,0)`;
      currentTranslateRef.current = px;
    },
    []
  );

  // animate to target px
  const animateToPx = useCallback(
    (targetPx: number, onEnd?: () => void) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const start = currentTranslateRef.current;
      const delta = targetPx - start;
      if (Math.abs(delta) < 1) {
        setInnerTranslatePx(targetPx, true);
        onEnd?.();
        return;
      }
      const duration = 320;
      const startTime = performance.now();

      const step = (t: number) => {
        const p = Math.min(1, (t - startTime) / duration);
        const ease = 1 - Math.pow(1 - p, 3);
        const v = start + delta * ease;
        setInnerTranslatePx(clampTranslatePx(v), false);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          setInnerTranslatePx(clampTranslatePx(targetPx), true);
          rafRef.current = null;
          onEnd?.();
        }
      };

      rafRef.current = requestAnimationFrame(step);
    },
    [clampTranslatePx, setInnerTranslatePx]
  );

  // Pointer handlers
  const onPointerDown = (ev: React.PointerEvent) => {
    const node = ev.currentTarget as Element;
    node.setPointerCapture?.(ev.pointerId);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pointerStateRef.current = {
      dragging: true,
      startX: ev.clientX,
      startTranslate: currentTranslateRef.current,
    };
    setInnerTranslatePx(currentTranslateRef.current, false);
    document.body.style.userSelect = "none";
    document.body.style.touchAction = "none";
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    const ps = pointerStateRef.current;
    if (!ps || !ps.dragging) return;
    const delta = ev.clientX - ps.startX;
    const next = clampTranslatePx(ps.startTranslate - delta);
    setInnerTranslatePx(next, false);
    setPanFraction(next / dayPx, myId, "drag");
  };

  const onPointerUp = (ev: React.PointerEvent) => {
    const node = ev.currentTarget as Element;
    node.releasePointerCapture?.(ev.pointerId);
    const ps = pointerStateRef.current;
    if (!ps) return;
    pointerStateRef.current = null;
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";

    const finalPx = clampTranslatePx(currentTranslateRef.current);
    const fractionalDayOffset = finalPx / dayPx;
    setDayOffset(fractionalDayOffset);
    setInnerTranslatePx(finalPx, false);
    setPanFraction(fractionalDayOffset, myId, "animate");

    const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
    setIsAtRightEdge(finalPx >= maxTranslate - 1);
  };

  // Button controls
  const handleNext = useCallback(() => {
    const maxOffset = Math.max(0, totalFetchedDays - 1);
    const currentFractionalOffset = currentTranslateRef.current / dayPx;
    const newOffset = Math.min(maxOffset, currentFractionalOffset + 1);
    const targetPx = newOffset * dayPx;
    setPanFraction(newOffset, myId, "animate");
    animateToPx(targetPx, () => {
      setDayOffset(newOffset);
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      setIsAtRightEdge(targetPx >= maxTranslate - 1);
      setPanFraction(newOffset, myId);
    });
  }, [animateToPx, dayPx, totalFetchedDays, chartInnerWidth, viewportWidth]);

  const handleBack = useCallback(() => {
    const currentFractionalOffset = currentTranslateRef.current / dayPx;
    const newOffset = Math.max(0, currentFractionalOffset - 1);
    const targetPx = newOffset * dayPx;
    setPanFraction(newOffset, myId, "animate");
    animateToPx(targetPx, () => {
      setDayOffset(newOffset);
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      setIsAtRightEdge(targetPx >= maxTranslate - 1);
      setPanFraction(newOffset, myId);
    });
  }, [animateToPx, dayPx, chartInnerWidth, viewportWidth]);

  useEffect(() => {
    const unsub = subscribePan(
      (fraction, sourceId, mode) => {
        if (sourceId === myId) return;
        const px = clampTranslatePx(fraction * dayPx);
        if (mode === "animate") {
          const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
          setIsAtRightEdge(px >= maxTranslate - 1);
          setDayOffset(fraction);
          animateToPx(px);
        } else {
          setInnerTranslatePx(px, false);
        }
      },
      { immediate: true }
    );
    return () => unsub();
  }, [
    subscribePan,
    myId,
    dayPx,
    clampTranslatePx,
    setInnerTranslatePx,
    animateToPx,
  ]);

  // Update transform when dayOffset changes
  useEffect(() => {
    if (pointerStateRef.current?.dragging) return;
    const px = clampTranslatePx(dayOffset * dayPx);
    setInnerTranslatePx(px, true);
  }, [dayOffset, dayPx, clampTranslatePx, setInnerTranslatePx]);

  // ResizeObserver for container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.floor(e.contentRect.width);
        setContainerWidth(w);
        const maxTranslate = Math.max(
          0,
          chartInnerWidth - Math.min(w || 0, dayPx * VISIBLE_DAYS)
        );
        setIsAtRightEdge(currentTranslateRef.current >= maxTranslate - 1);
      }
    });
    ro.observe(el);

    const maxTranslateOnMount = Math.max(0, chartInnerWidth - viewportWidth);
    setIsAtRightEdge(currentTranslateRef.current >= maxTranslateOnMount - 1);

    return () => ro.disconnect();
  }, [chartInnerWidth, dayPx, viewportWidth]);

  // Hydrate sun shading immediately (in parallel with data fetch)
  useEffect(() => {
    let cancelled = false;
    const hydrateSun = async () => {
      const totalDays =
        normalizedDays && normalizedDays.length > 0
          ? normalizedDays.length
          : VISIBLE_DAYS;
      if (!beachId || totalDays <= 0) {
        setDayAreas([]);
        setNightAreas([]);
        return;
      }

      const baseDate =
        normalizedDays && normalizedDays.length > 0
          ? normalizedDays[0]
          : new Date();
      const startDate = getPacificMidnightUTC(baseDate);

      try {
        const segments = await buildSunSegmentsForRange({
          fetchSun: (date) => getSunData(String(beachId), date),
          startDate,
          days: totalDays,
          hourSnap: 3,
        });
        if (!cancelled) {
          setDayAreas(segments.dayAreas);
          setNightAreas(segments.nightAreas);
        }
      } catch {
        if (!cancelled) {
          setDayAreas([]);
          setNightAreas([{ x1: 0, x2: totalDays * HOURS_PER_DAY }]);
        }
      }
      if (!cancelled) {
        setSunReady(true);
      }
    };

    void hydrateSun();

    return () => {
      cancelled = true;
      setSunReady(false);
    };
  }, [beachId, normalizedDays, getSunData]);

  // Build swell series from forecast rows
  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        if (!beachId) {
          if (!cancelled) {
            setSwellData([]);
            setBaseStartMs(null);
          }
          return;
        }

        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;

        if (!id) {
          if (!cancelled) {
            setSwellData([]);
            setBaseStartMs(null);
          }
          return;
        }

        const numDaysToFetch =
          normalizedDays && normalizedDays.length > 0
            ? normalizedDays.length
            : VISIBLE_DAYS;
        const baseDateValue =
          normalizedDays && normalizedDays.length > 0
            ? normalizedDays[0]
            : new Date();
        const start = getPacificMidnightUTC(baseDateValue);
        const end = new Date(
          start.getTime() + numDaysToFetch * 24 * 60 * 60 * 1000
        );
        const rows = await getForecastCached(String(id), start, end);

        if (!rows || !rows.length) {
          if (!cancelled) {
            setSwellData([]);
            setBaseStartMs(null);
          }
          return;
        }

        // Sort rows
        rows.sort(
          (a: any, b: any) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Use today's date (or the first selected day) as the base, not the earliest data point
        const shadingBaseDate = baseDateValue;

        // Get midnight in Pacific timezone for the base date (DST-aware)
        const dateFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const dateParts = dateFormatter.formatToParts(shadingBaseDate);
        const year = parseInt(
          dateParts.find((p) => p.type === "year")?.value || "0"
        );
        const month =
          parseInt(dateParts.find((p) => p.type === "month")?.value || "1") - 1;
        const day = parseInt(
          dateParts.find((p) => p.type === "day")?.value || "1"
        );

        // Calculate UTC timestamp for Pacific midnight using offset at noon
        const noonUTC = Date.UTC(year, month, day, 12, 0, 0, 0);
        const noonDate = new Date(noonUTC);
        const noonFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          hour: "2-digit",
          hour12: false,
        });
        const pacificNoonHour = parseInt(noonFormatter.format(noonDate));
        const offsetHours = pacificNoonHour - 12;

        const baseMs = Date.UTC(year, month, day, -offsetHours, 0, 0, 0);
        if (!cancelled) {
          setBaseStartMs(baseMs);
        }

        const series: SwellPoint[] = [];
        const maxHour = numDaysToFetch * 24; // Maximum hour based on days to fetch
        for (const r of rows) {
          const ts = new Date(r.timestamp).getTime();
          const hour = Math.round((ts - baseMs) / 3600000);
          // Only include data points within the valid range
          if (hour >= 0 && hour <= maxHour) {
            series.push({
              hour,
              primary: Number((r.swell.primary.height ?? 0).toFixed(1)),
              secondary: Number((r.swell.secondary.height ?? 0).toFixed(1)),
              tertiary: Number((r.swell.tertiary?.height ?? 0).toFixed(1)),
              primaryDir: r.swell.primary.direction ?? undefined,
              secondaryDir: r.swell.secondary.direction ?? undefined,
              tertiaryDir: r.swell.tertiary?.direction ?? undefined,
            });
          }
        }

        series.sort((a, b) => a.hour - b.hour);
        if (!cancelled) {
          setSwellData(series);
          setLoading(series.length === 0);
        }

        const shadingStartDate = days ? days[0] : new Date();

        // Get midnight in Pacific timezone (DST-aware)
        const startFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const startParts = startFormatter.formatToParts(shadingStartDate);
        const startYear = parseInt(
          startParts.find((p) => p.type === "year")?.value || "0"
        );
        const startMonth =
          parseInt(startParts.find((p) => p.type === "month")?.value || "1") -
          1;
        const startDay = parseInt(
          startParts.find((p) => p.type === "day")?.value || "1"
        );

        const startNoonUTC = Date.UTC(
          startYear,
          startMonth,
          startDay,
          12,
          0,
          0,
          0
        );
        const startNoonDate = new Date(startNoonUTC);
        const startNoonFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          hour: "2-digit",
          hour12: false,
        });
        const startPacificNoonHour = parseInt(
          startNoonFormatter.format(startNoonDate)
        );
        const startOffsetHours = startPacificNoonHour - 12;

        const startMs = Date.UTC(
          startYear,
          startMonth,
          startDay,
          -startOffsetHours,
          0,
          0,
          0
        );

      } catch (e) {
        console.error("Failed to load swell data", e);
        if (!cancelled) {
          setSwellData([]);
          setBaseStartMs(null);
          setDayAreas([]);
          setNightAreas([]);
          setLoading(true);
        }
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [beachId, normalizedDays]);

  const dayStats = React.useMemo(() => {
    if (!swellData.length) return [];

    const stats: { high: number; low: number }[] = [];
    const hoursPerDay = 24;

    for (let dayIdx = 0; dayIdx < totalFetchedDays; dayIdx++) {
      const dayStartHour = dayIdx * hoursPerDay;
      const dayEndHour = dayStartHour + hoursPerDay;

      const dayData = swellData.filter(
        (point) => point.hour >= dayStartHour && point.hour < dayEndHour
      );

      if (dayData.length > 0) {
        const primaryValues = dayData.map((p) => p.primary);
        const high = Math.max(...primaryValues);
        const low = Math.min(...primaryValues);
        stats.push({
          high: Math.round(high * 10) / 10,
          low: Math.round(low * 10) / 10,
        });
      } else {
        stats.push({ high: 0, low: 0 });
      }
    }

    return stats;
  }, [swellData, totalFetchedDays]);

  const dayLabels =
    Array.isArray(displayDays) && displayDays.length > 0
      ? displayDays.map((d) =>
          d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: "America/Los_Angeles",
          })
        )
      : null;

  // Generate ticks for every hour
  const hourTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let v = 0; v <= 24 * totalFetchedDays; v += 1) {
      ticks.push(v);
    }
    return ticks;
  }, [totalFetchedDays]);

  // Hover sync handlers
  const lastHoveredRef = React.useRef<number | null>(null);

  const handleMouseMove = React.useCallback(
    (e: any) => {
      if (e && e.activeLabel !== undefined) {
        const hour = Number(e.activeLabel);
        if (!isNaN(hour)) {
          // Round to nearest 3-hour increment
          const roundedHour = Math.round(hour / 3) * 3;

          if (lastHoveredRef.current !== roundedHour) {
            lastHoveredRef.current = roundedHour;
            setHoveredHour(roundedHour);
          }
        }
      }
    },
    [setHoveredHour]
  );

  const handleMouseLeave = React.useCallback(() => {
    lastHoveredRef.current = null;
    setHoveredHour(null);
  }, [setHoveredHour]);

  const { setReady } = useForecastChartLoading("forecast-swell");
  React.useEffect(() => {
    setReady(!loading && sunReady);
  }, [loading, sunReady, setReady]);
  const globalLoading = useForecastChartsLoadingState();

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative w-full"
        style={{
          height: 300,
          overflow: "hidden",
          background: "transparent",
          contain: "layout style paint",
          willChange: "transform",
        }}
      >
        <ChartLoadingCover
          show={(loading || !sunReady) && !globalLoading}
          message="Loading swell forecast"
          className="rounded-xl"
        />
        {/* prev/next buttons */}
        <button
          aria-label="Back one day"
          onClick={handleBack}
          className={cn(
            "absolute left-4 top-[55%] -translate-y-1/2 z-50 rounded-full bg-highlight-7/90 p-1 shadow border border-border/30 shadow-even backdrop-blur-xl",
            dayOffset === 0 && "hidden"
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          aria-label="Next one day"
          onClick={handleNext}
          className={cn(
            "absolute right-4 top-[55%] -translate-y-1/2 z-50 rounded-full bg-highlight-7/90 p-1 shadow border border-border/30 shadow-even backdrop-blur-xl",
            isAtRightEdge && "hidden"
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* moving inner (chart + day labels) */}
        <div
          ref={innerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            marginTop: 65,
            position: "absolute",
            left: 0,
            width: chartInnerWidth,
            height: 250,
            display: "block",
            willChange: "transform",
            cursor: "grab",
            touchAction: "pan-y",
          }}
        >
          {/* Day label bar */}
          <div
            className="w-[95.5%] flex justify-between"
            style={{
              position: "absolute",
              zIndex: 40,
              left: "3%",
              top: -65,
              boxSizing: "border-box",
              pointerEvents: "none",
            }}
          >
            {dayLabels?.map((label, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: "center",
                  borderRadius: 8,
                  padding: "6px 6px",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--foreground)",
                  pointerEvents: "none",
                }}
              >
                <div className="flex justify-between whitespace-nowrap px-3 py-2 rounded-lg bg-highlight-5">
                  <span className="flex flex-col items-start">
                    <span className="text-xs font-medium">
                      {label.split(",")[1]}
                    </span>
                    <span className="text-sm font-bold">
                      {label.split(",")[0]}
                    </span>
                  </span>
                  <div className="grid rounded-md bg-highlight-6 grid-cols-[60px_1fr] grid-rows-2 space-y-0.5 items-center text-xs text-muted-foreground uppercase tracking-wide leading-tight">
                    <span className="flex gap-2 items-center">
                      <TrendingUp
                        fill="#353535ff"
                        className="stroke-muted-foreground w-4 h-4"
                      />
                      <span className="block font-medium">High</span>
                    </span>
                    <span className="ml-1 text-foreground normal-case font-medium">
                      {dayStats[idx]?.high ?? 0}{" "}
                      <span className="inline-block">ft</span>
                    </span>
                    <span className="flex gap-2 items-center">
                      <TrendingDown
                        fill="#353535ff"
                        className="stroke-muted-foreground w-4 h-4"
                      />
                      <span className="block -mb-0.5 font-medium">Low</span>
                    </span>
                    <span className="ml-1 text-foreground normal-case font-medium">
                      {dayStats[idx]?.low ?? 0}{" "}
                      <span className="inline-block">ft</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {containerWidth > 0 && (
            <ChartContainer
              key={chartInnerWidth}
              config={chartConfig}
              className="forecast-swell-chart-container aspect-auto h-[235px] w-full"
            >
              <AreaChart
                accessibilityLayer={false}
                width={chartInnerWidth}
                data={swellData}
                margin={{ left: -25, right: 15, bottom: 5, top: 0 }}
                syncId="allCharts"
                syncMethod={syncToNearestThirdHour}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                {/* vertical boundaries every day */}
                {Array.from({ length: totalFetchedDays + 1 }, (_, i) => {
                  if (i !== 0 && i !== totalFetchedDays) {
                    return (
                      <ReferenceLine
                        key={`boundary-${i}`}
                        x={i * 24}
                        stroke="var(--foreground)"
                        strokeOpacity={0.25}
                        strokeWidth={0.5}
                      />
                    );
                  }
                })}
                {dayAreas.map((a, idx) => (
                  <ReferenceArea
                    key={`day-${idx}`}
                    x1={a.x1}
                    x2={a.x2}
                    fill="#FFE58F"
                    fillOpacity={0.2}
                    ifOverflow="extendDomain"
                  />
                ))}
                {nightAreas.map((a, idx) => (
                  <ReferenceArea
                    key={`night-${idx}`}
                    x1={idx === 0 ? undefined : a.x1}
                    x2={idx === nightAreas.length - 1 ? undefined : a.x2}
                    fill="#ccc1ffff"
                    fillOpacity={0.2}
                    ifOverflow="extendDomain"
                  />
                ))}
                <XAxis
                  dataKey="hour"
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={0}
                  fontSize={11}
                  domain={[0, totalFetchedDays * 24]}
                  ticks={hourTicks}
                  tickFormatter={(v: number) =>
                    v % 3 === 0 ? String(v % 12 === 0 ? 12 : v % 12) : ""
                  }
                />
                {/* Selected hour marker */}
                {(() => {
                  try {
                    const base =
                      displayDays && displayDays.length > 0
                        ? displayDays[0]
                        : null;
                    if (!base || !selectedDate) return null;
                    const baseMid = new Date(
                      base.getFullYear(),
                      base.getMonth(),
                      base.getDate()
                    ).getTime();
                    const selMid = new Date(
                      selectedDate.getFullYear(),
                      selectedDate.getMonth(),
                      selectedDate.getDate()
                    ).getTime();
                    const dayDelta = Math.floor(
                      (selMid - baseMid) / (24 * 3600 * 1000)
                    );
                    const x = dayDelta * 24 + (selectedHour ?? 0);
                    if (x < 0 || x > totalFetchedDays * 24) return null;
                    return (
                      <ReferenceLine
                        x={x}
                        stroke="var(--foreground)"
                        strokeDasharray="3 3"
                      />
                    );
                  } catch {
                    return null;
                  }
                })()}
                {/* Hover indicator line */}
                <HoverReferenceLine
                  days={displayDays}
                  selectedDate={selectedDate}
                  selectedHour={selectedHour}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                  domain={[0, (dataMax: number) => Math.ceil(dataMax + 2)]}
                />
                {/* <ChartLegend content={<ChartLegendContent />} /> */}
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0)
                      return null;

                    const data = payload[0].payload;

                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid gap-2">
                          {payload.map((entry, index) => {
                            const dirKey =
                              `${entry.dataKey}Dir` as keyof SwellPoint;
                            const direction = data[dirKey] as
                              | number
                              | undefined;
                            const dirLabel =
                              direction != null
                                ? getWindDirection(direction)
                                : "N/A";

                            return (
                              <div key={index} className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {entry.name}
                                </span>
                                <span
                                  className="font-bold"
                                  style={{ color: entry.color }}
                                >
                                  {typeof entry.value === "number"
                                    ? entry.value.toFixed(1)
                                    : entry.value}{" "}
                                  ft
                                </span>
                                {direction != null && (
                                  <span className="text-[0.65rem] text-muted-foreground">
                                    {dirLabel} ({Math.round(direction)}°)
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                  cursor={{
                    stroke: "var(--foreground)",
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                    strokeOpacity: 0.5,
                  }}
                  animationDuration={0}
                  isAnimationActive={false}
                />

                <Area
                  type="monotone"
                  dataKey="primary"
                  activeDot={false}
                  stroke="#023e8a"
                  fill="#0077b6"
                  fillOpacity={0.2}
                  isAnimationActive={false}
                  animationDuration={0}
                  animationBegin={0}
                  dot={({ payload, cx, cy, index }) => {
                    const iconSize = 15;
                    const direction = payload.primaryDir ?? 0;
                    const rotation = direction - 315;

                    return (
                      <g key={`primary-${index}`}>
                        <g transform={`translate(${cx}, ${cy})`}>
                          <g transform={`rotate(${rotation}, 0, 0)`}>
                            <ArrowIcon
                              size={iconSize}
                              x={-iconSize / 2}
                              y={-iconSize / 2}
                              fill="var(--swell-primary)"
                              color="var(--color-highlight-2)"
                            />
                          </g>
                        </g>
                      </g>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="secondary"
                  activeDot={false}
                  stroke="#0096c7"
                  fill="#48cae4"
                  fillOpacity={0.2}
                  isAnimationActive={false}
                  animationDuration={0}
                  animationBegin={0}
                  dot={({ payload, cx, cy, index }) => {
                    const iconSize = 15;
                    const direction = payload.secondaryDir ?? 0;
                    const rotation = direction - 315;

                    return (
                      <g key={`secondary-${index}`}>
                        <g transform={`translate(${cx}, ${cy})`}>
                          <g transform={`rotate(${rotation}, 0, 0)`}>
                            <ArrowIcon
                              size={iconSize}
                              x={-iconSize / 2}
                              y={-iconSize / 2}
                              fill="var(--swell-primary)"
                              color="var(--color-highlight-2)"
                            />
                          </g>
                        </g>
                      </g>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tertiary"
                  activeDot={false}
                  stroke="#70ccebff"
                  fill="#adf1ffff"
                  fillOpacity={0.2}
                  isAnimationActive={false}
                  animationDuration={0}
                  animationBegin={0}
                  dot={({ payload, cx, cy, index }) => {
                    const iconSize = 15;
                    const direction = payload.tertiaryDir ?? 0;
                    const rotation = direction - 315;

                    return (
                      <g key={`tertiary-${index}`}>
                        <g transform={`translate(${cx}, ${cy})`}>
                          <g transform={`rotate(${rotation}, 0, 0)`}>
                            <ArrowIcon
                              size={iconSize}
                              x={-iconSize / 2}
                              y={-iconSize / 2}
                              fill="var(--swell-primary)"
                              color="var(--color-highlight-2)"
                            />
                          </g>
                        </g>
                      </g>
                    );
                  }}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>

        {/* invisible overlay to prevent pointer events leaking */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 56,
            width: viewportWidth,
            height: 220,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
};

export default React.memo(ForecastSwellChart);
