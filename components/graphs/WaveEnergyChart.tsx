"use client";

import React, { useEffect, useMemo, useState } from "react";
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

const chartConfig = {
  energy: {
    label: "Energy (kJ)",
    color: "#616161ff",
  },
  //   secondary: {
  //     label: "Secondary",
  //     color: "#95c5ffff",
  //   },
  //   tertiary: {
  //     label: "tertiary",
  //     color: "#2564b8ff",
  //   },
} satisfies ChartConfig;

type Props = { beachId?: string; hours?: number; date?: Date };
type EnergyPoint = { hour: number; energy: number };

import {
  fetchBeachForecast,
  fetchBeachByIdLoose,
  fetchBeachDetails,
  fetchDailyConditions,
} from "@/lib/supabase";

const HOURS_TO_MS = 60 * 60 * 1000;

function buildTrendStops(
  series: EnergyPoint[],
  incColor: string,
  decColor: string
) {
  if (series.length < 2) {
    return [
      { offset: "0%", color: incColor },
      { offset: "100%", color: incColor },
    ];
  }

  const segInc: boolean[] = [];
  for (let i = 1; i < series.length; i++) {
    segInc.push(series[i].energy >= series[i - 1].energy);
  }

  const stops: { offset: string; color: string }[] = [];
  const colorOf = (inc: boolean) => (inc ? incColor : decColor);

  stops.push({ offset: "0%", color: colorOf(segInc[0]) });

  for (let i = 1; i < segInc.length; i++) {
    if (segInc[i] !== segInc[i - 1]) {
      const frac = (i / (series.length - 1)) * 100;
      const pct = `${frac}%`;
      // hard transition: duplicate stop with new color
      stops.push({ offset: pct, color: colorOf(segInc[i - 1]) });
      stops.push({ offset: pct, color: colorOf(segInc[i]) });
    }
  }

  stops.push({ offset: "100%", color: colorOf(segInc[segInc.length - 1]) });
  return stops;
}

const WaveEnergyChart = ({ beachId, hours = 24, date }: Props) => {
  const [series, setSeries] = useState<EnergyPoint[]>([]);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2: number }[]>(
    []
  );
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!beachId) {
          if (!cancelled) {
            setSeries([
              { hour: 0, energy: 1 },
              { hour: 3, energy: 2 },
              { hour: 6, energy: 2 },
              { hour: 9, energy: 3 },
              { hour: 12, energy: 2 },
              { hour: 15, energy: 3 },
              { hour: 18, energy: 2 },
              { hour: 21, energy: 1 },
            ]);
            setDayAreas([{ x1: 6, x2: 18 }]);
            setNightAreas([
              { x1: 0, x2: 6 },
              { x1: 18, x2: hours },
            ]);
          }
          return;
        }

        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;

        let start = new Date();
        let end = new Date(start.getTime() + hours * HOURS_TO_MS);
        if (date instanceof Date) {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          start = d;
          end = new Date(d.getTime() + hours * HOURS_TO_MS);
        }

        const rows = await fetchBeachForecast(id, start, end);
        if (cancelled) return;

        const startMs = start.getTime();
        setSeries(
          rows.map((r) => ({
            hour: Math.max(
              0,
              Math.min(
                hours,
                (new Date(r.timestamp).getTime() - startMs) / HOURS_TO_MS
              )
            ),
            energy: r.surf.waveEnergy ?? 0,
          }))
        );

        const beach = await fetchBeachDetails(String(id));
        if (cancelled) return;

        const county = beach?.COUNTY;
        if (county) {
          const basisDate =
            date instanceof Date ? new Date(date) : new Date(start);
          const cond = await fetchDailyConditions(county, basisDate);
          if (cancelled) return;

          const parseHM = (
            s: string | null
          ): { h: number; m: number } | null => {
            if (!s) return null;
            const m = /^([0-9]{1,2}):(\d{2})/.exec(s.trim());
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
          const clampHour = (val: number) => Math.max(0, Math.min(hours, val));
          if (rise && setv) {
            const riseHour = clampHour(toHour(rise));
            const setHour = clampHour(toHour(setv));
            const x1 = Math.min(riseHour, setHour);
            const x2 = Math.max(riseHour, setHour);
            if (!cancelled) {
              setDayAreas(x2 > x1 ? [{ x1, x2 }] : []);
              const nights: { x1: number; x2: number }[] = [];
              if (x1 > 0) nights.push({ x1: 0, x2: x1 });
              if (x2 < hours) nights.push({ x1: x2, x2: hours });
              setNightAreas(nights);
            }
          } else if (!cancelled) {
            setDayAreas([]);
            setNightAreas([{ x1: 0, x2: hours }]);
          }
        } else if (!cancelled) {
          setDayAreas([]);
          setNightAreas([{ x1: 0, x2: hours }]);
        }
      } catch (e) {
        console.error("Failed to load wave energy", e);
        if (!cancelled) {
          setDayAreas([]);
          setNightAreas([{ x1: 0, x2: hours }]);
        }
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [beachId, hours, date]);

  const stops = useMemo(
    () => buildTrendStops(series, "var(--green)", "var(--red)"),
    [series]
  );
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[280px] w-full"
    >
      <AreaChart
        accessibilityLayer
        data={series}
        margin={{
          top: 10,
          right: 10,
          left: -28,
        }}
        syncId="anyId"
      >
        {dayAreas.map((area, idx) => (
          <ReferenceArea
            key={`day-${idx}`}
            x1={area.x1}
            x2={area.x2}
            fill="#FFE58F"
            fillOpacity={0.2}
          />
        ))}
        {nightAreas.map((area, idx) => (
          <ReferenceArea
            key={`night-${idx}`}
            x1={area.x1}
            x2={area.x2}
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
          type="number"
          domain={[0, hours]}
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
          domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.5)]}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <defs>
          <linearGradient id="splitColor" x1="0" y1="0" x2="1" y2="0">
            {/* <stop offset={off} stopColor="green" stopOpacity={1} />
            <stop offset={off} stopColor="red" stopOpacity={1} /> */}
            {stops.map((s, i) => (
              <stop
                key={i}
                offset={s.offset}
                stopColor={s.color}
                stopOpacity={1}
              />
            ))}
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="energy"
          stackId="1"
          stroke="#818181ff"
          //   fill="#adf1ffff"
          fill="url(#splitColor)"
          fillOpacity={1}
        />
      </AreaChart>
    </ChartContainer>
  );
};

export default WaveEnergyChart;
