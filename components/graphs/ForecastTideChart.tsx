"use client";

import React, { useEffect, useState } from "react";

import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  LabelList,
  LabelProps,
  ReferenceLine,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Sun } from "lucide-react";
import {
  fetchBeachByIdLoose,
  fetchBeachDetails,
  fetchDailyConditions,
  fetchBeachTides,
  fetchBeachForecast,
} from "@/lib/supabase";
import DaySlider from "../general/DaySlider";

type Props = { beachId?: string; date?: Date };
type TidePoint = { hour: number; tide: number; isPeak?: number };

const ForecastTideChart: React.FC<Props> = ({ beachId, date }) => {
  const [data, setData] = useState<TidePoint[]>([]);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );
  const [sunMarkers, setSunMarkers] = useState<number[]>([]);
  const [startIndex, setStartIndex] = React.useState(0);
  const [windowSize, setWindowSize] = React.useState(0);

  const chartRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (!beachId) return;
        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;

        // 48-hour window from selected day midnight (Pacific)
        const startInput = date instanceof Date ? new Date(date) : new Date();
        const startLocal = new Date(
          startInput.toLocaleString("en-US", {
            timeZone: "America/Los_Angeles",
          })
        );
        startLocal.setHours(0, 0, 0, 0);
        const startMs = startLocal.getTime();
        const end = new Date(startMs + windowSize * 60 * 60 * 1000);

        const points = await fetchBeachTides(id, new Date(startMs), end);
        let series: TidePoint[];
        if (!points || points.length === 0) {
          const rows = await fetchBeachForecast(id, new Date(startMs), end);
          series = rows.map((r) => ({
            hour: Math.round(
              (new Date(r.timestamp).getTime() - startMs) / (60 * 60 * 1000)
            ),
            tide: r.conditions.tideLevel ?? 0,
          }));
        } else {
          series = points.map((p) => ({
            hour: Math.round(
              (new Date(p.timestamp).getTime() - startMs) / (60 * 60 * 1000)
            ),
            tide: p.tideLevelFt ?? 0,
          }));
        }
        series = series
          .filter((p) => p.hour >= 0 && p.hour < windowSize)
          .sort((a, b) => a.hour - b.hour);
        // peaks
        const out = series.map((p) => ({ ...p }));
        for (let i = 1; i < series.length - 1; i++) {
          const a = series[i - 1],
            b = series[i],
            c = series[i + 1];
          if (b.tide > a.tide && b.tide >= c.tide)
            out[i].isPeak = Number(b.tide.toFixed(1));
          else if (b.tide < a.tide && b.tide <= c.tide)
            out[i].isPeak = Number(b.tide.toFixed(1));
        }
        setData(out);

        // shading & markers across two days
        const beach = await fetchBeachDetails(String(id));
        const county = beach?.COUNTY;
        if (county) {
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
          const days = [];
          for (let i = 0; i < (windowSize - 1) / 24; i++) {
            days.push(new Date(startMs + 24 * i * 60 * 60 * 1000));
          }
          console.log("DAYS", days);
          const dayAreasBuild: { x1: number; x2: number }[] = [];
          const nightAreasBuild: { x1: number; x2?: number }[] = [];
          const markers: number[] = [];
          let nightStart = 0;
          for (let di = 0; di < days.length; di++) {
            const cond = await fetchDailyConditions(county, days[di]);
            console.log("CONDITIO NOW", cond);
            const rise = parseHM(cond?.sunrise ?? null);
            const setv = parseHM(cond?.sunset ?? null);
            if (!rise || !setv) continue;
            const offset = di * 24;
            const rH = offset + rise.h;
            const sH = offset + setv.h;
            const dayStart = Math.min(rH, sH);
            const dayEnd = Math.max(rH, sH);
            dayAreasBuild.push({ x1: dayStart, x2: dayEnd });
            nightAreasBuild.push({ x1: nightStart, x2: dayStart });
            nightStart = dayEnd;
            markers.push(rH, sH);
          }
          setDayAreas(dayAreasBuild);
          nightAreasBuild.push({ x1: nightStart });
          setNightAreas(nightAreasBuild);
          setSunMarkers(markers);
        } else {
          setDayAreas([]);
          setSunMarkers([]);
        }
      } catch (e) {
        console.error("Failed to load forecast tide", e);
      }
    };
    load();
  }, [windowSize, beachId, date]);

  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const adjustData = () => {
      const width = chart.clientWidth;
      if (width < 550) {
        setWindowSize(25);
      } else if (width < 750) {
        setWindowSize(49);
      } else if (width < 1000) {
        setWindowSize(73);
      } else {
        setWindowSize(97);
      }
    };

    const observer = new ResizeObserver(adjustData);
    observer.observe(chart);

    adjustData();

    return () => observer.disconnect();
  }, []);

  const handleNext = () => {
    if (startIndex + windowSize < data.length) {
      setStartIndex((prev) => prev + 24);
    }
  };

  const handleBack = () => {
    if (startIndex > 0) {
      setStartIndex((prev) => prev - 24);
    }
  };

  const visibleData = data.slice(startIndex, startIndex + windowSize);

  return (
    <>
      <DaySlider
        handleBack={handleBack}
        handleNext={handleNext}
        startIndex={startIndex}
        windowSize={windowSize}
        length={data.length}
        days="Wed, 8/15 - Fri, 8/17"
      />
      <ChartContainer
        config={{ tide: { label: "Tide", color: "#6e6e6eff" } } as ChartConfig}
        ref={chartRef}
        className="aspect-auto h-[250px] w-full"
      >
        <LineChart
          data={visibleData}
          margin={{ left: -35, right: 15, bottom: 5 }}
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
              x2={idx === nightAreas.length - 1 ? undefined : a.x2}
              fill="#ccc1ffff"
              fillOpacity={0.2}
            />
          ))}
          {Array.from({ length: (windowSize - 1) / 24 }, (_, i) => {
            if (i !== 0 && i !== windowSize - 1) {
              return (
                <ReferenceLine
                  key={`boundary-${i}`}
                  x={i * 24}
                  stroke="#c9c9c9ff"
                  strokeWidth={0.5}
                />
              );
            }
          })}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--foreground)"
            strokeWidth={0.1}
            vertical={false}
          />
          <XAxis
            dataKey="hour"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={0}
            fontSize={11}
            domain={[0, 47]}
            tickFormatter={(v: number) =>
              v % 3 === 0 ? String(v % 12 === 0 ? 12 : v % 12) : ""
            }
          />
          <YAxis
            dataKey="tide"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
            domain={[
              (dataMin: number) => Math.floor(dataMin) - 1,
              (dataMax: number) => Math.max(Math.ceil(dataMax) + 2, 8),
            ]}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            dataKey="tide"
            type="natural"
            stroke="var(--color-tide)"
            strokeWidth={2}
            dot={({ payload, cx, cy }: any) => {
              const hour = payload.hour as number;
              if (sunMarkers.includes(hour)) {
                return (
                  <circle
                    key={hour}
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
                    key={hour}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={isLow ? "#ef4444" : "#22c55e"}
                    stroke="var(--color-tide)"
                    strokeWidth={1}
                  />
                );
              }
              return <g key={hour} />;
            }}
          >
            <LabelList
              dataKey="tide"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const hour = data[props.index ?? -1]?.hour;
                return (
                  <g>
                    {hour != null && sunMarkers.includes(hour) ? (
                      <Sun
                        size={20}
                        x={safeX - 10}
                        y={0}
                        fill="#ff9946ff"
                        color="#ff9946ff"
                      />
                    ) : null}
                  </g>
                );
              }}
            />
            <LabelList
              dataKey="isPeak"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                if (props.value && typeof props.index === "number") {
                  const h = data[props.index]?.hour ?? 0;
                  const lbl = `${h % 12 === 0 ? 12 : h % 12} ${
                    h >= 12 ? "PM" : "AM"
                  }`;
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
                        {lbl}
                      </text>
                      <text
                        x={safeX}
                        y={safeY - 17}
                        fill="var(--foreground)"
                        textAnchor="middle"
                        fontWeight="bold"
                        fontSize={12}
                      >{`${props.value} ft`}</text>
                    </g>
                  );
                }
              }}
            />
          </Line>
        </LineChart>
      </ChartContainer>
    </>
  );
};

export default ForecastTideChart;
