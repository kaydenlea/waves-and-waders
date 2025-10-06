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
} from "@/lib/supabase";

type Props = { beachId?: string; hours?: number; date?: Date };
type Row = { hour: number; actual: number };

const chartConfig = {
  surf: {
    label: "Surf (ft)",
    color: "#95c5ffff",
  },
} satisfies ChartConfig;

const SurfChart = ({ beachId, hours = 21, date }: Props) => {
  const [chartData, setChartData] = useState<Row[]>([]);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]); // sunrise-sunset (hours)
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );

  useEffect(() => {
    const load = async () => {
      try {
        if (!beachId) {
          setChartData([
            { hour: 0, actual: 2 },
            { hour: 1, actual: 2.5 },
            { hour: 2, actual: 1 },
            { hour: 3, actual: 1 },
            { hour: 4, actual: 3.5 },
            { hour: 5, actual: 1.5 },
            { hour: 6, actual: 1.5 },
          ]);
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
        const data: Row[] = rows.map((r, i) => {
          const h1 = r.swell.primary.height ?? 0;
          const p1 = r.swell.primary.period ?? 10;
          const h2 = r.swell.secondary.height ?? 0;
          const p2 = r.swell.secondary.period ?? 10;
          const h3 = r.swell.tertiary?.height ?? 0;
          const p3 = r.swell.tertiary?.period ?? 10;
          // Period influence: longer period swells carry more energy; scale ~ sqrt(P/10)
          const s1 = h1 * Math.sqrt(Math.max(0, p1) / 10);
          const s2 = h2 * Math.sqrt(Math.max(0, p2) / 10);
          const s3 = h3 * Math.sqrt(Math.max(0, p3) / 10);
          // Component weights: primary dominant, secondary moderate, tertiary light
          const w1 = 1.0,
            w2 = 0.6,
            w3 = 0.3;
          // Combine components in quadrature (energy-like)
          const combined = Math.sqrt(
            Math.pow(w1 * s1, 2) + Math.pow(w2 * s2, 2) + Math.pow(w3 * s3, 2)
          );
          // Wind penalty: reduce height for stronger winds
          const wind = r.conditions.windSpeed ?? 0; // mph
          // No penalty <= 5 mph; up to 50% reduction by 40+ mph
          const windPenalty = Math.min(0.5, Math.max(0, (wind - 5) / 35));
          const effective = Math.max(0, combined * (1 - windPenalty));

          return {
            hour:
              i === rows.length - 1 ? hours : new Date(r.timestamp).getHours(),
            actual: Number(effective.toFixed(1)),
          };
        });
        setChartData(data);

        // Build sunrise/sunset shading for the selected day window (hours)
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
            if (rise && setv) {
              const dayStart = Math.min(rise.h, setv.h);
              const dayEnd = Math.max(rise.h, setv.h);
              setDayAreas([{ x1: dayStart, x2: dayEnd }]);
              setNightAreas([
                { x1: 0, x2: Math.max(0, dayStart - 3) },
                { x1: Math.min(hours, dayEnd + 3) },
              ]);
            } else {
              setDayAreas([]);
            }
          }
        } catch (_) {
          setDayAreas([]);
        }
      } catch (e) {
        console.error("Failed to load surf data", e);
      }
    };
    load();
  }, [beachId, hours, date]);

  const domainMax = useMemo(
    () => (chartData.length ? chartData.length - 1 : 6),
    [chartData]
  );
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[280px] w-full"
    >
      <BarChart
        margin={{
          right: 10,
          left: -28,
        }}
        accessibilityLayer
        data={chartData}
        syncId="anyId"
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
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--foreground)"
          strokeWidth={0.1}
          vertical={false}
        />
        <XAxis
          dataKey="hour"
          orientation="bottom"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          domain={[0, domainMax]}
          tickFormatter={(value: number) => {
            if (typeof value !== "number") return "";
            return value % 3 === 0
              ? String(value % 12 === 0 ? 12 : value % 12)
              : "";
          }}
        />
        <YAxis
          dataKey="actual"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.5)]}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="actual"
          fill="var(--color-surf, var(--color-tide))"
          radius={4}
          stroke="#0000006e"
          strokeWidth={0.5}
        >
          <LabelList
            dataKey="actual"
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
                      y={safeY + safeHeight / 2 + fontSize / 3}
                      fill="#2c2c2cff"
                      textAnchor="middle"
                      fontWeight="bold"
                      fontSize={fontSize}
                    >
                      {/* {`${props.value.toFixed(1)} ft`} */}
                      {`${props.value.toFixed(1)}`}
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

export default SurfChart;
