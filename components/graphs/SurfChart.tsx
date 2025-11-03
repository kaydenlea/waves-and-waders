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
type Row = {
  hour: number;
  surf: number;
  min: number | null;
  max: number | null;
  rangeLabel: string;
};

const chartConfig = {
  surf: {
    label: "Surf (ft)",
    color: "#95c5ffff",
  },
} satisfies ChartConfig;

const SurfChart = ({ beachId, hours = 24, date }: Props) => {
  const [chartData, setChartData] = useState<Row[]>([]);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]); // sunrise-sunset (hours)
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );

  const [buffer, setBuffer] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  const chartRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const adjustData = () => {
      const width = chart.clientWidth;
      setWidth(width);
      if (width < 350) {
        setBuffer(15);
      } else if (width < 800) {
        setBuffer(40);
      } else {
        setBuffer(65);
      }
    };

    const observer = new ResizeObserver(adjustData);
    observer.observe(chart);

    adjustData();

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!beachId) {
          if (!cancelled) {
            // setChartData(
            //   Array.from({ length: 25 }, (_, h) => ({
            //     hour: h,
            //     surf: Number((2 + Math.sin((h / 24) * Math.PI * 2)).toFixed(1)),
            //   }))
            // );
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

        const formatSurfRange = (
          min: number | null | undefined,
          max: number | null | undefined
        ) => {
          const safeMin =
            typeof min === "number" && Number.isFinite(min) ? min : null;
          const safeMax =
            typeof max === "number" && Number.isFinite(max) ? max : null;

          if (safeMin === null && safeMax === null) {
            return {
              min: null,
              max: null,
              label: "--",
              estimate: 0,
            };
          }

          let effectiveMin = safeMin ?? safeMax ?? 0;
          let effectiveMax = safeMax ?? safeMin ?? 0;

          if (effectiveMin > effectiveMax) {
            [effectiveMin, effectiveMax] = [effectiveMax, effectiveMin];
          }

          const minRounded = Math.round(Math.max(0, effectiveMin));
          const maxRounded = Math.round(Math.max(0, effectiveMax));

          let label = "";
          if (minRounded === 0 && maxRounded === 0) {
            label = "--";
          } else if (minRounded === maxRounded) {
            label = String(maxRounded);
          } else {
            label = `${minRounded}-${maxRounded}`;
          }

          return {
            min: Math.max(0, effectiveMin),
            max: Math.max(0, effectiveMax),
            label,
            estimate: Math.max(
              0,
              safeMin !== null && safeMax !== null
                ? (effectiveMin + effectiveMax) / 2
                : effectiveMax
            ),
          };
        };

        const data: Row[] = rows.map((r, i) => {
          const h1 = r.swell.primary.height ?? 0;
          const p1 = r.swell.primary.period ?? 10;
          const h2 = r.swell.secondary.height ?? 0;
          const p2 = r.swell.secondary.period ?? 10;
          const h3 = r.swell.tertiary?.height ?? 0;
          const p3 = r.swell.tertiary?.period ?? 10;
          const s1 = h1 * Math.sqrt(Math.max(0, p1) / 10);
          const s2 = h2 * Math.sqrt(Math.max(0, p2) / 10);
          const s3 = h3 * Math.sqrt(Math.max(0, p3) / 10);
          const w1 = 1.0,
            w2 = 0.6,
            w3 = 0.3;
          const combined = Math.sqrt(
            Math.pow(w1 * s1, 2) + Math.pow(w2 * s2, 2) + Math.pow(w3 * s3, 2)
          );
          const wind = r.conditions.windSpeed ?? 0;
          const windPenalty = Math.min(0.5, Math.max(0, (wind - 5) / 35));
          const effective = Math.max(0, combined * (1 - windPenalty));

          const { min, max, label, estimate } = formatSurfRange(
            r.surf.heightMin,
            r.surf.heightMax
          );

          let representative = effective;

          if (!Number.isFinite(representative) || representative <= 0) {
            representative = estimate > 0 ? estimate : 0;
          } else if (estimate > 0) {
            representative = representative * 0.7 + estimate * 0.3;
          }

          return {
            hour:
              i === rows.length - 1 ? hours : new Date(r.timestamp).getHours(),
            surf: Number(Math.max(0, representative).toFixed(1)),
            min,
            max,
            rangeLabel: label,
          };
        });
        if (!cancelled) {
          setChartData(data);
        }

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
              const toHour = (value: { h: number; m: number }) =>
                value.h + value.m / 60;
              const clampHour = (val: number) =>
                Math.max(0, Math.min(hours, val));
              const riseHour = clampHour(toHour(rise));
              const setHour = clampHour(toHour(setv));
              const x1 = Math.min(riseHour, setHour);
              const x2 = Math.max(riseHour, setHour);
              if (!cancelled) {
                setDayAreas(x2 > x1 ? [{ x1, x2 }] : []);
              }
              const nightSegments: { x1: number; x2: number }[] = [];
              if (x1 > 0) {
                nightSegments.push({ x1: 0, x2: x1 });
              }
              if (x2 < hours) {
                nightSegments.push({ x1: x2, x2: hours });
              }
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
        console.error("Failed to load surf data", e);
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

  // const EDGE_GUTTER_PX = 35;
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
      const leftPad = touchesLeft ? buffer : 0;
      const rightPad = touchesRight ? buffer : 0;

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

    // Assign a display name for debugging & ESLint
    AreaShape.displayName = `AreaShape(${color})`;

    return AreaShape;
  };

  return (
    <ChartContainer
      ref={chartRef}
      config={chartConfig}
      className="aspect-auto h-[300px] w-full !justify-start"
    >
      <BarChart
        margin={{
          top: 10,
          right: 10,
          left: -28,
          bottom: 0,
        }}
        accessibilityLayer
        data={chartData}
        syncId="anyId"
        barCategoryGap="15%"
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
              a.x2 ? closeTo(a.x2, domainEnd) : true
            )}
          />
        ))}
        {/* <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--foreground)"
          strokeWidth={0.1}
          vertical={false}
        /> */}
        <XAxis
          dataKey="hour"
          type="number"
          orientation="bottom"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          padding={{ left: buffer, right: buffer }}
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
          dataKey="surf"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          domain={[
            0,
            (dataMax: number) => Math.max(4, Math.ceil(dataMax * 1.5)),
          ]}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="surf"
          fill="var(--color-surf, var(--color-tide))"
          radius={4}
          stroke="#0000006e"
          strokeWidth={0.5}
          minPointSize={15}
        >
          <LabelList
            dataKey="surf"
            position="middle"
            content={(props: LabelProps) => {
              const safeX = typeof props.x === "number" ? props.x : 0;
              const safeY = typeof props.y === "number" ? props.y : 0;
              const safeWidth =
                typeof props.width === "number" ? props.width : 0;
              const safeHeight =
                typeof props.height === "number" ? props.height : 0;
              const fontSize = Math.max(10, safeWidth * 0.15);
              const label =
                typeof props.value === "number" ? props.value.toFixed(1) : "";

              if (label) {
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
                      {label === "0.0" ? "0" : label}
                    </text>
                  </g>
                );
              }
              return null;
            }}
            fill="black"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
};

export default SurfChart;
