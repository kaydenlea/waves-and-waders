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
} from "recharts";
import { Sun, Sunrise, Sunset, TrendingUp, TrendingDown } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  fetchBeachTides,
  fetchBeachByIdLoose,
  fetchBeachForecast,
  fetchBeachDetails,
  fetchDailyConditions,
} from "@/lib/supabase";
import {
  useDateContext,
  useHoveredHour,
} from "@/components/context/DateContext";

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

const parseHourMinute = (value: string | null) => {
  if (!value) return null;
  const match = /^([0-9]{1,2}):(\d{2})(?::(\d{2}))?/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  const s = Number(match[3] || 0);
  if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s))
    return null;
  return h + m / 60 + s / 3600;
};

const TideChart: React.FC<TideChartProps> = ({
  beachId,
  hours = 24,
  chartData: chartDataProp,
  date,
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

  const clampHour = useMemo(
    () => (value: number) => Math.max(0, Math.min(hours, value)),
    [hours]
  );

  const buildPoints = (
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

    // First pass: identify all potential peaks
    const potentialPeaks: number[] = [];
    for (let i = 0; i < annotated.length; i++) {
      const prev = i > 0 ? annotated[i - 1] : null;
      const curr = annotated[i];
      const next = i < annotated.length - 1 ? annotated[i + 1] : null;

      // Skip if we don't have both neighbors (unless it's an endpoint within the window)
      const isStartEdge = curr.hour === 0;
      const isEndEdge = curr.hour === windowHours;

      // Special case: For today, don't mark the start edge (12 AM) as a peak
      // because there's no previous data (it was deleted)
      if (isToday && isStartEdge && !prev) {
        continue;
      }

      // For points in the middle, require both neighbors
      if (!isStartEdge && !isEndEdge && (!prev || !next)) {
        continue;
      }

      // Must have at least one neighbor
      if (!prev && !next) continue;

      // Check if it's a high tide (local maximum)
      const isHigh =
        (!prev || curr.tide >= prev.tide) &&
        (!next || curr.tide >= next.tide) &&
        ((prev && curr.tide > prev.tide) || (next && curr.tide > next.tide));

      // Check if it's a low tide (local minimum)
      const isLow =
        (!prev || curr.tide <= prev.tide) &&
        (!next || curr.tide <= next.tide) &&
        ((prev && curr.tide < prev.tide) || (next && curr.tide < next.tide));

      if (isHigh || isLow) {
        potentialPeaks.push(i);
      }
    }

    // Second pass: remove duplicate peaks (consecutive points with same tide value)
    const uniquePeaks = new Set<number>();
    for (let i = 0; i < potentialPeaks.length; i++) {
      const idx = potentialPeaks[i];
      const curr = annotated[idx];

      // Look ahead to find all consecutive peaks with the same tide value
      let j = i + 1;
      const sameTidePeaks = [idx];

      while (j < potentialPeaks.length) {
        const nextIdx = potentialPeaks[j];
        const nextPeak = annotated[nextIdx];

        // If same tide value (within 0.1 ft tolerance), add to group
        if (Math.abs(curr.tide - nextPeak.tide) < 0.1) {
          sameTidePeaks.push(nextIdx);
          j++;
        } else {
          break;
        }
      }

      // If we found multiple peaks with the same tide value, only keep the middle one
      if (sameTidePeaks.length > 1) {
        const middleIndex = Math.floor(sameTidePeaks.length / 2);
        uniquePeaks.add(sameTidePeaks[middleIndex]);
        i = j - 1; // Skip all the peaks we just processed
      } else {
        uniquePeaks.add(idx);
      }
    }

    // Mark the unique peaks
    uniquePeaks.forEach((idx) => {
      annotated[idx].isPeak = Number(annotated[idx].tide.toFixed(1));
    });

    // Filter to only return points within the window
    return annotated.filter((p) => p.hour >= 0 && p.hour <= windowHours);
  };

  const resolveStartMs = (basis: Date) => {
    // Get midnight in Pacific timezone (DST-aware)
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(basis);
    const year = parseInt(parts.find((p) => p.type === "year")?.value || "0");
    const month =
      parseInt(parts.find((p) => p.type === "month")?.value || "1") - 1;
    const day = parseInt(parts.find((p) => p.type === "day")?.value || "1");

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

    return Date.UTC(year, month, day, -offsetHours, 0, 0, 0);
  };

  useEffect(() => {
    let cancelled = false;

    const loadFromProp = (points: ExternalTidePoint[]) => {
      if (!points.length) {
        setChartData([]);
        setWindowStart(null);
        return;
      }
      const origin = resolveStartMs(new Date(points[0].x));
      const firstPointDate = new Date(points[0].x);
      const today = new Date();
      const isToday =
        firstPointDate.getFullYear() === today.getFullYear() &&
        firstPointDate.getMonth() === today.getMonth() &&
        firstPointDate.getDate() === today.getDate();
      const built = buildPoints(points, origin, hours, isToday);
      if (!cancelled) {
        setWindowStart(origin);
        setChartData(built);
      }
    };

    const loadFromApi = async () => {
      if (!beachId) {
        setChartData([]);
        setWindowStart(null);
        return;
      }
      try {
        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;
        const startBasis = date instanceof Date ? new Date(date) : new Date();
        const startMs = resolveStartMs(startBasis);

        // Check if this is today
        const today = new Date();
        const isToday =
          startBasis.getFullYear() === today.getFullYear() &&
          startBasis.getMonth() === today.getMonth() &&
          startBasis.getDate() === today.getDate();

        // Fetch extra data (6 hours before and after) to detect peaks at window boundaries
        const BUFFER_HOURS = 6;
        const fetchStart = new Date(startMs - BUFFER_HOURS * HOURS_TO_MS);
        const fetchEnd = new Date(
          startMs + (hours + BUFFER_HOURS) * HOURS_TO_MS
        );

        const tideRows = await fetchBeachTides(id, fetchStart, fetchEnd);
        let rows: ExternalTidePoint[];
        if (!tideRows || tideRows.length === 0) {
          console.warn(
            "[Warning] No tide data from county_tides_15min, falling back to grid_forecast_data"
          );
          const fallback = await fetchBeachForecast(id, fetchStart, fetchEnd);
          rows = fallback.map((r) => ({
            x: new Date(r.timestamp).getTime(),
            tide: r.conditions.tideLevel ?? 0,
          }));
          console.log(
            "[Warning] Using grid_forecast_data:",
            rows.length,
            "points (3-hour intervals)"
          );
        } else {
          rows = tideRows.map((p) => ({
            x: new Date(p.timestamp).getTime(),
            tide: p.tideLevelFt ?? 0,
          }));
          console.log(
            "?? Using county tide data:",
            rows.length,
            "points (6-min intervals)"
          );
        }
        const built = buildPoints(rows, startMs, hours, isToday);
        if (!cancelled) {
          setWindowStart(startMs);
          setChartData(built);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load tide data", error);
          setChartData([]);
          setWindowStart(null);
        }
      }
    };

    if (chartDataProp?.length) {
      loadFromProp(chartDataProp);
    } else {
      void loadFromApi();
    }

    return () => {
      cancelled = true;
    };
  }, [beachId, chartDataProp, date, hours]);

  useEffect(() => {
    let cancelled = false;

    const hydrateShading = async () => {
      if (!beachId || windowStart == null || chartData.length === 0) {
        setDayAreas([]);
        setNightAreas([]);
        return;
      }
      try {
        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;
        const beach = await fetchBeachDetails(String(id));
        const county = beach?.COUNTY;
        if (!county) {
          setDayAreas([]);
          setNightAreas([]);
          return;
        }
        const conditions = await fetchDailyConditions(
          county,
          new Date(windowStart)
        );
        const riseHourRaw = parseHourMinute(conditions?.sunrise ?? null) ?? 0;
        const setHourRaw = parseHourMinute(conditions?.sunset ?? null) ?? hours;
        const riseHour = clampHour(riseHourRaw);
        const setHour = clampHour(setHourRaw);

        const x1 = Math.min(riseHour, setHour);
        const x2 = Math.max(riseHour, setHour);

        const daySegments = x2 > x1 ? [{ x1, x2 }] : [];
        const nightSegments: { x1: number; x2?: number }[] = [];
        if (x1 > 0) nightSegments.push({ x1: 0, x2: x1 });
        if (x2 < hours) nightSegments.push({ x1: x2, x2: hours });

        // Create sun markers for sunrise and sunset (if they're within the window)
        // We need to find the closest data point to the actual sunrise/sunset time
        const markers: { hour: number; type: "sunrise" | "sunset" }[] = [];
        if (riseHourRaw >= 0 && riseHourRaw <= hours && chartData.length > 0) {
          // Find the data point closest to sunrise
          const closestToRise = chartData.reduce((closest, point) => {
            const currentDiff = Math.abs(point.hour - riseHourRaw);
            const closestDiff = Math.abs(closest.hour - riseHourRaw);
            return currentDiff < closestDiff ? point : closest;
          });
          if (Math.abs(closestToRise.hour - riseHourRaw) < 0.5) {
            markers.push({ hour: closestToRise.hour, type: "sunrise" });
          }
        }
        if (
          setHourRaw >= 0 &&
          setHourRaw <= hours &&
          setHourRaw !== riseHourRaw &&
          chartData.length > 0
        ) {
          // Find the data point closest to sunset
          const closestToSet = chartData.reduce((closest, point) => {
            const currentDiff = Math.abs(point.hour - setHourRaw);
            const closestDiff = Math.abs(closest.hour - setHourRaw);
            return currentDiff < closestDiff ? point : closest;
          });
          if (Math.abs(closestToSet.hour - setHourRaw) < 0.5) {
            markers.push({ hour: closestToSet.hour, type: "sunset" });
          }
        }

        if (!cancelled) {
          setDayAreas(daySegments);
          setNightAreas(nightSegments);
          setSunMarkers(markers);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to build sunrise/sunset shading", error);
          setDayAreas([]);
          setNightAreas([]);
          setSunMarkers([]);
        }
      }
    };

    void hydrateShading();

    return () => {
      cancelled = true;
    };
  }, [beachId, chartData, clampHour, hours, windowStart]);

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
        data={chartData}
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
          dot={({ payload, cx, cy }) => {
            const point = payload as TidePoint;
            // Check if this hour is a sun marker (sunrise/sunset)
            const sunMarker = sunMarkers.find((m) => m.hour === point.hour);
            if (sunMarker) {
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
            return <g key={point.hour} />;
          }}
        >
          <LabelList
            dataKey="hour"
            content={(props: LabelProps) => {
              const index = props.index ?? -1;
              const point = chartData[index];
              const marker = sunMarkers.find((m) => m.hour === point?.hour);
              if (!marker) return null;
              const safeX = typeof props.x === "number" ? props.x : 0;

              const IconComponent =
                marker.type === "sunrise" ? Sunrise : Sunset;
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
              const point = chartData[index];
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

              // Check for nearby peaks to avoid overlap
              // Find all peaks with isPeak != null
              const peakIndices = chartData
                .map((p, i) => (p.isPeak != null ? i : -1))
                .filter((i) => i !== -1);

              const currentPeakIndex = peakIndices.indexOf(index);
              let placeBelow = false;

              if (currentPeakIndex > 0) {
                const prevPeakIndex = peakIndices[currentPeakIndex - 1];
                const prevPeak = chartData[prevPeakIndex];

                // If the previous peak is within 3 hours, alternate position
                if (prevPeak && Math.abs(point.hour - prevPeak.hour) < 3) {
                  placeBelow = true;
                }
              }

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
