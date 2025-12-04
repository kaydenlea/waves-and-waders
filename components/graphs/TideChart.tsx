"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
  LabelList,
  LabelProps,
  Scatter,
} from "recharts";
import { Sunrise, Sunset } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  useDateContext,
  useHoveredHour,
} from "@/components/context/DateContext";
import { useTideData } from "@/components/context/TideDataContext";
import { useTideWindowData } from "@/lib/hooks/useTideWindow";
import {
  buildSunSegments,
  parseSunTimeToHour,
} from "@/components/graphs/sunSegments";

const HOURS_TO_MS = 60 * 60 * 1000;

const chartConfig: ChartConfig = {
  tide: {
    color: "#aaaaaaff",
  },
};

type ExternalTidePoint = { x: number; tide: number; isPeak?: number };

type TidePoint = {
  timestamp: number;
  hour: number;
  tide: number;
  isPeak?: number;
};

type TideChartProps = {
  beachId?: string;
  hours?: number;
  chartData?: ExternalTidePoint[];
  date?: Date;
  sunSegments?: {
    dayAreas: { x1: number; x2: number }[];
    nightAreas: { x1: number; x2?: number }[];
    sunrise?: string | null;
    sunset?: string | null;
  };
};

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });

const formatHourTick = (value: number) => {
  const normalized = ((value % 24) + 24) % 24;
  return normalized % 3 === 0
    ? String(normalized % 12 === 0 ? 12 : normalized % 12)
    : "";
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const TideChart: React.FC<TideChartProps> = ({
  beachId,
  hours = 24,
  chartData: chartDataProp,
  date,
  sunSegments,
}) => {
  const { hour: selectedHour, setHoveredHour } = useDateContext();
  const hoveredHour = useHoveredHour();
  const [chartData, setChartData] = useState<TidePoint[]>([]);
  const [windowStart, setWindowStart] = useState<number | null>(null);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );
  const [sunMarkers, setSunMarkers] = useState<
    { hour: number; type: "sunrise" | "sunset" }[]
  >([]);

  const tideContext = useTideData();
  const tideWindow = useTideWindowData({
    beachId,
    date,
    hours,
    enabled: !tideContext,
    initialRows: tideContext?.rows ?? undefined,
    initialStartMs: tideContext?.startMs ?? undefined,
  });

  const tideRows = tideContext?.rows ?? tideWindow.rows;
  const tideStartMs = tideContext?.startMs ?? tideWindow.startMs;
  const tideSunTimes = tideContext?.sunTimes ?? tideWindow.sunTimes;
  const tideSunWindowStart =
    tideContext?.sunWindowStart ?? tideWindow.sunWindowStart;
  const tideSunStatus = tideContext?.sunStatus ?? tideWindow.sunStatus;
  const tideResolved = tideContext?.resolved ?? tideWindow.resolved;
  const tideLoading = tideContext?.loading ?? tideWindow.loading;

  // Reduce render payload while preserving peaks and sun markers.
  const renderData = useMemo(() => {
    const target = 350;
    if (chartData.length <= target) return chartData;

    const peaks = chartData.filter((p) => p.isPeak != null);

    // Optimized: find closest points to sun markers using binary search approach
    const markerPoints: TidePoint[] = [];
    for (const marker of sunMarkers) {
      if (!chartData.length) break;
      let closest = chartData[0];
      let minDiff = Math.abs(chartData[0].hour - marker.hour);

      // Binary search for closest hour
      let left = 0;
      let right = chartData.length - 1;
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const diff = Math.abs(chartData[mid].hour - marker.hour);
        if (diff < minDiff) {
          minDiff = diff;
          closest = chartData[mid];
        }
        if (chartData[mid].hour < marker.hour) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
      markerPoints.push(closest);
    }

    const important = new Set<number>();
    [chartData[0], chartData[chartData.length - 1], ...peaks, ...markerPoints]
      .filter(Boolean)
      .forEach((p) => important.add(p.timestamp));

    const step = Math.ceil(chartData.length / target);
    const merged = new Map<number, TidePoint>();

    // Single pass: add sampled and important points
    for (let idx = 0; idx < chartData.length; idx++) {
      const p = chartData[idx];
      if (idx % step === 0 || important.has(p.timestamp)) {
        merged.set(p.timestamp, p);
      }
    }

    return Array.from(merged.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );
  }, [chartData, sunMarkers]);

  const peakPoints = useMemo(
    () => renderData.filter((p) => p.isPeak != null),
    [renderData]
  );

  // Pre-compute which peaks should be placed below to avoid overlap
  const peakPlacementMap = useMemo(() => {
    const map = new Map<number, boolean>();
    const peaks = renderData.filter((p) => p.isPeak != null);

    for (let i = 1; i < peaks.length; i++) {
      const prevPeak = peaks[i - 1];
      const currPeak = peaks[i];
      // If the previous peak is within 3 hours, alternate position
      if (Math.abs(currPeak.hour - prevPeak.hour) < 3) {
        map.set(currPeak.timestamp, true);
      }
    }
    return map;
  }, [renderData]);

  // Pre-compute sun marker lookup map for O(1) access
  const sunMarkerMap = useMemo(() => {
    const map = new Map<number, "sunrise" | "sunset">();
    sunMarkers.forEach((m) => map.set(m.hour, m.type));
    return map;
  }, [sunMarkers]);

  const sunMarkerPoints = useMemo(() => {
    if (!sunMarkers.length || !renderData.length) return [];
    const tolerance = 0.6; // hours

    return sunMarkers
      .map((marker) => {
        // Optimized: binary search for closest hour
        let left = 0;
        let right = renderData.length - 1;
        let closest = renderData[0];
        let minDiff = Math.abs(renderData[0].hour - marker.hour);

        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          const diff = Math.abs(renderData[mid].hour - marker.hour);
          if (diff < minDiff) {
            minDiff = diff;
            closest = renderData[mid];
          }
          if (renderData[mid].hour < marker.hour) {
            left = mid + 1;
          } else {
            right = mid - 1;
          }
        }

        if (Math.abs(closest.hour - marker.hour) <= tolerance) {
          return { ...closest, markerType: marker.type };
        }
        return null;
      })
      .filter(Boolean) as Array<
      TidePoint & { markerType: "sunrise" | "sunset" }
    >;
  }, [renderData, sunMarkers]);

  // Memoized buildPoints function to avoid re-computing on every render
  const buildPoints = useMemo(
    () =>
      (
        rows: ExternalTidePoint[],
        startMs: number,
        windowHours: number,
        isToday: boolean = false
      ): TidePoint[] => {
        const sorted = rows
          .map((row) => {
            const timestamp = typeof row.x === "number" ? row.x : Number(row.x);
            const hour = (timestamp - startMs) / HOURS_TO_MS;
            return {
              timestamp,
              hour,
              tide: row.tide,
              isPeak: row.isPeak,
            } as TidePoint;
          })
          .filter((p) => Number.isFinite(p.hour))
          .sort((a, b) => a.timestamp - b.timestamp);

        // Mark peaks for all points including endpoints
        const annotated = sorted.map((p) => ({ ...p }));

        // Optimized single-pass peak detection with deduplication
        const uniquePeaks = new Set<number>();
        let i = 0;
        while (i < annotated.length) {
          const prev = i > 0 ? annotated[i - 1] : null;
          const curr = annotated[i];
          const next = i < annotated.length - 1 ? annotated[i + 1] : null;

          // Skip if we don't have both neighbors (unless it's an endpoint within the window)
          const isStartEdge = curr.hour === 0;
          const isEndEdge = curr.hour === windowHours;

          // Special case: For today, don't mark the start edge (12 AM) as a peak
          if (isToday && isStartEdge && !prev) {
            i++;
            continue;
          }

          // For points in the middle, require both neighbors
          if (!isStartEdge && !isEndEdge && (!prev || !next)) {
            i++;
            continue;
          }

          // Must have at least one neighbor
          if (!prev && !next) {
            i++;
            continue;
          }

          // Check if it's a high tide (local maximum)
          const isHigh =
            (!prev || curr.tide >= prev.tide) &&
            (!next || curr.tide >= next.tide) &&
            ((prev && curr.tide > prev.tide) ||
              (next && curr.tide > next.tide));

          // Check if it's a low tide (local minimum)
          const isLow =
            (!prev || curr.tide <= prev.tide) &&
            (!next || curr.tide <= next.tide) &&
            ((prev && curr.tide < prev.tide) || (next && curr.tide < next.tide));

          if (isHigh || isLow) {
            // Look ahead for consecutive peaks with same tide value
            let j = i + 1;
            const sameTidePeaks = [i];

            while (j < annotated.length) {
              const nextPt = annotated[j];
              const nextPrev = annotated[j - 1];
              const nextNext = j < annotated.length - 1 ? annotated[j + 1] : null;

              // Check if next point is also a peak
              const nextIsHigh =
                nextPt.tide >= nextPrev.tide &&
                (!nextNext || nextPt.tide >= nextNext.tide) &&
                (nextPt.tide > nextPrev.tide ||
                  (nextNext && nextPt.tide > nextNext.tide));
              const nextIsLow =
                nextPt.tide <= nextPrev.tide &&
                (!nextNext || nextPt.tide <= nextNext.tide) &&
                (nextPt.tide < nextPrev.tide ||
                  (nextNext && nextPt.tide < nextNext.tide));

              if (
                (nextIsHigh || nextIsLow) &&
                Math.abs(curr.tide - nextPt.tide) < 0.1
              ) {
                sameTidePeaks.push(j);
                j++;
              } else {
                break;
              }
            }

            // Keep the middle peak if multiple
            const middleIndex = Math.floor(sameTidePeaks.length / 2);
            uniquePeaks.add(sameTidePeaks[middleIndex]);
            i = j; // Skip all processed peaks
          } else {
            i++;
          }
        }

        // Mark the unique peaks
        uniquePeaks.forEach((idx) => {
          annotated[idx].isPeak = Number(annotated[idx].tide.toFixed(1));
        });

        // Filter to only return points within the window
        return annotated.filter((p) => p.hour >= 0 && p.hour <= windowHours);
      },
    []
  );

  // Memoized and optimized resolveStartMs
  const resolveStartMs = useMemo(() => {
    // Cache formatters to avoid recreating them
    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const hourFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "2-digit",
      hour12: false,
    });

    return (basis: Date) => {
      const parts = dateFormatter.formatToParts(basis);
      const year = parseInt(parts.find((p) => p.type === "year")?.value || "0");
      const month =
        parseInt(parts.find((p) => p.type === "month")?.value || "1") - 1;
      const day = parseInt(parts.find((p) => p.type === "day")?.value || "1");

      // Calculate UTC timestamp for Pacific midnight using offset at noon
      const noonUTC = Date.UTC(year, month, day, 12, 0, 0, 0);
      const noonDate = new Date(noonUTC);
      const pacificNoonHour = parseInt(hourFormatter.format(noonDate));
      const offsetHours = pacificNoonHour - 12;

      return Date.UTC(year, month, day, -offsetHours, 0, 0, 0);
    };
  }, []);

  useEffect(() => {
    // Optimized: synchronous processing, batch state updates
    try {
      if (chartDataProp && chartDataProp.length > 0) {
        const sorted = chartDataProp
          .map((row) => ({
            x: typeof row.x === "number" ? row.x : Number(row.x),
            tide: row.tide,
            isPeak: row.isPeak,
          }))
          .filter((row) => Number.isFinite(row.x));
        if (!sorted.length) {
          setChartData([]);
          setWindowStart(null);
          return;
        }
        const firstTimestamp = sorted[0].x;
        const baseDate = new Date(firstTimestamp);
        const startMs = resolveStartMs(baseDate);
        const built = buildPoints(
          sorted,
          startMs,
          hours,
          isSameDay(baseDate, new Date())
        );
        // Batch state updates using startTransition for better performance
        React.startTransition(() => {
          setWindowStart(startMs);
          setChartData(built);
        });
        return;
      }

      if (tideRows.length && tideStartMs != null) {
        const baseDate =
          date instanceof Date ? new Date(date) : new Date(tideStartMs);
        const built = buildPoints(
          tideRows.map((row) => ({
            x: typeof row.x === "number" ? row.x : Number(row.x),
            tide: row.tide,
          })),
          tideStartMs,
          hours,
          isSameDay(baseDate, new Date())
        );
        // Batch state updates
        React.startTransition(() => {
          setWindowStart(tideStartMs);
          setChartData(built);
        });
        return;
      }

      if (!tideLoading && tideResolved) {
        setChartData([]);
        setWindowStart(tideStartMs ?? null);
      }
    } catch (error) {
      console.error("Failed to load tide data", error);
      setChartData([]);
      setWindowStart(null);
    }
  }, [
    beachId,
    chartDataProp,
    date,
    hours,
    tideLoading,
    tideResolved,
    tideRows,
    tideStartMs,
    buildPoints,
    resolveStartMs,
  ]);

  // Optimized helper: extract binary search to avoid duplication
  const findClosestPoint = React.useCallback(
    (data: TidePoint[], target: number): TidePoint | null => {
      if (!data.length) return null;
      let left = 0;
      let right = data.length - 1;
      let closest = data[0];
      let minDiff = Math.abs(data[0].hour - target);

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const diff = Math.abs(data[mid].hour - target);
        if (diff < minDiff) {
          minDiff = diff;
          closest = data[mid];
        }
        if (data[mid].hour < target) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
      return closest;
    },
    []
  );

  useEffect(() => {
    // Optimized: synchronous processing
    if (
      sunSegments &&
      (sunSegments.dayAreas?.length ||
        sunSegments.sunrise ||
        sunSegments.sunset)
    ) {
      const markers: { hour: number; type: "sunrise" | "sunset" }[] = [];

      // build markers from provided sunrise/sunset if data present
      if (chartData.length > 0 && (sunSegments.sunrise || sunSegments.sunset)) {
        const riseHourRaw = parseSunTimeToHour(sunSegments.sunrise ?? null);
        const setHourRaw = parseSunTimeToHour(sunSegments.sunset ?? null);

        if (riseHourRaw != null && riseHourRaw >= 0 && riseHourRaw <= hours) {
          const closest = findClosestPoint(chartData, riseHourRaw);
          if (closest && Math.abs(closest.hour - riseHourRaw) < 0.5) {
            markers.push({ hour: closest.hour, type: "sunrise" });
          }
        }
        if (
          setHourRaw != null &&
          setHourRaw >= 0 &&
          setHourRaw <= hours &&
          setHourRaw !== riseHourRaw
        ) {
          const closest = findClosestPoint(chartData, setHourRaw);
          if (closest && Math.abs(closest.hour - setHourRaw) < 0.5) {
            markers.push({ hour: closest.hour, type: "sunset" });
          }
        }
      }

      // Batch state updates
      React.startTransition(() => {
        setDayAreas(sunSegments.dayAreas ?? []);
        setNightAreas(sunSegments.nightAreas ?? []);
        setSunMarkers(markers);
      });
      return;
    }

    if (
      tideSunTimes &&
      tideSunWindowStart != null &&
      windowStart != null &&
      Math.abs(tideSunWindowStart - windowStart) < 1000
    ) {
      const riseHourRaw = parseSunTimeToHour(tideSunTimes.sunrise ?? null);
      const setHourRaw = parseSunTimeToHour(tideSunTimes.sunset ?? null);

      if (riseHourRaw == null || setHourRaw == null) {
        React.startTransition(() => {
          setDayAreas([]);
          setNightAreas([{ x1: 0, x2: hours }]);
          setSunMarkers([]);
        });
        return;
      }

      const segments = buildSunSegments(
        hours,
        tideSunTimes.sunrise ?? null,
        tideSunTimes.sunset ?? null
      );

      const markers: { hour: number; type: "sunrise" | "sunset" }[] = [];
      if (chartData.length > 0) {
        if (riseHourRaw >= 0 && riseHourRaw <= hours) {
          const closest = findClosestPoint(chartData, riseHourRaw);
          if (closest && Math.abs(closest.hour - riseHourRaw) < 0.5) {
            markers.push({ hour: closest.hour, type: "sunrise" });
          }
        }
        if (
          setHourRaw >= 0 &&
          setHourRaw <= hours &&
          setHourRaw !== riseHourRaw
        ) {
          const closest = findClosestPoint(chartData, setHourRaw);
          if (closest && Math.abs(closest.hour - setHourRaw) < 0.5) {
            markers.push({ hour: closest.hour, type: "sunset" });
          }
        }
      }

      React.startTransition(() => {
        setDayAreas(segments.dayAreas);
        setNightAreas(segments.nightAreas);
        setSunMarkers(markers);
      });
      return;
    }

    if (tideSunStatus === "loading") {
      return;
    }

    setDayAreas([]);
    setNightAreas([{ x1: 0, x2: hours }]);
    setSunMarkers([]);
  }, [
    chartData,
    hours,
    sunSegments,
    tideSunStatus,
    tideSunTimes,
    tideSunWindowStart,
    windowStart,
    findClosestPoint,
  ]);

  const hourTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let v = 0; v <= hours; v += 1) {
      ticks.push(v);
    }
    return ticks;
  }, [hours]);

  // Calculate high and low tide values from peaks
  const { highTide, lowTide } = useMemo(() => {
    const peaks = chartData.filter((p) => p.isPeak != null);
    if (peaks.length === 0) return { highTide: null, lowTide: null };

    const peakValues = peaks.map((p) => p.isPeak!);
    const high = Math.max(...peakValues);
    const low = Math.min(...peakValues);

    return {
      highTide: high > 0 ? high.toFixed(1) : null,
      lowTide: low <= 0 ? low.toFixed(1) : null,
    };
  }, [chartData]);

  const lastHoveredRef = React.useRef<number | null>(null);

  const handleMouseMove = (e: any) => {
    if (e && e.activeLabel !== undefined) {
      const hour = Number(e.activeLabel);
      if (!isNaN(hour)) {
        // Round to nearest 3-hour interval for syncing with other charts
        const rounded = Math.round(hour / 3) * 3;
        // Only update if the hour changed (throttle updates)
        if (lastHoveredRef.current !== rounded) {
          lastHoveredRef.current = rounded;
          setHoveredHour(rounded);
        }
      }
    }
  };

  const handleMouseLeave = () => {
    lastHoveredRef.current = null;
    setHoveredHour(null);
  };

  return (
    <ChartContainer
      className="aspect-auto h-[250px] @min-3xl:h-[280px] @min-4xl:h-[300px] w-full [&_.recharts-legend-wrapper]:hidden mb-3"
      config={chartConfig}
    >
      <LineChart
        accessibilityLayer
        data={renderData}
        margin={{
          top: 10,
          left: -30,
          right: 15,
          bottom: 0,
        }}
        syncId="allCharts"
        syncMethod="value"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Hour indicator line */}
        <ReferenceLine
          x={selectedHour}
          stroke="var(--foreground)"
          // strokeWidth={2}
          strokeDasharray="3 3"
        />
        {/* Hover indicator line - always rendered to avoid re-mount */}
        <ReferenceLine
          x={hoveredHour ?? 0}
          stroke="var(--foreground)"
          strokeWidth={1}
          strokeOpacity={
            hoveredHour !== null && hoveredHour !== selectedHour ? 0.5 : 0
          }
          strokeDasharray="5 5"
        />
        {dayAreas.map((area, idx) => (
          <ReferenceArea
            key={`day-${idx}`}
            x1={area.x1}
            x2={area.x2}
            fill="#FFE58F"
            fillOpacity={0.2}
          />
        ))}
        {nightAreas.map((area, idx) => (
          <ReferenceArea
            key={`night-${idx}`}
            x1={area.x1}
            x2={area.x2}
            fill="#ccc1ffff"
            fillOpacity={0.2}
          />
        ))}
        {/* <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--foreground)"
          strokeWidth={0.1}
          vertical={false}
        /> */}
        <XAxis
          dataKey="hour"
          type="number"
          domain={[0, hours]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={0}
          fontSize={11}
          ticks={hourTicks}
          tickFormatter={formatHourTick}
        />
        <YAxis
          dataKey="tide"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          domain={[
            (dataMin: number) => Math.floor(dataMin) - 1,
            (dataMax: number) => Math.max(Math.ceil(dataMax) + 3, 8),
          ]}
        />
        <ChartTooltip
          content={<ChartTooltipContent />}
          labelFormatter={(_, payload) => {
            const entry = Array.isArray(payload)
              ? (payload[0]?.payload as TidePoint | undefined)
              : undefined;
            return entry ? formatTime(entry.timestamp) : "";
          }}
        />
        <Line
          dataKey="tide"
          type="natural"
          stroke="var(--color-tide)"
          strokeWidth={2}
          isAnimationActive={false}
          animationDuration={0}
          animationBegin={0}
          dot={(props) => {
            const { payload, cx, cy } = props;
            const point = payload as TidePoint;
            // Optimized: use Map lookup instead of find
            const sunMarkerType = sunMarkerMap.get(point.hour);
            if (sunMarkerType) {
              return (
                <circle
                  key={`sun-${point.hour}`}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill="orange"
                  stroke="var(--color-tide)"
                  strokeWidth={1}
                />
              );
            }
            // Otherwise check if it's a tide peak
            if (point.isPeak != null) {
              const isLow = point.isPeak <= point.tide && point.isPeak <= 0;
              return (
                <circle
                  key={`peak-${point.timestamp}`}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={isLow ? "#ef4444" : "#22c55e"}
                  stroke="var(--color-tide)"
                  strokeWidth={1}
                />
              );
            }
            return <g key={`empty-${point.timestamp}`} />;
          }}
        >
          <LabelList
            dataKey="hour"
            content={(props: LabelProps) => {
              const index = props.index ?? -1;
              const point = renderData[index];
              // Optimized: use Map lookup instead of find
              const markerType = point ? sunMarkerMap.get(point.hour) : null;
              if (!markerType) return null;
              const safeX = typeof props.x === "number" ? props.x : 0;

              const IconComponent =
                markerType === "sunrise" ? Sunrise : Sunset;
              return (
                <g>
                  <IconComponent
                    size={18}
                    x={safeX - 9}
                    y={15}
                    fill="#ff9946ff"
                    color="var(--muted-foreground)"
                  />
                </g>
              );
            }}
          />
          <LabelList
            dataKey="isPeak"
            content={(props: LabelProps) => {
              const index = props.index ?? -1;
              const point = renderData[index];
              if (!point || point.isPeak == null) return null;
              const safeX = typeof props.x === "number" ? props.x : 0;
              const safeY = typeof props.y === "number" ? props.y : 0;

              // Adjust text anchor based on position to prevent labels bleeding off edges
              const isNearStart = point.hour <= 0;
              const isNearEnd = point.hour >= hours - 1;
              const textAnchor = isNearStart
                ? "start"
                : isNearEnd
                ? "end"
                : "middle";

              // Optimized: use pre-computed placement map
              const placeBelow = peakPlacementMap.get(point.timestamp) ?? false;

              const timeY = placeBelow ? safeY + 25 : safeY - 32;
              const heightY = placeBelow ? safeY + 40 : safeY - 17;

              return (
                <g>
                  <text
                    x={safeX}
                    y={timeY}
                    fill="var(--foreground)"
                    textAnchor={textAnchor}
                    dominantBaseline="middle"
                    fontSize={10}
                  >
                    {formatTime(point.timestamp)}
                  </text>
                  <text
                    x={safeX}
                    y={heightY}
                    fill="var(--foreground)"
                    textAnchor={textAnchor}
                    fontWeight="bold"
                    fontSize={12}
                  >
                    {`${point.isPeak} ft`}
                  </text>
                </g>
              );
            }}
          />
        </Line>
      </LineChart>
    </ChartContainer>
  );
};

export default React.memo(TideChart);
