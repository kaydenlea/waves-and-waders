"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
  LabelList,
} from "recharts";
import { Sun } from "lucide-react";
import {
  fetchBeachByIdLoose,
  fetchBeachDetails,
  fetchDailyConditions,
  fetchBeachTides,
  fetchBeachForecast,
} from "@/lib/supabase";
import DaySlider from "../general/DaySlider";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const VISIBLE_DAYS = 4;
const HOURS_PER_DAY = 24;
const VISIBLE_HOURS = VISIBLE_DAYS * HOURS_PER_DAY;
const FETCH_DAYS = VISIBLE_DAYS; // fetch one extra day to allow forward pan
const MIN_DAY_PX = 250; // minimum pixels per day to keep UI usable on tiny screens

type Props = { beachId?: string; date?: Date };
type TidePoint = { hour: number; tide: number; isPeak?: number };

export default function ForecastTideChart({ beachId, date }: Props) {
  // data loaded for FETCH_DAYS days (hours)
  const [data, setData] = useState<TidePoint[]>([]);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );
  const [sunMarkers, setSunMarkers] = useState<number[]>([]);

  // which day index (0..totalFetchedDays - VISIBLE_DAYS) is the first visible day
  const [dayOffset, setDayOffset] = useState(0);

  // layout
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isAtRightEdge, setIsAtRightEdge] = useState(false);

  // Derived
  const totalFetchedDays = useMemo(() => FETCH_DAYS, []); // fixed for predictability
  const dayPx = useMemo(() => {
    if (!containerWidth) return MIN_DAY_PX;
    const fillPerDay = containerWidth / VISIBLE_DAYS;
    // clamp so days don't become tiny
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

  // Pointer & animation refs (imperative values to avoid re-renders)
  const currentTranslateRef = useRef(0); // px
  const pointerStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startTranslate: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);

  // helpers: clamp translate (px)
  const clampTranslatePx = useCallback(
    (px: number) => {
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      return Math.max(0, Math.min(px, maxTranslate));
    },
    [chartInnerWidth, viewportWidth]
  );

  // set transform imperatively (no setState) - removed per-frame setState here
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
      // IMPORTANT: intentionally do NOT call setIsAtRightEdge here to avoid re-renders per-frame
    },
    []
  );

  // animate from currentTranslateRef to targetPx with RAF (smooth)
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
        // easeOutCubic
        const ease = 1 - Math.pow(1 - p, 3);
        const v = start + delta * ease;
        setInnerTranslatePx(clampTranslatePx(v), false);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          // final snap with transition for crispness
          setInnerTranslatePx(clampTranslatePx(targetPx), true);
          rafRef.current = null;
          onEnd?.();
        }
      };

      rafRef.current = requestAnimationFrame(step);
    },
    [clampTranslatePx, setInnerTranslatePx]
  );

  // pointer handlers (imperative)
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
    // remove transition for immediate follow
    setInnerTranslatePx(currentTranslateRef.current, false);
    // prevent text selection
    document.body.style.userSelect = "none";
    document.body.style.touchAction = "none";
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    const ps = pointerStateRef.current;
    if (!ps || !ps.dragging) return;
    const delta = ev.clientX - ps.startX;
    const next = clampTranslatePx(ps.startTranslate - delta);
    // update transform imperatively (no React state)
    setInnerTranslatePx(next, false);
  };

  const snapToNearestDayFromPx = useCallback(
    (px: number) => {
      const day = Math.round(px / dayPx);
      const dayClamped = Math.max(
        0,
        Math.min(day, totalFetchedDays - VISIBLE_DAYS)
      );
      return dayClamped;
    },
    [dayPx, totalFetchedDays]
  );

  const RoundToNearestDayFromPx = useCallback(
    (px: number) => {
      const day = Math.round(px / dayPx);
      const dayClamped = Math.max(
        0,
        Math.min(day, totalFetchedDays - VISIBLE_DAYS)
      );
      return dayClamped;
    },
    [dayPx, totalFetchedDays]
  );

  const onPointerUp = (ev: React.PointerEvent) => {
    const node = ev.currentTarget as Element;
    node.releasePointerCapture?.(ev.pointerId);
    const ps = pointerStateRef.current;
    if (!ps) return;
    pointerStateRef.current = null;
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";

    // get the current pixel translation (where the user left it)
    const finalPx = clampTranslatePx(currentTranslateRef.current);

    // compute the fractional offset in days
    const fractionalDayOffset = finalPx / dayPx;

    // update logical day offset — keeps button behavior in sync
    setDayOffset(fractionalDayOffset);

    // do NOT animate or snap visually (user position is already correct)
    // Just ensure transform matches clamped px
    setInnerTranslatePx(finalPx, false);

    // update right-edge flag once at drag end (low frequency)
    const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
    setIsAtRightEdge(finalPx >= maxTranslate - 1);
  };

  // Button controls: animate to next/prev by one day
  const handleNext = useCallback(() => {
    const maxOffset = Math.max(0, totalFetchedDays - 1);
    const currentFractionalOffset = currentTranslateRef.current / dayPx;
    const newOffset = Math.min(maxOffset, currentFractionalOffset + 1);
    const targetPx = newOffset * dayPx;
    animateToPx(targetPx, () => {
      setDayOffset(newOffset);
      // update isAtRightEdge after animation completes
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      setIsAtRightEdge(targetPx >= maxTranslate - 1);
    });
  }, [animateToPx, dayPx, totalFetchedDays, chartInnerWidth, viewportWidth]);

  const handleBack = useCallback(() => {
    const currentFractionalOffset = currentTranslateRef.current / dayPx;
    const newOffset = Math.max(0, currentFractionalOffset - 1);
    const targetPx = newOffset * dayPx;
    animateToPx(targetPx, () => {
      setDayOffset(newOffset);
      // update isAtRightEdge after animation completes
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      setIsAtRightEdge(targetPx >= maxTranslate - 1);
    });
  }, [animateToPx, dayPx, chartInnerWidth, viewportWidth]);

  // Update inner transform when dayOffset or dayPx changes (unless user is actively dragging)
  useEffect(() => {
    // if user is dragging, avoid snapping
    if (pointerStateRef.current?.dragging) return;
    const px = clampTranslatePx(dayOffset * dayPx);
    // animate to logical position for programmatic changes
    setInnerTranslatePx(px, true);

    // update right-edge flag once (low frequency)
    // const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
    // setIsAtRightEdge(px >= maxTranslate - 1);
  }, [
    dayOffset,
    dayPx,
    clampTranslatePx,
    setInnerTranslatePx,
    chartInnerWidth,
    viewportWidth,
  ]);

  // ResizeObserver for container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.floor(e.contentRect.width);
        setContainerWidth(w);
        // compute right-edge after resize (low frequency)
        const maxTranslate = Math.max(
          0,
          chartInnerWidth - Math.min(w || 0, dayPx * VISIBLE_DAYS)
        );
        setIsAtRightEdge(currentTranslateRef.current >= maxTranslate - 1);
      }
    });
    ro.observe(el);
    // setContainerWidth(Math.floor(el.clientWidth));

    // also set isAtRightEdge on mount
    const maxTranslateOnMount = Math.max(0, chartInnerWidth - viewportWidth);
    setIsAtRightEdge(currentTranslateRef.current >= maxTranslateOnMount - 1);

    return () => ro.disconnect();
  }, [chartInnerWidth, dayPx, viewportWidth]);

  // Fetch tide + day info for FETCH_DAYS
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!beachId) return;
      try {
        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;

        const startInput = date instanceof Date ? new Date(date) : new Date();
        const startLocal = new Date(
          startInput.toLocaleString("en-US", {
            timeZone: "America/Los_Angeles",
          })
        );
        startLocal.setHours(0, 0, 0, 0);
        const startMs = startLocal.getTime();
        const fetchHours = FETCH_DAYS * HOURS_PER_DAY;
        const end = new Date(startMs + fetchHours * 60 * 60 * 1000);
        console.log("WINDOW WINDOW WINDOW", new Date(startMs), end);
        const points = await fetchBeachTides(id, new Date(startMs), end);
        let series: TidePoint[] = [];
        if (!points || points.length === 0) {
          const rows = await fetchBeachForecast(id, new Date(startMs), end);
          series = rows.map((r) => ({
            hour: Math.round(
              (new Date(r.timestamp).getTime() - startMs) / (60 * 60 * 1000)
            ),
            tide: r.conditions.tideLevel ?? 0,
          }));
        } else {
          series = points.map((p) => ({
            hour:
              (new Date(p.timestamp).getTime() - startMs) / (60 * 60 * 1000),
            tide: p.tideLevelFt ?? 0,
          }));
        }

        series = series
          .filter((p) => p.hour >= 0 && p.hour <= fetchHours)
          .sort((a, b) => a.hour - b.hour);

        // peaks
        const out = series.map((p) => ({ ...p }));
        for (let i = 1; i < series.length - 1; i++) {
          const a = series[i - 1],
            b = series[i],
            c = series[i + 1];
          if (b.tide > a.tide && b.tide >= c.tide)
            out[i].isPeak = Number(b.tide.toFixed(1));
          else if (b.tide < a.tide && b.tide <= c.tide)
            out[i].isPeak = Number(b.tide.toFixed(1));
        }
        if (!cancelled) setData(out);

        // day/night/sun markers
        const beach = await fetchBeachDetails(String(id));
        const county = beach?.COUNTY;
        if (county) {
          const parseHM = (
            s: string | null
          ): { h: number; m: number } | null => {
            if (!s) return null;
            const m = /^(\d{1,2}):(\d{2})/.exec(s.trim());
            if (!m) return null;
            const h = Number(m[1]);
            const mm = Number(m[2]);
            if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
            return { h, m: mm };
          };

          const dayAreasBuild: { x1: number; x2: number }[] = [];
          const nightAreasBuild: { x1: number; x2?: number }[] = [];
          const markerTargets: number[] = [];
          let nightStart = 0;
          for (let di = 0; di < FETCH_DAYS; di++) {
            const cond = await fetchDailyConditions(
              county,
              new Date(startMs + di * 24 * 60 * 60 * 1000)
            );
            const rise = parseHM(cond?.sunrise ?? null);
            const setv = parseHM(cond?.sunset ?? null);
            if (!rise || !setv) {
              // fallback mark whole day
              dayAreasBuild.push({ x1: di * 24, x2: di * 24 + 24 });
              nightAreasBuild.push({ x1: nightStart, x2: di * 24 });
              nightStart = di * 24 + 24;
              continue;
            }
            const offset = di * 24;
            const rH = offset + rise.h + rise.m / 60; // Use fractional hours
            const sH = offset + setv.h + setv.m / 60; // Use fractional hours
            const dayStart = Math.min(rH, sH);
            const dayEnd = Math.max(rH, sH);
            dayAreasBuild.push({ x1: dayStart, x2: dayEnd });
            nightAreasBuild.push({ x1: nightStart, x2: dayStart });
            nightStart = dayEnd;
            markerTargets.push(rH, sH);
          }
          nightAreasBuild.push({ x1: nightStart });

          // Find the closest data point to each marker target
          const markers: number[] = [];
          for (const target of markerTargets) {
            let closest = series[0];
            let minDiff = Math.abs(series[0].hour - target);
            for (const point of series) {
              const diff = Math.abs(point.hour - target);
              if (diff < minDiff) {
                minDiff = diff;
                closest = point;
              }
            }
            // Only add if within reasonable range (10 minutes = 0.17 hours)
            if (minDiff < 0.17 && !markers.includes(closest.hour)) {
              markers.push(closest.hour);
            }
          }

          if (!cancelled) {
            console.log("📅 Day areas:", dayAreasBuild);
            console.log("🌙 Night areas:", nightAreasBuild);
            console.log("☀️ Sun markers:", markers);
            setDayAreas(dayAreasBuild);
            setNightAreas(nightAreasBuild);
            setSunMarkers(markers);
          }
        } else {
          if (!cancelled) {
            setDayAreas([]);
            setNightAreas([]);
            setSunMarkers([]);
          }
        }
      } catch (e) {
        console.error("ForecastTideChart load error:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [beachId, date]);

  // Prepare day label texts for the *visible 4 days* starting at dayOffset
  const dayLabels = useMemo(() => {
    const base = date instanceof Date ? new Date(date) : new Date();
    const startLocal = new Date(
      base.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
    );
    startLocal.setHours(0, 0, 0, 0);
    const labels = [];
    for (let i = 0; i < VISIBLE_DAYS; i++) {
      const d = new Date(startLocal.getTime() + i * 24 * 60 * 60 * 1000);
      labels.push(
        d.toLocaleDateString(undefined, {
          weekday: "short",
          month: "numeric",
          day: "numeric",
        })
      );
    }
    return labels;
  }, [date]);

  // computed visible data (for tooltip & potential optimization)
  const visibleHourStart = dayOffset * HOURS_PER_DAY;
  const visibleHourEnd = visibleHourStart + VISIBLE_HOURS - 1;
  const visibleData = useMemo(
    () =>
      data.filter(
        (d) => d.hour >= visibleHourStart && d.hour <= visibleHourEnd
      ),
    [data, visibleHourStart, visibleHourEnd]
  );

  // Compute label positions with collision avoidance
  const labelPositions = useMemo(() => {
    const peaks = data
      .map((d, idx) => ({ ...d, index: idx }))
      .filter((d) => d.isPeak !== undefined && d.isPeak !== null);

    if (peaks.length === 0) return new Map<number, number>();

    const positions = new Map<number, number>(); // index -> y-offset
    const LABEL_WIDTH = 70; // Approximate width of label text (increased for better detection)

    // Sort peaks by x-position (hour)
    const sorted = [...peaks].sort((a, b) => a.hour - b.hour);

    // Calculate chart width scale (pixels per hour)
    const pxPerHour = chartInnerWidth / (totalFetchedDays * 24);

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      let baseOffset = -32; // Default offset from point (above)

      // Check for collisions with all previous labels
      for (let j = i - 1; j >= 0; j--) {
        const prev = sorted[j];
        const prevOffset = positions.get(prev.index) ?? -32;

        // Calculate horizontal distance in pixels
        const xDist = Math.abs(current.hour - prev.hour) * pxPerHour;

        // If labels overlap horizontally, alternate above/below
        if (xDist < LABEL_WIDTH) {
          // Alternate: if previous is above (negative), place current below (positive)
          if (prevOffset < 0) {
            baseOffset = 25; // Below the curve
          } else {
            baseOffset = -32; // Above the curve
          }
          break; // Only check the most recent overlapping label
        }
      }

      positions.set(current.index, baseOffset);
    }

    return positions;
  }, [data, chartInnerWidth, totalFetchedDays]);

  const hourTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let v = 0; v <= 24 * totalFetchedDays; v += 1) {
      ticks.push(v);
    }
    return ticks;
  }, [totalFetchedDays]);

  // Render
  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative w-full"
        style={{
          height: 290,
          overflow: "hidden",
          background: "transparent",
        }}
      >
        {/* prev/next buttons */}
        <button
          aria-label="Back one day"
          onClick={handleBack}
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-highlight-7/90 p-2 shadow border border-border/30 shadow-even backdrop-blur-xl",
            dayOffset === 0 && "hidden"
          )}
        >
          ◀
        </button>
        <button
          aria-label="Next one day"
          onClick={handleNext}
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-highlight-7/90 p-2 shadow border border-border/30 shadow-even backdrop-blur-xl",
            isAtRightEdge && "hidden"
          )}
        >
          ▶
        </button>

        {/* moving inner (chart + day separators) */}
        <div
          ref={innerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            marginTop: 35,
            position: "absolute",
            left: 0,
            // top: 60, // leave room for label bar
            width: chartInnerWidth,
            height: 250,
            display: "block",
            willChange: "transform",
            cursor: "grab",
            touchAction: "pan-y",
          }}
        >
          {/* Day label bar (4 filled boxes) — fixed in viewport and aligned to visible days */}
          <div
            className="w-[96%] flex justify-between"
            style={{
              position: "absolute",
              zIndex: 40,
              left: "3%",
              top: -35,
              boxSizing: "border-box",
              pointerEvents: "none",
            }}
          >
            {dayLabels.map((label, idx) => (
              <div
                key={idx}
                className=""
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
                <div className="max-w-25 mx-auto p-1 rounded-sm bg-highlight-7 border border-border">
                  {label}
                </div>
              </div>
            ))}
          </div>
          <ChartContainer
            config={
              { tide: { label: "Tide", color: "#6e6e6eff" } } as ChartConfig
            }
            className="aspect-auto h-[258px] w-full"
          >
            <LineChart
              width={chartInnerWidth}
              // height={200}
              data={data}
              margin={{ left: -35, right: 0, bottom: 5, top: 6 }}
            >
              {dayAreas.length > 0 &&
                console.log("🎨 Rendering", dayAreas.length, "day areas")}
              {dayAreas.map((a, idx) => (
                <ReferenceArea
                  key={`day-${idx}`}
                  x1={a.x1}
                  x2={a.x2}
                  fill="#FFE58F"
                  fillOpacity={0.18}
                  ifOverflow="extendDomain"
                />
              ))}
              {nightAreas.length > 0 &&
                console.log("🎨 Rendering", nightAreas.length, "night areas")}
              {nightAreas.map((a, idx) => (
                <ReferenceArea
                  key={`night-${idx}`}
                  x1={idx === 0 ? undefined : a.x1}
                  x2={idx === nightAreas.length - 1 ? undefined : a.x2}
                  fill="#ccc1ffff"
                  fillOpacity={0.12}
                  ifOverflow="extendDomain"
                />
              ))}

              {/* vertical boundaries every day */}
              {Array.from({ length: totalFetchedDays + 1 }, (_, i) => {
                if (i !== 0 && i !== totalFetchedDays) {
                  return (
                    <ReferenceLine
                      key={`boundary-${i}`}
                      x={i * 24}
                      stroke="var(--foreground)"
                      strokeOpacity={0.3}
                      strokeWidth={1}
                    />
                  );
                }
              })}

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--foreground)"
                strokeWidth={0.08}
                vertical={false}
              />
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
              <YAxis
                dataKey="tide"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                domain={[
                  (dataMin: number) =>
                    Number.isFinite(dataMin) ? Math.floor(dataMin) - 4 : 0,
                  (dataMax: number) =>
                    Number.isFinite(dataMax)
                      ? Math.max(Math.ceil(dataMax) + 4, 8)
                      : 8,
                ]}
              />
              <ChartTooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload || !payload.length) return null;

                  const dataPoint = payload[0].payload;
                  const h = dataPoint.hour;

                  // Format time
                  const wholeHour = Math.floor(h);
                  const minutes = Math.round((h - wholeHour) * 60);
                  const displayHour =
                    wholeHour % 12 === 0 ? 12 : wholeHour % 12;
                  const ampm = wholeHour % 24 >= 12 ? "PM" : "AM";
                  const timeLabel =
                    minutes > 0
                      ? `${displayHour}:${minutes
                          .toString()
                          .padStart(2, "0")} ${ampm}`
                      : `${displayHour} ${ampm}`;

                  // Format tide value
                  const tideValue =
                    dataPoint.tide != null ? dataPoint.tide.toFixed(1) : "N/A";

                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="text-xs font-medium">{timeLabel}</div>
                      <div className="text-sm font-bold">{tideValue} ft</div>
                    </div>
                  );
                }}
              />

              <Line
                dataKey="tide"
                type="natural"
                stroke="var(--color-tide)"
                strokeWidth={2}
                dot={({ payload, cx, cy }: any) => {
                  const hour = payload.hour as number;
                  // Exact match for sun markers (no duplicates)
                  const isSunMarker = sunMarkers.includes(hour);
                  if (isSunMarker) {
                    return (
                      <circle
                        key={hour}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="orange"
                        stroke="var(--color-tide)"
                        strokeWidth={1}
                      />
                    );
                  } else if (
                    payload.isPeak !== undefined &&
                    payload.isPeak !== null
                  ) {
                    const isLow =
                      typeof payload.isPeak === "number" &&
                      payload.isPeak <= (payload.tide ?? 0) &&
                      payload.isPeak <= 0;
                    return (
                      <circle
                        key={hour}
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill={isLow ? "#ef4444" : "#22c55e"}
                        stroke="var(--color-tide)"
                        strokeWidth={1}
                      />
                    );
                  }
                  return <g key={payload.hour} />;
                }}
              >
                <LabelList
                  dataKey="tide"
                  content={(props: any) => {
                    const safeX = typeof props.x === "number" ? props.x : 0;
                    const hour = data[props.index ?? -1]?.hour;
                    // Exact match for sun markers (no duplicates)
                    const isSunMarker =
                      hour != null && sunMarkers.includes(hour);
                    return (
                      <g>
                        {isSunMarker ? (
                          <Sun
                            size={18}
                            x={safeX - 9}
                            y={5}
                            fill="#ff9946ff"
                            color="#ff9946ff"
                          />
                        ) : null}
                      </g>
                    );
                  }}
                />
                <LabelList
                  dataKey="isPeak"
                  content={(props: any) => {
                    const safeX = typeof props.x === "number" ? props.x : 0;
                    const safeY = typeof props.y === "number" ? props.y : 0;
                    if (props.value && typeof props.index === "number") {
                      const h = data[props.index]?.hour ?? 0;
                      const wholeHour = Math.floor(h);
                      const minutes = Math.round((h - wholeHour) * 60);
                      const displayHour =
                        wholeHour % 12 === 0 ? 12 : wholeHour % 12;
                      const ampm = wholeHour % 24 >= 12 ? "PM" : "AM";
                      // Format time as "8:30 AM" or "8 AM" if no minutes
                      const lbl =
                        minutes > 0
                          ? `${displayHour}:${minutes
                              .toString()
                              .padStart(2, "0")} ${ampm}`
                          : `${displayHour} ${ampm}`;
                      // Round tide value to 1 decimal place
                      const tideValue = Number(props.value).toFixed(1);

                      // Get collision-adjusted offset
                      const yOffset = labelPositions.get(props.index) ?? -32;

                      return (
                        <g>
                          <text
                            x={safeX}
                            y={safeY + yOffset}
                            fill="var(--foreground)"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={10}
                          >
                            {lbl}
                          </text>
                          <text
                            x={safeX}
                            y={safeY + yOffset + 15}
                            fill="var(--foreground)"
                            textAnchor="middle"
                            fontWeight="bold"
                            fontSize={12}
                          >
                            {`${tideValue} ft`}
                          </text>
                        </g>
                      );
                    }
                    return null;
                  }}
                />
              </Line>
            </LineChart>
          </ChartContainer>
        </div>

        {/* invisible overlay (visual viewport) to prevent pointer events leaking to inner beyond boundaries */}
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
}
