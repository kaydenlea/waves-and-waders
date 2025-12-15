"use client";

import * as React from "react";
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  LabelList,
  YAxis,
  LabelProps,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn, getPacificHour, getPacificMidnightUTC } from "@/lib/utils";
import { getForecastCached } from "@/lib/dataCache";
import { useForecastData } from "@/components/context/ForecastDataContext";
import { useDateContext } from "@/components/context/DateContext";
import { useForecastChartContext } from "@/components/context/ForecastChartContext";
import HoverReferenceLine from "@/components/graphs/HoverReferenceLine";
import { syncToNearestThirdHour } from "@/components/graphs/chartSync";
import { buildYAxisTicks } from "@/components/graphs/yAxisTicks";
import { useSunData } from "@/components/context/SunDataContext";
import { buildSunSegmentsForRange } from "@/components/graphs/sunSegments";
import {
  useForecastChartLoading,
  useForecastChartsBusyState,
} from "../context/ForecastChartsLoadingContext";

const chartConfig = {
  surf: {
    label: "Surf (ft)",
    color: "#95c5ffff",
  },
} satisfies ChartConfig;

type SurfPoint = {
  hour: number;
  surf: number;
};

type Props = { beachId?: string; days?: Date[] | null };

const HOURS_PER_DAY = 24;
const VISIBLE_DAYS = 4;
const MIN_DAY_PX = 275;
const CHART_LEFT_MARGIN = 0;
const CHART_RIGHT_MARGIN = 0;
const DATA_STEP_HOURS = 3;
const HALF_STEP_HOURS = DATA_STEP_HOURS / 2;
const Y_AXIS_WIDTH = 30;
const DAY_LABEL_INSET = 6;
const Y_AXIS_OFFSET_VAR = "--forecast-y-axis-offset";
const Y_AXIS_TICK = {
  fill: "var(--foreground)",
  fontWeight: 700,
  filter: "drop-shadow(0 0 4px var(--background))",
} as const;

const ForecastSurfChart: React.FC<Props> = ({ beachId, days }) => {
  const { setPanFraction, subscribePan } = useForecastChartContext();
  const myId = React.useId();
  const { hour: selectedHour, setHoveredHour } = useDateContext();
  const { getSunData } = useSunData();
  const [loading, setLoading] = useState(true);
  const [sunReady, setSunReady] = useState(false);
  const [surfData, setSurfData] = useState<SurfPoint[]>([]);
  const [baseStartMs, setBaseStartMs] = useState<number | null>(null);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );
  const [axisPadding, setAxisPadding] = useState(10);

  // Function to get color based on surf height intensity
  const getSurfColor = (value: number): string => {
    // Define thresholds and colors (light to dark blue)
    if (value >= 5) return "#74b0ffff"; // Very dark blue for 5+ ft
    if (value >= 3) return "#86bbffff"; // Dark blue for 3-5 ft
    if (value >= 1.5) return "#9ccaffff"; // Medium blue for 1.5-3 ft
    return "#b8d9ffff"; // Light blue for < 1.5 ft
  };

  // Scrollable state
  const [dayOffset, setDayOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isAtRightEdge, setIsAtRightEdge] = useState(false);
  const { selected: selectedDate } = useDateContext();

  // Pointer & animation refs
  const currentTranslateRef = useRef(0);
  const pointerStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startTranslate: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);

  // Derived dimensions
  const normalizedDays = useMemo(() => {
    if (!days || days.length === 0) {
      return null;
    }
    return [...days].sort((a, b) => a.getTime() - b.getTime());
  }, [days]);

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
  const surfTicks = useMemo(
    () =>
      buildYAxisTicks(
        surfData.map((d) => d.surf),
        0,
        6,
        0.2,
        5
      ),
    [surfData]
  );
  const hoursSpan = useMemo(
    () => totalFetchedDays * HOURS_PER_DAY,
    [totalFetchedDays]
  );
  const edgePadHours = useMemo(() => {
    if (!chartInnerWidth || hoursSpan === 0) return 0;
    return (axisPadding / chartInnerWidth) * hoursSpan;
  }, [axisPadding, chartInnerWidth, hoursSpan]);

  const viewportWidth = useMemo(
    () => Math.min(containerWidth || 0, dayPx * VISIBLE_DAYS),
    [containerWidth, dayPx]
  );
  const xAxisLeftPadding = useMemo(
    () => Math.max(6, axisPadding / 2),
    [axisPadding]
  );
  const dayLabelLeftOffset = CHART_LEFT_MARGIN + Y_AXIS_WIDTH;
  const dataAreaWidth =
    chartInnerWidth - CHART_LEFT_MARGIN - CHART_RIGHT_MARGIN - Y_AXIS_WIDTH;
  const dayLabelColumnWidth = dataAreaWidth / totalFetchedDays;
  const dayLabelAvailableWidth = totalFetchedDays * dayLabelColumnWidth;

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
      node.style.setProperty(Y_AXIS_OFFSET_VAR, `${px}px`);
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
        if (w < 350) {
          setAxisPadding(8);
        } else if (w < 800) {
          setAxisPadding(20);
        } else {
          setAxisPadding(32);
        }
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

  // Hydrate sun shading immediately (runs in parallel with data fetch)
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
      } catch (err) {
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
  }, [beachId, getSunData, normalizedDays]);

  // Build surf series from forecast rows
  const { rows: sharedRows } = useForecastData();

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        if (!beachId) {
          if (!cancelled) {
            setSurfData([]);
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
        const startMs = start.getTime();
        const endMs = end.getTime();
        const coverageToleranceMs = 3 * 60 * 60 * 1000;

        const filterSharedRows = () => {
          if (!sharedRows?.length) {
            return [] as typeof sharedRows;
          }
          const filtered =
            sharedRows
              .filter((row) => {
                const ts = new Date(row.timestamp).getTime();
                return ts >= startMs && ts <= endMs;
              })
              .sort(
                (a, b) =>
                  new Date(a.timestamp).getTime() -
                  new Date(b.timestamp).getTime()
              ) ?? [];
          if (!filtered.length) {
            return [];
          }
          const firstTs = new Date(filtered[0].timestamp).getTime();
          const lastTs = new Date(
            filtered[filtered.length - 1].timestamp
          ).getTime();
          const coversStart = firstTs <= startMs + coverageToleranceMs;
          const coversEnd = lastTs >= endMs - coverageToleranceMs;
          return coversStart && coversEnd ? filtered : [];
        };

        let rows = filterSharedRows();
        if (!rows?.length) {
          rows = await getForecastCached(String(beachId), start, end);
        }

        if (!rows || !rows.length) {
          if (!cancelled) {
            setSurfData([]);
            setBaseStartMs(null);
          }
          return;
        }

        rows.sort(
          (a: any, b: any) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

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

        // Create data points every 3 hours, centered within each 3-hour window
        const series: SurfPoint[] = [];
        const maxHour = numDaysToFetch * 24;

        for (
          let windowStart = 0;
          windowStart < maxHour;
          windowStart += DATA_STEP_HOURS
        ) {
          const centerHour = windowStart + HALF_STEP_HOURS;

          // Filter rows close to this 3-hour window center (within 1.5 hours)
          const nearbyRows = rows.filter((r: any) => {
            const ts = new Date(r.timestamp).getTime();
            const rowHour = Math.round((ts - baseMs) / 3600000);
            return Math.abs(rowHour - centerHour) <= HALF_STEP_HOURS;
          });

          if (nearbyRows.length === 0) continue;

          // Find the closest row to this hour
          const closest = nearbyRows.reduce((best: any, cur: any) => {
            const ts = new Date(cur.timestamp).getTime();
            const rowHour = Math.round((ts - baseMs) / 3600000);
            const dist = Math.abs(rowHour - centerHour);
            if (!best || dist < best.dist) {
              return { dist, row: cur };
            }
            return best;
          }, null);

          if (closest && closest.row) {
            const r = closest.row;

            // Calculate surf height using swell data
            const h1 = r.swell.primary.height ?? 0;
            const p1 = r.swell.primary.period ?? 10;
            const h2 = r.swell.secondary.height ?? 0;
            const p2 = r.swell.secondary.period ?? 10;
            const h3 = r.swell.tertiary?.height ?? 0;
            const p3 = r.swell.tertiary?.period ?? 10;
            const s1 = h1 * Math.sqrt(Math.max(0, p1) / 10);
            const s2 = h2 * Math.sqrt(Math.max(0, p2) / 10);
            const s3 = h3 * Math.sqrt(Math.max(0, p3) / 10);
            const w1 = 1.0,
              w2 = 0.6,
              w3 = 0.3;
            const combined = Math.sqrt(
              Math.pow(w1 * s1, 2) + Math.pow(w2 * s2, 2) + Math.pow(w3 * s3, 2)
            );
            const wind = r.conditions.windSpeed ?? 0;
            const windPenalty = Math.min(0.5, Math.max(0, (wind - 5) / 35));
            const effective = Math.max(0, combined * (1 - windPenalty));

            // Calculate estimate from heightMin and heightMax (same as SurfChart)
            const heightMin = r.surf.heightMin ?? null;
            const heightMax = r.surf.heightMax ?? null;

            let estimate = 0;
            if (heightMin !== null && heightMax !== null) {
              estimate = (heightMin + heightMax) / 2;
            } else if (heightMax !== null) {
              estimate = heightMax;
            } else if (heightMin !== null) {
              estimate = heightMin;
            }

            let representative = effective;

            if (!Number.isFinite(representative) || representative <= 0) {
              representative = estimate > 0 ? estimate : 0;
            } else if (estimate > 0) {
              representative = representative * 0.7 + estimate * 0.3;
            }

            series.push({
              hour: centerHour,
              surf: Number(Math.max(0, representative).toFixed(1)),
            });
          }
        }

        if (!cancelled) {
          setSurfData(series);
          setLoading(series.length === 0);
        }
      } catch (e) {
        console.error("Failed to load surf data", e);
        if (!cancelled) {
          setSurfData([]);
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
  }, [beachId, normalizedDays, sharedRows]);

  const dayStats = React.useMemo(() => {
    if (!surfData.length) return [];

    const stats: { high: number; low: number }[] = [];
    const hoursPerDay = 24;

    for (let dayIdx = 0; dayIdx < totalFetchedDays; dayIdx++) {
      const dayStartHour = dayIdx * hoursPerDay;
      const dayEndHour = dayStartHour + hoursPerDay;

      const dayData = surfData.filter(
        (point) => point.hour >= dayStartHour && point.hour < dayEndHour
      );

      if (dayData.length > 0) {
        const surfValues = dayData.map((p) => p.surf);
        const high = Math.max(...surfValues);
        const low = Math.min(...surfValues);
        stats.push({
          high: Math.round(high * 10) / 10,
          low: Math.round(low * 10) / 10,
        });
      } else {
        stats.push({ high: 0, low: 0 });
      }
    }

    return stats;
  }, [surfData, totalFetchedDays]);

  const dayLabels =
    normalizedDays && normalizedDays.length > 0
      ? normalizedDays.map((d) =>
          d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: "America/Los_Angeles",
          })
        )
      : null;

  // Generate hour ticks centered beneath each bar
  const hourTicks = useMemo(() => {
    const ticks: number[] = [];
    const totalHours = totalFetchedDays * HOURS_PER_DAY;
    for (let start = 0; start < totalHours; start += DATA_STEP_HOURS) {
      ticks.push(start + HALF_STEP_HOURS);
    }
    return ticks;
  }, [totalFetchedDays]);

  // Hover sync handlers
  const lastHoveredRef = useRef<number | null>(null);

  const handleMouseMove = useCallback(
    (e: any) => {
      if (e?.activeLabel !== undefined) {
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

  const handleMouseLeave = useCallback(() => {
    lastHoveredRef.current = null;
    setHoveredHour(null);
  }, [setHoveredHour]);

  const [stableSelectedHour, setStableSelectedHour] = useState<number | null>(
    null
  );
  const { setReady } = useForecastChartLoading("forecast-surf");
  const dashboardBusy = useForecastChartsBusyState();

  // Mark this widget as not ready whenever its local loading flag is true.
  useEffect(() => {
    if (loading) {
      setReady(false);
    }
  }, [loading, setReady]);

  // Mark ready only after data and sun/shading are fully ready.
  useEffect(() => {
    if (!loading && sunReady) {
      setReady(true);
    }
  }, [loading, sunReady, setReady]);

  useEffect(() => {
    if (!dashboardBusy) {
      setStableSelectedHour(selectedHour ?? null);
    }
  }, [dashboardBusy, selectedHour]);

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
            style={{
              position: "absolute",
              zIndex: 40,
              left: dayLabelLeftOffset,
              top: -65,
              width: dayLabelAvailableWidth,
              display: "grid",
              gridTemplateColumns: `repeat(${totalFetchedDays}, ${dayLabelColumnWidth}px)`,
              pointerEvents: "none",
            }}
          >
            {dayLabels?.map((label, idx) => (
              <div
                key={idx}
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--foreground)",
                  pointerEvents: "none",
                }}
              >
                <div
                  className="flex justify-between whitespace-nowrap px-3 py-2 rounded-lg bg-highlight-5"
                  style={{ width: "95%" }}
                >
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
              className="forecast-surf-chart-container aspect-auto h-[235px] w-full"
            >
              <BarChart
                accessibilityLayer={false}
                width={chartInnerWidth}
                data={surfData}
                margin={{
                  left: CHART_LEFT_MARGIN,
                  right: 0,
                  bottom: 5,
                  top: 0,
                }}
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
                {dayAreas.map((a, idx) => {
                  const extendLeft = idx === 0 && a.x1 <= 1e-3;
                  const extendRight =
                    idx === dayAreas.length - 1 &&
                    Math.abs(a.x2 - hoursSpan) <= 1e-3;
                  const x1 = extendLeft
                    ? Math.max(-edgePadHours * 0.6, a.x1 - edgePadHours)
                    : a.x1;
                  const x2 = extendRight ? a.x2 + edgePadHours : a.x2;
                  return (
                    <ReferenceArea
                      key={`day-${idx}`}
                      x1={x1}
                      x2={x2}
                      fill="#FFE58F"
                      fillOpacity={0.2}
                      ifOverflow="visible"
                    />
                  );
                })}
                {nightAreas.map((a, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === nightAreas.length - 1;
                  const x1 = isFirst ? 0 : a.x1 ?? 0;
                  const x2 = isLast ? hoursSpan : a.x2 ?? hoursSpan;
                  const extendLeft = isFirst && x1 <= 1e-3;
                  const extendRight =
                    isLast && Math.abs(x2 - hoursSpan) <= 1e-3;
                  const safeX1 = extendLeft
                    ? Math.max(-edgePadHours * 0.6, x1 - edgePadHours)
                    : x1;
                  const safeX2 = extendRight ? x2 + edgePadHours : x2;
                  return (
                    <ReferenceArea
                      key={`night-${idx}`}
                      x1={x1}
                      x2={x2}
                      fill="#ccc1ffff"
                      fillOpacity={0.2}
                      ifOverflow="visible"
                    />
                  );
                })}
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
                  tickFormatter={(value: number) => {
                    const baseHour = Math.round(value - HALF_STEP_HOURS);
                    const normalized =
                      ((baseHour % 24) + 24) % 24;
                    const labelHour =
                      normalized % 12 === 0 ? 12 : normalized % 12;
                    return String(labelHour);
                  }}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  cursor={{
                    fill: "transparent",
                    stroke: "var(--foreground)",
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                    strokeOpacity: 0.5,
                  }}
                  animationDuration={0}
                  isAnimationActive={false}
                />
                {/* Selected hour marker */}
                {(() => {
                  try {
                    const effectiveHour =
                      stableSelectedHour ?? selectedHour ?? null;
                    const base =
                      normalizedDays && normalizedDays.length > 0
                        ? normalizedDays[0]
                        : null;
                    if (!base || !selectedDate || effectiveHour == null)
                      return null;
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
                    const x = dayDelta * 24 + effectiveHour;
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
                  days={normalizedDays ?? undefined}
                  selectedDate={selectedDate}
                  selectedHour={selectedHour}
                />
                <Bar
                  dataKey="surf"
                  fill="var(--color-surf)"
                  radius={4}
                  stroke="#5f5f5fff"
                  strokeWidth={0.5}
                  minPointSize={15}
                  isAnimationActive={false}
                  animationDuration={0}
                  animationBegin={0}
                >
                  <LabelList
                    dataKey="surf"
                    position="middle"
                    content={(props: LabelProps) => {
                      const safeX = typeof props.x === "number" ? props.x : 0;
                      const safeY = typeof props.y === "number" ? props.y : 0;
                      const safeWidth =
                        typeof props.width === "number" ? props.width : 0;
                      const safeHeight =
                        typeof props.height === "number" ? props.height : 0;
                      const fontSize = Math.max(10, safeWidth * 0.15);
                      const label =
                        typeof props.value === "number"
                          ? props.value.toFixed(1)
                          : "";

                      // Get color based on surf value
                      const surfValue =
                        typeof props.value === "number" ? props.value : 0;
                      const barColor = getSurfColor(surfValue);

                      if (label) {
                        return (
                          <g>
                            {/* Render the colored bar */}
                            <rect
                              x={safeX}
                              y={safeY}
                              width={safeWidth}
                              height={safeHeight}
                              fill={barColor}
                              rx={4}
                              stroke="#5f5f5fff"
                              strokeWidth={0.5}
                            />
                            <text
                              x={safeX + safeWidth / 2}
                              y={safeY + safeHeight / 2 + fontSize / 3}
                              fill="#2c2c2cff"
                              textAnchor="middle"
                              fontWeight="bold"
                              fontSize={fontSize}
                            >
                              {label === "0.0" ? "0" : label}
                            </text>
                          </g>
                        );
                      }
                      return null;
                    }}
                    fill="black"
                  />
                </Bar>
                <YAxis
                  width={Y_AXIS_WIDTH}
                  tickLine={false}
                  axisLine={{
                    stroke: "var(--border)",
                    strokeWidth: 1.25,
                    opacity: 0.85,
                  }}
                  tickMargin={8}
                  fontSize={11}
                  tick={Y_AXIS_TICK}
                  domain={[
                    surfTicks[0] ?? 0,
                    surfTicks[surfTicks.length - 1] ?? 6,
                  ]}
                  ticks={surfTicks}
                  style={{
                    transform: `translateX(var(${Y_AXIS_OFFSET_VAR}, 0px))`,
                  }}
                />
              </BarChart>
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

export default React.memo(ForecastSurfChart);
