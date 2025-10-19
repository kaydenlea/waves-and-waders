"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  LabelList,
  YAxis,
  LabelProps,
  ReferenceArea,
} from "recharts";
import { MousePointer2 as ArrowIcon } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import {
  fetchBeachForecast,
  fetchBeachByIdLoose,
  fetchBeachDetails,
  fetchDailyConditions,
  getWindDirection,
} from "@/lib/supabase";

type Props = { beachId?: string; hours?: number; date?: Date };
const chartConfig = {
  wind: {
    label: "Wind (mph)",
    color: "#95c5ffff",
  },
} satisfies ChartConfig;

const WindChart = ({ beachId, hours = 24, date }: Props) => {
  const [chartData, setChartData] = useState<
    {
      hour: number;
      wind: number;
      direction?: number;
    }[]
  >([]);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2: number }[]>(
    []
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!beachId) {
          // default placeholder 24 hours
          if (!cancelled) {
            setChartData(
              Array.from({ length: 25 }, (_, h) => ({
                hour: h,
                wind: Number(
                  Math.max(0, 3 + Math.sin((h / 24) * Math.PI * 2) * 2).toFixed(
                    1
                  )
                ),
                direction: (h * 15) % 360, // rotating placeholder
              }))
            );
          }
          return;
        }
        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;
        let start = new Date();
        let end = new Date(start.getTime() + hours * 60 * 60 * 1000);
        if (date instanceof Date) {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          start = d;
          end = new Date(d.getTime() + hours * 60 * 60 * 1000);
        }
        const rows = await fetchBeachForecast(id, start, end);

        // Helper to get Pacific timezone hour from timestamp
        const getPacificHour = (timestamp: string): number => {
          try {
            const fmt = new Intl.DateTimeFormat("en-US", {
              hour: "numeric",
              hour12: false,
              timeZone: "America/Los_Angeles",
            });
            const h = Number(fmt.format(new Date(timestamp)));
            return Number.isFinite(h) ? h : new Date(timestamp).getUTCHours();
          } catch {
            return new Date(timestamp).getUTCHours();
          }
        };

        const data = rows.map((r, i) => ({
          hour: i === rows.length - 1 ? hours : getPacificHour(r.timestamp),
          wind: Math.round(r.conditions.windSpeed ?? 0),
          direction: r.conditions.windDirection ?? undefined,
        }));
        if (!cancelled) {
          setChartData(data);
        }

        // Build sunrise/sunset shading for the day in view (hours)
        try {
          const beach = await fetchBeachDetails(String(id));
          const county = beach?.COUNTY;
          if (county) {
            const basisDate =
              date instanceof Date ? new Date(date) : new Date(start);
            const cond = await fetchDailyConditions(county, basisDate);
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
            const rise = parseHM(cond?.sunrise ?? null);
            const setv = parseHM(cond?.sunset ?? null);
            const toHour = (value: { h: number; m: number }) =>
              value.h + value.m / 60;
            const clampHour = (val: number) =>
              Math.max(0, Math.min(hours, val));
            if (rise && setv) {
              const riseHour = clampHour(toHour(rise));
              const setHour = clampHour(toHour(setv));
              const x1 = Math.min(riseHour, setHour);
              const x2 = Math.max(riseHour, setHour);
              if (!cancelled) {
                setDayAreas(x2 > x1 ? [{ x1, x2 }] : []);
              }
              const nightSegments: { x1: number; x2: number }[] = [];
              if (x1 > 0) nightSegments.push({ x1: 0, x2: x1 });
              if (x2 < hours) nightSegments.push({ x1: x2, x2: hours });
              if (!cancelled) {
                setNightAreas(nightSegments);
              }
            } else if (!cancelled) {
              setDayAreas([]);
              setNightAreas([{ x1: 0, x2: hours }]);
            }
          }
        } catch (_) {
          if (!cancelled) {
            setDayAreas([]);
            setNightAreas([{ x1: 0, x2: hours }]);
          }
        }
      } catch (e) {
        console.error("Failed to load wind data", e);
        if (!cancelled) {
          setChartData([]);
          setDayAreas([]);
          setNightAreas([]);
        }
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [beachId, hours, date]);

  const domainStart = 0;
  const domainEnd = hours;

  const hourTicks = useMemo(() => {
    const step = 3;
    const ticks: number[] = [];
    for (let v = 0; v <= hours; v += step) {
      ticks.push(v);
    }
    if (ticks[ticks.length - 1] !== hours) {
      ticks.push(hours);
    }
    return ticks;
  }, [hours]);

  const EDGE_GUTTER_PX = 35;
  const closeTo = (a: number, b: number, tolerance = 0.05) =>
    Math.abs(a - b) <= tolerance;
  const makeAreaShape = (
    color: string,
    touchesLeft: boolean,
    touchesRight: boolean
  ) => {
    const AreaShape = (props: any) => {
      const x = typeof props.x === "number" ? props.x : 0;
      const y = typeof props.y === "number" ? props.y : 0;
      const width = typeof props.width === "number" ? props.width : 0;
      const height = typeof props.height === "number" ? props.height : 0;
      const leftPad = touchesLeft ? EDGE_GUTTER_PX : 0;
      const rightPad = touchesRight ? EDGE_GUTTER_PX : 0;
      return (
        <rect
          x={x - leftPad}
          y={y}
          width={width + leftPad + rightPad}
          height={height}
          fill={color}
          fillOpacity={0.2}
          pointerEvents="none"
        />
      );
    };

    AreaShape.displayName = `AreaShape(${color})`;
    return AreaShape;
  };

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[300px] w-full"
    >
      <BarChart
        margin={{ top: 10, right: 35, left: -28, bottom: 0 }}
        accessibilityLayer
        data={chartData}
        syncId="anyId"
        barCategoryGap="20%"
        maxBarSize={60}
      >
        {dayAreas.map((a, idx) => (
          <ReferenceArea
            key={`day-${idx}`}
            x1={a.x1}
            x2={a.x2}
            ifOverflow="extendDomain"
            shape={makeAreaShape(
              "#FFE58F",
              closeTo(a.x1, domainStart),
              closeTo(a.x2, domainEnd)
            )}
          />
        ))}
        {nightAreas.map((a, idx) => (
          <ReferenceArea
            key={`night-${idx}`}
            x1={a.x1}
            x2={a.x2}
            ifOverflow="extendDomain"
            shape={makeAreaShape(
              "#ccc1ffff",
              closeTo(a.x1, domainStart),
              closeTo(a.x2, domainEnd)
            )}
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
          orientation="bottom"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          padding={{ left: 35, right: 35 }}
          domain={[domainStart, domainEnd]}
          ticks={hourTicks}
          scale="linear"
          tickFormatter={(value: number) => {
            const num = Number(value);
            if (!Number.isFinite(num)) return "";
            const normalized = ((num % 24) + 24) % 24;
            const labelHour = normalized % 12 === 0 ? 12 : normalized % 12;
            return String(labelHour);
          }}
        />
        <YAxis
          dataKey="wind"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2)]}
        />
        <ChartTooltip
          content={({ active, payload }) => {
            if (!active || !payload || payload.length === 0) return null;

            const data = payload[0].payload;
            const windSpeed = data.wind;
            const direction = data.direction ?? 0;
            const directionLabel = getWindDirection(direction);

            return (
              <div className="rounded-lg border bg-background p-2 shadow-sm">
                <div className="grid gap-2">
                  <div className="flex flex-col">
                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                      Wind Speed
                    </span>
                    <span className="font-bold text-muted-foreground">
                      {Math.round(windSpeed)} mph
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                      Direction
                    </span>
                    <span className="font-bold text-muted-foreground">
                      {directionLabel} ({Math.round(direction)}°)
                    </span>
                  </div>
                </div>
              </div>
            );
          }}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="wind"
          fill="var(--color-wind)"
          radius={4}
          stroke="#0000006e"
          strokeWidth={0.5}
          minPointSize={10}
        >
          <LabelList
            dataKey="wind"
            position="top"
            content={(props: LabelProps) => {
              const safeX = typeof props.x === "number" ? props.x : 0;
              const safeY = typeof props.y === "number" ? props.y : 0;
              const safeWidth =
                typeof props.width === "number" ? props.width : 0;
              const safeHeight =
                typeof props.height === "number" ? props.height : 0;
              const iconSize = Math.min(20, safeWidth * 0.6);

              // Get wind direction from the data point
              const dataPoint = chartData[props.index ?? 0];
              const direction = dataPoint?.direction ?? 0;
              const directionLabel = getWindDirection(direction);
              // Arrow points at 315° by default, adjust rotation
              const rotation = direction - 315;

              // Calculate center point for rotation - position on top of bar
              const centerX = safeX + safeWidth / 2;
              const centerY = safeY - iconSize / 2 - 2; // Position above the bar

              return (
                <g>
                  <title>{`Wind Direction: ${directionLabel} (${Math.round(
                    direction
                  )}°)`}</title>
                  <g transform={`translate(${centerX}, ${centerY})`}>
                    <g transform={`rotate(${rotation}, 0, 0)`}>
                      <ArrowIcon
                        size={iconSize}
                        x={-iconSize / 2}
                        y={-iconSize / 2}
                        fill="#8bd668ff"
                        color="#8bd668ff"
                      />
                    </g>
                  </g>
                </g>
              );
            }}
          />
          <LabelList
            dataKey="wind"
            position="middle"
            content={(props: LabelProps) => {
              const safeX = typeof props.x === "number" ? props.x : 0;
              const safeY = typeof props.y === "number" ? props.y : 0;
              const safeWidth =
                typeof props.width === "number" ? props.width : 0;
              const safeHeight =
                typeof props.height === "number" ? props.height : 0;
              const fontSize = Math.max(10, safeWidth * 0.15);
              if (typeof props.value === "number") {
                return (
                  <g>
                    <text
                      x={safeX + safeWidth / 2}
                      y={
                        safeY +
                        safeHeight / 2 +
                        (props.value < 1 ? 0 : fontSize / 3)
                      }
                      fill="#2c2c2cff"
                      textAnchor="middle"
                      fontWeight="bold"
                      fontSize={fontSize}
                    >
                      {`${Math.round(props.value)}-${
                        Math.round(props.value) + 1
                      }`}
                    </text>
                  </g>
                );
              }
            }}
            fill="black"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
};

export default WindChart;
