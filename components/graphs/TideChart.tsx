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
import {
  fetchBeachTides,
  fetchBeachByIdLoose,
  fetchBeachForecast,
  fetchBeachDetails,
  fetchDailyConditions,
} from "@/lib/supabase";

type TidePoint = { x: number; tide: number; isPeak?: number };

const TideChart = ({
  beachId,
  hours = 21,
  chartData: chartDataProp,
  date,
}: {
  beachId?: string;
  hours?: number;
  chartData?: TidePoint[];
  date?: Date;
}) => {
  const [chartData, setChartData] = useState<TidePoint[]>(chartDataProp ?? []);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]); // daytime intervals in ms
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );
  const [sunMarkers, setSunMarkers] = useState<number[]>([]); // exact sunrise/sunset ms

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
          end = new Date(d.getTime() + hours * 60 * 60 * 1000);
        }
        const points = await fetchBeachTides(id, start, end);
        // Fallback: if tide table empty for this window, use forecast tideLevel
        if (!points || points.length === 0) {
          const rows = await fetchBeachForecast(id, start, end);
          let fallback = rows.map((r) => ({
            x: new Date(r.timestamp).getTime(),
            tide: r.conditions.tideLevel ?? 0,
          }));
          // compute peaks (highs and lows)
          fallback = computePeaks(fallback);
          setChartData(fallback);
          return;
        }
        let data = points
          .map((p) => ({
            x: new Date(p.timestamp).getTime(),
            tide: p.tideLevelFt ?? 0,
          }))
          .sort((a, b) => a.x - b.x);
        // compute peaks (highs and lows)
        data = computePeaks(data);
        setChartData(data);
      } catch (e) {
        console.error("Failed to load tide data", e);
      }
    };
    load();
  }, [beachId, hours, chartDataProp, date]);

  // Compute sunrise/sunset daytime shading from daily conditions (Pacific) for days in view
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
        const fmtKey = (ms: number) =>
          new Date(ms).toLocaleDateString("en-US", {
            timeZone: "America/Los_Angeles",
          });
        const pointsByDay = new Map<string, TidePoint[]>();
        console.log("CHART DATA DATAAAAA", chartData);
        for (const p of chartData) {
          const key = fmtKey(p.x);
          const arr = pointsByDay.get(key) ?? [];
          arr.push(p);
          pointsByDay.set(key, arr);
        }

        const parseHM = (s: string | null): { h: number; m: number } | null => {
          if (!s) return null;
          const m = /^(\d{1,2}):(\d{2})/.exec(s.trim());
          if (!m) return null;
          const h = Number(m[1]);
          const mm = Number(m[2]);
          if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
          return { h, m: mm };
        };

        const areas: { x1: number; x2: number }[] = [];
        const markers: number[] = [];
        const dayKeys = Array.from(pointsByDay.keys());
        const dayBounds: { start: number; end: number } = {
          start: Infinity,
          end: -Infinity,
        };
        for (const key of dayKeys) {
          const dayPts = (pointsByDay.get(key) ?? []).sort((a, b) => a.x - b.x);
          if (dayPts.length === 0) continue;
          if (dayPts[0].x < dayBounds.start) dayBounds.start = dayPts[0].x;
          if (dayPts[0].x > dayBounds.end) dayBounds.end = dayPts[0].x;
          const d0 = new Date(dayPts[0].x);
          const cond = await fetchDailyConditions(county, d0);
          const rise = parseHM(cond?.sunrise ?? null); // {h,m}
          const setv = parseHM(cond?.sunset ?? null);
          if (!rise || !setv) continue;
          // Build ms for sunrise and sunset aligned to the day of these points (same local basis as x)
          const riseMs = new Date(d0).setHours(rise.h, rise.m, 0, 0);
          const setMs = new Date(d0).setHours(setv.h, setv.m, 0, 0);
          markers.push(riseMs, setMs);
          const minX = dayPts[0].x;
          const maxX = dayPts[dayPts.length - 1].x;
          // Constrain to visible range for this day
          const x1 = Math.max(minX, Math.min(riseMs, setMs));
          const x2 = Math.min(maxX, Math.max(riseMs, setMs));
          if (x2 > x1) areas.push({ x1, x2 });
        }
        setNightAreas([
          { x1: dayBounds.start, x2: areas[0].x1 },
          { x1: areas[areas.length - 1].x2 },
        ]);
        setDayAreas(areas);
        setSunMarkers(markers);
      } catch (e) {
        // ignore; keep previous markers
      }
    };
    run();
  }, [beachId, chartData]);

  // Helper: detect peaks (high and low tides)
  function computePeaks(arr: TidePoint[]): TidePoint[] {
    if (!arr || arr.length < 3) return arr;
    const out = arr.map((p) => ({ ...p }));
    for (let i = 1; i < arr.length - 1; i++) {
      const prev = arr[i - 1];
      const curr = arr[i];
      const next = arr[i + 1];
      if (curr.tide > prev.tide && curr.tide >= next.tide) {
        out[i].isPeak = Number(curr.tide.toFixed(1)); // high tide
      } else if (curr.tide < prev.tide && curr.tide <= next.tide) {
        out[i].isPeak = Number(curr.tide.toFixed(1)); // low tide (negative OK)
      }
    }
    return out;
  }
  return (
    <>
      <ChartContainer
        className="aspect-auto h-[250px] w-full"
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
          {/* Daytime shading between sunrise and sunset intervals */}
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
              return h % 3 === 0 ? (h % 12 === 0 ? 12 : h % 12).toString() : "";
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
              (dataMax: number) => Math.max(Math.ceil(dataMax) + 3, 8),
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
              const NEAR = 30 * 60 * 1000; // 30 minutes threshold
              const isNearSun = sunMarkers.some(
                (ms) => Math.abs(ms - (payload.x as number)) <= NEAR
              );
              if (isNearSun) {
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
              } else if (
                payload.isPeak !== undefined &&
                payload.isPeak !== null
              ) {
                const isLow =
                  typeof payload.isPeak === "number" &&
                  payload.isPeak <= (payload.tide ?? 0) &&
                  payload.isPeak <= 0;
                return (
                  <circle
                    key={payload.x}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={isLow ? "#ef4444" : "#22c55e"}
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
                      const NEAR = 30 * 60 * 1000;
                      const isNearSun = sunMarkers.some(
                        (ms) => Math.abs(ms - datum.x) <= NEAR
                      );
                      return isNearSun ? (
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
                } else if (props.index === hours) {
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
