"use client";

import React from "react";
import { createPortal } from "react-dom";
import { cn, getPacificDayRange } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  ArrowLeft,
  ArrowRight,
  MousePointer2 as ArrowIcon,
  Clock3,
  ArrowUp,
  ArrowDown,
  Minus,
  CalendarDays,
  Sun,
  Cloud as CloudIcon,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Snowflake,
  Droplets,
  ClockFading,
} from "lucide-react";

import {
  fetchBeachByIdLoose,
  getWindDirection,
  type ForecastData,
} from "@/lib/supabase";
import { getForecastCached } from "@/lib/dataCache";
import { useDateContext } from "../context/DateContext";
import { useClientPath } from "../context/PathContext";
import { useForecastData } from "../context/ForecastDataContext";
import {
  useOptionalForecastChartLoading,
  useOptionalForecastChartsBusyState,
} from "../context/ForecastChartsLoadingContext";

type MetricGroup =
  | "hour"
  | "surf"
  | "wind"
  | "swell"
  | "weather"
  | "water"
  | "energy"
  | "pressure";

const groupAccentFillClass: Record<MetricGroup, string> = {
  hour: "bg-foreground/25",
  surf: "bg-cyan-500/70 dark:bg-cyan-400/70",
  wind: "bg-sky-500/70 dark:bg-sky-400/70",
  swell: "bg-indigo-500/70 dark:bg-indigo-400/70",
  weather: "bg-amber-500/70 dark:bg-amber-400/70",
  water:
    "bg-gradient-to-r from-cyan-500/70 to-amber-500/70 dark:from-cyan-400/70 dark:to-amber-400/70",
  energy:
    "bg-gradient-to-r from-indigo-500/70 to-cyan-500/70 dark:from-indigo-400/70 dark:to-cyan-400/70",
  pressure: "bg-violet-500/60 dark:bg-violet-400/60",
};

const statusGradientTrackClass =
  "bg-gradient-to-r from-emerald-500/40 via-amber-500/35 to-rose-500/35 dark:from-emerald-400/35 dark:via-amber-400/30 dark:to-rose-400/30";

const WIND_SCALE_MAX_MPH = 40;
const SURF_SCALE_MAX_FT = 12;
const ENERGY_SCALE_MAX_KJ = 100;

function getMetricGroupForColumnId(columnId: string): MetricGroup {
  switch (columnId) {
    case "surf":
      return "surf";
    case "wind":
      return "wind";
    case "swellPrimary":
    case "swellSecondary":
    case "swellTertiary":
      return "swell";
    case "weather":
      return "weather";
    case "water":
      return "water";
    case "energy":
      return "energy";
    case "pressure":
      return "pressure";
    default:
      return "hour";
  }
}

function parseSurfMaxFt(range: string): number | null {
  if (!range || range === "-") return null;
  const match = range.match(/(\d+)-?(\d+)?/);
  if (!match) return null;
  const maxStr = match[2] ?? match[1];
  const max = Number(maxStr);
  return Number.isFinite(max) ? max : null;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function MiniMarkerTrack({
  value,
  min,
  max,
  trackClassName,
  markerClassName,
}: {
  value: number | null;
  min: number;
  max: number;
  trackClassName: string;
  markerClassName?: string;
}) {
  if (value == null || !Number.isFinite(value) || max <= min) return null;
  const t = clamp01((value - min) / (max - min));
  const markerW = "0.375rem"; // w-1.5
  return (
    <div
      aria-hidden="true"
      className="relative mt-1 h-[3px] w-full overflow-visible"
    >
      <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-foreground/10">
        <div className={cn("absolute inset-0", trackClassName)} />
      </div>
      <div
        className={cn(
          "absolute top-1/2 h-2 w-1.5 -translate-y-1/2 rounded-full",
          "bg-highlight-4 shadow-md ring-1 ring-foreground/35 dark:ring-foreground/45",
          "outline outline-2 outline-background/70",
          markerClassName
        )}
        style={{
          left: `clamp(0px, calc(${
            t * 100
          }% - (${markerW} / 2)), calc(100% - ${markerW}))`,
        }}
      />
    </div>
  );
}

function CellSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full rounded-lg border border-border/25 bg-foreground/[0.03] dark:bg-foreground/[0.05]",
        "shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:shadow-[0_1px_0_rgba(0,0,0,0.35)]",
        "h-14 min-h-14 px-2.5 py-1.5 flex items-center justify-center",
        className
      )}
    >
      {children}
    </div>
  );
}

function TimeCell({ time, selected }: { time: string; selected: boolean }) {
  const parts = time.split(" ");
  const hour = parts[0] ?? "";
  const ampm = parts[1] ?? "";
  return (
    <div
      className={cn(
        "rounded-xl",
        selected &&
          "ring-2 ring-sky-500/35 shadow-sm dark:ring-sky-400/30 dark:shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
      )}
    >
      <div className="relative h-14 w-12 overflow-hidden rounded-xl border border-foreground/10 bg-foreground/[0.07] dark:bg-foreground/[0.09]">
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-foreground/30 via-foreground/10 to-transparent dark:from-foreground/30 dark:via-foreground/10" />
        <div
          className={cn(
            "absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full",
            selected
              ? "bg-sky-500/60 ring-1 ring-sky-500/30 dark:bg-sky-400/55 dark:ring-sky-400/25"
              : "bg-foreground/20"
          )}
        />
        <div className="grid h-full place-items-center px-1 text-center">
          <div>
            <div className="text-[1rem] font-semibold tabular-nums leading-none">
              {hour}
            </div>
            <div className="mt-1 text-[0.65rem] font-semibold uppercase text-muted-foreground leading-none">
              {ampm}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DirectionBadge({
  deg,
  label,
}: {
  deg?: number | null;
  label?: string | null;
}) {
  const rotation = typeof deg === "number" ? deg - 315 : 0;
  const safeLabel = label ?? "-";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-foreground/[0.03] px-1.5 py-0.5">
      <span
        aria-hidden="true"
        style={{ transform: `rotate(${rotation}deg)`, display: "inline-block" }}
        className="leading-none"
      >
        <ArrowIcon
          size={13}
          className="fill-foreground/15 text-foreground/45"
        />
      </span>
      <span className="hidden @min-lg:inline-block @min-4xl:hidden @min-5xl:inline-block text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">
        {safeLabel}
      </span>
    </span>
  );
}

function DotScale({
  value,
  max,
  dots = 5,
  fillClassName,
}: {
  value: number | null;
  max: number;
  dots?: number;
  fillClassName: string;
}) {
  if (value == null || !Number.isFinite(value) || max <= 0) return null;
  const t = clamp01(value / max);
  const filled = Math.max(1, Math.min(dots, Math.round(t * (dots - 1)) + 1));
  return (
    <div aria-hidden="true" className="flex items-center justify-center gap-1">
      {Array.from({ length: dots }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            i < filled ? fillClassName : "bg-foreground/10"
          )}
        />
      ))}
    </div>
  );
}

function PeriodTicks({ period }: { period: number | null }) {
  if (period == null || !Number.isFinite(period)) return null;
  const t = clamp01((period - 6) / 14);
  const filled = Math.max(1, Math.min(5, Math.round(t * 4) + 1));
  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-center gap-0.5"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 w-[3px] rounded-full",
            i < filled ? groupAccentFillClass.swell : "bg-foreground/10",
            i >= 3 && "h-2.5"
          )}
        />
      ))}
    </div>
  );
}

function PressureNeedle({
  value,
  min,
  max,
  className,
}: {
  value: number;
  min: number;
  max: number;
  className?: string;
}) {
  if (!Number.isFinite(value) || max <= min) return null;
  const t = clamp01((value - min) / (max - min));
  const markerH = "0.5rem"; // h-2
  return (
    <div
      aria-hidden="true"
      className={cn("relative h-7 w-2.5 overflow-visible", className)}
    >
      <div className="relative h-7 w-2.5 overflow-hidden rounded-full bg-foreground/10">
        <div className="absolute inset-0 bg-gradient-to-t from-violet-500/25 to-violet-500/0 dark:from-violet-400/20" />
      </div>
      <div
        className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-background shadow-md ring-1 ring-foreground/25 dark:ring-foreground/35"
        style={{
          bottom: `clamp(0px, calc(${
            t * 100
          }% - (${markerH} / 2)), calc(100% - ${markerH}))`,
        }}
      />
    </div>
  );
}

// Simple cache for forecast data to avoid refetching
const forecastCache = new Map<
  string,
  { data: ForecastData[]; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const SwellStat = ({
  primary = false,
  data,
}: {
  primary?: boolean;
  data?: {
    height?: number | string | null;
    period?: number | null;
    dir?: string | null;
    deg?: number | null;
  } | null;
}) => {
  const height = data?.height ?? "-";
  const period = data?.period ?? "-";
  const dir = data?.dir ?? "-";
  const deg = data?.deg ?? 0;

  const periodNumber = typeof data?.period === "number" ? data.period : null;

  return (
    <CellSurface
      className={cn(
        primary ? "bg-foreground/[0.04] dark:bg-foreground/[0.06]" : undefined
      )}
    >
      <div className="w-full">
        <div className="flex h-full items-center justify-between gap-2 min-w-0">
          <div className="flex min-w-0 flex-col items-start">
            <div className="flex items-baseline gap-1 whitespace-nowrap">
              <span
                className={cn(
                  "tabular-nums leading-none",
                  primary
                    ? "text-[0.95rem] font-semibold"
                    : "text-sm font-semibold"
                )}
              >
                {height}
              </span>
              <span className="text-[0.65rem] text-muted-foreground">ft</span>
            </div>
            <div className="flex items-center gap-1 whitespace-nowrap text-muted-foreground -mb-1">
              <ClockFading
                aria-hidden="true"
                className="hidden @min-lg:block h-3.5 w-3.5 shrink-0 text-muted-foreground/80"
              />
              <span
                className={cn(
                  "tabular-nums leading-none",
                  primary
                    ? "text-[0.95rem] font-semibold"
                    : "text-sm font-semibold"
                )}
              >
                {period}
                <span className="text-[0.65rem] text-muted-foreground ml-0.5">
                  s
                </span>
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end justify-center gap-2">
            <DirectionBadge deg={deg} label={dir} />
            <div className="pr-1">
              <PeriodTicks period={periodNumber} />
            </div>
          </div>
        </div>
      </div>
    </CellSurface>
  );
};

const WindStat = ({
  data,
  scaleMax = 30,
}: {
  data: { dir: string; speed: number; max: number; deg?: number };
  scaleMax?: number;
}) => {
  return (
    <CellSurface>
      <div className="w-full">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <DirectionBadge deg={data.deg} label={data.dir} />

          <div className="flex min-w-0 flex-col items-end leading-none">
            <div className="inline-flex items-baseline gap-1">
              <span className="inline-flex w-[3ch] justify-end text-[1.05rem] font-semibold tabular-nums leading-none">
                {data.speed}
              </span>
              <span className="text-[0.65rem] text-muted-foreground">mph</span>
            </div>
            <div className="mt-0.5 inline-flex items-center gap-1 text-muted-foreground">
              <ArrowUp
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80"
              />
              <span className="inline-flex w-[1.5ch] justify-end text-xs font-medium tabular-nums">
                {data.max}
              </span>
              <span className="sr-only">gust</span>
            </div>
          </div>
        </div>
        <div className="mt-0.5">
          <MiniMarkerTrack
            value={data.speed}
            min={0}
            max={scaleMax}
            trackClassName={statusGradientTrackClass}
          />
        </div>
      </div>
    </CellSurface>
  );
};

const WeatherStat = ({
  data,
  water,
  waterMin,
  waterMax,
}: {
  data?: { condition?: string; temp: number; code?: number | null };
  water?: number;
  waterMin?: number;
  waterMax?: number;
}) => {
  // Function to get weather icon based on WMO code
  const getWeatherIcon = (code: number | null) => {
    if (code == null)
      return <Sun className="w-4 h-4" strokeWidth={3} color="#f79e55ff" />;

    // WMO code groupings
    if (code === 0)
      return <Sun className="w-4 h-4" strokeWidth={3} color="#f79e55ff" />; // Clear
    if ([1, 2, 3].includes(code))
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g stroke="#f79e55ff">
            <path d="M12 2v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="M20 12h2" />
            <path d="m19.07 4.93-1.41 1.41" />
            <path d="M15.947 12.65a4 4 0 0 0-5.925-4.128" />
          </g>
          <path
            d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"
            stroke="#bdbdbdff"
          />
        </svg>
      ); // Partly cloudy/overcast
    if ([45, 48].includes(code))
      return <CloudIcon className="w-4 h-4" color="#bdbdbdff" />; // Fog
    if ([51, 53, 55].includes(code))
      return <CloudDrizzle className="w-4 h-4" color="#66a3ffff" />; // Drizzle
    if ([56, 57].includes(code))
      return <CloudDrizzle className="w-4 h-4" color="#66a3ffff" />; // Freezing drizzle
    if ([61, 63, 65].includes(code))
      return <CloudRain className="w-4 h-4" color="#66a3ffff" />; // Rain
    if ([66, 67].includes(code))
      return <CloudRain className="w-4 h-4" color="#66a3ffff" />; // Freezing rain
    if ([71, 73, 75].includes(code))
      return <Snowflake className="w-4 h-4" color="#8ecaffff" />; // Snow
    if (code === 77) return <Snowflake className="w-4 h-4" color="#8ecaffff" />; // Snow grains
    if ([80, 81, 82].includes(code))
      return <CloudRain className="w-4 h-4" color="#66a3ffff" />; // Showers
    if ([85, 86].includes(code))
      return <Snowflake className="w-4 h-4" color="#8ecaffff" />; // Snow showers
    if ([95, 96, 99].includes(code))
      return <CloudLightning className="w-4 h-4" color="#ff8d6bff" />; // Thunderstorm/hail

    return <CloudIcon className="w-4 h-4" color="#bdbdbdff" />;
  };

  const isWater = water != null;
  const tempValue = water ?? data?.temp;
  const waterTemp = typeof water === "number" ? water : null;
  const waterT = waterTemp != null ? clamp01(waterTemp / 100) : null;
  const waterFillInsetTop =
    isWater && waterT != null ? `${Math.round((1 - waterT) * 100)}%` : null;

  return (
    <CellSurface>
      <div className="w-full">
        <div className="flex items-center justify-center gap-1">
          {isWater ? (
            <span aria-hidden="true" className="shrink-0 relative h-4 w-4">
              <Droplets
                className="absolute inset-0 h-4 w-4 text-foreground/35 dark:text-foreground/30"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              />
              {waterFillInsetTop ? (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(${waterFillInsetTop} 0 0 0)` }}
                >
                  <Droplets
                    className="h-4 w-4 text-sky-500/25 dark:text-sky-400/40"
                    fill="currentColor"
                    stroke="none"
                  />
                </span>
              ) : null}
              {waterFillInsetTop ? (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(${waterFillInsetTop} 0 0 0)` }}
                >
                  <Droplets
                    className="h-4 w-4 text-sky-600/70 dark:text-sky-300/80"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  />
                </span>
              ) : null}
            </span>
          ) : (
            <span aria-hidden="true">{getWeatherIcon(data?.code ?? null)}</span>
          )}
          <span className="inline-flex items-start gap-0.5">
            <span className="text-[1.05rem] font-semibold tabular-nums leading-none">
              {tempValue}
            </span>
            <span className="text-[0.7rem] text-muted-foreground">&deg;F</span>
          </span>
        </div>
      </div>
    </CellSurface>
  );
};

const SurfStat = ({
  range,
  maxFt,
  scaleMax,
}: {
  range: string;
  maxFt: number | null;
  scaleMax: number;
}) => {
  return (
    <CellSurface className="px-2">
      <div className="w-full h-full flex flex-col justify-end gap-3">
        <div className="flex items-baseline justify-start gap-1 whitespace-nowrap">
          <span className="text-[1.05rem] font-semibold tabular-nums leading-none">
            {range}
          </span>
          <span className="text-[0.65rem] text-muted-foreground">ft</span>
        </div>
        <MiniMarkerTrack
          value={maxFt}
          min={0}
          max={scaleMax}
          trackClassName={statusGradientTrackClass}
        />
      </div>
    </CellSurface>
  );
};

const EnergyStat = ({
  value,
  scaleMax,
}: {
  value: number;
  scaleMax: number;
}) => {
  return (
    <CellSurface>
      <div className="w-full">
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-[1.05rem] font-semibold tabular-nums leading-none">
              {value}
            </span>
            <span className="text-[0.65rem] text-muted-foreground">kJ</span>
          </span>
        </div>
        <DotScale
          value={value}
          max={scaleMax}
          fillClassName={groupAccentFillClass.energy}
        />
      </div>
    </CellSurface>
  );
};

type PressureTrend = "up" | "down" | "flat";

function getPressureTrend(delta: number): PressureTrend {
  if (!Number.isFinite(delta)) return "flat";
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

const PressureStat = ({
  value,
  min,
  max,
  prev,
}: {
  value: number;
  min: number;
  max: number;
  prev: number | null;
}) => {
  const delta = prev == null ? 0 : value - prev;
  const trend = getPressureTrend(delta);
  const TrendIcon =
    trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
  const trendClass =
    trend === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : trend === "down"
      ? "text-rose-600 dark:text-rose-400"
      : "text-muted-foreground";
  const deltaText =
    prev == null ? "0.00" : `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`;

  return (
    <CellSurface className="px-3">
      <div className="flex w-full items-center justify-center @min-xl:justify-between gap-2">
        <div className="flex min-w-0 flex-col items-start mt-1">
          <div className="flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-[0.9rem] @min-lg:text-[1.05rem] font-semibold tabular-nums leading-none">
              {value.toFixed(2)}
            </span>
            <span className="hidden @min-xs:block text-[0.65rem] text-muted-foreground">
              in
            </span>
          </div>
          <div
            className={cn(
              "inline-flex items-center gap-0.5",
              "text-[0.65rem] font-semibold tabular-nums",
              trendClass
            )}
          >
            <TrendIcon
              className="hidden @min-xs:block h-3.5 w-3.5"
              aria-hidden="true"
            />
            <span>{deltaText}</span>
          </div>
        </div>
        <PressureNeedle
          className="hidden @min-xl:block"
          value={value}
          min={min}
          max={max}
        />
      </div>
    </CellSurface>
  );
};

type TableEntry = {
  index: number;
  time: string;
  wind: {
    label: string;
    dir: string;
    speed: number;
    max: number;
    deg?: number;
  };
  surf: { label: string; height: string };
  swell: {
    label: string;
    primary: { height: number; period: number; dir: string; deg: number };
    secondary: { height: number; period: number; dir: string; deg: number }[];
  };
  pressure: { label: string; value: number };
  weather: {
    label: string;
    condition: string;
    temp: number;
    code?: number | null;
  };
  water: { label: string; temp: number };
  energy: { label: string; value: number };
};

type TableDay = {
  key: string;
  date: string;
  dateMs: number;
  vals: TableEntry[];
};

type DateLike = Date | undefined | null;

const isValidDate = (value: DateLike): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

const DAY_MS = 24 * 60 * 60 * 1000;

const TABLE_COLUMNS: Array<{ id: string; label: string }> = [
  { id: "surf", label: "Surf" },
  { id: "wind", label: "Wind" },
  { id: "swellPrimary", label: "Primary Swell" },
  { id: "swellSecondary", label: "Swell 2" },
  { id: "swellTertiary", label: "Swell 3" },
  { id: "weather", label: "Weather" },
  { id: "water", label: "Water" },
  { id: "energy", label: "Energy" },
  { id: "pressure", label: "Pressure" },
];

const SPACER_COLUMN: { id: string; label: string } = {
  id: "__spacer",
  label: "",
};

const StatTable = ({
  numDays,
  numHours,
  header = false,
  beachId,
  date,
}: {
  numDays: number;
  numHours: number;
  header?: boolean;
  beachId?: string;
  date?: Date;
}) => {
  // TODO(overview-perf): Ideally drive this loading state from a shared forecast context
  // when available so both overview and forecast tables stay in sync with other widgets.
  const [loading, setLoading] = React.useState<boolean>(true);
  const [data, setData] = React.useState<TableDay[]>([]);
  const {
    selectedDays,
    hour: selectedHour,
    selected,
    showSecondarySwells,
  } = useDateContext();
  const { selectedTab } = useClientPath();
  const forecastPage = selectedTab === "forecast";
  const headerBgClass =
    "bg-highlight-4 supports-[backdrop-filter]:backdrop-blur-md";
  const { rows: sharedRows } = useForecastData();
  const { setReady } = useOptionalForecastChartLoading("forecast-table");
  const dashboardBusy = useOptionalForecastChartsBusyState();
  const [stableSelectedHour, setStableSelectedHour] = React.useState<
    number | null
  >(null);
  const wasBusyRef = React.useRef(dashboardBusy);

  // Forecast dashboard readiness reporting for the table: mark not ready
  // whenever the table is loading, and ready once data is present.
  React.useEffect(() => {
    if (!forecastPage) return;
    if (loading) {
      setReady(false);
    }
  }, [forecastPage, loading, setReady]);

  React.useEffect(() => {
    if (!forecastPage) return;
    if (!loading && data.length > 0) {
      setReady(true);
    }
  }, [forecastPage, loading, data.length, setReady]);

  React.useEffect(() => {
    if (!forecastPage) {
      setStableSelectedHour(null);
      return;
    }
    if (dashboardBusy && !wasBusyRef.current) {
      setStableSelectedHour(selectedHour ?? null);
    }
    if (!dashboardBusy && wasBusyRef.current) {
      setStableSelectedHour(null);
    }
    wasBusyRef.current = dashboardBusy;
  }, [forecastPage, dashboardBusy, selectedHour]);

  // Extract requestedDate at component level so it's accessible throughout
  const requestedDate = React.useMemo(
    () => (isValidDate(date) ? date : undefined),
    [date]
  );

  // Memoize date range calculation to prevent unnecessary recalculations
  const dateRange = React.useMemo(() => {
    if (!beachId) return null;

    const anchor = requestedDate ?? new Date();
    const { start: anchorStart } = getPacificDayRange(anchor);
    const bufferBefore = requestedDate ? 1 : 0;
    const bufferAfter = requestedDate ? 1 : 0;

    const hasSelectedDays =
      Array.isArray(selectedDays) && selectedDays.length > 0;
    const rangeStart =
      requestedDate && !forecastPage
        ? new Date(anchorStart.getTime() - bufferBefore * DAY_MS)
        : hasSelectedDays
        ? selectedDays![0]
        : new Date(anchorStart.getTime() - bufferBefore * DAY_MS);

    const daysToFetch = Math.max(numDays, 1) + bufferAfter;
    const rangeEnd =
      requestedDate && !forecastPage
        ? new Date(anchorStart.getTime() + daysToFetch * DAY_MS)
        : hasSelectedDays
        ? new Date(
            selectedDays![selectedDays!.length - 1].getTime() +
              bufferAfter * DAY_MS
          )
        : new Date(anchorStart.getTime() + daysToFetch * DAY_MS);

    return { rangeStart, rangeEnd };
  }, [beachId, requestedDate, selectedDays, forecastPage, numDays]);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!beachId || !dateRange) {
          setData([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        const { rangeStart, rangeEnd } = dateRange;

        const rangeStartMs = rangeStart.getTime();
        const rangeEndMs = rangeEnd.getTime();
        const coverageToleranceMs = 3 * 60 * 60 * 1000;

        const filterSharedRows = () => {
          if (!sharedRows?.length) {
            return [] as ForecastData[];
          }
          const filtered =
            sharedRows
              .filter((row) => {
                const ts = new Date(row.timestamp).getTime();
                return ts >= rangeStartMs && ts <= rangeEndMs;
              })
              .sort(
                (a, b) =>
                  new Date(a.timestamp).getTime() -
                  new Date(b.timestamp).getTime()
              ) ?? [];
          if (!filtered.length) {
            return [];
          }
          const firstTs = new Date(filtered[0].timestamp).getTime();
          const lastTs = new Date(
            filtered[filtered.length - 1].timestamp
          ).getTime();
          const coversStart = firstTs <= rangeStartMs + coverageToleranceMs;
          const coversEnd = lastTs >= rangeEndMs - coverageToleranceMs;
          return coversStart && coversEnd ? filtered : [];
        };

        const resolved = await fetchBeachByIdLoose(beachId);
        const resolvedId = resolved?.id ?? beachId;

        // Check cache first
        const cacheKey = `${resolvedId}:${rangeStart.getTime()}:${rangeEnd.getTime()}`;
        const cached = forecastCache.get(cacheKey);
        const now = Date.now();

        let weekly: ForecastData[];
        const shared = filterSharedRows();
        if (shared.length) {
          weekly = shared;
        } else if (cached && now - cached.timestamp < CACHE_DURATION) {
          weekly = cached.data;
        } else {
          weekly = await getForecastCached(
            String(resolvedId),
            rangeStart,
            rangeEnd
          );

          // Update cache
          forecastCache.set(cacheKey, { data: weekly, timestamp: now });

          // Clean up old cache entries
          if (forecastCache.size > 10) {
            const keys = Array.from(forecastCache.keys());
            forecastCache.delete(keys[0]);
          }
        }

        if (cancelled) {
          return;
        }

        // Group by date using Pacific timezone (matches chart processing)
        const byDay = new Map<string, ForecastData[]>();
        const getDayKey = (timestamp: string) => {
          const d = new Date(timestamp);
          // Use Pacific timezone for grouping to match charts (DST-aware)
          const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Los_Angeles",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
          const parts = formatter.formatToParts(d);
          const year = parts.find((p) => p.type === "year")?.value;
          const month = parts.find((p) => p.type === "month")?.value;
          const day = parts.find((p) => p.type === "day")?.value;
          return `${year}-${month}-${day}`;
        };

        const fmtDayLabel = (d: Date) =>
          d.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          });

        weekly.forEach((row) => {
          const dayKey = getDayKey(row.timestamp);
          const arr = byDay.get(dayKey) ?? [];
          arr.push(row);
          byDay.set(dayKey, arr);
        });

        const days: TableDay[] = [];
        const entriesByDay = Array.from(byDay.entries()).sort((a, b) => {
          const ta = new Date(a[1][0]?.timestamp ?? 0).getTime();
          const tb = new Date(b[1][0]?.timestamp ?? 0).getTime();
          return ta - tb;
        });

        // Convert requested dates to day keys for filtering
        const onlyKey =
          requestedDate && !forecastPage
            ? getDayKey(requestedDate.toISOString())
            : null;
        const onlyKeys =
          Array.isArray(selectedDays) && selectedDays.length > 0
            ? selectedDays.map((day) => getDayKey(day.toISOString()))
            : null;
        let allowedKeys: Set<string> | null = null;
        const dayKeys = entriesByDay.map(([key]) => key);

        // Prioritize date prop over selectedDays
        if (onlyKeys && onlyKeys.length > 0) {
          allowedKeys = new Set(onlyKeys);
        } else if (onlyKey) {
          if (onlyKey && dayKeys.includes(onlyKey)) {
            allowedKeys = new Set([onlyKey]);
          } else if (requestedDate) {
            const prev = getDayKey(
              new Date(requestedDate.getTime() - DAY_MS).toISOString()
            );
            const next = getDayKey(
              new Date(requestedDate.getTime() + DAY_MS).toISOString()
            );
            const cands = [prev, next].filter((k) => dayKeys.includes(k));
            if (cands.length) allowedKeys = new Set([cands[0]]);
          }
        }

        for (const [dayKey, rows] of entriesByDay) {
          if (allowedKeys && !allowedKeys.has(dayKey)) continue;
          rows.sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          // Use the EXACT same hour calculation as charts - local browser hours
          // This matches SwellChart.tsx line 107: new Date(r.timestamp).getHours()
          const getLocalHour = (timestamp: string): number => {
            return new Date(timestamp).getHours();
          };

          // Instead of forcing specific hours, sample evenly from available data
          // This ensures we show ACTUAL forecast times that exist in the data
          const numSamples = Math.min(numHours, rows.length);
          const sampledRows: ForecastData[] = [];

          if (numSamples > 0 && rows.length > 0) {
            if (rows.length <= numSamples) {
              // Use all rows if we have fewer than requested
              sampledRows.push(...rows);
            } else {
              // Sample evenly across the day, avoiding duplicates
              const indices = new Set<number>();
              const step = (rows.length - 1) / (numSamples - 1);

              for (let i = 0; i < numSamples; i++) {
                let index = Math.round(i * step);
                // Ensure we don't exceed array bounds
                index = Math.min(index, rows.length - 1);
                indices.add(index);
              }

              // Convert to sorted array and get rows
              Array.from(indices)
                .sort((a, b) => a - b)
                .forEach((idx) => sampledRows.push(rows[idx]));
            }
          }

          const makeEntryFromRow = (r: ForecastData): TableEntry => {
            // Use the ACTUAL hour from the data, not the target hour
            const actualHour = getLocalHour(r.timestamp);
            const displayHour = actualHour % 12 === 0 ? 12 : actualHour % 12;
            const ampm = actualHour >= 12 ? "PM" : "AM";

            const windDir = getWindDirection(r.conditions.windDirection ?? 0);
            const windDeg = Math.round(r.conditions.windDirection ?? 0);
            const windSpeed = Math.round(r.conditions.windSpeed ?? 0);
            const windGust = Math.round(r.conditions.windGust ?? windSpeed);

            const min = r.surf.heightMin ?? 0;
            const max = r.surf.heightMax ?? 0;
            const minR = Math.round(min);
            const maxR = Math.round(max);
            const surfHeight =
              minR === 0 && maxR === 0
                ? "-"
                : minR === maxR
                ? `${maxR}`
                : `${minR}-${maxR}`;

            const priH =
              r.swell.primary.height != null
                ? Number(r.swell.primary.height.toFixed(1))
                : 0;
            const priP = Math.round(r.swell.primary.period ?? 0);
            const priDeg = Math.round(r.swell.primary.direction ?? 0);
            const priDir = getWindDirection(priDeg);

            const secList: TableEntry["swell"]["secondary"] = [];
            if (r.swell.secondary.height != null) {
              const sH = Number((r.swell.secondary.height ?? 0).toFixed(1));
              const sP = Math.round(r.swell.secondary.period ?? 0);
              const sDg = Math.round(r.swell.secondary.direction ?? 0);
              secList.push({
                height: sH,
                period: sP,
                dir: getWindDirection(sDg),
                deg: sDg,
              });
            }
            if (r.swell.tertiary?.height != null) {
              const tH = Number((r.swell.tertiary.height ?? 0).toFixed(1));
              const tP = Math.round(r.swell.tertiary.period ?? 0);
              const tDg = Math.round(r.swell.tertiary.direction ?? 0);
              secList.push({
                height: tH,
                period: tP,
                dir: getWindDirection(tDg),
                deg: tDg,
              });
            }

            const pressure =
              r.conditions.pressure != null
                ? Number(r.conditions.pressure.toFixed(2))
                : 0;

            return {
              index: actualHour,
              time: `${displayHour} ${ampm}`,
              wind: {
                label: "wind",
                dir: windDir,
                speed: windSpeed,
                max: windGust,
                deg: windDeg,
              },
              surf: { label: "surf", height: surfHeight },
              swell: {
                label: "swell",
                primary: {
                  height: priH,
                  period: priP,
                  dir: priDir,
                  deg: priDeg,
                },
                secondary: secList.slice(0, 2),
              },
              pressure: { label: "pressure", value: pressure },
              weather: {
                label: "weather",
                condition: "clear",
                temp: Math.round(r.conditions.airTemp ?? 0),
                code: r.conditions.weather ?? null,
              },
              water: {
                label: "water",
                temp: Math.round(r.conditions.waterTemp ?? 0),
              },
              energy: {
                label: "energy",
                value: Math.round(r.surf.waveEnergy ?? 0),
              },
            };
          };

          const entries: TableEntry[] = sampledRows.map((r) => {
            return makeEntryFromRow(r);
          });

          const firstTs = rows[0]?.timestamp ?? new Date().toISOString();
          const d0 = new Date(firstTs);
          const midnight = new Date(
            d0.getFullYear(),
            d0.getMonth(),
            d0.getDate()
          ).getTime();
          const displayLabel = fmtDayLabel(d0);
          days.push({
            key: dayKey,
            date: displayLabel,
            dateMs: midnight,
            vals: entries,
          });
        }

        let finalDays: TableDay[] = [];

        if (days.length) {
          const dayMap = new Map(days.map((day) => [day.key, day]));
          const ordered: TableDay[] = [];
          const seenKeys = new Set<string>();

          const pushByKey = (key: string | null) => {
            if (!key || seenKeys.has(key)) return;
            const match = dayMap.get(key);
            if (!match) return;
            ordered.push(match);
            seenKeys.add(key);
          };

          pushByKey(onlyKey);

          if (onlyKeys) {
            for (const key of onlyKeys) {
              pushByKey(key);
            }
          }

          for (const day of days) {
            if (seenKeys.has(day.key)) continue;
            ordered.push(day);
            seenKeys.add(day.key);
          }

          const limit = Math.max(1, numDays);
          finalDays = ordered.slice(0, limit);
        }

        if (!cancelled) {
          setData(finalDays);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to load StatTable data", e);
          setLoading(false);
        }
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [
    dateRange,
    beachId,
    numDays,
    numHours,
    sharedRows,
    forecastPage,
    requestedDate,
    selectedDays,
  ]);

  // Filter columns based on toggle state
  const filteredColumns = React.useMemo(() => {
    if (showSecondarySwells) {
      return TABLE_COLUMNS;
    }
    return TABLE_COLUMNS.filter(
      (col) => col.id !== "swellSecondary" && col.id !== "swellTertiary"
    );
  }, [showSecondarySwells]);

  const [columnPages, setColumnPages] = React.useState([TABLE_COLUMNS]);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [stickyHeaderTopPx, setStickyHeaderTopPx] = React.useState(0);

  const tableRef = React.useRef<HTMLDivElement | null>(null);
  const [tableEl, setTableEl] = React.useState<HTMLDivElement | null>(null);
  const assignTableRef = React.useCallback((node: HTMLDivElement | null) => {
    tableRef.current = node;
    setTableEl(node);
  }, []);

  React.useEffect(() => {
    const nav = document.querySelector("header.fixed") as HTMLElement | null;
    if (!nav) return;

    const update = () => {
      const next = Math.min(65, Math.ceil(nav.getBoundingClientRect().height));
      setStickyHeaderTopPx((prev) => (prev === next ? prev : next));
    };

    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(nav);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const resizeRafRef = React.useRef<number | null>(null);
  const measuredWidthRef = React.useRef<number>(0);
  type LayoutBucket = "lt400" | "lt600" | "lt900" | "lt1150" | "gte1150";
  const layoutBucketRef = React.useRef<LayoutBucket>("gte1150");
  const LAYOUT_HYSTERESIS_PX = 20;

  React.useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const adjustData = () => {
      const widthNow = measuredWidthRef.current || table.clientWidth;
      let newPages: typeof columnPages;
      // Use filtered columns instead of COLUMNS
      const cols = filteredColumns;

      const hysteresis = LAYOUT_HYSTERESIS_PX;
      const up = (edge: number) => edge + hysteresis;
      const down = (edge: number) => edge - hysteresis;
      const stepBucket = (bucket: LayoutBucket): LayoutBucket => {
        switch (bucket) {
          case "lt400":
            if (widthNow > up(400)) return "lt600";
            return "lt400";
          case "lt600":
            if (widthNow < down(400)) return "lt400";
            if (widthNow > up(600)) return "lt900";
            return "lt600";
          case "lt900":
            if (widthNow < down(600)) return "lt600";
            if (widthNow > up(900)) return "lt1150";
            return "lt900";
          case "lt1150":
            if (widthNow < down(900)) return "lt900";
            if (widthNow > up(1150)) return "gte1150";
            return "lt1150";
          case "gte1150":
          default:
            if (widthNow < down(1150)) return "lt1150";
            return "gte1150";
        }
      };

      // Allow large width jumps (tab switches, minimize/maximize) to settle in a
      // single pass, while still keeping hysteresis near boundaries.
      let bucket = layoutBucketRef.current;
      for (let i = 0; i < 4; i += 1) {
        const next = stepBucket(bucket);
        if (next === bucket) break;
        bucket = next;
      }
      const nextBucket = bucket;

      layoutBucketRef.current = nextBucket;

      if (nextBucket === "lt400") {
        if (showSecondarySwells) {
          newPages = [
            [cols[0], cols[1]],
            cols.slice(2, 4),
            cols.slice(4, 6),
            cols.slice(6, cols.length),
          ];
        } else {
          newPages = [
            [cols[0], cols[1]],
            cols.slice(2, 4),
            cols.slice(4, cols.length),
          ];
        }
      } else if (nextBucket === "lt600") {
        if (showSecondarySwells) {
          newPages = [
            [cols[0], cols[2], cols[1]],
            cols.slice(3, 5),
            cols.slice(5, cols.length),
          ];
        } else {
          newPages = [[cols[0], cols[2], cols[1]], cols.slice(3, cols.length)];
        }
      } else if (nextBucket === "lt900") {
        if (showSecondarySwells) {
          newPages = [
            [cols[0], cols[2], cols[1]],
            [cols[3], cols[4]].filter(Boolean),
            cols.slice(5, cols.length).filter(Boolean),
          ];
        } else {
          newPages = [[cols[0], cols[2], cols[1]], cols.slice(3, cols.length)];
        }
      } else if (nextBucket === "lt1150") {
        if (showSecondarySwells) {
          newPages = [
            [cols[0], cols[2], cols[3], cols[4], cols[1]].filter(Boolean),
            [cols[1], cols[5], cols[6], cols[7], cols[8]].filter(Boolean),
          ];
        } else {
          newPages = [
            [cols[0], cols[2], cols[1], cols[3], cols[4], cols[5], cols[6]],
          ];
        }
      } else {
        if (showSecondarySwells) {
          newPages = [
            [
              cols[0],
              cols[2],
              cols[3],
              cols[4],
              cols[5],
              cols[6],
              cols[7],
              cols[8],
              cols[1],
            ],
          ];
        } else {
          newPages = [
            [cols[0], cols[2], cols[1], cols[3], cols[4], cols[5], cols[6]],
          ];
        }
      }
      setColumnPages((prev) => {
        const prevJson = JSON.stringify(prev);
        const nextJson = JSON.stringify(newPages);
        if (prevJson !== nextJson) {
          setCurrentPage((p) => Math.min(p, newPages.length - 1));
          return newPages;
        }
        return prev;
      });
    };

    const scheduleAdjust = () => {
      if (resizeRafRef.current != null) return;
      resizeRafRef.current = window.requestAnimationFrame(() => {
        resizeRafRef.current = null;
        adjustData();
      });
    };

    const observer = new ResizeObserver(() => {
      const w = table.clientWidth;
      if (w > 0) measuredWidthRef.current = w;
      scheduleAdjust();
    });
    observer.observe(table);

    const onWindowResize = () => {
      const w = table.clientWidth;
      if (w > 0) measuredWidthRef.current = w;
      scheduleAdjust();
    };
    window.addEventListener("resize", onWindowResize);
    window.visualViewport?.addEventListener("resize", onWindowResize);

    measuredWidthRef.current = table.clientWidth;
    adjustData();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onWindowResize);
      window.visualViewport?.removeEventListener("resize", onWindowResize);
      if (resizeRafRef.current != null) {
        window.cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
    };
  }, [filteredColumns, showSecondarySwells, selectedTab]);

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, columnPages.length - 1));
  };
  const handleBack = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };
  const visibleColumns = columnPages[currentPage];

  const windowSize = 4;

  const visibleDays = data.slice(0, windowSize);

  const barScales = React.useMemo(() => {
    let waterMin = Number.POSITIVE_INFINITY;
    let waterMax = Number.NEGATIVE_INFINITY;

    for (const day of data) {
      for (const entry of day.vals) {
        if (Number.isFinite(entry.water.temp)) {
          waterMin = Math.min(waterMin, entry.water.temp);
          waterMax = Math.max(waterMax, entry.water.temp);
        }
      }
    }

    if (!Number.isFinite(waterMin) || !Number.isFinite(waterMax)) {
      waterMin = 50;
      waterMax = 75;
    } else if (waterMax - waterMin < 2) {
      waterMin -= 1;
      waterMax += 1;
    }

    return {
      energyMax: ENERGY_SCALE_MAX_KJ,
      waterMin,
      waterMax,
      pressureMin: 29.4,
      pressureMax: 30.6,
    };
  }, [data]);

  // Swipe and horizontal wheel to change column pages
  const touchStartX = React.useRef<number | null>(null);
  const touchDeltaX = React.useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    if (columnPages.length <= 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const onTouchEnd = () => {
    if (touchStartX.current == null) return;
    const dx = touchDeltaX.current;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    const threshold = 40;
    if (Math.abs(dx) < threshold) return;
    if (dx < 0) handleNext();
    else handleBack();
  };
  const onWheel = (e: React.WheelEvent) => {
    if (columnPages.length <= 1) return;
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
    if (e.deltaX > 8) handleNext();
    if (e.deltaX < -8) handleBack();
  };

  type PagerMode = "hidden" | "fixed" | "docked";
  const [pagerMode, setPagerMode] = React.useState<PagerMode>("hidden");
  const [pagerFrame, setPagerFrame] = React.useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });
  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(
    null
  );

  React.useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  React.useEffect(() => {
    if (columnPages.length <= 1) {
      setPagerMode("hidden");
      return;
    }
    if (!tableEl) return;
    if (typeof window === "undefined") return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = tableEl.getBoundingClientRect();
      const vh = window.innerHeight || 0;
      const vw = window.innerWidth || 0;

      const isVisible = rect.bottom > 0 && rect.top < vh;
      if (!isVisible) {
        setPagerMode("hidden");
        return;
      }

      const visibleLeft = Math.max(0, rect.left);
      const visibleRight = Math.min(vw, rect.right);
      const visibleWidth = Math.max(0, visibleRight - visibleLeft);
      setPagerFrame({ left: visibleLeft, width: visibleWidth });

      // Stick to the viewport while the table extends below the viewport,
      // then dock to the table bottom once you reach the end of the table.
      const dockThresholdPx = 12;
      const shouldDock = rect.bottom <= vh - dockThresholdPx;
      setPagerMode(shouldDock ? "docked" : "fixed");
    };

    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [columnPages.length, tableEl]);

  const Pager = () => (
    <>
      <Button
        aria-label="previous columns"
        size="icon"
        className={cn(
          "h-7 w-7 rounded-full border border-border/60",
          "bg-background/80 text-muted-foreground shadow-sm",
          "hover:bg-background focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
        onClick={handleBack}
        disabled={currentPage === 0}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="flex gap-1">
        {columnPages.map((_, i) => (
          <span
            key={`pager-${i}`}
            className={cn(
              "h-2 w-2 rounded-full transition-colors motion-reduce:transition-none",
              i === currentPage ? "bg-foreground/80" : "bg-foreground/25"
            )}
          />
        ))}
      </div>
      <Button
        aria-label="next columns"
        size="icon"
        className={cn(
          "h-7 w-7 rounded-full border border-border/60",
          "bg-background/80 text-muted-foreground shadow-sm",
          "hover:bg-background focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
        onClick={handleNext}
        disabled={currentPage === columnPages.length - 1}
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </>
  );

  const pagerShell = (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-2",
        "bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70",
        "border border-border/60 rounded-full px-2 py-1 shadow-md"
      )}
    >
      <Pager />
    </div>
  );

  return (
    <>
      {pagerMode === "fixed" && portalTarget
        ? createPortal(
            <div
              className="fixed z-20 flex justify-center pointer-events-none"
              style={{
                left: pagerFrame.left,
                width: pagerFrame.width,
                bottom: "calc(0.75rem + env(safe-area-inset-bottom))",
              }}
            >
              {pagerShell}
            </div>,
            portalTarget
          )
        : null}
      <div
        ref={assignTableRef}
        className={cn(
          "relative -mx-1 @min-md:mx-2 @min-2xl:mx-4",
          columnPages.length > 1 && "pb-16",
          "rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
        tabIndex={0}
        onKeyDown={(e) => {
          if (columnPages.length <= 1) return;
          if (e.key === "ArrowRight") {
            e.preventDefault();
            handleNext();
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            handleBack();
          }
        }}
      >
        {/* Toggle button for secondary/tertiary swells */}
        {/* <div className="flex justify-end mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSecondarySwells(!showSecondarySwells)}
          className="flex items-center gap-2"
        >
          {showSecondarySwells ? (
            <>
              <EyeOff size={16} />
              <span className="text-xs">Hide Secondary Swells</span>
            </>
          ) : (
            <>
              <Eye size={16} />
              <span className="text-xs">Show Secondary Swells</span>
            </>
          )}
        </Button>
      </div> */}
        {pagerMode === "docked" && columnPages.length > 1 ? (
          <div
            className="absolute inset-x-0 z-20 flex justify-center pointer-events-none"
            style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
          >
            {pagerShell}
          </div>
        ) : null}
        <div
          className={cn(
            "sticky z-20 -mx-1 @min-md:mx-0 rounded-b-[18px] px-1.5 py-1",
            headerBgClass,
            "supports-[backdrop-filter]:backdrop-blur-md"
          )}
          style={{ top: stickyHeaderTopPx }}
        >
          <table className="w-full table-fixed border-separate border-spacing-x-2 border-spacing-y-0 text-sm">
            <colgroup>
              <col className="w-12" />
              {visibleColumns.map((col) => (
                <col
                  key={col.id}
                  className={cn(
                    col.id === "surf" && "w-[clamp(5.25rem,10vw,5.75rem)]",
                    col.id === "wind" &&
                      showSecondarySwells &&
                      "@min-5xl:w-[11rem]",
                    col.id === "weather" || col.id === "water"
                      ? showSecondarySwells
                        ? "@min-[1175px]:w-[clamp(4.5rem,9vw,5.5rem)]"
                        : "@min-5xl:w-[clamp(4.5rem,9vw,5.5rem)]"
                      : "",
                    col.id === "energy"
                      ? showSecondarySwells
                        ? "@min-[1175px]:w-[clamp(4.75rem,9vw,5.5rem)]"
                        : "@min-5xl:w-[clamp(4.75rem,9vw,5.5rem)]"
                      : "",
                    col.id === "pressure"
                      ? showSecondarySwells
                        ? "@min-[1175px]:w-[clamp(5.25rem,10vw,6.75rem)]"
                        : "@min-5xl:w-[clamp(5.25rem,10vw,6.75rem)]"
                      : "",
                    col.id === "__spacer" && "w-[10rem]"
                  )}
                />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 w-12 pb-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Time</span>
                    </div>
                    <span
                      aria-hidden="true"
                      className="h-[2px] w-8 rounded-full bg-foreground/20"
                    />
                    <span className="sr-only">Time</span>
                  </div>
                </th>
                {visibleColumns.map((col) => {
                  const group = getMetricGroupForColumnId(col.id);
                  return (
                    <th
                      key={col.id}
                      scope="col"
                      className={cn(
                        "pb-1 text-center text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs"
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className={cn(!col.label && "sr-only")}>
                          {col.label || "Spacer"}
                        </span>
                        <span
                          aria-hidden="true"
                          className={cn(
                            "h-[2px] w-10 rounded-full",
                            groupAccentFillClass[group],
                            col.id === "__spacer" ? "opacity-0" : "opacity-60"
                          )}
                        />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
          </table>
        </div>

        <table
          className={cn(
            "w-full table-fixed border-separate border-spacing-x-2 border-spacing-y-1.5 text-sm",
            forecastPage && "-mt-5"
          )}
        >
          <colgroup>
            <col className="w-12" />
            {visibleColumns.map((col) => (
              <col
                key={col.id}
                className={cn(
                  col.id === "surf" && "w-[clamp(5.25rem,10vw,5.75rem)]",
                  col.id === "wind" &&
                    showSecondarySwells &&
                    "@min-5xl:w-[11rem]",
                  col.id === "weather" || col.id === "water"
                    ? showSecondarySwells
                      ? "@min-[1175px]:w-[clamp(4.5rem,9vw,5.5rem)]"
                      : "@min-5xl:w-[clamp(4.5rem,9vw,5.5rem)]"
                    : "",
                  col.id === "energy"
                    ? showSecondarySwells
                      ? "@min-[1175px]:w-[clamp(4.75rem,9vw,5.5rem)]"
                      : "@min-5xl:w-[clamp(4.75rem,9vw,5.5rem)]"
                    : "",
                  col.id === "pressure"
                    ? showSecondarySwells
                      ? "@min-[1175px]:w-[clamp(5.25rem,10vw,6.75rem)]"
                      : "@min-5xl:w-[clamp(5.25rem,10vw,6.75rem)]"
                    : "",
                  col.id === "__spacer" && "w-[10rem]"
                )}
              />
            ))}
          </colgroup>
          <thead className="sr-only">
            <tr>
              <th scope="col">Time</th>
              {visibleColumns.map((col) => (
                <th key={`sr-${col.id}`} scope="col">
                  {col.label || "Spacer"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && !visibleDays.length
              ? (() => {
                  const daysForSkeleton = Math.min(
                    windowSize,
                    Math.max(numDays, 1)
                  );
                  return Array.from({ length: daysForSkeleton }).map(
                    (_, dayIdx) => (
                      <React.Fragment key={`skeleton-day-${dayIdx}`}>
                        {header && (
                          <tr>
                            <td
                              colSpan={visibleColumns.length + 1}
                              className="p-0"
                            >
                              <div className="mx-1 my-4 relative overflow-hidden rounded-2xl border border-border/60 bg-foreground/[0.06] px-4 py-3 shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_30px_rgba(0,0,0,0.06)] dark:bg-foreground/[0.09] dark:shadow-[0_1px_0_rgba(0,0,0,0.35),0_12px_30px_rgba(0,0,0,0.35)]">
                                <div className="absolute inset-0 bg-gradient-to-r from-foreground/[0.06] via-transparent to-foreground/[0.02] dark:from-foreground/[0.09] dark:to-foreground/[0.04]" />
                                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent dark:via-foreground/25" />
                                <div className="relative flex items-center gap-3">
                                  <div className="h-8 w-8 shrink-0 rounded-full bg-foreground/10 animate-pulse motion-reduce:animate-none" />
                                  <div className="min-w-0 flex-1">
                                    <div className="h-3 w-44 max-w-full rounded bg-foreground/10 animate-pulse motion-reduce:animate-none" />
                                    <div className="mt-2 h-[2px] w-20 rounded-full bg-foreground/10 animate-pulse motion-reduce:animate-none" />
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        {Array.from({ length: numHours }).map((_, rowIdx) => (
                          <tr
                            key={`skeleton-row-${dayIdx}-${rowIdx}`}
                            className="transition-colors"
                          >
                            <th
                              scope="row"
                              className="sticky left-0 z-10 p-0 align-middle bg-background/90 supports-[backdrop-filter]:bg-background/50 supports-[backdrop-filter]:backdrop-blur border-r border-border/40 dark:border-border/50"
                            >
                              <div className="h-14 w-12 rounded-xl border border-border/25 bg-foreground/[0.03] dark:bg-foreground/[0.05] animate-pulse motion-reduce:animate-none" />
                            </th>
                            {visibleColumns.map((col) => (
                              <td
                                key={`skeleton-${col.id}-${dayIdx}-${rowIdx}`}
                                className="p-0 align-middle"
                              >
                                <div className="h-14 w-full rounded-lg border border-border/25 bg-foreground/[0.03] dark:bg-foreground/[0.05] animate-pulse motion-reduce:animate-none" />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </React.Fragment>
                    )
                  );
                })()
              : visibleDays.map((day, i) => {
                  const content = day.vals.flatMap((entry, rowIdx) => {
                    let isSelectedHour = false;
                    // Determine selection per page context
                    if (forecastPage) {
                      // Highlight only within the selected day and matching interval bucket
                      const sel = selected instanceof Date ? selected : null;
                      const sameDay = sel
                        ? new Date(
                            sel.getFullYear(),
                            sel.getMonth(),
                            sel.getDate()
                          ).getTime() === day.dateMs
                        : false;
                      if (sameDay) {
                        const hours = day.vals
                          .map((v) => v.index)
                          .sort((a, b) => a - b);
                        // pick the last hour <= selected hour, otherwise first
                        const effectiveHour = dashboardBusy
                          ? stableSelectedHour ?? selectedHour ?? null
                          : selectedHour ?? null;
                        if (effectiveHour != null) {
                          let bucket = hours[0];
                          for (const h of hours) {
                            if (h <= effectiveHour) bucket = h;
                          }
                          isSelectedHour = entry.index === bucket;
                        }
                      }
                    } else {
                      // Overview behavior: exact hour match
                      isSelectedHour = entry.index === selectedHour;
                    }
                    const row = (
                      <tr
                        key={`${i}-${entry.index}`}
                        className="transition-colors duration-200 motion-reduce:duration-0"
                      >
                        <th
                          scope="row"
                          className="sticky left-0 z-10 p-0 align-middle bg-background/90 supports-[backdrop-filter]:bg-background/50 supports-[backdrop-filter]:backdrop-blur"
                        >
                          <TimeCell
                            time={entry.time}
                            selected={isSelectedHour}
                          />
                        </th>
                        {visibleColumns.map((col) => {
                          let content: React.ReactNode = null;
                          switch (col.id) {
                            case "__spacer":
                              content = (
                                <CellSurface className="bg-transparent dark:bg-transparent border-border/20">
                                  <span
                                    aria-hidden="true"
                                    className="h-2 w-10 rounded-full bg-foreground/10"
                                  />
                                </CellSurface>
                              );
                              break;
                            case "wind":
                              content = (
                                <WindStat
                                  data={entry.wind}
                                  scaleMax={WIND_SCALE_MAX_MPH}
                                />
                              );
                              break;
                            case "weather":
                              content = <WeatherStat data={entry.weather} />;
                              break;
                            case "surf":
                              content = (
                                <SurfStat
                                  range={entry.surf.height}
                                  maxFt={parseSurfMaxFt(entry.surf.height)}
                                  scaleMax={SURF_SCALE_MAX_FT}
                                />
                              );
                              break;
                            case "swellPrimary":
                              content = (
                                <SwellStat primary data={entry.swell.primary} />
                              );
                              break;
                            case "swellSecondary": {
                              const s0 = entry.swell.secondary[0];
                              content = <SwellStat data={s0} />;
                              break;
                            }
                            case "swellTertiary": {
                              const s1 = entry.swell.secondary[1];
                              content = <SwellStat data={s1} />;
                              break;
                            }
                            case "pressure":
                              content = (
                                <PressureStat
                                  value={entry.pressure.value}
                                  min={barScales.pressureMin}
                                  max={barScales.pressureMax}
                                  prev={
                                    rowIdx > 0
                                      ? day.vals[rowIdx - 1]?.pressure.value ??
                                        null
                                      : null
                                  }
                                />
                              );
                              break;
                            case "water":
                              content = (
                                <WeatherStat
                                  water={entry.water.temp}
                                  waterMin={barScales.waterMin}
                                  waterMax={barScales.waterMax}
                                />
                              );
                              break;
                            case "energy":
                              content = (
                                <EnergyStat
                                  value={entry.energy.value}
                                  scaleMax={barScales.energyMax}
                                />
                              );
                              break;
                          }
                          return (
                            <td
                              key={`${col.id}-${entry.index}`}
                              className="p-0 align-middle"
                            >
                              <div
                                className={cn(
                                  "rounded-lg",
                                  isSelectedHour &&
                                    "ring-2 ring-sky-500/30 shadow-sm dark:ring-sky-400/25 dark:shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
                                )}
                              >
                                {content}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );

                    const divider =
                      rowIdx === day.vals.length - 1 ? null : (
                        <tr
                          key={`${i}-${entry.index}-divider`}
                          aria-hidden="true"
                          className="h-2"
                        >
                          <td
                            colSpan={visibleColumns.length + 1}
                            className="p-0"
                          >
                            <div className="mx-2 h-px bg-foreground/10 dark:bg-foreground/15" />
                          </td>
                        </tr>
                      );

                    return [row, divider].filter(Boolean);
                  });
                  return (
                    <React.Fragment key={i}>
                      {header && (
                        <tr key={`${i}-date`}>
                          <td
                            colSpan={visibleColumns.length + 1}
                            className="p-0"
                          >
                            <div className="mx-1 my-4 relative overflow-hidden rounded-2xl border border-border/60 bg-foreground/[0.06] px-4 py-3 shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_30px_rgba(0,0,0,0.06)] dark:bg-foreground/[0.09] dark:shadow-[0_1px_0_rgba(0,0,0,0.35),0_12px_30px_rgba(0,0,0,0.35)]">
                              <div className="absolute inset-0 bg-gradient-to-r from-foreground/[0.06] via-transparent to-foreground/[0.02] dark:from-foreground/[0.09] dark:to-foreground/[0.04]" />
                              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent dark:via-foreground/25" />
                              <div className="relative flex items-center gap-3">
                                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/70 shadow-sm dark:bg-background/30">
                                  <CalendarDays
                                    aria-hidden="true"
                                    className="h-4 w-4 text-muted-foreground"
                                  />
                                </span>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold tracking-tight">
                                    {day.date}
                                  </div>
                                  <div className="mt-1 h-[2px] w-16 rounded-full bg-foreground/15" />
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {content}
                    </React.Fragment>
                  );
                })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default StatTable;
