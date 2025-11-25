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
} from "@/lib/supabase";
import {
  useDateContext,
  useHoveredHour,
} from "@/components/context/DateContext";
import { useSunData } from "@/components/context/SunDataContext";
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
  sunSegments?: { dayAreas: { x1: number; x2: number }[]; nightAreas: { x1: number; x2?: number }[]; sunrise?: string | null; sunset?: string | null };
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
  const { getSunData } = useSunData();
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

    const load = async () => {
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
            if (!cancelled) {
              setChartData([]);
              setWindowStart(null);
            }
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
          if (!cancelled) {
            setChartData(built);
            setWindowStart(startMs);
          }
          return;
        }

        if (!beachId) {
          if (!cancelled) {
            setChartData([]);
            setWindowStart(null);
          }
          return;
        }

        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;

        const baseDate =
          date instanceof Date ? new Date(date) : new Date();
        const startMs = resolveStartMs(baseDate);
        const startDate = new Date(startMs);
        const endDate = new Date(startMs + hours * HOURS_TO_MS);

        let tideRows = await fetchBeachTides(String(id), startDate, endDate);
        let externalRows: ExternalTidePoint[];
        if (tideRows && tideRows.length > 0) {
          externalRows = tideRows
            .filter((row) => row.tideLevelFt != null)
            .map((row) => ({
              x: new Date(row.timestamp).getTime(),
              tide: row.tideLevelFt ?? 0,
            }));
        } else {
          const forecastRows = await fetchBeachForecast(
            String(id),
            startDate,
            endDate
          );
          externalRows = forecastRows.map((row) => ({
            x: new Date(row.timestamp).getTime(),
            tide: row.conditions.tideLevel ?? 0,
          }));
        }

        const built = buildPoints(
          externalRows,
          startMs,
          hours,
          isSameDay(baseDate, new Date())
        );

        if (!cancelled) {
          setChartData(built);
          setWindowStart(startMs);
        }
      } catch (error) {
        console.error("Failed to load tide data", error);
        if (!cancelled) {
          setChartData([]);
          setWindowStart(null);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [beachId, chartDataProp, date, hours]);

  useEffect(() => {
    let cancelled = false;

    const hydrateShading = async () => {
      if (
        sunSegments &&
        (sunSegments.dayAreas?.length || sunSegments.sunrise || sunSegments.sunset)
      ) {
        setDayAreas(sunSegments.dayAreas ?? []);
        setNightAreas(sunSegments.nightAreas ?? []);
        // build markers from provided sunrise/sunset if data present
        if (chartData.length > 0 && (sunSegments.sunrise || sunSegments.sunset)) {
          const riseHourRaw = parseSunTimeToHour(sunSegments.sunrise ?? null);
          const setHourRaw = parseSunTimeToHour(sunSegments.sunset ?? null);
          const markers: { hour: number; type: "sunrise" | "sunset" }[] = [];
          const pushClosest = (target: number, type: "sunrise" | "sunset") => {
            const closest = chartData.reduce((closestPoint, point) => {
              const currentDiff = Math.abs(point.hour - target);
              const closestDiff = Math.abs(closestPoint.hour - target);
              return currentDiff < closestDiff ? point : closestPoint;
            });
            if (Math.abs(closest.hour - target) < 0.5) {
              markers.push({ hour: closest.hour, type });
            }
          };
          if (riseHourRaw != null && riseHourRaw >= 0 && riseHourRaw <= hours) {
            pushClosest(riseHourRaw, "sunrise");
          }
          if (
            setHourRaw != null &&
            setHourRaw >= 0 &&
            setHourRaw <= hours &&
            setHourRaw !== riseHourRaw
          ) {
            pushClosest(setHourRaw, "sunset");
          }
          setSunMarkers(markers);
        }
        return;
      }

      if (!beachId || windowStart == null || chartData.length === 0) {
        setDayAreas([]);
        setNightAreas([]);
        setSunMarkers([]);
        return;
      }
      try {
        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;
        const sunData = await getSunData(String(id), new Date(windowStart));
        const riseHourRaw = parseSunTimeToHour(sunData?.sunrise ?? null);
        const setHourRaw = parseSunTimeToHour(sunData?.sunset ?? null);
        if (riseHourRaw == null || setHourRaw == null) {
          if (!cancelled) {
            setDayAreas([]);
            setNightAreas([{ x1: 0, x2: hours }]);
            setSunMarkers([]);
          }
          return;
        }

        const segments = buildSunSegments(
          hours,
          sunData?.sunrise ?? null,
          sunData?.sunset ?? null
        );

        const markers: { hour: number; type: "sunrise" | "sunset" }[] = [];
        if (chartData.length > 0) {
          const pushClosest = (
            target: number,
            type: "sunrise" | "sunset"
          ) => {
            const closest = chartData.reduce((closestPoint, point) => {
              const currentDiff = Math.abs(point.hour - target);
              const closestDiff = Math.abs(closestPoint.hour - target);
              return currentDiff < closestDiff ? point : closestPoint;
            });
            if (Math.abs(closest.hour - target) < 0.5) {
              markers.push({ hour: closest.hour, type });
            }
          };
          if (riseHourRaw >= 0 && riseHourRaw <= hours) {
            pushClosest(riseHourRaw, "sunrise");
          }
          if (
            setHourRaw >= 0 &&
            setHourRaw <= hours &&
            setHourRaw !== riseHourRaw
          ) {
            pushClosest(setHourRaw, "sunset");
          }
        }

        if (!cancelled) {
          setDayAreas(segments.dayAreas);
          setNightAreas(segments.nightAreas);
          setSunMarkers(markers);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to build sunrise/sunset shading", error);
          setDayAreas([]);
          setNightAreas([{ x1: 0, x2: hours }]);
          setSunMarkers([]);
        }
      }
    };

    void hydrateShading();

    return () => {
      cancelled = true;
    };
  }, [beachId, chartData, getSunData, hours, sunSegments, windowStart]);

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
