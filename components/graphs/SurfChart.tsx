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
import { fetchBeachForecast } from "@/lib/supabase";

type Props = { beachId?: string; hours?: number };
type Row = { hour: number; max: number; range: string };

const chartConfig = {
  surf: {
    label: "Surf (ft)",
    color: "#95c5ffff",
  },
} satisfies ChartConfig;

const SurfChart = ({ beachId, hours = 24 }: Props) => {
  const [chartData, setChartData] = useState<Row[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!beachId) {
          setChartData([
            { hour: 0, max: 2, range: "1-2" },
            { hour: 1, max: 3, range: "2-3" },
            { hour: 2, max: 1, range: "1-1" },
            { hour: 3, max: 1, range: "1-1" },
            { hour: 4, max: 4, range: "3-4" },
            { hour: 5, max: 2, range: "1-2" },
            { hour: 6, max: 2, range: "1-2" },
          ]);
          return;
        }
        const start = new Date();
        const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
        const rows = await fetchBeachForecast(beachId, start, end);
        const baseHour = start.getHours();
        const data: Row[] = rows.map((r, idx) => {
          const min = r.surf.heightMin ?? 0;
          const max = r.surf.heightMax ?? 0;
          return {
            hour: (baseHour + idx) % 24,
            max,
            range: min === max ? `${max.toFixed(0)}` : `${min.toFixed(0)}-${max.toFixed(0)}`,
          };
        });
        setChartData(data);
      } catch (e) {
        console.error("Failed to load surf data", e);
      }
    };
    load();
  }, [beachId, hours]);

  const domainMax = useMemo(() => (chartData.length ? chartData.length - 1 : 6), [chartData]);
  return (
    <ChartContainer
      config={chartConfig}
      className="@min-lg:aspect-auto @min-lg:h-[300px] w-full"
    >
      <BarChart
        margin={{
          top: 5,
          right: 10,
          left: -28,
          bottom: 5,
        }}
        accessibilityLayer
        data={chartData}
        syncId="anyId"
      >
        <ReferenceArea x2={1} fill="#ccc1ffff" fillOpacity={0.2} />
        <ReferenceArea x1={2} x2={5} fill="#FFE58F" fillOpacity={0.2} />
        <ReferenceArea x1={6} fill="#ccc1ffff" fillOpacity={0.2} />
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
        />
        <YAxis
          dataKey="max"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.5)]}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="max"
          fill="var(--color-surf, var(--color-tide))"
          radius={4}
          stroke="#0000006e"
          strokeWidth={0.5}
        >
          <LabelList
            dataKey="range"
            position="middle"
            content={(props: LabelProps) => {
              const safeX = typeof props.x === "number" ? props.x : 0;
              const safeY = typeof props.y === "number" ? props.y : 0;
              const safeWidth = typeof props.width === "number" ? props.width : 0;
              const safeHeight = typeof props.height === "number" ? props.height : 0;
              const fontSize = Math.max(10, safeWidth * 0.15);
              if (typeof props.value === "string") {
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
                      {`${props.value} ft`}
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
