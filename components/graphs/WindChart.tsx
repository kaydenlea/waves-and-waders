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
} from "@/lib/supabase";

type Props = { beachId?: string; hours?: number; date?: Date };
const chartConfig = {
  wind: {
    label: "Wind (mph)",
    color: "#95c5ffff",
  },
} satisfies ChartConfig;

const WindChart = ({ beachId, hours = 21, date }: Props) => {
  const [chartData, setChartData] = useState<{ hour: number; wind: number }[]>(
    []
  );
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2: number }[]>(
    []
  );

  useEffect(() => {
    const load = async () => {
      try {
        if (!beachId) {
          // default placeholder 7 hours
          setChartData([
            { hour: 0, wind: 2 },
            { hour: 1, wind: 3 },
            { hour: 2, wind: 1 },
            { hour: 3, wind: 1 },
            { hour: 4, wind: 4 },
            { hour: 5, wind: 2 },
            { hour: 6, wind: 2 },
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
        const data = rows.map((r, i) => ({
          hour:
            i === rows.length - 1 ? hours : new Date(r.timestamp).getHours(),
          wind: r.conditions.windSpeed ?? 0,
        }));
        setChartData(data);

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
            if (rise && setv) {
              const dayStart = Math.min(rise.h, setv.h);
              const dayEnd = Math.max(rise.h, setv.h);
              setDayAreas([{ x1: dayStart, x2: dayEnd }]);
              setNightAreas([
                { x1: 0, x2: Math.max(0, dayStart - 3) },
                { x1: Math.min(24, dayEnd + 3), x2: hours },
              ]);
            } else {
              setDayAreas([]);
            }
          }
        } catch (_) {
          setDayAreas([]);
        }
      } catch (e) {
        console.error("Failed to load wind data", e);
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
          dataKey="wind"
          allowDecimals={false}
          // tickFormatter={(v: number) =>
          //   typeof v === "number" ? v.toFixed(1) : String(v)
          // }
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          domain={[0, (dataMax: number) => Math.ceil(dataMax * 2)]}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="wind"
          fill="var(--color-wind)"
          radius={4}
          stroke="#0000006e"
          strokeWidth={0.5}
        >
          <LabelList
            dataKey="wind"
            position="top"
            content={(props: LabelProps) => {
              const safeX = typeof props.x === "number" ? props.x : 0;
              const safeY = typeof props.y === "number" ? props.y : 0;
              const safeWidth =
                typeof props.width === "number" ? props.width : 0;
              const iconSize = Math.min(20, safeWidth * 0.6);
              return (
                <g>
                  <ArrowIcon
                    size={iconSize}
                    x={safeX + (safeWidth - iconSize) / 2}
                    // y={safeY - iconSize - iconSize}
                    y={iconSize / 2}
                    fill="#8bd668ff"
                    color="#8bd668ff"
                  />
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
