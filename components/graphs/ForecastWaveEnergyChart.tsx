"use client";

import React from "react";

import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  LabelList,
  LabelProps,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import DaySlider from "../general/DaySlider";
import { Slider } from "@/components/ui/slider";

const chartData = [
  { hour: 0, energy: 1 },
  { hour: 1, energy: 2 },
  { hour: 2, energy: 2 },
  { hour: 3, energy: 2 },
  { hour: 4, energy: 2 },
  { hour: 5, energy: 2 },
  { hour: 6, energy: 2 },
  { hour: 7, energy: 3 },
  { hour: 8, energy: 3 },
  { hour: 9, energy: 3 },
  { hour: 10, energy: 2 },
  { hour: 11, energy: 2 },
  { hour: 12, energy: 2 },
  { hour: 13, energy: 2 },
  { hour: 14, energy: 2 },
  { hour: 15, energy: 3 },
  { hour: 16, energy: 3 },
  { hour: 17, energy: 3 },
  { hour: 18, energy: 2 },
  { hour: 19, energy: 2 },
  { hour: 20, energy: 2 },
  { hour: 21, energy: 1 },
  { hour: 22, energy: 1 },
  { hour: 23, energy: 1 },
  { hour: 24, energy: 1 },
  { hour: 25, energy: 1 },
  { hour: 26, energy: 1 },
  { hour: 27, energy: 2 },
  { hour: 28, energy: 2 },
  { hour: 29, energy: 2 },
  { hour: 30, energy: 2 },
  { hour: 31, energy: 2 },
  { hour: 32, energy: 2 },
  { hour: 33, energy: 3 },
  { hour: 34, energy: 3 },
  { hour: 35, energy: 3 },
  { hour: 36, energy: 2 },
  { hour: 37, energy: 2 },
  { hour: 38, energy: 2 },
  { hour: 39, energy: 3 },
  { hour: 40, energy: 3 },
  { hour: 41, energy: 3 },
  { hour: 42, energy: 2 },
  { hour: 43, energy: 2 },
  { hour: 44, energy: 2 },
  { hour: 45, energy: 1 },
  { hour: 46, energy: 1 },
  { hour: 47, energy: 1 },
  { hour: 48, energy: 1 },
  { hour: 49, energy: 1 },
  { hour: 50, energy: 1 },
  { hour: 51, energy: 2 },
  { hour: 52, energy: 2 },
  { hour: 53, energy: 2 },
  { hour: 54, energy: 2 },
  { hour: 55, energy: 2 },
  { hour: 56, energy: 2 },
  { hour: 57, energy: 3 },
  { hour: 58, energy: 3 },
  { hour: 59, energy: 3 },
  { hour: 60, energy: 2 },
  { hour: 61, energy: 2 },
  { hour: 62, energy: 2 },
  { hour: 63, energy: 3 },
  { hour: 64, energy: 3 },
  { hour: 65, energy: 3 },
  { hour: 66, energy: 2 },
  { hour: 67, energy: 2 },
  { hour: 68, energy: 2 },
  { hour: 69, energy: 1 },
  { hour: 70, energy: 1 },
  { hour: 71, energy: 1 },
  { hour: 72, energy: 1 },
  { hour: 73, energy: 1 },
  { hour: 74, energy: 1 },
  { hour: 75, energy: 2 },
  { hour: 76, energy: 2 },
  { hour: 77, energy: 2 },
  { hour: 78, energy: 2 },
  { hour: 79, energy: 2 },
  { hour: 80, energy: 2 },
  { hour: 81, energy: 3 },
  { hour: 82, energy: 3 },
  { hour: 83, energy: 3 },
  { hour: 84, energy: 2 },
  { hour: 85, energy: 2 },
  { hour: 86, energy: 2 },
  { hour: 87, energy: 3 },
  { hour: 88, energy: 3 },
  { hour: 89, energy: 3 },
  { hour: 90, energy: 2 },
  { hour: 91, energy: 2 },
  { hour: 92, energy: 2 },
  { hour: 93, energy: 1 },
  { hour: 94, energy: 2 },
  { hour: 95, energy: 2 },
  { hour: 96, energy: 1 },
];

const chartConfig = {
  energy: {
    label: "Energy (kJ)",
    color: "#616161ff",
  },
} satisfies ChartConfig;

type WavePoint = {
  hour: number;
  energy: number;
};

const HOURS_PER_DAY = 24;

function buildTrendStops(
  series: WavePoint[],
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

import { fetchWeeklyForecast, fetchBeachByIdLoose } from "@/lib/supabase";

type Props = { beachId?: string; date?: Date };

const ForecastWaveEnergyChart: React.FC<Props> = ({ beachId, date }) => {
  const [startIndex, setStartIndex] = React.useState(0);
  const [dayWindow, setDayWindow] = React.useState(3);
  const [energyData, setEnergyData] = React.useState<WavePoint[]>([]);
  const [baseStartMs, setBaseStartMs] = React.useState<number | null>(null);

  // Build energy series from forecast rows (wave_energy_kj or surf.waveEnergy)
  React.useEffect(() => {
    const load = async () => {
      try {
        if (!beachId) { setEnergyData([]); setBaseStartMs(null); return; }
        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;
        const rows = await fetchWeeklyForecast(String(id));
        if (!rows || !rows.length) { setEnergyData([]); setBaseStartMs(null); return; }
        // Sort rows and determine Pacific midnight of the earliest row without string roundtrip
        rows.sort((a:any,b:any)=> new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const earliest = new Date(rows[0].timestamp);
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Los_Angeles',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
        }).formatToParts(earliest);
        const hh = Number(parts.find(p=>p.type==='hour')?.value ?? '0');
        const mm = Number(parts.find(p=>p.type==='minute')?.value ?? '0');
        const ss = Number(parts.find(p=>p.type==='second')?.value ?? '0');
        const baseMs = earliest.getTime() - ((hh*3600 + mm*60 + ss) * 1000);
        setBaseStartMs(baseMs);

        const series: WavePoint[] = [];
        for (const r of rows) {
          const ts = new Date(r.timestamp).getTime();
          const hour = Math.round((ts - baseMs) / 3600000);
          const v = (r as any)?.surf?.waveEnergy ?? (r as any)?.wave_energy_kj ?? 0;
          series.push({ hour, energy: Number(v) || 0 });
        }
        // Keep within a reasonable window (e.g., first 96 hours)
        series.sort((a,b)=> a.hour - b.hour);
        setEnergyData(series);
      } catch (e) {
        setEnergyData([]); setBaseStartMs(null);
      }
    };
    load();
  }, [beachId]);

  const source = energyData.length ? energyData : chartData;
  const pointsPerDay = React.useMemo(() => {
    if (source.length < 2) {
      return HOURS_PER_DAY;
    }
    let minStep = Infinity;
    for (let i = 1; i < source.length; i++) {
      const diff = Math.abs(source[i].hour - source[i - 1].hour);
      if (diff > 0 && diff < minStep) {
        minStep = diff;
      }
    }
    if (!Number.isFinite(minStep) || minStep <= 0) {
      return HOURS_PER_DAY;
    }
    return Math.max(1, Math.ceil(HOURS_PER_DAY / minStep));
  }, [source]);
  const totalLength = source.length;

  const maxSelectableDays = React.useMemo(() => {
    if (!totalLength || !pointsPerDay) {
      return 1;
    }
    const available = Math.floor(totalLength / pointsPerDay);
    const capped = Math.min(7, available > 0 ? available : 1);
    return Math.max(1, capped);
  }, [pointsPerDay, totalLength]);

  const effectiveDayWindow = Math.min(dayWindow, maxSelectableDays);
  const windowSize = pointsPerDay * effectiveDayWindow;
  const maxStartIndex = Math.max(0, totalLength - windowSize);

  React.useEffect(() => {
    if (dayWindow > maxSelectableDays) {
      setDayWindow(maxSelectableDays);
    }
  }, [dayWindow, maxSelectableDays]);

  React.useEffect(() => {
    setStartIndex((prev) => Math.min(prev, maxStartIndex));
  }, [maxStartIndex]);

  const visibleData = source.slice(startIndex, startIndex + windowSize);

  const stops = React.useMemo(
    () => buildTrendStops(visibleData, "var(--green)", "var(--red)"),
    [visibleData]
  );


  const pacificMidnight = React.useMemo(() => {
    if (baseStartMs != null) return baseStartMs;
    const now = new Date();
    const local = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    local.setHours(0,0,0,0);
    return local.getTime();
  }, [baseStartMs]);

  const fmtRange = React.useMemo(() => {
    if (!visibleData.length) return '';
    const startMs = pacificMidnight + visibleData[0].hour * 3600 * 1000;
    const endMs = pacificMidnight + visibleData[visibleData.length - 1].hour * 3600 * 1000;
    const fmt = (ms: number) => new Date(ms).toLocaleDateString('en-US', { weekday:'short', month:'numeric', day:'numeric', timeZone:'America/Los_Angeles' });
    return `${fmt(startMs)} - ${fmt(endMs)}`;
  }, [visibleData, pacificMidnight]);

  const handleNext = () => {
    if (startIndex < maxStartIndex) {
      setStartIndex((prev) => Math.min(prev + pointsPerDay, maxStartIndex));
    }
  };

  const handleBack = () => {
    if (startIndex > 0) {
      setStartIndex((prev) => Math.max(prev - pointsPerDay, 0));
    }
  };

  const handleDayWindowChange = React.useCallback((value: number[]) => {
    const raw = value?.[0];
    const candidate = raw == null ? effectiveDayWindow : raw;
    const next = Math.min(Math.max(Math.round(candidate), 1), maxSelectableDays);
    setDayWindow(next);
    setStartIndex(0);
  }, [effectiveDayWindow, maxSelectableDays]);

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Range</span>
          <span>{effectiveDayWindow} {effectiveDayWindow === 1 ? "day" : "days"}</span>
        </div>
        <Slider
          value={[effectiveDayWindow]}
          min={1}
          max={maxSelectableDays}
          step={1}
          onValueChange={handleDayWindowChange}
          className="mt-2"
        />
      </div>
      <DaySlider
        handleBack={handleBack}
        handleNext={handleNext}
        startIndex={startIndex}
        windowSize={windowSize}
        length={totalLength}
        days={fmtRange}
      />
      <ChartContainer
        config={chartConfig}
        className="@min-md:aspect-auto @min-md:h-[250px] w-full"
      >
        <AreaChart
          accessibilityLayer
          data={visibleData}
          margin={{
            left: -35,
            right: 15,
            bottom: 5,
          }}
          syncId="anyId"
        >
          {visibleData.map((entry) =>
            entry.hour % 24 === 0 ? (
              <ReferenceLine
                key={entry.hour}
                x={entry.hour}
                stroke="#c2c2c2ff"
                strokeWidth={0.5}
              />
            ) : null
          )}

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
            tickFormatter={(value) =>
              value % 3 === 0
                ? (value % 12 === 0 ? 12 : value % 12).toString()
                : ""
            }
          />
          <YAxis
            dataKey="energy"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
            domain={[
              0,
              (dataMax: number) => Math.max(Math.ceil(dataMax) + 1, 8),
            ]}
          />
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
                  stopOpacity={0.7}
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
          {/* <Line
            dataKey="energy"
            type="natural"
            stroke="var(--color-energy)"
            strokeWidth={2}
            dot={false}
          ></Line> */}
        </AreaChart>
      </ChartContainer>
    </>
  );
};

export default ForecastWaveEnergyChart;

