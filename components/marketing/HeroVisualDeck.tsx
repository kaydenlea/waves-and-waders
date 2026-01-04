"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  Droplets,
  Filter,
  Info,
  MapPin,
  Sparkles,
} from "lucide-react";

import BeachCard, { type Beach } from "@/components/general/BeachCard";
import FiltersPanel from "@/components/general/FiltersPanel";
import TimeRail from "@/components/general/TimeRail";
import OverviewWidget from "@/components/general/overview/OverviewWidget";
import { useDateContext } from "@/components/context/DateContext";
import { ForecastDataProvider } from "@/components/context/ForecastDataContext";
import { TideDataProvider } from "@/components/context/TideDataContext";
import TideChart from "@/components/graphs/TideChart";
import { buildSunSegments } from "@/components/graphs/sunSegments";
import type { SharedSunSegments } from "@/components/graphs/sharedSunSegments";
import { SwellRings, WindRing } from "@/components/visuals/DirectionRings";
import Highlights from "@/components/visuals/Highlights";
import Summary from "@/components/visuals/Summary";
import type { DailyConditions, ForecastData, TidePoint } from "@/lib/supabase";
import { cn, getPacificMidnightUTC } from "@/lib/utils";

const HOUR_MS = 60 * 60 * 1000;
const PREVIEW_HOURS = 24;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(Boolean(mql.matches));
    update();
    if (mql.addEventListener) {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    }
    mql.addListener?.(update);
    return () => {
      mql.removeListener?.(update);
    };
  }, []);

  return reduced;
}

type Slide = {
  key: string;
  label: string;
  eyebrow: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  render: () => React.ReactNode;
};

const buildPreviewForecastRows = (
  base: ForecastData,
  windowStart: Date,
  hours: number
) => {
  const rows: ForecastData[] = [];
  for (let h = 0; h <= hours; h += 3) {
    const t = new Date(windowStart.getTime() + h * HOUR_MS);
    const phase = (h / Math.max(1, hours)) * Math.PI * 2;
    const swellPrimary =
      (base.swell.primary.height ?? 4.5) + Math.sin(phase) * 0.6;
    const swellSecondary =
      (base.swell.secondary.height ?? 2.5) + Math.cos(phase * 0.9) * 0.35;
    const swellTertiary =
      (base.swell.tertiary.height ?? 1.5) + Math.sin(phase * 1.3) * 0.25;
    const wind = Math.max(
      2,
      (base.conditions.windSpeed ?? 7) + Math.cos(phase) * 2.2
    );
    const gust = Math.max(
      wind,
      (base.conditions.windGust ?? 11) + Math.cos(phase) * 2.8
    );
    const tide =
      (base.conditions.tideLevel ?? 1.8) + Math.sin(phase * 1.15) * 0.9;
    const surfMax = Math.max(
      0.5,
      (base.surf.heightMax ?? 6) + Math.sin(phase * 0.8) * 1.1
    );
    const surfMin = Math.max(0.0, surfMax - 2.2);

    rows.push({
      timestamp: t.toISOString(),
      swell: {
        primary: {
          height: Number(swellPrimary.toFixed(1)),
          period: base.swell.primary.period ?? 12,
          direction: base.swell.primary.direction ?? 292,
        },
        secondary: {
          height: Number(swellSecondary.toFixed(1)),
          period: base.swell.secondary.period ?? 9,
          direction: base.swell.secondary.direction ?? 248,
        },
        tertiary: {
          height: Number(swellTertiary.toFixed(1)),
          period: base.swell.tertiary.period ?? 7,
          direction: base.swell.tertiary.direction ?? 210,
        },
      },
      surf: {
        heightMin: Number(surfMin.toFixed(1)),
        heightMax: Number(surfMax.toFixed(1)),
        waveEnergy: base.surf.waveEnergy ?? 62,
      },
      conditions: {
        waterTemp: base.conditions.waterTemp ?? 58,
        tideLevel: Number(tide.toFixed(2)),
        windSpeed: Math.round(wind),
        windGust: Math.round(gust),
        windDirection: base.conditions.windDirection ?? 308,
        airTemp: base.conditions.airTemp ?? 62,
        pressure: base.conditions.pressure ?? 30.02,
        weather: base.conditions.weather ?? 1,
      },
    });
  }
  return rows;
};

const buildPreviewTideRows = (
  windowStart: Date,
  hours: number
): TidePoint[] => {
  const out: TidePoint[] = [];
  for (let h = 0; h <= hours; h++) {
    const t = new Date(windowStart.getTime() + h * HOUR_MS);
    const phase = (h / Math.max(1, hours)) * Math.PI * 2;
    const tideLevelFt = Number((Math.sin(phase * 1.2) * 1.4 + 1.6).toFixed(2));
    out.push({ timestamp: t.toISOString(), tideLevelFt, tideLevelM: null });
  }
  return out;
};

function SummarySlide({
  beachId,
  forecastRows,
  preview,
  date,
}: {
  beachId: string;
  forecastRows: ForecastData[];
  preview: {
    current: ForecastData;
    tides: TidePoint[];
    dailyConditions: DailyConditions;
    beachDetails: Record<string, unknown> & { COUNTY?: string | null };
  };
  date: Date;
}) {
  return (
    <div className="h-full p-3 @container">
      <Summary
        beachId={beachId}
        date={date}
        forecastRows={forecastRows}
        forecastLoading={false}
        variant="overview"
        previewData={preview}
      />
    </div>
  );
}

function formatHourLabel(hour: number) {
  const normalized = ((hour % 24) + 24) % 24 | 0;
  const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
  const ampm = normalized >= 12 ? "PM" : "AM";
  return `${displayHour} ${ampm}`;
}

function useNowTimeLabel() {
  const [currentTime, setCurrentTime] = React.useState<string | null>(null);

  React.useEffect(() => {
    const update = () =>
      setCurrentTime(
        new Date().toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        })
      );
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return currentTime;
}

function TideRangePill({
  unit,
  min,
  max,
}: {
  unit: string;
  min: string | null;
  max: string | null;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/25 bg-highlight-7/70 px-3 py-2 text-xs uppercase tracking-wide leading-tight text-muted-foreground shadow-even supports-[backdrop-filter]:bg-highlight-7/40 supports-[backdrop-filter]:backdrop-blur-md">
      <div className="flex items-center gap-0.5">
        <span className="flex gap-0.5 items-center">
          <ArrowDown className="h-4 w-4 text-rose-500/80" aria-hidden="true" />
          <span className="hidden @min-sm:block font-semibold">Lo</span>
        </span>
        <span className="ml-1 text-foreground normal-case font-semibold tabular-nums">
          {min ?? "--"} <span className="inline-block">{unit}</span>
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        <span className="flex gap-0.5 items-center">
          <ArrowUp className="h-4 w-4 text-emerald-500/80" aria-hidden="true" />
          <span className="hidden @min-sm:block font-semibold">Hi</span>
        </span>
        <span className="ml-1 text-foreground normal-case font-semibold tabular-nums">
          {max ?? "--"} <span className="inline-block">{unit}</span>
        </span>
      </div>
    </div>
  );
}

function ChartsSlide({
  beachId,
  forecastRows,
  tideSamples,
  tideRows,
  date,
  hour,
  windowStart,
  sunSegments,
  highlightPreview,
}: {
  beachId: string;
  forecastRows: ForecastData[];
  tideSamples: Array<{ x: number; tide: number }>;
  tideRows: TidePoint[];
  date: Date;
  hour: number;
  windowStart: Date;
  sunSegments: SharedSunSegments;
  highlightPreview: {
    county: string | null;
    dailyConditions: DailyConditions;
  };
}) {
  const windowEnd = React.useMemo(
    () => new Date(windowStart.getTime() + PREVIEW_HOURS * HOUR_MS),
    [windowStart]
  );

  const currentPreview = React.useMemo(() => {
    if (!forecastRows.length) return null;
    const targetHour = (((Math.round(hour / 3) * 3) % 24) + 24) % 24;
    return (
      forecastRows.find(
        (r) => new Date(r.timestamp).getHours() === targetHour
      ) ??
      forecastRows[0] ??
      null
    );
  }, [forecastRows, hour]);

  const currentTime = useNowTimeLabel();

  const label = React.useMemo(() => {
    const now = new Date();
    const dataHour = Number.isFinite(hour) ? hour : now.getHours();
    const nearestHour = Math.round(dataHour / 3) * 3;

    const isToday =
      date &&
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const selectedDateTime = date ? new Date(date) : new Date(now);
    selectedDateTime.setHours(nearestHour, 0, 0, 0);

    const currentNearestHour = Math.round(now.getHours() / 3) * 3;
    const currentDateTime = new Date(now);
    currentDateTime.setHours(currentNearestHour, 0, 0, 0);

    if (isToday && nearestHour === currentNearestHour) return "Current";
    if (selectedDateTime < currentDateTime) return "Historical";
    return "Forecast";
  }, [date, hour]);

  const timeDisplay = React.useMemo(() => {
    const nowText = currentTime ?? "--:--";
    return `${nowText} • ${formatHourLabel(hour)}`;
  }, [currentTime, hour]);

  const tideExtrema = React.useMemo(() => {
    const levels = tideRows
      .map((r) => r.tideLevelFt)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (!levels.length)
      return { min: null as string | null, max: null as string | null };
    return {
      min: Math.min(...levels).toFixed(1),
      max: Math.max(...levels).toFixed(1),
    };
  }, [tideRows]);

  return (
    <ForecastDataProvider
      value={{
        rows: forecastRows,
        start: windowStart,
        end: windowEnd,
        loading: false,
      }}
    >
      <TideDataProvider
        value={{
          rows: tideSamples,
          startMs: windowStart.getTime(),
          sunTimes: {
            sunrise: sunSegments.sunrise,
            sunset: sunSegments.sunset,
          },
          sunWindowStart: windowStart.getTime(),
          sunStatus: "ready",
          loading: false,
          resolved: true,
        }}
      >
        <div className="h-full flex flex-col">
          <div className="relative z-30 overflow-visible border-b border-border/30 bg-background/95 backdrop-blur-sm p-3">
            <TimeRail beachId={beachId} />
          </div>

          <div className="flex-1 min-h-0 p-3 grid grid-rows-[1fr_1fr] gap-3">
            <OverviewWidget
              label="Tide"
              unit="ft"
              headerContent={
                <TideRangePill
                  unit="ft"
                  min={tideExtrema.min}
                  max={tideExtrema.max}
                />
              }
            >
              <TideChart
                preview
                beachId={beachId}
                date={date}
                hours={PREVIEW_HOURS}
                sunSegments={{
                  dayAreas: sunSegments.dayAreas,
                  nightAreas: sunSegments.nightAreas,
                  sunrise: sunSegments.sunrise,
                  sunset: sunSegments.sunset,
                }}
              />
            </OverviewWidget>

            <OverviewWidget label={label} unit={timeDisplay}>
              <Highlights
                beachId={beachId}
                date={date}
                hour={hour}
                forecastRows={forecastRows}
                layout="carousel"
                carouselPageSize={3}
                previewData={{
                  county: highlightPreview.county,
                  tides: tideRows,
                  dailyConditions: highlightPreview.dailyConditions,
                  current: currentPreview,
                }}
              />
            </OverviewWidget>
          </div>
        </div>
      </TideDataProvider>
    </ForecastDataProvider>
  );
}

function BeachPreviewSlide({
  beach,
  forecast,
}: {
  beach: Beach;
  forecast: ForecastData;
}) {
  const [legendOpen, setLegendOpen] = React.useState(true);

  const ringScale = 1.05;
  const ringSize = 160 * ringScale;
  const outerRadius = 110 * ringScale;
  const labelDistance = 148 * ringScale;
  const centerOffset = ringSize / 2;
  const cardinalLabels = [
    {
      id: "N" as const,
      style: {
        top: `${centerOffset - labelDistance}px`,
        left: `${centerOffset}px`,
        transform: "translate(-50%, -50%)",
      },
    },
    {
      id: "S" as const,
      style: {
        top: `${centerOffset + labelDistance}px`,
        left: `${centerOffset}px`,
        transform: "translate(-50%, -50%)",
      },
    },
    {
      id: "E" as const,
      style: {
        top: `${centerOffset}px`,
        left: `${centerOffset + labelDistance}px`,
        transform: "translate(-50%, -50%)",
      },
    },
    {
      id: "W" as const,
      style: {
        top: `${centerOffset}px`,
        left: `${centerOffset - labelDistance}px`,
        transform: "translate(-50%, -50%)",
      },
    },
  ];

  const ringLabels = React.useMemo(() => {
    const fmt = (height?: number | null, period?: number | null) => {
      const h =
        typeof height === "number" && Number.isFinite(height)
          ? `${height.toFixed(1)}ft`
          : "--";
      const p =
        typeof period === "number" && Number.isFinite(period)
          ? `${period}s`
          : "--";
      return `${h} · ${p}`;
    };
    return {
      primary: fmt(
        forecast.swell.primary.height,
        forecast.swell.primary.period
      ),
      secondary: fmt(
        forecast.swell.secondary.height,
        forecast.swell.secondary.period
      ),
      tertiary: fmt(
        forecast.swell.tertiary.height,
        forecast.swell.tertiary.period
      ),
      wind:
        typeof forecast.conditions.windSpeed === "number"
          ? `${forecast.conditions.windSpeed} mph`
          : null,
    };
  }, [forecast]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col gap-3 p-4">
        <div className="w-full max-w-[460px] mx-auto flex-1 min-h-0">
          <div className="relative h-full overflow-hidden rounded-3xl border border-border/35 bg-gradient-to-br from-sky-100 to-blue-200 dark:from-slate-900 dark:to-slate-950">
            <Image
              src={`/beach_pictures/${beach.id}.png`}
              alt={`Map view of ${beach.name}`}
              fill
              sizes="460px"
              className="object-cover"
              priority={false}
            />
            <div
              className="absolute inset-0 bg-gradient-to-b from-background/5 via-transparent to-background/20"
              aria-hidden="true"
            />

            <div className="absolute left-3 top-3 z-20">
              <button
                type="button"
                aria-label="Toggle direction rings legend"
                aria-pressed={legendOpen}
                onClick={() => setLegendOpen((v) => !v)}
                className={cn(
                  "bg-highlight-7/80 backdrop-blur hover:bg-blue-200 dark:hover:bg-blue-400 rounded-full border border-border shadow-lg p-3 text-sm font-medium",
                  "active:scale-95 transition motion-reduce:transition-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15",
                  legendOpen && "bg-blue-300"
                )}
              >
                <Info className="w-5 h-5 mx-auto" aria-hidden="true" />
              </button>
            </div>

            {legendOpen ? (
              <div className="absolute right-3 top-3 z-20 max-w-[200px]">
                <div className="rounded-lg border border-border/60 bg-highlight-7/80 backdrop-blur px-3 py-2 shadow">
                  <span className="text-[11px] font-semibold uppercase text-foreground">
                    Direction Rings
                  </span>
                  <div className="mt-1.5 flex flex-col gap-1 text-[11px] text-foreground/90">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1d4ed8]" />
                      <span>Primary swell</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0ea5e9]" />
                      <span>Secondary swell</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#22d3ee]" />
                      <span>Tertiary swell</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#a855f7]" />
                      <span>Wind direction</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="absolute inset-0 grid place-items-center">
              <div className="pointer-events-none relative flex flex-col items-center justify-center overflow-visible">
                <div
                  className={cn(
                    "absolute bg-background rounded-lg border border-border px-3 py-1.5 shadow-lg whitespace-nowrap z-10 text-sm font-semibold text-foreground",
                    legendOpen ? "-top-30" : "-top-24"
                  )}
                >
                  {beach.name}
                </div>

                <div
                  className="relative flex items-center justify-center"
                  style={{ width: ringSize, height: ringSize }}
                  aria-hidden="true"
                >
                  {legendOpen && (
                    <div className="pointer-events-none absolute inset-0">
                      {cardinalLabels.map(({ id, style }) => (
                        <span
                          key={id}
                          className="w-5 text-center bg-background dark:bg-highlight-5 p-1 rounded-sm font-black absolute text-[11px] uppercase leading-none text-foreground drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)] select-none"
                          style={style}
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  )}

                  <SwellRings
                    directions={{
                      primary: forecast.swell.primary.direction,
                      secondary: forecast.swell.secondary.direction,
                      tertiary: forecast.swell.tertiary.direction,
                    }}
                    labels={{
                      primary: ringLabels.primary,
                      secondary: ringLabels.secondary,
                      tertiary: ringLabels.tertiary,
                    }}
                    showLegend={legendOpen}
                    scale={ringScale}
                    className="absolute inset-0"
                    variant="full"
                  />
                  <WindRing
                    direction={forecast.conditions.windDirection}
                    label={ringLabels.wind}
                    showLegend={legendOpen}
                    scale={ringScale}
                    className="absolute inset-0"
                    variant="full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-[460px] mx-auto pointer-events-none shrink-0">
          <BeachCard b={{ ...beach, current: forecast }} isFav={false} />
        </div>
      </div>
    </div>
  );
}

export default function HeroVisualDeck({
  previewBeach,
  previewForecast,
}: {
  previewBeach: Beach;
  previewForecast: ForecastData;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { selected, hour } = useDateContext();
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [filtersPreview, setFiltersPreview] = React.useState<Set<string>>(
    () => new Set(["PARKING", "RESTROOMS"])
  );
  const deckContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [deckScale, setDeckScale] = React.useState(1);

  React.useLayoutEffect(() => {
    const el = deckContainerRef.current;
    if (!el) return;

    const BASE_W = 540;
    const BASE_H = 760;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const widthScale = rect.width / BASE_W;
      const heightScale = rect.height / BASE_H;
      const next = Math.min(1, widthScale, heightScale);
      const rounded = Math.max(0.72, Math.round(next * 100) / 100);
      setDeckScale(rounded);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const basisDate = React.useMemo(() => {
    return selected instanceof Date && !Number.isNaN(selected.getTime())
      ? selected
      : new Date();
  }, [selected]);

  const basisHour =
    typeof hour === "number" && Number.isFinite(hour) ? hour : 0;

  const windowStart = React.useMemo(
    () => getPacificMidnightUTC(basisDate),
    [basisDate]
  );

  const forecastRows = React.useMemo(
    () => buildPreviewForecastRows(previewForecast, windowStart, PREVIEW_HOURS),
    [previewForecast, windowStart]
  );

  const tideRows = React.useMemo(
    () => buildPreviewTideRows(windowStart, PREVIEW_HOURS),
    [windowStart]
  );

  const tideSamples = React.useMemo(
    () =>
      tideRows.map((row) => ({
        x: new Date(row.timestamp).getTime(),
        tide: row.tideLevelFt ?? 0,
      })),
    [tideRows]
  );

  const sunrise = "6:56 AM";
  const sunset = "4:55 PM";
  const previewCounty = "Orange";

  const sunSegments = React.useMemo<SharedSunSegments>(() => {
    const segments = buildSunSegments(PREVIEW_HOURS, sunrise, sunset);
    return {
      ...segments,
      sunrise,
      sunset,
      baseDate: windowStart,
    };
  }, [sunrise, sunset, windowStart]);

  const previewDaily = React.useMemo<DailyConditions>(() => {
    const dateKey = windowStart.toISOString().split("T")[0] ?? "today";
    return {
      county: previewCounty,
      date: dateKey,
      moon_phase: 0.42,
      sunrise,
      sunset,
    };
  }, [previewCounty, sunrise, sunset, windowStart]);

  const previewBeachDetails = React.useMemo<
    Record<string, unknown> & { COUNTY?: string | null }
  >(
    () => ({
      COUNTY: previewCounty,
      PARKING: true,
      RESTROOMS: true,
      DOG_FRIEND: true,
      SNDY_BEACH: true,
      SURFING: true,
    }),
    [previewCounty]
  );

  const slides = React.useMemo<Slide[]>(
    () => [
      {
        key: "summary",
        label: "Summary",
        eyebrow: "Overview",
        icon: Sparkles,
        render: () => (
          <SummarySlide
            beachId={previewBeach.id}
            forecastRows={forecastRows}
            date={basisDate}
            preview={{
              current: previewForecast,
              tides: tideRows,
              dailyConditions: previewDaily,
              beachDetails: previewBeachDetails,
            }}
          />
        ),
      },
      {
        key: "charts",
        label: "Forecast",
        eyebrow: "Charts",
        icon: Droplets,
        render: () => (
          <ChartsSlide
            beachId={previewBeach.id}
            forecastRows={forecastRows}
            tideSamples={tideSamples}
            tideRows={tideRows}
            date={basisDate}
            hour={basisHour}
            windowStart={windowStart}
            sunSegments={sunSegments}
            highlightPreview={{
              county: previewCounty,
              dailyConditions: previewDaily,
            }}
          />
        ),
      },
      {
        key: "beaches",
        label: "Beach",
        eyebrow: "Browse",
        icon: MapPin,
        render: () => (
          <BeachPreviewSlide
            beach={{
              ...previewBeach,
              id: "000b44bb-e4b7-452b-b28b-dd596d202cdf",
              name: "10th Street Beach",
              region: "Orange County, CA",
            }}
            forecast={previewForecast}
          />
        ),
      },
      {
        key: "filters",
        label: "Filters",
        eyebrow: "Beaches",
        icon: Filter,
        render: () => (
          <FiltersPanel
            open
            appliedFilters={filtersPreview}
            onClose={() => {}}
            onApply={(next) => setFiltersPreview(new Set(next))}
            className="h-full rounded-none border-none"
          />
        ),
      },
    ],
    [
      basisDate,
      basisHour,
      filtersPreview,
      forecastRows,
      previewBeach,
      previewBeachDetails,
      previewCounty,
      previewDaily,
      previewForecast,
      sunSegments,
      tideRows,
      tideSamples,
      windowStart,
    ]
  );

  React.useEffect(() => {
    if (paused || prefersReducedMotion) return;
    const id = window.setInterval(() => {
      setActive((v) => (v + 1) % slides.length);
    }, 5600);
    return () => window.clearInterval(id);
  }, [paused, prefersReducedMotion, slides.length]);

  const activeSlide = slides[active] ?? slides[0];

  return (
    <div
      ref={deckContainerRef}
      className="relative w-full h-[760px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="absolute xl:left-3/5 left-1/2 top-1/2"
        style={{
          width: 540,
          height: 760,
          transform: `translate(-63%, -63%) scale(${deckScale})`,
          transformOrigin: "center",
          scale: 0.8,
        }}
      >
        <div className="absolute -inset-6 rounded-[46px] bg-gradient-to-br from-cyan-500/12 via-transparent to-indigo-500/12 blur-2xl ww-hero-float motion-reduce:animate-none" />

        <div
          className={cn(
            "relative h-full rounded-[38px] border border-border/50 bg-highlight-7 p-3 shadow-[0_18px_55px_rgba(0,0,0,0.10)] flex flex-col"
          )}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[38px] ring-1 ring-inset ring-white/10" />

          <div className="relative z-10 flex items-start justify-between gap-3 px-4 pt-2 pb-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm">
              {(() => {
                const Icon = activeSlide?.icon ?? Sparkles;
                return <Icon className="h-4 w-4" aria-hidden="true" />;
              })()}
              <span className="hidden @min-sm:inline">
                {activeSlide?.eyebrow}
              </span>
              <span className="text-muted-foreground">•</span>
              <span>{activeSlide?.label}</span>
            </div>

            <div className="flex items-center gap-1">
              {slides.map((s, idx) => (
                <button
                  key={s.key}
                  type="button"
                  aria-label={`Show ${s.label}`}
                  aria-pressed={idx === active}
                  onClick={() => setActive(idx)}
                  className={cn(
                    "h-8 w-8 rounded-full border border-border/40 bg-background text-xs font-semibold text-foreground/80 shadow-sm transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15",
                    idx === active
                      ? "bg-foreground text-background"
                      : "hover:bg-highlight-6/50"
                  )}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex-1 min-h-0 overflow-hidden rounded-[32px]">
            <AnimatePresence mode="wait" initial={false}>
              {activeSlide ? (
                <motion.div
                  key={activeSlide.key}
                  className="absolute inset-0"
                  initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -6 }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.28,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <div className="h-full rounded-[32px] border border-border/35 bg-background shadow-even overflow-hidden">
                    {activeSlide.render()}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
