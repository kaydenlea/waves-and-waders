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
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Sun } from "lucide-react";
import {
  fetchBeachTides,
  fetchBeachByIdLoose,
  fetchBeachForecast,
  fetchBeachDetails,
  fetchDailyConditions,
} from "@/lib/supabase";

const HOURS_TO_MS = 60 * 60 * 1000;

const chartConfig: ChartConfig = {
  tide: {
    label: "Tide",
    color: "#6e6e6eff",
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
  return String(normalized % 12 === 0 ? 12 : normalized % 12);
};

const renderSunLabel = (props: any) => {
  const { viewBox } = props;
  if (!viewBox) return null;
  const { x = 0, y = 0 } = viewBox as { x: number; y: number };
  const iconSize = 20;
  return (
    <g transform={`translate(${x - iconSize / 2}, ${y - iconSize - 6})`}>
      <Sun size={iconSize} color="#ff9946ff" />
    </g>
  );
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
  const [chartData, setChartData] = useState<TidePoint[]>([]);
  const [windowStart, setWindowStart] = useState<number | null>(null);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );
  const [sunMarkers, setSunMarkers] = useState<number[]>([]);

  const clampHour = useMemo(
    () => (value: number) => Math.max(0, Math.min(hours, value)),
    [hours]
  );

  const buildPoints = (
    rows: ExternalTidePoint[],
    startMs: number
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

    const annotated = sorted.map((p) => ({ ...p }));
    for (let i = 1; i < annotated.length - 1; i++) {
      const prev = annotated[i - 1];
      const curr = annotated[i];
      const next = annotated[i + 1];
      if (curr.tide > prev.tide && curr.tide >= next.tide) {
        annotated[i].isPeak = Number(curr.tide.toFixed(1));
      } else if (curr.tide < prev.tide && curr.tide <= next.tide) {
        annotated[i].isPeak = Number(curr.tide.toFixed(1));
      }
    }
    return annotated;
  };

  const resolveStartMs = (basis: Date) => {
    const pacific = new Date(
      basis.toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
      })
    );
    pacific.setHours(0, 0, 0, 0);
    return pacific.getTime();
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
      const built = buildPoints(points, origin);
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
        const end = new Date(startMs + hours * HOURS_TO_MS);

        const tideRows = await fetchBeachTides(id, new Date(startMs), end);
        let rows: ExternalTidePoint[];
        if (!tideRows || tideRows.length === 0) {
          const fallback = await fetchBeachForecast(id, new Date(startMs), end);
          rows = fallback.map((r) => ({
            x: new Date(r.timestamp).getTime(),
            tide: r.conditions.tideLevel ?? 0,
          }));
        } else {
          rows = tideRows.map((p) => ({
            x: new Date(p.timestamp).getTime(),
            tide: p.tideLevelFt ?? 0,
          }));
        }
        const built = buildPoints(rows, startMs);
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
        setSunMarkers([]);
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
          setSunMarkers([]);
          return;
        }
        const conditions = await fetchDailyConditions(county, new Date(windowStart));
        const riseHour = clampHour(parseHourMinute(conditions?.sunrise ?? null) ?? 0);
        const setHour = clampHour(parseHourMinute(conditions?.sunset ?? null) ?? hours);
        const x1 = Math.min(riseHour, setHour);
        const x2 = Math.max(riseHour, setHour);

        const daySegments = x2 > x1 ? [{ x1, x2 }] : [];
        const nightSegments: { x1: number; x2?: number }[] = [];
        if (x1 > 0) nightSegments.push({ x1: 0, x2: x1 });
        if (x2 < hours) nightSegments.push({ x1: x2, x2: hours });

        if (!cancelled) {
          setDayAreas(daySegments);
          setNightAreas(nightSegments);
          setSunMarkers([x1, x2]);
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

  return (
    <ChartContainer
      className="aspect-auto h-[250px] w-full"
      config={chartConfig}
    >
      <LineChart
        accessibilityLayer
        data={chartData}
        margin={{
          left: -30,
          right: 15,
        }}
      >
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
        {sunMarkers.map((marker, idx) => (
          <ReferenceLine
            key={`sun-marker-${idx}`}
            x={marker}
            stroke="transparent"
            ifOverflow="extendDomain"
            label={{ position: "top", content: renderSunLabel }}
          />
        ))}
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--foreground)"
          strokeWidth={0.1}
          vertical={false}
        />
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
            (dataMax: number) => Math.max(Math.ceil(dataMax) + 1, 8),
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
            return null;
          }}
        >
          <LabelList
            dataKey="isPeak"
            content={(props: LabelProps) => {
              const index = props.index ?? -1;
              const point = chartData[index];
              if (!point || point.isPeak == null) return null;
              const safeX = typeof props.x === "number" ? props.x : 0;
              const safeY = typeof props.y === "number" ? props.y : 0;
              return (
                <g>
                  <text
                    x={safeX}
                    y={safeY - 32}
                    fill="var(--foreground)"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={10}
                  >
                    {formatTime(point.timestamp)}
                  </text>
                  <text
                    x={safeX}
                    y={safeY - 17}
                    fill="var(--foreground)"
                    textAnchor="middle"
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

export default TideChart;
