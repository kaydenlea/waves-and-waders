"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
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
import TideSun from "../general/Stats/TideSun";

const chartConfig = {
  tide: {
    label: "Tide",
    color: "#6e6e6eff",
  },
} satisfies ChartConfig;

import React, { useEffect, useMemo, useState } from "react";
import { fetchBeachTides, fetchBeachByIdLoose, fetchBeachForecast, fetchBeachDetails, fetchDailyConditions } from "@/lib/supabase";

type TidePoint = { x: number; tide: number; isPeak?: number };

const TideChart = ({ beachId, hours = 24, chartData: chartDataProp, date }: { beachId?: string; hours?: number; chartData?: TidePoint[]; date?: Date }) => {
  const [chartData, setChartData] = useState<TidePoint[]>(chartDataProp ?? []);
  const [sunLines, setSunLines] = useState<number[]>([]); // ms positions for sunrise/sunset

  useEffect(() => {
    if (chartDataProp || !beachId) return; // allow override or skip without id
    const load = async () => {
      try {
        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;
        // If a date is provided, use that entire day; else next `hours`
        let start = new Date();
        let end = new Date(start.getTime() + hours * 60 * 60 * 1000);
        if (date instanceof Date) {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          start = d;
          end = new Date(d.getTime() + 24 * 60 * 60 * 1000);
        }
        const points = await fetchBeachTides(id, start, end);
        // Fallback: if tide table empty for this window, use forecast tideLevel
        if (!points || points.length === 0) {
          const rows = await fetchBeachForecast(id, start, end);
          const fallback = rows.map((r) => ({
            x: new Date(r.timestamp).getTime(),
            tide: r.conditions.tideLevel ?? 0,
          }));
          setChartData(fallback);
          return;
        }
        const data = points
          .map((p) => ({
            x: new Date(p.timestamp).getTime(),
            tide: p.tideLevelFt ?? 0,
          }))
          .sort((a, b) => a.x - b.x);
        setChartData(data);
      } catch (e) {
        console.error("Failed to load tide data", e);
      }
    };
    load();
  }, [beachId, hours, chartDataProp, date]);

  // Compute sunrise/sunset lines from daily conditions (Pacific) for days in view
  useEffect(() => {
    const run = async () => {
      try {
        if (!beachId || chartData.length === 0) return;
        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;
        const beach = await fetchBeachDetails(String(id));
        const county = beach?.COUNTY;
        if (!county) return;

        // Group points by Pacific date key
        const fmtKey = (ms: number) => new Date(ms).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
        const pointsByDay = new Map<string, TidePoint[]>();
        for (const p of chartData) {
          const key = fmtKey(p.x);
          const arr = pointsByDay.get(key) ?? [];
          arr.push(p);
          pointsByDay.set(key, arr);
        }

        const parseHM = (s: string | null): number | null => {
          if (!s) return null;
          const m = /^(\d{1,2}):(\d{2})/.exec(s.trim());
          if (!m) return null;
          const h = Number(m[1]);
          const mm = Number(m[2]);
          if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
          return h; // align to nearest hour (data is hourly)
        };

        const lines: number[] = [];
        // For current window, we only need up to two days typically
        const dayKeys = Array.from(pointsByDay.keys()).slice(0, 2);
        for (const key of dayKeys) {
          const dayPts = (pointsByDay.get(key) ?? []).sort((a,b)=>a.x-b.x);
          if (dayPts.length === 0) continue;
          // Fetch daily conditions for this date
          // Convert key back to Date in Pacific
          const pacParts = key.split('/'); // M/D/YYYY or M/D/YY
          const d0 = new Date(dayPts[0].x);
          const cond = await fetchDailyConditions(county, d0);
          const riseH = parseHM(cond?.sunrise ?? null);
          const setH = parseHM(cond?.sunset ?? null);
          const hourOf = (ms: number) => new Date(ms).getHours();
          if (riseH != null) {
            const match = dayPts.find(pt => hourOf(pt.x) === riseH);
            if (match) lines.push(match.x);
          }
          if (setH != null) {
            const match = dayPts.find(pt => hourOf(pt.x) === setH);
            if (match) lines.push(match.x);
          }
        }
        setSunLines(lines);
      } catch (e) {
        // ignore; keep previous markers
      }
    };
    run();
  }, [beachId, chartData]);
  return (
    <>
      <ChartContainer
        className="@min-lg:aspect-auto @min-lg:h-[250px] w-full"
        config={chartConfig}
      >
        <LineChart
          accessibilityLayer
          data={chartData}
          syncId="anyId"
          margin={{
            left: -30,
            right: 15,
          }}
        >
          {/* Sunrise/Sunset markers from daily conditions */}
          {sunLines.map((x, i) => (
            <ReferenceArea key={`sun-${i}`} x1={x} x2={x} fill="#ff9946ff" fillOpacity={0.25} />
          ))}
          {(() => {
            if (!chartData.length) return null;
            const minX = chartData[0].x;
            const maxX = chartData[chartData.length - 1].x;
            const HOUR = 60 * 60 * 1000;
            const dayStartHour = 6;
            const dayEndHour = 20;
            const startOfHour = (ms: number) => {
              const d = new Date(ms);
              d.setMinutes(0, 0, 0);
              return d.getTime();
            };
            const atHourSameDay = (ms: number, hour: number) => {
              const d = new Date(ms);
              d.setHours(hour, 0, 0, 0);
              return d.getTime();
            };
            let t = startOfHour(minX);
            const hourNow = new Date(t).getHours();
            let isDay = hourNow >= dayStartHour && hourNow < dayEndHour;
            let next6 = atHourSameDay(t, dayStartHour);
            if (next6 <= t) next6 += 24 * HOUR;
            let next20 = atHourSameDay(t, dayEndHour);
            if (next20 <= t) next20 += 24 * HOUR;
            let nextBoundary = Math.min(next6, next20);
            const areas: { x1: number; x2: number; isDay: boolean }[] = [];
            while (t < maxX) {
              const x2 = Math.min(nextBoundary, maxX);
              areas.push({ x1: t, x2, isDay });
              t = nextBoundary;
              if (nextBoundary === next6) {
                // moved to 6 -> next boundary is 20
                next6 += 24 * HOUR;
                nextBoundary = next20;
              } else {
                // moved to 20 -> next boundary is 6
                next20 += 24 * HOUR;
                nextBoundary = next6;
              }
              isDay = !isDay;
            }
            return (
              <>
                {areas.map((a, idx) => (
                  <ReferenceArea
                    key={`${a.x1}-${a.x2}-${idx}`}
                    x1={a.x1}
                    x2={a.x2}
                    fill={a.isDay ? "#FFE58F" : "#ccc1ffff"}
                    fillOpacity={0.2}
                  />
                ))}
              </>
            );
          })()}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--foreground)"
            strokeWidth={0.1}
            vertical={false}
          />
          <XAxis
            dataKey="x"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={0}
            fontSize={11}
            tickFormatter={(value) => {
              const h = new Date(Number(value)).getHours();
              return h % 3 === 0 ? ((h % 12 === 0 ? 12 : h % 12).toString()) : "";
            }}
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
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            dataKey="tide"
            type="natural"
            stroke="var(--color-tide)"
            strokeWidth={2}
            dot={({ payload, cx, cy }) => {
              const hour = new Date(payload.x).getHours();
              if (hour === 6 || hour === 20) {
                return (
                  <circle
                    key={payload.x}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill="orange"
                    stroke="var(--color-tide)"
                    strokeWidth={1}
                  />
                );
              } else if (payload.isPeak) {
                return (
                  <circle
                    key={payload.x}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill="green"
                    stroke="var(--color-tide)"
                    strokeWidth={1}
                  />
                );
              } else {
                return <g key={payload.x} />;
              }
            }}
          >
            <LabelList
              dataKey="tide"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                return (
                  <g>
                    {(() => {
                      const datum = chartData[props.index ?? -1];
                      if (!datum) return null;
                      const hour = new Date(datum.x).getHours();
                      return (hour === 6 || hour === 20) ? (
                      <Sun
                        size={20}
                        x={safeX - 12}
                        y={0}
                        fill="#ff9946ff"
                        color="#ff9946ff"
                      />
                      ) : null;
                    })()}
                  </g>
                );
              }}
            />
            <LabelList
              dataKey="isPeak"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                let xShift = 0;
                if (props.index === 0) {
                  xShift = 5;
                } else if (props.index === 24) {
                  xShift = -5;
                }
                if (props.value && typeof props.index === "number") {
                  return (
                    <g>
                      <text
                        x={safeX + xShift}
                        y={safeY - 32}
                        fill="var(--foreground)"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={10}
                      >
                        {`${props.index % 12 === 0 ? 12 : props.index % 12} ${
                          props.index >= 12 ? "PM" : "AM"
                        }`}
                      </text>
                      <text
                        x={safeX + xShift}
                        y={safeY - 17}
                        fill="var(--foreground)"
                        textAnchor="middle"
                        fontWeight="bold"
                        fontSize={12}
                      >
                        {`${props.value} ft`}
                      </text>
                    </g>
                  );
                }
              }}
            />
          </Line>
        </LineChart>
      </ChartContainer>
      {/* <figcaption className="flex justify-between ml-10 mr-8 mt-2">
        <TideSun chartData={chartData} />
      </figcaption> */}
    </>
  );
};

export default TideChart;
