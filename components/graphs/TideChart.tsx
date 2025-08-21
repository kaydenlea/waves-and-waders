"use client";

import {
  Area,
  AreaChart,
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  LabelList,
  LabelProps,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { FiSunrise, FiSunset } from "react-icons/fi";
import { ForecastData } from "@/lib/supabase";

/* ---------------- Types ---------------- */

interface DailyConditions {
  date?: string;
  sunrise: string | null;
  sunset: string | null;
  moon_phase?: number | null;
}

interface TideDataPoint {
  hour: number;    // numeric hour (0-23, can be fractional if you ever want)
  tide: number;
  isPeak?: number;
  isHigh?: boolean;
  isLow?: boolean;
  time: string;
}

interface TidePreviewProps {
  data?: ForecastData[];
  selectedHour?: number;
  className?: string;
}

interface TideChartProps {
  data?: ForecastData[];
  dailyConditions?: DailyConditions;
  selectedHour?: number;
  selectedDate?: Date;
  beach?: { id: number; Name: string; COUNTY: string };
  className?: string;
}

/* ---------------- Utilities ---------------- */

const nowHour = () => new Date().getHours();

const formatHourLabel = (h: number) => {
  const hour = Math.floor(h + 1e-6);
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${display}:00 ${ampm}`;
};

const tickHour = (value: number) => {
  if (value % 3 !== 0) return "";
  const v = value % 12;
  return v === 0 ? "12" : String(v);
};

const getSunTimes = (daily?: DailyConditions, selectedDate?: Date) => {
  let sunrise = "6:30";
  let sunset = "19:30";
  if (daily?.sunrise && daily?.sunset) {
    sunrise = daily.sunrise;
    sunset  = daily.sunset;
  } else if (selectedDate) {
    const m = selectedDate.getMonth();
    const winter = m < 3 || m > 8;
    sunrise = winter ? "7:00" : "6:00";
    sunset  = winter ? "17:30" : "19:00";
  }

  const parse = (t: string) => {
    const [hh, mm = "0"] = t.split(":");
    const h = parseInt(hh || "0", 10);
    const m = parseInt(mm || "0", 10);
    return {
      hourFloat: h + m / 60,
      label: `${(h % 12) === 0 ? 12 : (h % 12)}:${mm.padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`,
    };
  };

  const r1 = parse(sunrise);
  const r2 = parse(sunset);
  return {
    sunriseHour: r1.hourFloat,
    sunsetHour: r2.hourFloat,
    sunriseLabel: r1.label,
    sunsetLabel: r2.label,
  };
};

const processHourlyTideData = (hourly?: ForecastData[]): TideDataPoint[] => {
  if (!hourly || hourly.length === 0) {
    // fallback shape (looks like a real day)
    return Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      tide:
        3 +
        1.4 * Math.sin(((h - 2) * Math.PI) / 6) + // semidiurnal-ish
        0.6 * Math.sin(((h + 3) * Math.PI) / 12),
      time: formatHourLabel(h),
    }));
  }

  const out: TideDataPoint[] = hourly
    .filter((f) => f.conditions.tideLevel !== null)
    .map((f) => {
      const d = new Date(f.timestamp);
      const h = d.getHours();
      return {
        hour: h,
        tide: f.conditions.tideLevel as number,
        time: formatHourLabel(h),
      };
    })
    .sort((a, b) => a.hour - b.hour);

  // Mark local highs/lows with 3-hour separation
  const peaks: TideDataPoint[] = [];
  for (let i = 1; i < out.length - 1; i++) {
    const prev = out[i - 1];
    const cur  = out[i];
    const next = out[i + 1];
    const isHigh = cur.tide > prev.tide && cur.tide > next.tide;
    const isLow  = cur.tide < prev.tide && cur.tide < next.tide;
    if (isHigh || isLow) {
      const closeIdx = peaks.findIndex((p) => Math.abs(p.hour - cur.hour) < 3);
      const candidate = { ...cur, isPeak: cur.tide, isHigh, isLow };
      if (closeIdx === -1) {
        peaks.push(candidate);
      } else {
        const nearby = peaks[closeIdx];
        const replace =
          (isHigh && cur.tide > (nearby.tide ?? nearby.isPeak ?? -Infinity)) ||
          (isLow  && cur.tide < (nearby.tide ?? nearby.isPeak ?? Infinity));
        if (replace) peaks[closeIdx] = candidate;
      }
    }
  }

  const peaksByHour = new Map<number, { isPeak: number; isHigh?: boolean; isLow?: boolean }>();
  peaks.forEach((p) => peaksByHour.set(p.hour, { isPeak: p.isPeak!, isHigh: p.isHigh, isLow: p.isLow }));

  return out.map((d) => ({ ...d, ...(peaksByHour.get(d.hour) || {}) }));
};

// Build tidy ticks: 0.5 step for tight ranges, else 1.0
const buildNiceTicks = (minVal: number, maxVal: number): number[] => {
  const range = Math.max(0.5, maxVal - minVal);
  const step = range <= 3 ? 0.5 : 1.0;
  const start = Math.floor(minVal / step) * step;
  const end   = Math.ceil(maxVal / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + 1e-6; v += step) {
    // Avoid float drift like 2.999999
    ticks.push(Math.round(v * 10) / 10);
  }
  return ticks;
};

/* ---------------- Preview (small sparkline) ---------------- */

const previewChartConfig = {
  tide: { label: "Tide", color: "#499effff" },
} satisfies ChartConfig;

export const TidePreview = ({ data, selectedHour, className }: TidePreviewProps) => {
  const processed = processHourlyTideData(data);
  const currentH = selectedHour ?? nowHour();

  // downsample for small sparkline
  const mini = processed.filter((_, i) => i % 4 === 0).slice(0, 6);
  const point = processed.find((d) => d.hour === currentH);
  const tideY = point?.tide ?? (mini[0]?.tide ?? 0);

  return (
    <ChartContainer className={`aspect-auto h-[60px] w-full ${className || ""}`} config={previewChartConfig}>
      <AreaChart data={mini} margin={{ left: 0, right: 0, bottom: 0, top: 5 }}>
        <ReferenceLine x={currentH} stroke="#ef4444" strokeWidth={1} />
        <ReferenceDot x={currentH} y={tideY} r={2} fill="#ef4444" stroke="#fff" />
        <XAxis dataKey="hour" hide />
        <defs>
          <linearGradient id="fillTidePreview" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-tide)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-tide)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <Area
          dataKey="tide"
          type="monotone"
          fill="url(#fillTidePreview)"
          fillOpacity={0.4}
          stroke="var(--color-tide)"
          strokeWidth={1.5}
          stackId="a"
        />
      </AreaChart>
    </ChartContainer>
  );
};

/* ---------------- Main Chart ---------------- */

const chartConfig = {
  tide: { label: "Tide", color: "#6e6e6eff" },
} satisfies ChartConfig;

export const TideChart = ({
  data,
  dailyConditions,
  selectedHour,
  selectedDate = new Date(),
  beach,
  className,
}: TideChartProps) => {
  const rows = processHourlyTideData(data);
  const sun  = getSunTimes(dailyConditions, selectedDate);
  const curH = selectedHour ?? nowHour();

  const values = rows.map((d) => d.tide);
  const dataMin = values.length ? Math.min(...values) : 0;
  const dataMax = values.length ? Math.max(...values) : 6;

  // comfortable domain & ticks
  const yMin = Math.max(0, Math.floor((dataMin - 0.4) * 2) / 2); // down to 0.5 step
  const yMax = Math.ceil((dataMax + 0.4) * 2) / 2;
  const ticks = buildNiceTicks(yMin, yMax);

  return (
    <div className={`h-full bg-background border border-border p-2 rounded-md shadow-sm ${className || ""}`}>
      <header className="mx-2 mb-4 mt-2">
        <h3 className="leading-none font-semibold">
          Tide <span className="text-base font-medium">(ft)</span>
        </h3>
        <span className="text-muted-foreground text-sm">
          {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {beach && ` • ${beach.Name}`}
          {rows.length > 0 && ` • ${rows.length} pts`}
        </span>
      </header>

      <ChartContainer className="@min-lg:aspect-auto @min-lg:h-[250px] w-full" config={chartConfig}>
        <LineChart
          data={rows}
          margin={{ left: -28, right: 16, top: 20, bottom: 6 }}
          accessibilityLayer
          syncId="anyId"            // <-- keep this same across Surf/Swell to sync hover line
          syncMethod="value"
        >
          {/* Night / Day background (use solid hex + fillOpacity for consistency) */}
          <ReferenceArea x1={0} x2={sun.sunriseHour} fill="#e0e7ff" fillOpacity={0.28} />
          <ReferenceArea x1={sun.sunriseHour} x2={sun.sunsetHour} fill="#fef3c7" fillOpacity={0.28} />
          <ReferenceArea x1={sun.sunsetHour} x2={24} fill="#e0e7ff" fillOpacity={0.28} />

          {/* Current time line */}
          <ReferenceLine x={curH} stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" />

          {/* Sunrise / Sunset vertical markers */}
          <ReferenceLine
            x={sun.sunriseHour}
            stroke="#f59e0b"
            strokeWidth={2}
            label={{ value: "Sunrise", position: "top", fill: "#f59e0b" }}
          />
          <ReferenceLine
            x={sun.sunsetHour}
            stroke="#ea580c"
            strokeWidth={2}
            label={{ value: "Sunset", position: "top", fill: "#ea580c" }}
          />

          {/* Optional dots near the bottom so they're visible even without a data point at that hour */}
          <ReferenceDot x={sun.sunriseHour} y={yMin} r={4} fill="#f59e0b" stroke="var(--color-tide)" />
          <ReferenceDot x={sun.sunsetHour}  y={yMin} r={4} fill="#ea580c" stroke="var(--color-tide)" />

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeWidth={0.5} vertical={false} />

          <XAxis
            dataKey="hour"
            type="number"            // <-- numeric axis so ReferenceArea/Line align
            domain={[0, 24]}
            allowDecimals
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
            tickFormatter={tickHour}
          />

          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
            domain={[yMin, yMax]}
            ticks={ticks}
            allowDecimals
            tickFormatter={(v) => (Number.isInteger(v) ? `${v}ft` : `${v.toFixed(1)}ft`)}
          />

          <ChartTooltip
            cursor={{ stroke: "#94a3b8", strokeWidth: 1 }}
            content={
              <ChartTooltipContent
                formatter={(v) => [typeof v === "number" ? `${v.toFixed(1)} ft` : "N/A", "Tide Height"]}
                labelFormatter={(x) => (typeof x === "number" ? formatHourLabel(x) : "Time")}
              />
            }
          />

          <Line
            dataKey="tide"
            type="monotone"
            stroke="var(--color-tide)"
            strokeWidth={3}
            dot={({ payload, cx, cy, index }) => {
              if (!payload || typeof cx !== "number" || typeof cy !== "number") return null;
              if (payload.isPeak) {
                return (
                  <circle
                    key={`pk-${index}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={payload.isHigh ? "#10b981" : "#3b82f6"}
                    stroke="var(--color-tide)"
                    strokeWidth={1}
                  />
                );
              }
              return null;
            }}
          >
            {/* Peak labels */}
            <LabelList
              dataKey="isPeak"
              content={(props: LabelProps) => {
                const x = typeof props.x === "number" ? props.x : 0;
                const y = typeof props.y === "number" ? props.y : 0;
                const i = typeof props.index === "number" ? props.index : 0;

                if (props.value && i < rows.length) {
                  const pt = rows[i];
                  const tideHeight = Number(props.value).toFixed(1);
                  return (
                    <g key={`peak-label-${i}`}>
                      <text
                        x={x}
                        y={y - 32}
                        fill="var(--foreground)"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={10}
                      >
                        {formatHourLabel(pt.hour)}
                      </text>
                      <text
                        x={x}
                        y={y - 17}
                        fill={pt.isHigh ? "#10b981" : "#3b82f6"}
                        textAnchor="middle"
                        fontWeight="bold"
                        fontSize={12}
                      >
                        {`${tideHeight} ft`}
                      </text>
                      <text
                        x={x}
                        y={y - 6}
                        fill="var(--muted-foreground)"
                        textAnchor="middle"
                        fontSize={9}
                      >
                        {pt.isHigh ? "HIGH" : "LOW"}
                      </text>
                    </g>
                  );
                }
                return null;
              }}
            />
          </Line>
        </LineChart>
      </ChartContainer>

      {/* Sunrise/Sunset footer badges */}
      <figcaption className="flex justify-between mt-4 mx-4">
        <div className="flex items-center gap-2 bg-amber-50 py-2 px-3 rounded-md border border-amber-200">
          <FiSunrise className="text-amber-600" size={18} />
          <div className="text-left">
            <div className="text-xs font-medium text-amber-800">Sunrise</div>
            <div className="text-xs text-amber-600">{sun.sunriseLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-orange-50 py-2 px-3 rounded-md border border-orange-200">
          <FiSunset className="text-orange-600" size={18} />
          <div className="text-left">
            <div className="text-xs font-medium text-orange-800">Sunset</div>
            <div className="text-xs text-orange-600">{sun.sunsetLabel}</div>
          </div>
        </div>
      </figcaption>
    </div>
  );
};
