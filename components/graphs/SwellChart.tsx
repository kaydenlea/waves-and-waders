"use client";

import React, { useEffect, useState } from "react";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  AreaChart,
  Area,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { MousePointer2 as ArrowIcon } from "lucide-react";

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
    label: "tertiary",
    color: "#adf1ffff",
  },
} satisfies ChartConfig;

import {
  fetchBeachForecast,
  fetchBeachByIdLoose,
  fetchBeachDetails,
  fetchDailyConditions,
} from "@/lib/supabase";

type Props = { beachId?: string; hours?: number; date?: Date };
type Row = {
  time: number;
  primary: number;
  secondary: number;
  tertiary: number;
};

const SwellChart = ({ beachId, hours = 21, date }: Props) => {
  const [data, setData] = useState<Row[]>([]);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]); // day shading intervals in hours
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );
  useEffect(() => {
    const load = async () => {
      try {
        if (!beachId) {
          setData([
            { time: 0, primary: 2, secondary: 1, tertiary: 0.5 },
            { time: 3, primary: 2.2, secondary: 1.1, tertiary: 0.6 },
            { time: 6, primary: 2.5, secondary: 1.3, tertiary: 0.7 },
            { time: 9, primary: 2.1, secondary: 1.0, tertiary: 0.6 },
            { time: 12, primary: 1.8, secondary: 0.8, tertiary: 0.5 },
            { time: 15, primary: 2.4, secondary: 1.2, tertiary: 0.7 },
            { time: 18, primary: 2.7, secondary: 1.3, tertiary: 0.9 },
            { time: 21, primary: 2.0, secondary: 0.9, tertiary: 0.6 },
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
        const series = rows.map((r, i) => ({
          time:
            i === rows.length - 1 ? hours : new Date(r.timestamp).getHours(),
          primary: r.swell.primary.height ?? 0,
          secondary: r.swell.secondary.height ?? 0,
          tertiary: r.swell.tertiary?.height ?? 0,
        }));
        setData(series);

        // Compute sunrise/sunset shading for the day in view
        try {
          const beach = await fetchBeachDetails(String(id));
          const county = beach?.COUNTY;
          if (county) {
            // Choose the date basis: if an explicit date given, use that; otherwise use "start"
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
              return h; // chart uses hour buckets
            };
            const riseH = parseHM(cond?.sunrise ?? null);
            const setH = parseHM(cond?.sunset ?? null);
            if (riseH != null && setH != null) {
              const dayStart = Math.min(riseH, setH);
              const dayEnd = Math.max(riseH, setH);
              setDayAreas([{ x1: dayStart, x2: dayEnd }]);
              setNightAreas([{ x1: 0, x2: dayStart }, { x1: dayEnd }]);
            } else {
              setDayAreas([]);
            }
          }
        } catch (e) {
          // ignore shading errors
          setDayAreas([]);
        }
      } catch (e) {
        console.error("Failed to load swell data", e);
      }
    };
    load();
  }, [beachId, hours, date]);
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[290px] w-full"
    >
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{
          right: 10,
          left: -28,
        }}
        syncId="anyId"
      >
        {/* Daytime shading from sunrise to sunset (hours) */}
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
          dataKey="time"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={0}
          fontSize={11}
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
        <ChartLegend content={<ChartLegendContent />} />
        <ChartTooltip content={<ChartTooltipContent />} />

        <Area
          type="monotone"
          dataKey="primary"
          stackId="1"
          activeDot={false}
          stroke="#023e8a"
          fill="#0077b6"
          fillOpacity={0.2}
          dot={({ payload, cx, cy }) => {
            const iconSize = 15;
            return (
              <ArrowIcon
                key={`swell-${cx}-${cy}`}
                size={iconSize}
                x={cx - iconSize / 2}
                y={cy - iconSize / 2}
                // fill="var(--color-primary)"
                // fill="#37f2ffff"
                fill="var(--swell-primary)"
                color="var(--color-highlight-2)"
              />
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="secondary"
          stackId="1"
          activeDot={false}
          stroke="#0096c7"
          fill="#48cae4"
          fillOpacity={0.2}
          dot={({ payload, cx, cy }) => {
            const iconSize = 15;
            return (
              <ArrowIcon
                key={`swell-${cx}-${cy}`}
                size={iconSize}
                x={cx - iconSize / 2}
                y={cy - iconSize / 2}
                // fill="var(--color-primary)"
                // fill="#37f2ffff"
                fill="var(--swell-primary)"
                color="var(--color-highlight-2)"
              />
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="tertiary"
          stackId="1"
          activeDot={false}
          stroke="#70ccebff"
          fill="#adf1ffff"
          fillOpacity={0.2}
          dot={({ payload, cx, cy }) => {
            const iconSize = 15;
            return (
              <ArrowIcon
                key={`swell-${cx}-${cy}`}
                size={iconSize}
                x={cx - iconSize / 2}
                y={cy - iconSize / 2}
                // fill="var(--color-primary)"
                // fill="#37f2ffff"
                fill="var(--swell-primary)"
                color="var(--color-highlight-2)"
              />
            );
          }}
        />
      </AreaChart>
    </ChartContainer>
  );
};

export default SwellChart;
