"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";
import { getPacificMidnightUTC, getPacificHour } from "@/lib/utils";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  ChartTooltipContent,
} from "@/components/ui/chart";

import {
  MousePointer2 as ArrowIcon,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

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

import {
  fetchBeachForecast,
  fetchBeachByIdLoose,
  fetchBeachDetails,
  fetchDailyConditions,
  getWindDirection,
} from "@/lib/supabase";
import {
  useDateContext,
  useHoveredHour,
} from "@/components/context/DateContext";
import { syncToNearestThirdHour } from "@/components/graphs/chartSync";

type Props = { beachId?: string; hours?: number; date?: Date };
type Row = {
  time: number;
  primary: number;
  secondary: number;
  tertiary: number;
  primaryDir?: number;
  secondaryDir?: number;
  tertiaryDir?: number;
};

export const SwellStatsHeader = ({
  beachId,
  hours = 24,
  date,
}: {
  beachId?: string;
  hours?: number;
  date?: Date;
}) => {
  const [highSwell, setHighSwell] = React.useState<string | null>(null);
  const [lowSwell, setLowSwell] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const loadSwellStats = async () => {
      try {
        if (!beachId) {
          if (!cancelled) {
            setHighSwell(null);
            setLowSwell(null);
          }
          return;
        }

        const HOURS_TO_MS = 60 * 60 * 1000;
        const getPacificMidnightUTC = (d: Date) => {
          const pst = new Date(
            d.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
          );
          pst.setHours(0, 0, 0, 0);
          return new Date(pst.toISOString());
        };

        let start = new Date();
        let end = new Date(start.getTime() + hours * HOURS_TO_MS);
        if (date instanceof Date) {
          start = getPacificMidnightUTC(date);
          end = new Date(start.getTime() + hours * HOURS_TO_MS);
        }

        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;
        const rows = await fetchBeachForecast(id, start, end);
        if (cancelled) return;

        const swellValues = rows
          .map((r) => r.swell.primary.height)
          .filter(
            (v): v is number => typeof v === "number" && !isNaN(v) && v !== null
          );

        if (swellValues.length > 0) {
          const high = Math.max(...swellValues);
          const low = Math.min(...swellValues);

          if (!cancelled) {
            setHighSwell(high.toFixed(1));
            setLowSwell(low.toFixed(1));
          }
        }
      } catch (e) {
        console.error("Failed to load swell stats", e);
      }
    };

    void loadSwellStats();

    return () => {
      cancelled = true;
    };
  }, [beachId, hours, date]);

  return (
    <div className="grid rounded-md bg-highlight-5 grid-cols-[60px_1fr] grid-rows-2 gap-y-0.5 items-center text-xs text-muted-foreground uppercase tracking-wide leading-tight px-2 py-1.5">
      <span className="flex gap-2 items-center">
        <TrendingUp
          fill="#353535ff"
          className="stroke-muted-foreground w-4 h-4"
        />
        <span className="block font-medium">High</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {highSwell ?? "--"} <span className="inline-block">ft</span>
      </span>
      <span className="flex gap-2 items-center">
        <TrendingDown
          fill="#353535ff"
          className="stroke-muted-foreground w-4 h-4"
        />
        <span className="block -mb-0.5 font-medium">Low</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {lowSwell ?? "--"} <span className="inline-block">ft</span>
      </span>
    </div>
  );
};

const SwellChart = ({ beachId, hours = 24, date }: Props) => {
  const { hour: selectedHour, setHoveredHour } = useDateContext();
  const hoveredHour = useHoveredHour();
  const [data, setData] = useState<Row[]>([]);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!beachId) {
          if (!cancelled) {
            setData(
              Array.from({ length: 9 }, (_, idx) => {
                const time = idx * 3;
                return {
                  time,
                  primary: Number(
                    (2 + Math.sin((time / 24) * Math.PI)).toFixed(1)
                  ),
                  secondary: Number(
                    (1 + Math.cos((time / 24) * Math.PI)).toFixed(1)
                  ),
                  tertiary: Number(
                    (0.5 + Math.sin((time / 12) * Math.PI) * 0.3).toFixed(1)
                  ),
                  primaryDir: (time * 15) % 360,
                  secondaryDir: (time * 20) % 360,
                  tertiaryDir: (time * 25) % 360,
                };
              })
            );
          }
          return;
        }
        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;
        let start = new Date();
        let end = new Date(start.getTime() + hours * 60 * 60 * 1000);
        if (date instanceof Date) {
          start = getPacificMidnightUTC(date);
          end = new Date(start.getTime() + hours * 60 * 60 * 1000);
        }
        const rows = await fetchBeachForecast(id, start, end);
        const series = rows.map((r, i) => ({
          time: i === rows.length - 1 ? hours : getPacificHour(r.timestamp),
          primary: Number((r.swell.primary.height ?? 0).toFixed(1)),
          secondary: Number((r.swell.secondary.height ?? 0).toFixed(1)),
          tertiary: Number((r.swell.tertiary?.height ?? 0).toFixed(1)),
          primaryDir: r.swell.primary.direction ?? undefined,
          secondaryDir: r.swell.secondary.direction ?? undefined,
          tertiaryDir: r.swell.tertiary?.direction ?? undefined,
        }));
        if (!cancelled) {
          setData(series);
        }

        // Compute sunrise/sunset shading for the day in view
        try {
          const beach = await fetchBeachDetails(String(id));
          const county = beach?.COUNTY;
          if (county) {
            const basisDate =
              date instanceof Date ? new Date(date) : new Date(start);
            const cond = await fetchDailyConditions(county, basisDate);
            const parseHM = (s: string | null): number | null => {
              if (!s) return null;
              const m = /^(\d{1,2}):(\d{2})/.exec(s.trim());
              if (!m) return null;
              const h = Number(m[1]);
              const mm = Number(m[2]);
              if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
              return h + mm / 60;
            };
            const riseH = parseHM(cond?.sunrise ?? null);
            const setH = parseHM(cond?.sunset ?? null);
            if (riseH != null && setH != null) {
              const dayStart = Math.min(riseH, setH);
              const dayEnd = Math.max(riseH, setH);
              const clampedStart = Math.max(0, Math.min(hours, dayStart));
              const clampedEnd = Math.max(0, Math.min(hours, dayEnd));
              if (!cancelled) {
                setDayAreas([{ x1: clampedStart, x2: clampedEnd }]);
              }
              const nightSegments: { x1: number; x2: number }[] = [];
              if (clampedStart > 0) {
                nightSegments.push({ x1: 0, x2: clampedStart });
              }
              if (clampedEnd < hours) {
                nightSegments.push({ x1: clampedEnd, x2: hours });
              }
              if (!cancelled) {
                setNightAreas(nightSegments);
              }
            } else if (!cancelled) {
              setDayAreas([]);
              setNightAreas([{ x1: 0, x2: hours }]);
            }
          }
        } catch (e) {
          if (!cancelled) {
            setDayAreas([]);
            setNightAreas([{ x1: 0, x2: hours }]);
          }
        }
      } catch (e) {
        console.error("Failed to load swell data", e);
        if (!cancelled) {
          setData([]);
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

  const hourTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let v = 0; v <= hours; v += 3) {
      ticks.push(v);
    }
    if (ticks[ticks.length - 1] !== hours) {
      ticks.push(hours);
    }
    return ticks;
  }, [hours]);

  const lastHoveredRef = React.useRef<number | null>(null);

  const handleMouseMove = (e: any) => {
    if (e && e.activeLabel !== undefined) {
      const hour = Number(e.activeLabel);
      if (!isNaN(hour)) {
        // Only update if the hour changed (throttle updates)
        if (lastHoveredRef.current !== hour) {
          lastHoveredRef.current = hour;
          setHoveredHour(hour);
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
      config={chartConfig}
      className="aspect-auto h-[250px] @min-3xl:h-[280px] @min-4xl:h-[300px] w-full mb-3"
    >
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{
          top: 10,
          right: 15,
          left: -28,
        }}
        syncId="allCharts"
        syncMethod={syncToNearestThirdHour}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {dayAreas.map((a, idx) => (
          <ReferenceArea
            key={`day-${idx}`}
            x1={a.x1}
            x2={a.x2}
            fill="#FFE58F"
            fillOpacity={0.2}
          />
        ))}
        {nightAreas.map((a, idx) => (
          <ReferenceArea
            key={`night-${idx}`}
            x1={a.x1}
            x2={a.x2}
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
          dataKey="time"
          domain={[0, hours]}
          type="number"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={0}
          fontSize={11}
          ticks={hourTicks}
          tickFormatter={(value) =>
            value % 3 === 0
              ? (value % 12 === 0 ? 12 : value % 12).toString()
              : ""
          }
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
            if (!active || !payload || payload.length === 0) return null;

            const data = payload[0].payload;

            return (
              <div className="rounded-lg border bg-background p-2 shadow-sm">
                <div className="grid gap-2">
                  {payload.map((entry, index) => {
                    const dirKey = `${entry.dataKey}Dir` as keyof Row;
                    const direction = data[dirKey] as number | undefined;
                    const dirLabel =
                      direction != null ? getWindDirection(direction) : "N/A";

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
        />

        <Area
          type="monotone"
          dataKey="primary"
          activeDot={false}
          stroke="#023e8a"
          fill="#0077b6"
          fillOpacity={0.2}
          dot={({ payload, cx, cy, index }) => {
            const iconSize = 15;
            const direction = payload.primaryDir ?? 0;
            const rotation = direction - 315; // Arrow points at 315° by default

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
        {/* Hour indicator line */}
        <ReferenceLine
          x={selectedHour}
          stroke="var(--foreground)"
          // strokeWidth={2}
          strokeDasharray="3 3"
        />
        {/* Hover indicator line - only show when hovering on any chart */}
        {hoveredHour !== null && hoveredHour !== selectedHour && (
          <ReferenceLine
            x={hoveredHour}
            stroke="var(--foreground)"
            strokeWidth={1}
            strokeOpacity={0.5}
            strokeDasharray="5 5"
          />
        )}
      </AreaChart>
    </ChartContainer>
  );
};

export default React.memo(SwellChart);
