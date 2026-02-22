"use client";

import React from "react";
import { flushSync } from "react-dom";
import { cn, getPacificDayRange } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useOptionalDashboardEditMode } from "../context/DashboardEditModeContext";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  ArrowLeft,
  ArrowRight,
  MousePointer2 as ArrowIcon,
  Clock3,
  ArrowUp,
  ArrowDown,
  Minus,
  CalendarDays,
  ChevronDown,
  Sun,
  MoonStar,
  Cloud as CloudIcon,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Snowflake,
  Droplets,
  ClockFading,
  LayoutGrid,
  SlidersHorizontal,
  Eye,
  EyeOff,
} from "lucide-react";
import MixedCloudSunIcon from "@/components/icons/MixedCloudSunIcon";

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
import { useOptionalOverviewChartLoading } from "../context/OverviewChartsLoadingContext";
import { useMapUI } from "../context/MapFilterContext";
import {
  useSessionContext,
  useSupabaseClient,
} from "@supabase/auth-helpers-react";

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
  const match = range.match(/(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?/);
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
          "bg-background dark:bg-foreground shadow-md ring-1 ring-foreground/40 dark:ring-background/55",
          "outline outline-2 outline-foreground/15 dark:outline-background/80",
          markerClassName,
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
        "mx-auto w-full rounded-lg bg-foreground/[0.03] dark:bg-foreground/[0.05]",
        "shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:shadow-[0_1px_0_rgba(0,0,0,0.35)]",
        "h-14 min-h-14 px-2.5 py-1.5 flex items-center justify-center",
        className,
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
          "ring-2 dark:ring-[3.5px] ring-sky-500/35 shadow-sm dark:ring-sky-400/30 dark:shadow-[0_8px_16px_rgba(0,0,0,0.35)]",
      )}
    >
      <div className="relative h-14 w-12 overflow-hidden rounded-xl bg-foreground/[0.07] dark:bg-foreground/[0.09]">
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-foreground/30 via-foreground/10 to-transparent dark:from-foreground/30 dark:via-foreground/10" />
        <div
          className={cn(
            "absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full",
            selected
              ? "bg-sky-500/60 ring-1 ring-sky-500/30 dark:bg-sky-400/55 dark:ring-sky-400/25"
              : "bg-foreground/20",
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
  showMap,
  showDegrees = false,
  labelVisibilityClassName,
  variant,
  showSecondarySwells,
  layout = "inline",
  widthClassName,
  className,
}: {
  deg?: number | null;
  label?: string | null;
  showMap?: boolean;
  showDegrees?: boolean;
  labelVisibilityClassName?: string;
  showSecondarySwells: boolean;
  layout?: "inline" | "grid";
  widthClassName?: string;
  className?: string;
  variant?: string;
}) {
  const rotation = typeof deg === "number" ? deg - 315 : 0;
  const safeLabel = label ?? "-";
  const degreesText = showDegrees
    ? typeof deg === "number" && Number.isFinite(deg)
      ? `${Math.round(deg)}\u00B0`
      : `--\u00B0`
    : null;
  return (
    <span
      className={cn(
        layout === "grid"
          ? "grid grid-cols-[0.9rem_1fr_1.5rem] items-center gap-x-1.5"
          : "inline-flex items-center gap-1",
        "h-[23px] rounded-full border border-border/40 bg-foreground/[0.03] px-1 mb-0.5 @min-sm:mb-0 @min-sm:px-1.5 py-0.5",
        widthClassName,
        className,
      )}
    >
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
      <span
        className={cn(
          labelVisibilityClassName,
          "text-[0.55rem] @min-sm:text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5 inline-block @min-[412px]:hidden @min-lg:inline-block",
          layout === "grid" && "justify-self-center",
          !showMap &&
            variant === "half" &&
            "@min-4xl:hidden @min-5xl:inline-block",
          showMap &&
            variant === "half" &&
            "@min-4xl:hidden @min-6xl:inline-block",
          // !showMap &&
          //   !showSecondarySwells &&
          //   "@min-5xl:hidden @min-6xl:inline-block"
          // (showMap || (!showMap && !showSecondarySwells)) &&
          //   "@min-4xl:hidden @min-5xl:inline-block"
          // !showMap &&
          //   showSecondarySwells &&
          //   "@min-[1217.5px]:hidden @min-[1235px]:inline-block"
        )}
      >
        {safeLabel}
      </span>
      {degreesText && (
        <span
          className={cn(
            "text-[0.65rem] font-semibold tabular-nums text-muted-foreground",
            layout === "grid" && "justify-self-end",
          )}
        >
          {degreesText}
        </span>
      )}
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
            i < filled ? fillClassName : "bg-foreground/10",
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
            i >= 3 && "h-2.5",
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
  showMap,
  showSecondarySwells,
  variant,
}: {
  primary?: boolean;
  showMap: boolean;
  data?: {
    height?: number | string | null;
    period?: number | null;
    dir?: string | null;
    deg?: number | null;
  } | null;
  showSecondarySwells: boolean;
  variant?: string;
}) => {
  const height = data?.height ?? "-";
  const period = data?.period ?? "-";
  const dir = data?.dir ?? "-";
  const deg = data?.deg ?? null;
  const degreesText =
    typeof deg === "number" && Number.isFinite(deg)
      ? `${Math.round(deg)}\u00B0`
      : `--\u00B0`;
  const periodNumber = typeof data?.period === "number" ? data.period : null;
  const swellHeightValue = (() => {
    const value = data?.height;
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  })();

  // return (
  //   <CellSurface
  //     className={cn(
  //       primary ? "bg-foreground/[0.04] dark:bg-foreground/[0.06]" : undefined
  //     )}
  //   >
  //     <div
  //       className={cn(
  //         "grid w-fit min-w-0 grid-cols-[2.75rem_2.6rem_6.75rem] @min-md:grid-cols-[3.25rem_3rem_6.75rem] items-center justify-items-center gap-x-2",
  //         primary ? "gap-x-2.5" : undefined
  //       )}
  //     >
  //       <span className="inline-flex items-baseline justify-center gap-0.5 whitespace-nowrap tabular-nums">
  //         <span
  //           className={cn(
  //             "font-semibold tabular-nums tracking-tight leading-none",
  //             primary ? "text-[0.95rem]" : "text-[0.9rem]"
  //           )}
  //         >
  //           {height}
  //         </span>
  //         <span className="text-[0.65rem] font-medium text-muted-foreground">
  //           ft
  //         </span>
  //       </span>

  //       <span className="inline-flex items-baseline justify-center gap-0.5 whitespace-nowrap tabular-nums">
  //         <span
  //           className={cn(
  //             "font-semibold tabular-nums tracking-tight leading-none",
  //             primary ? "text-[0.95rem]" : "text-[0.9rem]"
  //           )}
  //         >
  //           {period}
  //         </span>
  //         <span className="text-[0.65rem] font-medium text-muted-foreground">
  //           s
  //         </span>
  //       </span>

  //       <DirectionBadge
  //         deg={deg}
  //         label={dir}
  //         showMap={showMap}
  //         showDegrees
  //         layout="grid"
  //         widthClassName="w-[6rem]"
  //         labelVisibilityClassName="inline-block"
  //       />
  //     </div>
  //   </CellSurface>
  // );

  return (
    <CellSurface
      className={cn(
        primary ? "bg-foreground/[0.04] dark:bg-foreground/[0.06]" : undefined,
      )}
    >
      <div className="w-full">
        <div className="flex h-full items-center justify-between gap-2 min-w-0">
          <div className="flex min-w-0 flex-col items-start gap-0.5">
            <div className="flex items-baseline gap-1 whitespace-nowrap">
              <span
                className={cn(
                  "tabular-nums leading-none",
                  primary
                    ? "text-[0.9rem] @min-sm:text-[1rem] font-semibold"
                    : "text-[0.9rem] @min-sm:text-[1rem] font-semibold",
                )}
              >
                {height}
              </span>
              <span className="text-[0.65rem] text-muted-foreground">ft</span>
            </div>
            <div className="flex items-center gap-1 whitespace-nowrap text-muted-foreground -mb-0.5">
              <ClockFading
                aria-hidden="true"
                className="hidden @min-xs:block h-3.5 w-3.5 shrink-0 text-muted-foreground/80"
              />
              <span
                className={cn(
                  "tabular-nums leading-none",
                  primary ? "text-sm font-semibold" : "text-sm font-semibold",
                )}
              >
                {period}
                <span className="text-[0.65rem] text-muted-foreground ml-0.5">
                  s
                </span>
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end justify-center gap-1">
            <DirectionBadge
              deg={deg}
              label={dir}
              showMap={showMap}
              showSecondarySwells={showSecondarySwells}
              variant={variant}
            />
            {/* <div className="pr-1">
              <PeriodTicks period={periodNumber} />
            </div> */}
            {/* <div className="pr-1 w-16">
              <MiniMarkerTrack
                value={swellHeightValue}
                min={0}
                max={SURF_SCALE_MAX_FT}
                trackClassName={statusGradientTrackClass}
              />
            </div> */}
            <span
              className={cn(
                "pr-1 text-[0.7rem] font-semibold tabular-nums text-muted-foreground",
              )}
            >
              {degreesText}
            </span>
          </div>
        </div>
      </div>
    </CellSurface>
  );
};

const WindStat = ({
  data,
  scaleMax = 30,
  showSecondarySwells,
  variant,
  showMap,
}: {
  data: { dir: string; speed: number; max: number; deg?: number };
  scaleMax?: number;
  showSecondarySwells: boolean;
  variant?: string;
  showMap?: boolean;
}) => {
  return (
    <CellSurface>
      <div className="w-full">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <DirectionBadge
            deg={data.deg}
            label={data.dir}
            className="-mt-0.5"
            showMap={showMap}
            showSecondarySwells={showSecondarySwells}
            variant={variant}
          />

          <div className="flex min-w-0 flex-col items-end leading-none">
            <div className="inline-flex items-baseline gap-1">
              <span className="inline-flex w-[3ch] justify-end text-[1rem] font-semibold tabular-nums leading-none">
                {data.speed}
              </span>
              <span className="text-[0.65rem] text-muted-foreground">mph</span>
            </div>
            <div className="mt-0.5 inline-flex items-center gap-1 text-muted-foreground">
              <ArrowUp
                aria-hidden="true"
                className="h-3 w-3 shrink-0 text-muted-foreground/80 mb-0.5"
              />
              <span className="inline-flex w-[1.4ch] justify-end text-[0.7rem] font-medium tabular-nums">
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
  isNight = false,
}: {
  data?: { condition?: string; temp: number; code?: number | null };
  water?: number;
  waterMin?: number;
  waterMax?: number;
  isNight?: boolean;
}) => {
  // Function to get weather icon based on WMO code
  const getWeatherIcon = (code: number | null) => {
    if (isNight && (code == null || code === 0)) {
      return (
        <MoonStar
          className="w-4 h-4 text-violet-400 dark:text-violet-300"
          strokeWidth={1.5}
        />
      );
    }
    if (isNight && [1, 2].includes(code ?? -1)) {
      return (
        <MoonStar
          className="w-4 h-4 text-violet-400 dark:text-violet-300"
          strokeWidth={1.5}
        />
      );
    }
    if (code == null)
      return <Sun className="w-4 h-4" strokeWidth={2.5} color="#f79e55ff" />;

    // WMO code groupings
    if (code === 0)
      return <Sun className="w-4 h-4" strokeWidth={2.5} color="#f79e55ff" />; // Clear
    if ([1, 2].includes(code)) return <MixedCloudSunIcon className="h-4 w-4" />; // Partly cloudy
    if (code === 3) return <CloudIcon className="w-4 h-4" color="#bdbdbdff" />; // Overcast
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
  const rangeLabel = React.useMemo(() => {
    const raw = (range ?? "").trim();
    if (!raw || raw === "-" || raw === "—") return raw;
    return raw.replace(/\s*ft\.?\s*$/i, "").trim();
  }, [range]);

  return (
    <CellSurface className="px-2">
      <div className="w-full h-full flex flex-col justify-end gap-3 -mt-[3px]">
        <div className="flex items-baseline justify-start gap-1 whitespace-nowrap">
          <span className="text-[1.05rem] font-semibold tabular-nums leading-none">
            {rangeLabel}
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
        <div className="flex items-center justify-center gap-2 mb-1">
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
  showMap,
}: {
  value: number;
  min: number;
  max: number;
  prev: number | null;
  showMap: boolean;
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
      <div
        className={cn(
          "flex w-full items-center justify-center @min-xl:justify-between @min-4xl:justify-center gap-2",
          showMap ? "@min-5xl:justify-between" : "@min-6xl:justify-between",
        )}
      >
        <div className="flex min-w-0 flex-col items-start mt-1">
          <div className="flex items-baseline gap-1 whitespace-nowrap">
            <span className="text-[0.9rem] @min-lg:text-[1rem] font-semibold tabular-nums leading-none">
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
              trendClass,
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
          className={cn(
            "hidden @min-xl:block @min-4xl:hidden",
            showMap ? "@min-5xl:block" : "@min-6xl:block",
          )}
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
  missing?: boolean;
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

const PACIFIC_DAY_KEY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const PACIFIC_COMPACT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  weekday: "short",
  month: "short",
  day: "numeric",
});

const PACIFIC_PILL_WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  weekday: "short",
});

const PACIFIC_PILL_MONTHDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  month: "short",
  day: "numeric",
});

function getPacificDayKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = PACIFIC_DAY_KEY_FORMATTER.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

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

export type StatTableDensity = "3h" | "12h";

const THREE_HOUR_TARGET_HOURS = [0, 3, 6, 9, 12, 15, 18, 21] as const;
const TWELVE_HOUR_TARGET_HOURS = [0, 12, 21] as const;

function pickClosestBucket(hours: number[], targetHour: number): number | null {
  if (hours.length === 0) return null;
  let bestHour = hours[0];
  let bestDiff = Math.abs(hours[0] - targetHour);
  for (let i = 1; i < hours.length; i++) {
    const diff = Math.abs(hours[i] - targetHour);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestHour = hours[i];
    }
  }
  return bestHour;
}

function pickLastNotAfter(hours: number[], targetHour: number): number | null {
  if (hours.length === 0) return null;
  let bestHour = hours[0];
  for (const hour of hours) {
    if (hour <= targetHour) bestHour = hour;
  }
  return bestHour;
}

function formatHourLabel(hour24: number): string {
  const normalized = ((hour24 % 24) + 24) % 24;
  const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
  const ampm = normalized >= 12 ? "PM" : "AM";
  return `${displayHour} ${ampm}`;
}

function buildMissingEntry(hour24: number): TableEntry {
  return {
    index: hour24,
    time: formatHourLabel(hour24),
    missing: true,
    wind: { label: "wind", dir: "-", speed: 0, max: 0, deg: 0 },
    surf: { label: "surf", height: "—" },
    swell: {
      label: "swell",
      primary: { height: 0, period: 0, dir: "-", deg: 0 },
      secondary: [],
    },
    pressure: { label: "pressure", value: 0 },
    weather: { label: "weather", condition: "clear", temp: 0, code: null },
    water: { label: "water", temp: 0 },
    energy: { label: "energy", value: 0 },
  };
}

const COLUMN_PRIORITY: Record<string, number> = {
  surf: 1,
  wind: 2,
  swellPrimary: 3,
  weather: 4,
  water: 5,
  energy: 6,
  pressure: 7,
  swellSecondary: 8,
  swellTertiary: 9,
};

function getHalfColumnsPerPage(widthPx: number): number {
  if (!Number.isFinite(widthPx) || widthPx <= 0) return 3;

  // Half-width widgets get cramped fast; prefer fewer columns per page and rely
  // on the pager rather than squeezing content.
  const TIME_COL_PX = 48; // Tailwind `w-12`
  const MIN_DATA_COL_PX = 140;
  const available = Math.max(0, widthPx - TIME_COL_PX);
  const fit = Math.floor(available / MIN_DATA_COL_PX);
  return Math.max(2, Math.min(4, fit || 2));
}

function buildHalfColumnPages(
  columns: Array<{ id: string; label: string }>,
  widthPx: number,
) {
  const perPage = getHalfColumnsPerPage(widthPx);
  const ordered = columns
    .slice()
    .sort(
      (a, b) => (COLUMN_PRIORITY[a.id] ?? 999) - (COLUMN_PRIORITY[b.id] ?? 999),
    );

  const pages: Array<Array<{ id: string; label: string }>> = [];
  for (let i = 0; i < ordered.length; i += perPage) {
    pages.push(ordered.slice(i, i + perPage));
  }
  return pages.length ? pages : [ordered];
}

export type StatTableVariant = "full" | "half";

export type StatTableUiState = {
  canToggleDensity: boolean;
  effectiveDensity: StatTableDensity;
  isHalfColumns: boolean;
};

const StatTable = ({
  numDays,
  numHours,
  header = false,
  beachId,
  date,
  variant = "full",
  density,
  initialForecastViewMode = null,
  onToggleDensity,
  onUiStateChange,
}: {
  numDays: number;
  numHours: number;
  header?: boolean;
  beachId?: string;
  date?: Date;
  variant?: StatTableVariant;
  density?: StatTableDensity;
  initialForecastViewMode?: "all" | "single" | null;
  onToggleDensity?: () => void;
  onUiStateChange?: (state: StatTableUiState) => void;
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
    setShowSecondarySwells,
  } = useDateContext();
  const { selectedTab } = useClientPath();
  const { showMap } = useMapUI();
  const forecastPage = selectedTab === "forecast";
  const pathname = usePathname();
  const dashboardEditMode = useOptionalDashboardEditMode();
  const isEditing =
    (dashboardEditMode?.isEditing ?? false) || pathname.endsWith("/edit");
  const headerBgClass =
    "bg-[var(--widget-header-surface,var(--widget-surface,var(--highlight-4)))]";
  const { rows: sharedRows } = useForecastData();
  const { setReady } = useOptionalForecastChartLoading("forecast-table");
  const { setReady: setOverviewReady } =
    useOptionalOverviewChartLoading("overview-table");
  const dashboardBusy = useOptionalForecastChartsBusyState();
  const [stableSelectedHour, setStableSelectedHour] = React.useState<
    number | null
  >(null);
  const wasBusyRef = React.useRef(dashboardBusy);

  // Forecast dashboard readiness reporting for the table
  React.useEffect(() => {
    if (!forecastPage) return;
    setReady(!loading);
  }, [forecastPage, loading, setReady]);

  React.useEffect(() => {
    if (forecastPage) return;
    setOverviewReady(!loading);
  }, [forecastPage, loading, setOverviewReady]);

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
    [date],
  );

  // Memoize date range calculation to prevent unnecessary recalculations
  const dateRange = React.useMemo(() => {
    if (!beachId) return null;

    const anchor = requestedDate ?? new Date();
    const { start: anchorStart } = getPacificDayRange(anchor);
    const bufferBefore = requestedDate ? 1 : 0;
    const bufferAfter = requestedDate ? 1 : 0;

    const normalizedSelectedDays = Array.isArray(selectedDays)
      ? selectedDays
          .filter((d): d is Date => isValidDate(d))
          .slice()
          .sort((a, b) => a.getTime() - b.getTime())
      : [];
    const hasSelectedDays = normalizedSelectedDays.length > 0;
    const rangeStart =
      requestedDate && !forecastPage
        ? new Date(anchorStart.getTime() - bufferBefore * DAY_MS)
        : hasSelectedDays
          ? normalizedSelectedDays[0]
          : new Date(anchorStart.getTime() - bufferBefore * DAY_MS);

    const daysToFetch = Math.max(numDays, 1) + bufferAfter;
    const rangeEnd =
      requestedDate && !forecastPage
        ? new Date(anchorStart.getTime() + daysToFetch * DAY_MS)
        : hasSelectedDays
          ? new Date(
              normalizedSelectedDays[
                normalizedSelectedDays.length - 1
              ].getTime() +
                bufferAfter * DAY_MS,
            )
          : new Date(anchorStart.getTime() + daysToFetch * DAY_MS);

    return { rangeStart, rangeEnd };
  }, [beachId, requestedDate, selectedDays, forecastPage, numDays]);

  React.useEffect(() => {
    let cancelled = false;
    let retryTimer: number | null = null;
    let attempts = 0;

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
                  new Date(b.timestamp).getTime(),
              ) ?? [];
          if (!filtered.length) {
            return [];
          }
          const firstTs = new Date(filtered[0].timestamp).getTime();
          const lastTs = new Date(
            filtered[filtered.length - 1].timestamp,
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
        } else if (
          cached &&
          cached.data.length > 0 &&
          now - cached.timestamp < CACHE_DURATION
        ) {
          weekly = cached.data;
        } else {
          weekly = await getForecastCached(
            String(resolvedId),
            rangeStart,
            rangeEnd,
          );

          // Update cache
          // Avoid caching empty datasets; they can be transient and cause a "stuck empty table"
          // until a full page reload clears module-level state.
          if (weekly.length > 0) {
            forecastCache.set(cacheKey, { data: weekly, timestamp: now });
          }

          // Clean up old cache entries
          if (forecastCache.size > 10) {
            const keys = Array.from(forecastCache.keys());
            forecastCache.delete(keys[0]);
          }
        }

        if (cancelled) {
          return;
        }

        // Empty datasets can occur transiently during UI transitions (e.g. after editing the dashboard).
        // Retry once shortly to avoid rendering a blank table that only resolves on reload.
        if (
          weekly.length === 0 &&
          attempts < 1 &&
          typeof window !== "undefined"
        ) {
          attempts += 1;
          retryTimer = window.setTimeout(() => {
            if (cancelled) return;
            void load();
          }, 450);
          return;
        }

        // Group by date using Pacific timezone (matches chart processing)
        const byDay = new Map<string, ForecastData[]>();

        const fmtDayLabel = (d: Date) =>
          d.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          });

        weekly.forEach((row) => {
          const dayKey = getPacificDayKey(row.timestamp);
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
            ? getPacificDayKey(requestedDate.toISOString())
            : null;
        const onlyKeys =
          Array.isArray(selectedDays) && selectedDays.length > 0
            ? selectedDays
                .filter((d): d is Date => isValidDate(d))
                .slice()
                .sort((a, b) => a.getTime() - b.getTime())
                .map((day) => getPacificDayKey(day.toISOString()))
            : null;
        let allowedKeys: Set<string> | null = null;
        const dayKeys = entriesByDay.map(([key]) => key);

        // Prioritize the explicit `date` prop (overview) over `selectedDays` (forecast).
        // `selectedDays` can remain populated from the forecast tab and would otherwise
        // filter out the requested overview day, resulting in an empty table until refresh.
        if (onlyKey) {
          if (dayKeys.includes(onlyKey)) {
            allowedKeys = new Set([onlyKey]);
          } else if (requestedDate) {
            const prev = getPacificDayKey(
              new Date(requestedDate.getTime() - DAY_MS).toISOString(),
            );
            const next = getPacificDayKey(
              new Date(requestedDate.getTime() + DAY_MS).toISOString(),
            );
            const cands = [prev, next].filter((k) => dayKeys.includes(k));
            if (cands.length) allowedKeys = new Set([cands[0]]);
          }
        } else if (forecastPage && onlyKeys && onlyKeys.length > 0) {
          allowedKeys = new Set(onlyKeys);
        }

        for (const [dayKey, rows] of entriesByDay) {
          if (allowedKeys && !allowedKeys.has(dayKey)) continue;
          rows.sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          );

          // Use the EXACT same hour calculation as charts - local browser hours
          // This matches SwellChart.tsx line 107: new Date(r.timestamp).getHours()
          const getLocalHour = (timestamp: string): number => {
            return new Date(timestamp).getHours();
          };

          const makeEntryFromRow = (r: ForecastData): TableEntry => {
            // Use the ACTUAL hour from the data, not the target hour
            const actualHour = getLocalHour(r.timestamp);
            const displayHour = actualHour % 12 === 0 ? 12 : actualHour % 12;
            const ampm = actualHour >= 12 ? "PM" : "AM";

            const windDir = getWindDirection(r.conditions.windDirection ?? 0);
            const windDeg = Math.round(r.conditions.windDirection ?? 0);
            const windSpeed = Math.round(r.conditions.windSpeed ?? 0);
            const windGust = Math.round(r.conditions.windGust ?? windSpeed);

            // Match SurfChart representative surf calculation exactly so table and chart align.
            const h1 = r.swell.primary.height ?? 0;
            const p1 = r.swell.primary.period ?? 10;
            const h2 = r.swell.secondary.height ?? 0;
            const p2 = r.swell.secondary.period ?? 10;
            const h3 = r.swell.tertiary?.height ?? 0;
            const p3 = r.swell.tertiary?.period ?? 10;
            const s1 = h1 * Math.sqrt(Math.max(0, p1) / 10);
            const s2 = h2 * Math.sqrt(Math.max(0, p2) / 10);
            const s3 = h3 * Math.sqrt(Math.max(0, p3) / 10);
            const w1 = 1.0;
            const w2 = 0.6;
            const w3 = 0.3;
            const combined = Math.sqrt(
              Math.pow(w1 * s1, 2) + Math.pow(w2 * s2, 2) + Math.pow(w3 * s3, 2),
            );
            const wind = r.conditions.windSpeed ?? 0;
            const windPenalty = Math.min(0.5, Math.max(0, (wind - 5) / 35));
            const effective = Math.max(0, combined * (1 - windPenalty));

            const min = r.surf.heightMin;
            const max = r.surf.heightMax;
            const estimate =
              min != null && max != null
                ? (min + max) / 2
                : max != null
                  ? max
                  : min != null
                    ? min
                    : 0;
            const representative =
              effective > 0 && estimate > 0
                ? effective * 0.7 + estimate * 0.3
                : effective > 0
                  ? effective
                  : estimate;
            const surfHeight = (() => {
              if (!(representative > 0)) return "-";
              const low = Math.max(0, Math.floor(representative));
              const high = Math.max(low + 1, Math.ceil(representative));
              return `${low}-${high} ft`;
            })();

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

          const entriesByHour = new Map<number, TableEntry>();
          for (const r of rows) {
            const entry = makeEntryFromRow(r);
            if (!entriesByHour.has(entry.index)) {
              entriesByHour.set(entry.index, entry);
            }
          }
          const entries: TableEntry[] = Array.from(entriesByHour.values()).sort(
            (a, b) => a.index - b.index,
          );

          const firstTs = rows[0]?.timestamp ?? new Date().toISOString();
          const d0 = new Date(firstTs);
          const midnight = new Date(
            d0.getFullYear(),
            d0.getMonth(),
            d0.getDate(),
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
          if (process.env.NODE_ENV !== "production") {
            console.error("Failed to load StatTable data", e);
          }
          if (attempts < 1 && typeof window !== "undefined") {
            attempts += 1;
            retryTimer = window.setTimeout(() => {
              if (cancelled) return;
              void load();
            }, 600);
            return;
          }
          setLoading(false);
        }
      }
    };
    void load();

    return () => {
      cancelled = true;
      if (retryTimer != null && typeof window !== "undefined") {
        window.clearTimeout(retryTimer);
      }
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
      (col) => col.id !== "swellSecondary" && col.id !== "swellTertiary",
    );
  }, [showSecondarySwells]);

  const isHalfWidget = variant === "half";
  type ForecastViewMode = "all" | "single";
  const skipForecastViewModePersistRef = React.useRef(true);
  const supabase = useSupabaseClient();
  const { session, isLoading: sessionLoading } = useSessionContext();
  const [forecastViewMode, setForecastViewMode] =
    React.useState<ForecastViewMode>(() =>
      initialForecastViewMode ?? (variant === "half" ? "single" : "all"),
    );

  const [columnPages, setColumnPages] = React.useState([TABLE_COLUMNS]);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [tableWidthPx, setTableWidthPx] = React.useState(0);
  const [effectiveColumnsVariant, setEffectiveColumnsVariant] =
    React.useState<StatTableVariant>(variant);
  const effectiveColumnsVariantRef = React.useRef<StatTableVariant>(variant);

  const tableRef = React.useRef<HTMLDivElement | null>(null);
  const assignTableRef = React.useCallback((node: HTMLDivElement | null) => {
    tableRef.current = node;
  }, []);

  const headerWrapRef = React.useRef<HTMLDivElement | null>(null);
  const headerStickyRef = React.useRef<HTMLDivElement | null>(null);
  const pagerWrapRef = React.useRef<HTMLDivElement | null>(null);

  const resizeRafRef = React.useRef<number | null>(null);
  const measuredWidthRef = React.useRef<number>(0);
  const TABLE_BREAKPOINT_SM = 400;
  const TABLE_BREAKPOINT_MD = 600;
  const TABLE_BREAKPOINT_LG = 900;
  const TABLE_BREAKPOINT_XL = 1150;
  const widthNow = React.useRef<number>(0);

  React.useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const computeColumnsVariant = (): StatTableVariant => {
      if (variant !== "half") return "full";

      // When the table is being interacted with in the dashboard editor (drag handle press / drag),
      // force the compact half-columns view even if the layout is currently stacked/full-width.
      // This avoids a visible "switch" after the drag starts and matches the editor behavior on
      // both 1-up and 2-up layouts.
      const forceHalfWhileEditing = Boolean(
        table.closest(
          "[data-ww-dashboard-edit-card][data-ww-dashboard-dragging], [data-ww-dashboard-edit-card][data-ww-dashboard-activating]",
        ),
      );
      if (forceHalfWhileEditing) return "half";

      const figure = table.closest("figure") as HTMLElement | null;
      const row =
        (table.closest("[data-ww-dashboard-row]") as HTMLElement | null) ??
        (figure?.parentElement as HTMLElement | null);

      const isHalfStacked = (() => {
        if (!row) return null;
        const style = window.getComputedStyle(row);
        if (!style || style.display !== "flex") return null;
        return (
          style.flexDirection === "column" ||
          style.flexDirection === "column-reverse"
        );
      })();

      if (isHalfStacked === true) return "full";
      if (!row || !figure) return "half";

      const rowRect = row.getBoundingClientRect();
      const figureRect = figure.getBoundingClientRect();
      if (rowRect.width <= 0 || figureRect.width <= 0) return "half";

      const widthRatio = figureRect.width / rowRect.width;
      return widthRatio >= 0.82 ? "full" : "half";
    };

    const syncColumnsVariant = () => {
      const nextColumnsVariant = computeColumnsVariant();
      if (effectiveColumnsVariantRef.current === nextColumnsVariant) return;

      // ResizeObserver fires before paint; flushing here avoids a frame where the
      // half-width table renders at the previous density (visible layout shift).
      flushSync(() => {
        setEffectiveColumnsVariant(nextColumnsVariant);
      });
      effectiveColumnsVariantRef.current = nextColumnsVariant;
    };

    const adjustData = () => {
      widthNow.current = measuredWidthRef.current || table.clientWidth;
      setTableWidthPx((prev) =>
        prev === widthNow.current ? prev : widthNow.current,
      );

      let newPages: typeof columnPages;
      // Use filtered columns instead of COLUMNS
      const cols = filteredColumns;

      // if (nextColumnsVariant === "half") {
      //   newPages = buildHalfColumnPages(cols, widthNow.current);
      //   setColumnPages((prev) => {
      //     const prevJson = JSON.stringify(prev);
      //     const nextJson = JSON.stringify(newPages);
      //     if (prevJson !== nextJson) {
      //       setCurrentPage((p) => Math.min(p, newPages.length - 1));
      //       return newPages;
      //     }
      //     return prev;
      //   });
      //   return;
      // }

      if (widthNow.current < TABLE_BREAKPOINT_SM) {
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
      } else if (widthNow.current < TABLE_BREAKPOINT_MD) {
        if (showSecondarySwells) {
          newPages = [
            [cols[0], cols[2], cols[1]],
            cols.slice(3, 5),
            cols.slice(5, cols.length),
          ];
        } else {
          newPages = [[cols[0], cols[2], cols[1]], cols.slice(3, cols.length)];
        }
      } else if (widthNow.current < TABLE_BREAKPOINT_LG) {
        if (showSecondarySwells) {
          newPages = [
            [cols[0], cols[2], cols[1]],
            [cols[3], cols[4]].filter(Boolean),
            cols.slice(5, cols.length).filter(Boolean),
          ];
        } else {
          newPages = [[cols[0], cols[2], cols[1]], cols.slice(3, cols.length)];
        }
      } else if (widthNow.current < TABLE_BREAKPOINT_XL) {
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
              cols[1],
              cols[5],
              cols[6],
              cols[7],
              cols[8],
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
      syncColumnsVariant();
      scheduleAdjust();
    });
    observer.observe(table);

    const onWindowResize = () => {
      const w = table.clientWidth;
      if (w > 0) measuredWidthRef.current = w;
      syncColumnsVariant();
      scheduleAdjust();
    };
    window.addEventListener("resize", onWindowResize);
    window.visualViewport?.addEventListener("resize", onWindowResize);

    measuredWidthRef.current = table.clientWidth;
    syncColumnsVariant();
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
  }, [
    filteredColumns,
    showSecondarySwells,
    selectedTab,
    variant,
    isHalfWidget,
  ]);

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, columnPages.length - 1));
  };
  const handleBack = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };
  const visibleColumns = columnPages[currentPage];

  const isHalfColumns = effectiveColumnsVariant === "half";
  const effectiveDensity: StatTableDensity = React.useMemo(() => {
    return density ?? (numHours <= 3 ? "12h" : "3h");
  }, [density, numHours]);
  const canToggleDensity = !isHalfColumns;
  const lastUiStateRef = React.useRef<string>("");
  React.useEffect(() => {
    if (!onUiStateChange) return;
    const next = { canToggleDensity, effectiveDensity, isHalfColumns };
    const nextKey = JSON.stringify(next);
    if (lastUiStateRef.current === nextKey) return;
    lastUiStateRef.current = nextKey;
    onUiStateChange(next);
  }, [canToggleDensity, effectiveDensity, isHalfColumns, onUiStateChange]);

  const targetHours =
    effectiveDensity === "3h"
      ? THREE_HOUR_TARGET_HOURS
      : TWELVE_HOUR_TARGET_HOURS;

  const maxVisibleDays = 4;
  const selectorDays = React.useMemo(
    () => (forecastPage ? data.slice(0, maxVisibleDays) : []),
    [data, forecastPage],
  );

  const showForecastViewToggle = forecastPage && !isHalfWidget;
  const canToggleForecastView = selectorDays.length > 1;
  const resolvedForecastViewMode: ForecastViewMode = showForecastViewToggle
    ? forecastViewMode
    : "single";

  React.useLayoutEffect(() => {
    if (sessionLoading) return;
    if (initialForecastViewMode) return;
    if (!forecastPage) return;
    if (session) return;
    try {
      const stored = window.localStorage.getItem(
        "waves-and-waders.statTable.forecastViewMode",
      );
      if (stored === "all" || stored === "single") {
        skipForecastViewModePersistRef.current = true;
        setForecastViewMode(stored);
        document.cookie = `ww_statTable_forecastViewMode=${encodeURIComponent(
          stored,
        )}; Path=/; Max-Age=31536000; SameSite=Lax`;
      }
    } catch {}
  }, [forecastPage, initialForecastViewMode, session, sessionLoading]);

  React.useEffect(() => {
    if (sessionLoading) return;
    if (!session) return;
    if (initialForecastViewMode) return;
    if (!forecastPage) return;
    let cancelled = false;
    const loadForecastViewMode = async () => {
      const { data, error } = await supabase
        .from("user_dashboard_settings")
        .select("forecast_table_view_mode")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (cancelled || error || !data) return;
      const stored = (data as { forecast_table_view_mode?: unknown })
        .forecast_table_view_mode;
      if (stored === "all" || stored === "single") {
        skipForecastViewModePersistRef.current = true;
        setForecastViewMode(stored);
      }
    };
    void loadForecastViewMode();
    return () => {
      cancelled = true;
    };
  }, [
    forecastPage,
    initialForecastViewMode,
    session,
    sessionLoading,
    supabase,
  ]);

  React.useEffect(() => {
    if (!forecastPage) return;
    if (sessionLoading) return;
    if (skipForecastViewModePersistRef.current) {
      skipForecastViewModePersistRef.current = false;
      return;
    }
    if (session) {
      const persist = async () => {
        await supabase.from("user_dashboard_settings").upsert(
          {
            user_id: session.user.id,
            forecast_table_view_mode: forecastViewMode,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      };
      void persist();
      return;
    }
    try {
      window.localStorage.setItem(
        "waves-and-waders.statTable.forecastViewMode",
        forecastViewMode,
      );
      document.cookie = `ww_statTable_forecastViewMode=${encodeURIComponent(
        forecastViewMode,
      )}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } catch {}
  }, [
    forecastPage,
    forecastViewMode,
    session,
    sessionLoading,
    supabase,
  ]);

  const preferredForecastDayKey = React.useMemo(() => {
    if (!forecastPage) return null;
    if (selected instanceof Date) return getPacificDayKey(selected);
    return selectorDays[0]?.key ?? null;
  }, [forecastPage, selected, selectorDays]);

  const useSingleDayView = forecastPage
    ? resolvedForecastViewMode === "single"
    : Math.max(numDays, 1) <= 1;

  const showDayHeaderRow =
    header &&
    !isHalfWidget &&
    !(forecastPage && useSingleDayView);

  const [forecastDayKey, setForecastDayKey] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (!forecastPage || !useSingleDayView) return;
    const keys = new Set(selectorDays.map((day) => day.key));
    if (forecastDayKey && keys.has(forecastDayKey)) return;

    const next =
      preferredForecastDayKey && keys.has(preferredForecastDayKey)
        ? preferredForecastDayKey
        : (selectorDays[0]?.key ?? null);
    setForecastDayKey(next);
  }, [
    forecastDayKey,
    forecastPage,
    preferredForecastDayKey,
    selectorDays,
    useSingleDayView,
  ]);

  const forecastSelectedDay = React.useMemo(() => {
    if (!forecastPage || !useSingleDayView) return null;
    const target = forecastDayKey ?? preferredForecastDayKey;
    return (
      selectorDays.find((day) => day.key === target) ?? selectorDays[0] ?? null
    );
  }, [
    forecastDayKey,
    forecastPage,
    preferredForecastDayKey,
    selectorDays,
    useSingleDayView,
  ]);

  const visibleDays = React.useMemo(() => {
    if (!useSingleDayView) return data.slice(0, maxVisibleDays);
    if (forecastPage) return forecastSelectedDay ? [forecastSelectedDay] : [];
    return data.slice(0, Math.max(numDays, 1));
  }, [data, forecastPage, forecastSelectedDay, numDays, useSingleDayView]);

  const footerDateLabel = React.useMemo(() => {
    const preferMs = (() => {
      if (forecastPage) return forecastSelectedDay?.dateMs ?? null;
      if (visibleDays[0]?.dateMs) return visibleDays[0].dateMs;
      if (selected instanceof Date) return selected.getTime();
      return null;
    })();
    if (!preferMs) return null;
    const date = new Date(preferMs);
    const weekday = PACIFIC_PILL_WEEKDAY_FORMATTER.format(date);
    const monthDay = PACIFIC_PILL_MONTHDAY_FORMATTER.format(date);
    return `${weekday} · ${monthDay}`;
  }, [forecastPage, forecastSelectedDay?.dateMs, selected, visibleDays]);

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
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const touchDeltaRef = React.useRef({ x: 0, y: 0 });
  const touchModeRef = React.useRef<"unknown" | "horizontal" | "vertical">(
    "unknown",
  );
  const onTouchStart = (e: React.TouchEvent) => {
    if (columnPages.length <= 1) return;
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    touchDeltaRef.current = { x: 0, y: 0 };
    touchModeRef.current = "unknown";
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    if (e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - start.x;
    const dy = e.touches[0].clientY - start.y;
    touchDeltaRef.current = { x: dx, y: dy };

    if (touchModeRef.current !== "unknown") {
      return;
    }

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.hypot(absDx, absDy) < 10) {
      return;
    }

    if (absDy > absDx * 1.6) {
      touchModeRef.current = "vertical";
      return;
    }
    if (absDx > absDy * 1.6) {
      touchModeRef.current = "horizontal";
    }
  };
  const onTouchEnd = () => {
    if (!touchStartRef.current) return;
    const { x: dx, y: dy } = touchDeltaRef.current;
    touchStartRef.current = null;
    touchDeltaRef.current = { x: 0, y: 0 };
    const mode = touchModeRef.current;
    touchModeRef.current = "unknown";

    if (mode !== "horizontal") return;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const threshold = 52;
    if (absDx < threshold) return;
    if (absDx <= absDy * 1.2) return;
    if (dx < 0) handleNext();
    else handleBack();
  };
  const onWheel = (e: React.WheelEvent) => {
    if (columnPages.length <= 1) return;
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
    if (e.deltaX > 8) handleNext();
    if (e.deltaX < -8) handleBack();
  };
  const [forecastDateMenuOpen, setForecastDateMenuOpen] = React.useState(false);
  const [tableControlsMenuOpen, setTableControlsMenuOpen] =
    React.useState(false);

  React.useEffect(() => {
    const canShowForecastDateMenu =
      forecastPage && useSingleDayView && selectorDays.length > 1;
    if (!canShowForecastDateMenu) {
      setForecastDateMenuOpen(false);
    }
  }, [forecastPage, selectorDays.length, useSingleDayView]);

  // Match the "+n features" popover behavior: close any open menu while scrolling.
  React.useEffect(() => {
    if (!tableControlsMenuOpen) return;
    if (isEditing) return;
    const close = () => setTableControlsMenuOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("touchmove", close, { passive: true });
    window.addEventListener("wheel", close, { passive: true });
    document.addEventListener("scroll", close, {
      passive: true,
      capture: true,
    });
    document.addEventListener("touchmove", close, {
      passive: true,
      capture: true,
    });
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("touchmove", close);
      window.removeEventListener("wheel", close);
      document.removeEventListener("scroll", close, true);
      document.removeEventListener("touchmove", close, true);
    };
  }, [isEditing, tableControlsMenuOpen]);

  React.useEffect(() => {
    if (!forecastDateMenuOpen) return;
    if (isEditing) return;
    const close = () => setForecastDateMenuOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("touchmove", close, { passive: true });
    window.addEventListener("wheel", close, { passive: true });
    document.addEventListener("scroll", close, {
      passive: true,
      capture: true,
    });
    document.addEventListener("touchmove", close, {
      passive: true,
      capture: true,
    });
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("touchmove", close);
      window.removeEventListener("wheel", close);
      document.removeEventListener("scroll", close, true);
      document.removeEventListener("touchmove", close, true);
    };
  }, [forecastDateMenuOpen, isEditing]);

  const clearControlsMenuFocus = React.useCallback(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active?.closest?.("[data-slot='dropdown-menu-content']")) {
      active.blur();
    }
  }, []);

  const Pager = ({ compact }: { compact?: boolean }) => {
    const totalPages = columnPages.length;
    const dotIndices = (() => {
      if (!compact || totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, idx) => idx);
      }
      const windowSize = 7;
      const half = Math.floor(windowSize / 2);
      const start = Math.max(
        0,
        Math.min(currentPage - half, totalPages - windowSize),
      );
      return Array.from({ length: windowSize }, (_, idx) => start + idx);
    })();

    const showOverflowBefore =
      compact && totalPages > dotIndices.length && (dotIndices[0] ?? 0) > 0;
    const showOverflowAfter =
      compact &&
      totalPages > dotIndices.length &&
      (dotIndices[dotIndices.length - 1] ?? 0) < totalPages - 1;

    return (
      <>
        <Button
          aria-label="previous columns"
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            "rounded-full text-muted-foreground",
            "hover:bg-foreground/5 hover:text-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0",
          )}
          onClick={handleBack}
          disabled={currentPage === 0}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1 px-0.5">
          {showOverflowBefore ? (
            <span
              aria-hidden="true"
              className={cn("rounded-full bg-foreground/15", "h-2 w-2")}
            />
          ) : null}
          {dotIndices.map((idx) => (
            <span
              key={`pager-pill-${idx}`}
              className={cn(
                "rounded-full transition-colors motion-reduce:transition-none",
                "h-2 w-2",
                idx === currentPage ? "bg-foreground/80" : "bg-foreground/25",
              )}
            />
          ))}
          {showOverflowAfter ? (
            <span
              aria-hidden="true"
              className={cn("rounded-full bg-foreground/15", "h-2 w-2")}
            />
          ) : null}
        </div>
        <Button
          aria-label="next columns"
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            "rounded-full text-muted-foreground",
            "hover:bg-foreground/5 hover:text-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0",
          )}
          onClick={handleNext}
          disabled={currentPage === totalPages - 1}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </>
    );
  };

  const controlsReady = data.length > 0;
  const showDateSegment = controlsReady && useSingleDayView;
  const showPager = controlsReady && columnPages.length > 1;
  const showDensityToggle =
    controlsReady && Boolean(density) && typeof onToggleDensity === "function";
  const showExtraSwellsToggle = controlsReady;
  const showForecastViewToggleInPill = controlsReady && showForecastViewToggle;
  const controlsEnabled =
    showForecastViewToggleInPill ||
    showDateSegment ||
    showPager ||
    showDensityToggle ||
    showExtraSwellsToggle;

  const isCompactPill =
    controlsEnabled &&
    tableWidthPx > 0 &&
    (isHalfColumns ? tableWidthPx < 450 : tableWidthPx < 540);

  React.useEffect(() => {
    if (!isCompactPill) setTableControlsMenuOpen(false);
  }, [isCompactPill]);

  const divider = (
    <span
      aria-hidden="true"
      className="mx-1 @min-4xl:mx-1.5 h-5 w-px bg-border/60"
    />
  );

  const footerControlsPill = controlsEnabled ? (
    <div
      className={cn(
        "pointer-events-auto inline-flex h-10 max-w-full items-center rounded-full",
        loading && "pointer-events-none opacity-70",
        "bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/90",
        "border border-border/40 shadow-xs",
      )}
    >
      {isCompactPill ? (
        <DropdownMenu
          modal={false}
          open={tableControlsMenuOpen}
          onOpenChange={setTableControlsMenuOpen}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Table controls"
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold",
                "text-foreground hover:bg-foreground/5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0",
              )}
            >
              <SlidersHorizontal
                aria-hidden="true"
                className="h-4 w-4 text-muted-foreground"
              />
              <span className="max-w-[9.5rem] truncate">
                {showDateSegment ? (footerDateLabel ?? "Date") : "Controls"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            sideOffset={10}
            collisionPadding={12}
            className={cn(
              "w-56 rounded-2xl border border-border/40 p-1.5 shadow-xl",
              "bg-background/95 supports-[backdrop-filter]:backdrop-blur-md",
              "max-h-none overflow-visible",
              isEditing && "z-[1000005]",
            )}
          >
            {showForecastViewToggleInPill ? (
              <>
                <DropdownMenuItem
                  disabled={!canToggleForecastView}
                  onSelect={(e) => {
                    e.preventDefault();
                    setForecastViewMode((prev) =>
                      prev === "all" ? "single" : "all",
                    );
                    requestAnimationFrame(clearControlsMenuFocus);
                  }}
                  className={cn(
                    "rounded-xl px-2.5 py-2",
                    !canToggleForecastView && "opacity-60",
                  )}
                >
                  {resolvedForecastViewMode === "all" ? (
                    <LayoutGrid aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <CalendarDays aria-hidden="true" className="h-4 w-4" />
                  )}
                  <span className="font-semibold">
                    {resolvedForecastViewMode === "all" ? "4 days" : "1 day"}
                  </span>
                  <span className="ml-auto text-[0.7rem] font-semibold tabular-nums text-muted-foreground">
                    toggle
                  </span>
                </DropdownMenuItem>
                {showDateSegment ||
                showDensityToggle ||
                showExtraSwellsToggle ? (
                  <DropdownMenuSeparator className="my-1" />
                ) : null}
              </>
            ) : null}

            {showDateSegment && forecastPage && selectorDays.length > 1 ? (
              loading && !forecastSelectedDay ? (
                <div className="px-2 py-2">
                  <div className="h-3 w-full rounded bg-foreground/10 animate-pulse motion-reduce:animate-none" />
                </div>
              ) : forecastSelectedDay ? (
                <div className="px-1">
                  <DropdownMenuRadioGroup
                    value={forecastSelectedDay.key}
                    onValueChange={(value) => {
                      setForecastDayKey(value);
                      requestAnimationFrame(clearControlsMenuFocus);
                    }}
                    className="grid gap-1"
                  >
                    {selectorDays.map((day) => {
                      const date = new Date(day.dateMs);
                      const weekday =
                        PACIFIC_PILL_WEEKDAY_FORMATTER.format(date);
                      const monthDay =
                        PACIFIC_PILL_MONTHDAY_FORMATTER.format(date);
                      return (
                        <DropdownMenuRadioItem
                          key={day.key}
                          value={day.key}
                          className={cn(
                            "rounded-xl px-2.5 py-2 pl-8",
                            "focus:outline-none",
                            "hover:bg-foreground/5 focus:bg-foreground/5",
                          )}
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-[0.82rem] font-semibold leading-tight text-foreground">
                              {weekday}
                            </span>
                            <span className="mt-0.5 truncate text-[0.7rem] font-semibold tabular-nums leading-tight text-muted-foreground">
                              {monthDay}
                            </span>
                          </span>
                        </DropdownMenuRadioItem>
                      );
                    })}
                  </DropdownMenuRadioGroup>
                </div>
              ) : null
            ) : showDateSegment ? (
              <div className="px-2 py-2 text-sm font-semibold text-foreground">
                {footerDateLabel ?? "-"}
              </div>
            ) : null}

            {showDateSegment && (showDensityToggle || showExtraSwellsToggle) ? (
              <DropdownMenuSeparator className="my-1" />
            ) : null}

            {showDensityToggle ? (
              <DropdownMenuItem
                disabled={!canToggleDensity}
                onSelect={(e) => {
                  e.preventDefault();
                  onToggleDensity?.();
                  requestAnimationFrame(clearControlsMenuFocus);
                }}
                className={cn(
                  "rounded-xl px-2.5 py-2",
                  !canToggleDensity && "opacity-60",
                )}
              >
                <ClockFading aria-hidden="true" className="h-4 w-4" />
                <span className="font-semibold">Interval</span>
                <span className="ml-auto text-[0.75rem] font-semibold tabular-nums text-muted-foreground">
                  {effectiveDensity === "3h" ? "3h" : "12h"}
                </span>
              </DropdownMenuItem>
            ) : null}

            {showDensityToggle && showExtraSwellsToggle ? (
              <DropdownMenuSeparator className="my-1" />
            ) : null}

            {showExtraSwellsToggle ? (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setShowSecondarySwells(!showSecondarySwells);
                  requestAnimationFrame(clearControlsMenuFocus);
                }}
                className={cn(
                  "rounded-xl px-2.5 py-2",
                  showSecondarySwells
                    ? "bg-highlight-6/70 text-foreground ring-1 ring-foreground/20 shadow-even"
                    : "hover:bg-foreground/5",
                )}
              >
                {showSecondarySwells ? (
                  <Eye aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <EyeOff aria-hidden="true" className="h-4 w-4" />
                )}
                <span className="font-semibold">Swells</span>
                <span className="ml-auto text-[0.75rem] font-semibold text-muted-foreground">
                  {showSecondarySwells ? "On" : "Off"}
                </span>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : showForecastViewToggleInPill ? (
        <button
          type="button"
          aria-label={
            resolvedForecastViewMode === "all"
              ? "Switch to 1-day view"
              : "Switch to 4-day view"
          }
          onClick={() =>
            setForecastViewMode((prev) => (prev === "all" ? "single" : "all"))
          }
          disabled={!canToggleForecastView}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold",
            "text-foreground hover:bg-foreground/5",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0",
            !canToggleForecastView &&
              "opacity-60 cursor-not-allowed hover:bg-transparent",
          )}
        >
          {resolvedForecastViewMode === "all" ? (
            <LayoutGrid
              aria-hidden="true"
              className="h-4 w-4 text-muted-foreground"
            />
          ) : (
            <CalendarDays
              aria-hidden="true"
              className="h-4 w-4 text-muted-foreground"
            />
          )}
          <span>{resolvedForecastViewMode === "all" ? "4 days" : "1 day"}</span>
        </button>
      ) : null}

      {!isCompactPill &&
      showForecastViewToggleInPill &&
      (showDateSegment ||
        showDensityToggle ||
        showExtraSwellsToggle ||
        showPager)
        ? divider
        : null}

      {!isCompactPill && showDateSegment ? (
        forecastPage && selectorDays.length > 1 ? (
          loading && !forecastSelectedDay ? (
            <div className="h-9 w-40 rounded-full px-3">
              <div className="mt-3 h-3 w-full rounded bg-foreground/10 animate-pulse motion-reduce:animate-none" />
            </div>
          ) : forecastSelectedDay ? (
            <DropdownMenu
              modal={false}
              open={forecastDateMenuOpen}
              onOpenChange={setForecastDateMenuOpen}
            >
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Select forecast date"
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold",
                    "text-foreground hover:bg-foreground/5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0",
                  )}
                >
                  <CalendarDays
                    aria-hidden="true"
                    className="h-4 w-4 text-muted-foreground"
                  />
                  <span className="max-w-[10rem] truncate">
                    {footerDateLabel ??
                      PACIFIC_COMPACT_DATE_FORMATTER.format(
                        new Date(forecastSelectedDay.dateMs),
                      )}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200",
                      forecastDateMenuOpen && "rotate-180",
                    )}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="top"
                sideOffset={10}
                collisionPadding={12}
                className={cn(
                  "w-44 rounded-2xl border border-border/40 p-1 shadow-xl",
                  "bg-background/95 supports-[backdrop-filter]:backdrop-blur-md",
                  isEditing && "z-[1000005]",
                )}
              >
                <DropdownMenuRadioGroup
                  value={forecastSelectedDay.key}
                  onValueChange={(value) => setForecastDayKey(value)}
                  className="grid gap-1"
                >
                  {selectorDays.map((day) => {
                    const date = new Date(day.dateMs);
                    const weekday = PACIFIC_PILL_WEEKDAY_FORMATTER.format(date);
                    const monthDay =
                      PACIFIC_PILL_MONTHDAY_FORMATTER.format(date);
                    return (
                      <DropdownMenuRadioItem
                        key={day.key}
                        value={day.key}
                        className={cn(
                          "rounded-xl px-2.5 py-2 pl-8",
                          "focus:outline-none",
                          "data-[state=checked]:bg-foreground/6 data-[state=checked]:shadow-even",
                          "hover:bg-foreground/5 focus:bg-foreground/6",
                        )}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-[0.82rem] font-semibold leading-tight text-foreground">
                            {weekday}
                          </span>
                          <span className="mt-0.5 truncate text-[0.7rem] font-semibold tabular-nums leading-tight text-muted-foreground">
                            {monthDay}
                          </span>
                        </span>
                      </DropdownMenuRadioItem>
                    );
                  })}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null
        ) : (
          <div
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold",
              "text-foreground",
            )}
          >
            <CalendarDays
              aria-hidden="true"
              className="h-4 w-4 text-muted-foreground"
            />
            <span className="max-w-[10rem] truncate">
              {footerDateLabel ?? "—"}
            </span>
          </div>
        )
      ) : null}

      {!isCompactPill &&
      showDateSegment &&
      (showDensityToggle || showExtraSwellsToggle || showPager)
        ? divider
        : null}

      {!isCompactPill && showDensityToggle ? (
        <button
          type="button"
          aria-label={
            effectiveDensity === "3h"
              ? "Switch to 12-hour interval"
              : "Switch to 3-hour interval"
          }
          onClick={onToggleDensity}
          disabled={!canToggleDensity}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold",
            "text-foreground hover:bg-foreground/5",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0",
            !canToggleDensity &&
              "opacity-60 cursor-not-allowed hover:bg-transparent",
          )}
        >
          <ClockFading
            aria-hidden="true"
            className="h-4 w-4 text-muted-foreground"
          />
          <span className="tabular-nums">
            {effectiveDensity === "3h" ? "3h" : "12h"}
          </span>
        </button>
      ) : null}

      {!isCompactPill && showDensityToggle && showExtraSwellsToggle
        ? divider
        : null}

      {!isCompactPill && showExtraSwellsToggle ? (
        <button
          type="button"
          aria-label={`${showSecondarySwells ? "Hide" : "Show"} extra swells`}
          onClick={() => setShowSecondarySwells(!showSecondarySwells)}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold",
            "text-foreground hover:bg-foreground/5",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0",
          )}
        >
          {showSecondarySwells ? (
            <Eye aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          ) : (
            <EyeOff
              aria-hidden="true"
              className="h-4 w-4 text-muted-foreground"
            />
          )}
          <span className="hidden @min-[460px]:inline">Swells</span>
        </button>
      ) : null}

      {showPager ? divider : null}
      {showPager ? (
        <div className="flex items-center pr-1">
          <Pager compact={isCompactPill} />
        </div>
      ) : null}
    </div>
  ) : null;

  const shouldReserveFooterSpace = Boolean(footerControlsPill) || loading;
  // Only dock controls in-flow when there's no pager. If the pager exists, users
  // expect it to remain accessible while scrolling the table/widget.
  //
  // Exception: for multi-day forecast tables, keep the scroll-follow behavior.
  const dockPagerInFlow =
    !showPager &&
    targetHours.length <= 3 &&
    !(forecastPage && !useSingleDayView);
  const dockPagerInFlowEffective = isEditing ? true : dockPagerInFlow;
  const pagerStickyRef = React.useRef<HTMLDivElement | null>(null);
  const pagerRevealSentinelRef = React.useRef<HTMLDivElement | null>(null);
  const pagerBottomSentinelRef = React.useRef<HTMLDivElement | null>(null);
  const pagerRevealPastRef = React.useRef(false);
  const pagerBottomReachedRef = React.useRef(false);
  const pagerVisibleRef = React.useRef(isEditing);

  // iOS Safari can jitter `position: sticky` during active touch-drag scrolling (browser chrome /
  // overscroll). For coarse touch pointers, stabilize the sticky header/pager by promoting them
  // to `position: fixed` only while they're logically "stuck", while keeping layout space reserved.
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const table = tableRef.current;
    const headerWrap = headerWrapRef.current;
    const headerEl = headerStickyRef.current;
    const pagerWrap = pagerWrapRef.current;
    const pagerEl = pagerStickyRef.current;
    if (!table || !headerWrap || !headerEl) return;

    const coarseTouch =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    if (!coarseTouch) return;

    let rafId: number | null = null;
    let lastFixedHeader = false;
    let headerHeightPx = 0;
    let headerTopPx = 0;

    const measureHeader = () => {
      try {
        headerHeightPx = headerEl.getBoundingClientRect().height;
        const topRaw = window.getComputedStyle(headerEl).top;
        const parsed = Number.parseFloat(topRaw);
        headerTopPx = Number.isFinite(parsed) ? parsed : 0;
      } catch {}
    };

    const ensurePagerWrapHeight = () => {
      if (!pagerWrap || !pagerEl) return;
      if (dockPagerInFlowEffective) {
        pagerWrap.style.height = "";
        pagerEl.style.position = "";
        pagerEl.style.left = "";
        pagerEl.style.width = "";
        return;
      }
      try {
        const h = pagerEl.getBoundingClientRect().height;
        if (Number.isFinite(h) && h > 0) {
          pagerWrap.style.height = `${h}px`;
        }
      } catch {}
    };

    const resetHeaderStyles = () => {
      headerWrap.style.height = "";
      headerEl.style.position = "";
      headerEl.style.left = "";
      headerEl.style.width = "";
    };

    const resetPagerStyles = () => {
      if (!pagerEl) return;
      pagerEl.style.position = "";
      pagerEl.style.left = "";
      pagerEl.style.width = "";
    };

    const update = () => {
      rafId = null;

      measureHeader();
      ensurePagerWrapHeight();

      // Fixed pager: stable on coarse touch only while it's logically "stuck" within the table.
      // When the table's bottom edge approaches, return to native sticky so it can dock and
      // scroll away with the widget.
      if (
        pagerWrap &&
        pagerEl &&
        shouldReserveFooterSpace &&
        !dockPagerInFlowEffective &&
        pagerVisibleRef.current
      ) {
        try {
          const tableRect = table.getBoundingClientRect();
          const vh = window.visualViewport?.height ?? window.innerHeight;
          const bottomRaw = window.getComputedStyle(pagerEl).bottom;
          const bottomParsed = Number.parseFloat(bottomRaw);
          const bottomOffsetPx = Number.isFinite(bottomParsed) ? bottomParsed : 0;
          const pagerHeightPx = pagerEl.getBoundingClientRect().height;

          const tableIntersects = tableRect.bottom > 0 && tableRect.top < vh;
          const viewportBottomForPagerPx = vh - bottomOffsetPx;
          const canStickToViewportBottom =
            pagerHeightPx > 0 && tableRect.bottom >= viewportBottomForPagerPx - 1;

          if (tableIntersects && canStickToViewportBottom) {
            pagerEl.style.position = "fixed";
            pagerEl.style.left = `${tableRect.left}px`;
            pagerEl.style.width = `${tableRect.width}px`;
          } else {
            resetPagerStyles();
          }
        } catch {
          resetPagerStyles();
        }
      } else {
        resetPagerStyles();
      }

      // Fixed header: only while the header is logically "stuck".
      let shouldFixHeader = false;
      try {
        const tableRect = table.getBoundingClientRect();
        if (headerHeightPx > 0) {
          shouldFixHeader =
            tableRect.top <= headerTopPx &&
            tableRect.bottom >= headerTopPx + headerHeightPx + 1;
        }
      } catch {}

      if (!shouldFixHeader) {
        if (lastFixedHeader) {
          lastFixedHeader = false;
          resetHeaderStyles();
        }
        return;
      }

      lastFixedHeader = true;
      try {
        const r = headerWrap.getBoundingClientRect();
        if (headerHeightPx > 0) headerWrap.style.height = `${headerHeightPx}px`;
        headerEl.style.position = "fixed";
        headerEl.style.left = `${r.left}px`;
        headerEl.style.width = `${r.width}px`;
      } catch {}
    };

    const schedule = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule, { passive: true });

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      if (rafId != null) window.cancelAnimationFrame(rafId);
      resetHeaderStyles();
      if (pagerWrap) pagerWrap.style.height = "";
      if (pagerEl) {
        pagerEl.style.position = "";
        pagerEl.style.left = "";
        pagerEl.style.width = "";
      }
    };
  }, [
    dockPagerInFlowEffective,
    shouldReserveFooterSpace,
    showPager,
    isEditing,
    effectiveDensity,
    tableWidthPx,
  ]);

  React.useEffect(() => {
    const el = pagerStickyRef.current;
    const sentinel = pagerRevealSentinelRef.current;
    const bottomSentinel = pagerBottomSentinelRef.current;
    if (!shouldReserveFooterSpace || !el) return;
    if (isEditing || dockPagerInFlowEffective) {
      pagerVisibleRef.current = true;
      el.dataset.wwVisible = "true";
      el.setAttribute("aria-hidden", "false");
      const ui = el.querySelector("[data-ww-stat-table-pager-ui]");
      if (ui instanceof HTMLElement) {
        ui.style.pointerEvents = "auto";
        try {
          ui.removeAttribute("inert");
        } catch {}
      }
      return;
    }

    const setVisible = (visible: boolean) => {
      pagerVisibleRef.current = visible;
      el.dataset.wwVisible = visible ? "true" : "false";
      el.setAttribute("aria-hidden", visible ? "false" : "true");
      const ui = el.querySelector("[data-ww-stat-table-pager-ui]");
      if (ui instanceof HTMLElement) {
        ui.style.pointerEvents = visible ? "auto" : "none";
        try {
          if (visible) ui.removeAttribute("inert");
          else ui.setAttribute("inert", "");
        } catch {}
      }
    };

    if (
      typeof IntersectionObserver === "undefined" ||
      !sentinel ||
      !bottomSentinel
    ) {
      setVisible(true);
      return;
    }

    const recompute = () => {
      setVisible(pagerRevealPastRef.current || pagerBottomReachedRef.current);
    };

    // Show slightly after entering the StatTable (prevents appearing immediately at the top).
    const revealOffsetPx = 500;

    // Bootstrap once from current layout so the pill can't get stuck hidden if observers
    // don't fire after settings/layout edits.
    const bootstrapFromLayout = () => {
      try {
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const sentinelRect = sentinel.getBoundingClientRect();
        const bottomRect = bottomSentinel.getBoundingClientRect();

        const rootTop = revealOffsetPx;
        const rootBottom = vh;
        const sentinelIntersecting =
          sentinelRect.bottom >= rootTop && sentinelRect.top <= rootBottom;
        pagerRevealPastRef.current = !sentinelIntersecting;
        pagerBottomReachedRef.current =
          bottomRect.bottom >= 0 && bottomRect.top <= vh;
      } catch {}
      recompute();
    };
    const revealObserver = new IntersectionObserver(
      ([entry]) => {
        pagerRevealPastRef.current = !entry.isIntersecting;
        recompute();
      },
      {
        root: null,
        threshold: 0,
        rootMargin: `-${revealOffsetPx}px 0px 0px 0px`,
      },
    );

    // Safety net: if the user reaches/passes the bottom of the widget, ensure the pill
    // becomes eligible to show (prevents "never appears even past the widget").
    const bottomObserver = new IntersectionObserver(
      ([entry]) => {
        pagerBottomReachedRef.current = entry.isIntersecting;
        recompute();
      },
      { root: null, threshold: 0 },
    );

    revealObserver.observe(sentinel);
    bottomObserver.observe(bottomSentinel);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(bootstrapFromLayout);
    } else {
      bootstrapFromLayout();
    }
    return () => {
      revealObserver.disconnect();
      bottomObserver.disconnect();
    };
  }, [
    dockPagerInFlowEffective,
    isEditing,
    shouldReserveFooterSpace,
    loading,
    controlsEnabled,
    columnPages.length,
    effectiveDensity,
    showSecondarySwells,
    tableWidthPx,
  ]);

  return (
    <div
      ref={assignTableRef}
      data-ww-stat-table
      className={cn(
        "relative -mx-1 @min-md:mx-0",
        // variant !== "half" && "@min-2xl:mx-4",
        // controlsEnabled && "pb-16",
        "rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
      <div>
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
        <div ref={headerWrapRef}>
          <div
            ref={headerStickyRef}
            data-ww-stat-table-sticky="header"
            className={cn(
              "sticky top-15.5 @min-4xl/main:top-27.5 z-40 @min-md:mx-0 rounded-b-[10px] px-0.5 py-0.5",
              headerBgClass,
            )}
          >
            <table className="w-full table-fixed border-separate border-spacing-x-2 border-spacing-y-0 text-sm">
              <colgroup>
                <col className="w-12" />
                {visibleColumns.map((col) => (
                  <col
                    key={col.id}
                    className={cn(
                      col.id === "surf"
                        ? widthNow.current >= 750 &&
                          widthNow.current < TABLE_BREAKPOINT_LG
                          ? ""
                          : "w-[clamp(5.25rem,10vw,5.75rem)]"
                        : "",
                      col.id === "wind" &&
                        showSecondarySwells &&
                        widthNow.current >= TABLE_BREAKPOINT_LG &&
                        "w-[11rem]",
                      col.id === "weather" || col.id === "water"
                        ? showSecondarySwells && variant === "full"
                          ? widthNow.current >= TABLE_BREAKPOINT_LG &&
                            widthNow.current < TABLE_BREAKPOINT_XL
                            ? ""
                            : "@min-[1175px]:w-[clamp(4.5rem,9vw,5.5rem)]"
                          : widthNow.current >= TABLE_BREAKPOINT_LG &&
                            "w-[clamp(4.5rem,9vw,5.5rem)]"
                        : "",
                      col.id === "energy"
                        ? showSecondarySwells && variant === "full"
                          ? widthNow.current >= TABLE_BREAKPOINT_LG &&
                            widthNow.current < TABLE_BREAKPOINT_XL
                            ? ""
                            : "@min-[1175px]:w-[clamp(4.75rem,9vw,5.5rem)]"
                          : widthNow.current >= TABLE_BREAKPOINT_LG &&
                            "w-[clamp(4.75rem,9vw,5.5rem)]"
                        : "",
                      col.id === "pressure"
                        ? showSecondarySwells && variant === "full"
                          ? widthNow.current >= TABLE_BREAKPOINT_LG &&
                            widthNow.current < TABLE_BREAKPOINT_XL
                            ? ""
                            : "@min-[1175px]:w-[clamp(5.25rem,10vw,6.75rem)]"
                          : widthNow.current >= TABLE_BREAKPOINT_LG &&
                            "w-[clamp(5.25rem,10vw,6.75rem)]"
                        : "",
                      col.id === "__spacer" && "w-[10rem]",
                    )}
                  />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className="w-12 pb-0">
                    <div className="sticky left-0 z-10 w-12">
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
                    </div>
                  </th>
                  {visibleColumns.map((col) => {
                    const group = getMetricGroupForColumnId(col.id);
                    return (
                      <th
                        key={col.id}
                        scope="col"
                        className={cn(
                          "pb-0 text-center text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs",
                        )}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={
                              col.label
                                ? "block max-w-full truncate whitespace-nowrap"
                                : "sr-only"
                            }
                          >
                            {col.label || "Spacer"}
                          </span>
                          <span
                            aria-hidden="true"
                            className={cn(
                              "h-[2px] w-10 rounded-full",
                              groupAccentFillClass[group],
                              col.id === "__spacer"
                                ? "opacity-0"
                                : "opacity-60",
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
        </div>

        <table
          className={cn(
            "w-full table-fixed border-separate border-spacing-x-2 border-spacing-y-1.5 text-sm",
            forecastPage &&
              (variant === "half" ||
                (variant === "full" &&
                  resolvedForecastViewMode === "single")) &&
              "mt-0",
            forecastPage &&
              variant === "full" &&
              resolvedForecastViewMode === "all" &&
              "-mt-5",
          )}
        >
          <colgroup>
            <col className="w-12" />
            {visibleColumns.map((col) => (
              <col
                key={col.id}
                className={cn(
                  col.id === "surf"
                    ? widthNow.current >= 750 &&
                      widthNow.current < TABLE_BREAKPOINT_LG
                      ? ""
                      : "w-[clamp(5.25rem,10vw,5.75rem)]"
                    : "",
                  col.id === "wind" &&
                    showSecondarySwells &&
                    widthNow.current >= TABLE_BREAKPOINT_LG &&
                    "w-[11rem]",
                  col.id === "weather" || col.id === "water"
                    ? showSecondarySwells && variant === "full"
                      ? widthNow.current >= TABLE_BREAKPOINT_LG &&
                        widthNow.current < TABLE_BREAKPOINT_XL
                        ? ""
                        : "@min-[1175px]:w-[clamp(4.5rem,9vw,5.5rem)]"
                      : widthNow.current >= TABLE_BREAKPOINT_LG &&
                        "w-[clamp(4.5rem,9vw,5.5rem)]"
                    : "",
                  col.id === "energy"
                    ? showSecondarySwells && variant === "full"
                      ? widthNow.current >= TABLE_BREAKPOINT_LG &&
                        widthNow.current < TABLE_BREAKPOINT_XL
                        ? ""
                        : "@min-[1175px]:w-[clamp(4.75rem,9vw,5.5rem)]"
                      : widthNow.current >= TABLE_BREAKPOINT_LG &&
                        "w-[clamp(4.75rem,9vw,5.5rem)]"
                    : "",
                  col.id === "pressure"
                    ? showSecondarySwells && variant === "full"
                      ? widthNow.current >= TABLE_BREAKPOINT_LG &&
                        widthNow.current < TABLE_BREAKPOINT_XL
                        ? ""
                        : "@min-[1175px]:w-[clamp(5.25rem,10vw,6.75rem)]"
                      : widthNow.current >= TABLE_BREAKPOINT_LG &&
                        "w-[clamp(5.25rem,10vw,6.75rem)]"
                    : "",
                  col.id === "__spacer" && "w-[10rem]",
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
            {(visibleDays.length
              ? visibleDays
              : loading
                ? (() => {
                    const daysForPlaceholder = useSingleDayView
                      ? 1
                      : Math.min(maxVisibleDays, Math.max(numDays, 1));
                    const anchor =
                      (forecastPage && forecastSelectedDay?.dateMs
                        ? new Date(forecastSelectedDay.dateMs)
                        : (requestedDate ??
                          (selected instanceof Date ? selected : null))) ??
                      new Date();
                    const { start: anchorStart } = getPacificDayRange(anchor);
                    return Array.from(
                      { length: daysForPlaceholder },
                      (_, idx) => {
                        const d = new Date(
                          anchorStart.getTime() + idx * DAY_MS,
                        );
                        return {
                          key: `loading-${idx}`,
                          date: d.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          }),
                          dateMs: new Date(
                            d.getFullYear(),
                            d.getMonth(),
                            d.getDate(),
                          ).getTime(),
                          vals: [],
                        } satisfies TableDay;
                      },
                    );
                  })()
                : []
            ).map((day, i) => {
              const dayEntries = targetHours.map(
                (hour) =>
                  day.vals.find((entry) => entry.index === hour) ??
                  buildMissingEntry(hour),
              );

              const content = dayEntries.flatMap((entry, rowIdx) => {
                let isSelectedHour = false;
                // Determine selection per page context
                if (forecastPage) {
                  // Highlight only within the selected day and closest interval bucket
                  const sel = selected instanceof Date ? selected : null;
                  const sameDay = sel
                    ? new Date(
                        sel.getFullYear(),
                        sel.getMonth(),
                        sel.getDate(),
                      ).getTime() === day.dateMs
                    : false;
                  if (sameDay) {
                    const hours = dayEntries
                      .map((v) => v.index)
                      .sort((a, b) => a - b);
                    // pick the last hour <= selected hour, otherwise first
                    const effectiveHour = dashboardBusy
                      ? (stableSelectedHour ?? selectedHour ?? null)
                      : (selectedHour ?? null);
                    if (effectiveHour != null) {
                      const bucket = pickClosestBucket(hours, effectiveHour);
                      isSelectedHour = bucket != null && entry.index === bucket;
                    }
                  }
                } else {
                  const effectiveHour = selectedHour ?? null;
                  if (effectiveHour != null) {
                    const hours = dayEntries
                      .map((v) => v.index)
                      .sort((a, b) => a - b);
                    const bucket = pickClosestBucket(hours, effectiveHour);
                    isSelectedHour = bucket != null && entry.index === bucket;
                  }
                }
                const row = (
                  <tr
                    key={`${i}-${entry.index}`}
                    className="transition-colors duration-200 motion-reduce:duration-0"
                  >
                    <th scope="row" className="p-0 align-middle bg-transparent">
                      <div className="sticky left-0 z-10 w-12">
                        <TimeCell time={entry.time} selected={isSelectedHour} />
                      </div>
                    </th>
                    {visibleColumns.map((col) => {
                      let content: React.ReactNode = null;
                      if (entry.missing && col.id !== "__spacer") {
                        content = (
                          <CellSurface>
                            <span className="text-sm font-semibold text-muted-foreground">
                              —
                            </span>
                          </CellSurface>
                        );
                      } else {
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
                                showSecondarySwells={showSecondarySwells}
                                variant={variant}
                                showMap={showMap}
                              />
                            );
                            break;
                          case "weather":
                            content = (
                              <WeatherStat
                                data={entry.weather}
                                isNight={entry.index < 6 || entry.index >= 18}
                              />
                            );
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
                              <SwellStat
                                primary
                                data={entry.swell.primary}
                                showMap={showMap}
                                showSecondarySwells={showSecondarySwells}
                                variant={variant}
                              />
                            );
                            break;
                          case "swellSecondary": {
                            const s0 = entry.swell.secondary[0];
                            content = (
                              <SwellStat
                                data={s0}
                                showMap={showMap}
                                showSecondarySwells={showSecondarySwells}
                                variant={variant}
                              />
                            );
                            break;
                          }
                          case "swellTertiary": {
                            const s1 = entry.swell.secondary[1];
                            content = (
                              <SwellStat
                                data={s1}
                                showMap={showMap}
                                showSecondarySwells={showSecondarySwells}
                                variant={variant}
                              />
                            );
                            break;
                          }
                          case "pressure":
                            content = (
                              <PressureStat
                                showMap={showMap}
                                value={entry.pressure.value}
                                min={barScales.pressureMin}
                                max={barScales.pressureMax}
                                prev={
                                  rowIdx > 0
                                    ? (day.vals[rowIdx - 1]?.pressure.value ??
                                      null)
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
                                "ring-2 dark:ring-[3.5px] ring-sky-500/30 shadow-sm dark:ring-sky-400/25 dark:shadow-[0_8px_16px_rgba(0,0,0,0.35)]",
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
                  rowIdx === dayEntries.length - 1 ? null : (
                    <tr
                      key={`${i}-${entry.index}-divider`}
                      aria-hidden="true"
                      className="h-2"
                    >
                      <td colSpan={visibleColumns.length + 1} className="p-0">
                        <div className="mx-2 h-px bg-foreground/10 dark:bg-foreground/15" />
                      </td>
                    </tr>
                  );

                return [row, divider].filter(Boolean);
              });
              return (
                <React.Fragment key={i}>
                  {showDayHeaderRow && (
                    <tr key={`${i}-date`}>
                      <td colSpan={visibleColumns.length + 1} className="p-0">
                          <div
                            className={cn(
                              "mx-0 mb-3 mt-3 relative overflow-hidden rounded-2xl border border-border/60 bg-foreground/[0.06] px-4 py-3 shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_30px_rgba(0,0,0,0.06)] dark:bg-foreground/[0.09] dark:shadow-[0_1px_0_rgba(0,0,0,0.35),0_12px_30px_rgba(0,0,0,0.35)]",
                              i === 0 && "mt-5",
                            )}
                          >
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

        {/* Footer controls render in the fixed footer below. */}
        {false ? (
          <div className="mt-2 flex min-h-10 items-center justify-end px-1">
            {footerControlsPill}
            {/*
            <div className="flex items-center gap-2 min-w-0">
              {forecastPage && selectorDays.length > 1 ? (
                loading && !halfForecastSelectedDay ? (
                  <div className="h-8 w-32 rounded-full border border-border/60 bg-foreground/5 px-3 shadow-sm">
                    <div className="mt-2 h-3 w-full rounded bg-foreground/10 animate-pulse motion-reduce:animate-none" />
                  </div>
                ) : halfForecastSelectedDay ? (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Select forecast date"
                        className={cn(
                          "inline-flex h-8 items-center gap-2 rounded-full border border-border/60",
                          "bg-background/90 px-3 text-xs font-semibold text-foreground shadow-sm",
                          "hover:bg-background",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        )}
                      >
                        <CalendarDays
                          aria-hidden="true"
                          className="h-4 w-4 text-muted-foreground"
                        />
                        <span className="max-w-[9rem] truncate">
                          {halfFooterDateLabel ??
                            PACIFIC_COMPACT_DATE_FORMATTER.format(
                              new Date(halfForecastSelectedDay.dateMs)
                            )}
                        </span>
                        <ChevronDown
                          aria-hidden="true"
                          className="h-4 w-4 text-muted-foreground"
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      side="top"
                      sideOffset={8}
                      avoidCollisions={false}
                      className={cn(
                        "min-w-[14rem] rounded-2xl border border-border/40 p-1.5 shadow-lg",
                        "bg-background/95 supports-[backdrop-filter]:backdrop-blur-md"
                      )}
                    >
                      <DropdownMenuLabel className="px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                        Forecast date
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuRadioGroup
                        value={halfForecastSelectedDay.key}
                        onValueChange={(value) => setHalfForecastDayKey(value)}
                      >
                        {selectorDays.map((day) => {
                          const label = PACIFIC_COMPACT_DATE_FORMATTER.format(
                            new Date(day.dateMs)
                          );
                          const [weekdayRaw, restRaw] = label.split(",");
                          const weekday = (weekdayRaw ?? label).trim();
                          const rest = (restRaw ?? "").trim();
                          const compactLabel =
                            rest.length > 0 ? `${weekday} · ${rest}` : label;
                          return (
                            <DropdownMenuRadioItem
                              key={day.key}
                              value={day.key}
                              className={cn(
                                "rounded-xl py-2.5 pl-8 pr-3",
                                "text-sm font-medium text-foreground",
                                "data-[state=checked]:bg-highlight-6/60 data-[state=checked]:shadow-even",
                                "hover:bg-highlight-6/40 focus:bg-highlight-6/60"
                              )}
                            >
                              <span className="truncate">{compactLabel}</span>
                            </DropdownMenuRadioItem>
                          );
                        })}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null
              ) : (
                <div
                  className={cn(
                    "inline-flex h-8 items-center gap-2 rounded-full border border-border/60",
                    "bg-background/90 px-3 text-xs font-semibold text-foreground shadow-sm"
                  )}
                >
                  <CalendarDays
                    aria-hidden="true"
                    className="h-4 w-4 text-muted-foreground"
                  />
                  <span className="max-w-[9rem] truncate">
                    {halfFooterDateLabel ?? "—"}
                  </span>
                </div>
              )}
            </div>

            {columnPages.length > 1 ? (
              <div
                className={cn(
                  "shrink-0 pointer-events-auto flex items-center gap-2",
                  "bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70",
                  "border border-border/60 rounded-full px-2 py-1 shadow-md"
                )}
              >
                <Pager />
              </div>
            ) : null}
          </div>
            */}
          </div>
        ) : null}
      </div>

      {shouldReserveFooterSpace && !dockPagerInFlowEffective ? (
        <div
          aria-hidden="true"
          ref={pagerRevealSentinelRef}
          className="absolute left-0 top-0 h-px w-px"
        />
      ) : null}

      {shouldReserveFooterSpace && !dockPagerInFlowEffective ? (
        <div
          aria-hidden="true"
          ref={pagerBottomSentinelRef}
          className="absolute left-0 bottom-0 h-px w-px"
        />
      ) : null}

      {shouldReserveFooterSpace ? (
        <div ref={pagerWrapRef} className="mt-2">
          <div
            data-ww-stat-table-sticky="pager"
            ref={pagerStickyRef}
            data-ww-visible={
              dockPagerInFlowEffective || pagerVisibleRef.current
                ? "true"
                : "false"
            }
            className={cn(
              dockPagerInFlowEffective
                ? "relative z-50"
                : // Keep the pager attached to the bottom edge of the widget while the
                  // page scrolls; within-table scrolling is handled by the flex layout above.
                  "sticky z-50 bottom-[calc(0.75rem+env(safe-area-inset-bottom))]",
              "shrink-0 flex min-h-10 items-center justify-center px-1 pt-1",
              !dockPagerInFlowEffective &&
                "invisible opacity-0 pointer-events-none transition-opacity duration-150 motion-reduce:transition-none data-[ww-visible=true]:visible data-[ww-visible=true]:opacity-100 data-[ww-visible=true]:pointer-events-auto",
              // Keep native sticky styles lightweight; iOS stabilization is handled by the
              // coarse-touch fixed-promotion effect above.
            )}
            aria-hidden={!(dockPagerInFlowEffective || pagerVisibleRef.current)}
          >
            <div data-ww-stat-table-pager-ui>
              {footerControlsPill ? (
                footerControlsPill
              ) : (
                <div
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none h-10 w-[min(22rem,100%)] rounded-full",
                    "border border-border/30 bg-foreground/10",
                    "animate-pulse motion-reduce:animate-none",
                  )}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StatTable;
