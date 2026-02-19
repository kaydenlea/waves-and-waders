"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { cn, getPacificDayRange } from "@/lib/utils";
import GradientCircle from "../general/Stats/GradientCircle";
import Tag from "../general/Tag";
import WindStat from "../general/Stats/WindStat";
import SurfStat from "../general/Stats/SurfStat";

import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Navigation2,
  Sunrise,
  Sunset,
  Timer,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import {
  BEACH_FEATURE_ICONS,
  DEFAULT_FEATURE_ICON,
} from "@/lib/beachFeatureIcons";

import {
  useBeachForecast,
  useCurrentConditions,
  useBeachTides,
  useDailyConditions,
  useBeachDetails,
} from "@/lib/hooks/useBeachData";
import { FEATURE_COLUMNS, getFeatureDisplayName } from "@/lib/supabase";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

type SummaryStat =
  | {
      type: "temperature";
      waterTempHigh?: number;
      waterTempLow?: number;
      airTempHigh?: number;
      airTempLow?: number;
      waterTempPercent?: number;
      airTempPercent?: number;
      weatherCode?: number | null;
    }
  | {
      type: "tide";
      currentHeight?: number;
      peaks: TidePeak[];
      sunrise?: string;
      sunset?: string;
    }
  | {
      type: "wind";
      wind: {
        speed: number;
        loc?: string;
        gust?: number;
        intensity: number;
        direction?: number;
      };
    }
  | {
      type: "surf";
      surf: { height: string; period: number; intensity: number };
    }
  | {
      type: "features";
      tags: {
        label: string;
        icon: React.ReactNode;
        color: string;
        rank?: number;
      }[];
    };

type TidePointValue = { x: number; tide: number };
type TidePeak = {
  kind: "high" | "low";
  time: Date | null;
  level: number | null;
};

type FeatureTag = {
  label: string;
  icon: React.ReactNode;
  color: string;
  rank?: number;
};

const DEGREE = "\u00b0F";
const TAGS_POPOVER_PAGE_SIZE = 10;

const TagsOverflowPopover = ({
  tags,
  contentClassName,
  wrapClassName,
  tagClassName,
}: {
  tags: FeatureTag[];
  contentClassName: string;
  wrapClassName?: string;
  tagClassName?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (open) setPage(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("touchmove", close, { passive: true });
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("touchmove", close);
    };
  }, [open]);

  const pageCount = Math.max(
    1,
    Math.ceil(tags.length / TAGS_POPOVER_PAGE_SIZE),
  );
  const safePage = Math.min(Math.max(0, page), Math.max(0, pageCount - 1));
  const start = safePage * TAGS_POPOVER_PAGE_SIZE;
  const pageTags = tags.slice(start, start + TAGS_POPOVER_PAGE_SIZE);
  const canPrev = safePage > 0;
  const canNext = safePage < pageCount - 1;

  const dotItems = useMemo(() => {
    type DotItem =
      | { type: "page"; idx: number }
      | { type: "ellipsis"; key: string };
    const maxDots = 7;
    if (pageCount <= maxDots) {
      return Array.from({ length: pageCount }, (_, idx) => ({
        type: "page" as const,
        idx,
      }));
    }

    const windowSize = 5;
    const half = Math.floor(windowSize / 2);
    let startIdx = Math.max(1, safePage - half);
    let endIdx = Math.min(pageCount - 2, safePage + half);
    const actualWindow = endIdx - startIdx + 1;
    if (actualWindow < windowSize) {
      const missing = windowSize - actualWindow;
      if (startIdx === 1) {
        endIdx = Math.min(pageCount - 2, endIdx + missing);
      } else if (endIdx === pageCount - 2) {
        startIdx = Math.max(1, startIdx - missing);
      }
    }

    const items: DotItem[] = [{ type: "page", idx: 0 }];
    if (startIdx > 1) items.push({ type: "ellipsis", key: "l" });
    for (let i = startIdx; i <= endIdx; i++)
      items.push({ type: "page", idx: i });
    if (endIdx < pageCount - 2) items.push({ type: "ellipsis", key: "r" });
    items.push({ type: "page", idx: pageCount - 1 });
    return items;
  }, [pageCount, safePage]);

  const pagerButtonClassName = cn(
    "h-7 w-7 rounded-full border border-border/35 bg-background/90 text-foreground shadow-sm backdrop-blur-sm",
    "transition disabled:opacity-40 disabled:pointer-events-none",
    "hover:bg-highlight-6/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15",
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        title="More features"
        className="more-button shrink-0 px-2.5 py-2 rounded-full bg-foreground/5 hover:bg-foreground/8 border border-border/25 text-[13px] text-muted-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:ring-offset-0"
      >
        +{tags.length}
      </PopoverTrigger>
      <PopoverContent className={contentClassName}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border/25 pb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-foreground">
                Tags
              </span>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {tags.length}
              </span>
            </div>

            {pageCount > 1 ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous tags page"
                  disabled={!canPrev}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className={pagerButtonClassName}
                >
                  <ChevronLeft className="h-4 w-4 mx-auto" aria-hidden="true" />
                </button>
                <div className="flex items-center justify-center gap-1">
                  {dotItems.map((item, idx) =>
                    item.type === "ellipsis" ? (
                      <span
                        key={`${item.key}-${idx}`}
                        aria-hidden="true"
                        className="px-1 text-xs text-muted-foreground/70"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item.idx}
                        type="button"
                        aria-label={`Tags page ${item.idx + 1}`}
                        aria-current={
                          item.idx === safePage ? "page" : undefined
                        }
                        onClick={() => setPage(item.idx)}
                        className={cn(
                          "h-3 w-3 rounded-full grid place-items-center",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "h-2.5 w-2.5 rounded-full transition-colors",
                            item.idx === safePage
                              ? "bg-foreground/75"
                              : "bg-foreground/20 hover:bg-foreground/30",
                          )}
                        />
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Next tags page"
                  disabled={!canNext}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  className={pagerButtonClassName}
                >
                  <ChevronRight
                    className="h-4 w-4 mx-auto"
                    aria-hidden="true"
                  />
                </button>
              </div>
            ) : null}
          </div>

          {wrapClassName ? (
            <div className={wrapClassName}>
              {pageTags.map((tag) => (
                <Tag key={tag.label} className={tagClassName} data={tag} />
              ))}
            </div>
          ) : (
            pageTags.map((tag) => (
              <Tag key={tag.label} className={tagClassName} data={tag} />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const toTitleCase = (value: string) =>
  value.length === 0 ? value : `${value[0].toUpperCase()}${value.slice(1)}`;

const toFtRangeLabel = (raw: string) => raw.replace("-", "–");

const toCompass = (deg?: number | null): string | null => {
  if (deg == null || !Number.isFinite(deg)) return null;
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ] as const;
  const idx = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return directions[idx] ?? null;
};

const averageDirectionDeg = (values: number[]): number | null => {
  if (!values || values.length === 0) return null;
  let x = 0;
  let y = 0;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    const r = (v * Math.PI) / 180;
    x += Math.cos(r);
    y += Math.sin(r);
  }
  if (x === 0 && y === 0) return null;
  const a = (Math.atan2(y, x) * 180) / Math.PI;
  return ((a % 360) + 360) % 360;
};

type HighlightToken = {
  text: string;
  className: string;
};

const emphasizeText = (text: string, tokens: HighlightToken[]) => {
  if (!tokens.length) return text;

  const remainingTokens = tokens
    .map((t) => ({ ...t, text: t.text.trim() }))
    .filter((t) => t.text.length > 0);

  if (!remainingTokens.length) return text;

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let nextIndex = -1;
    let nextToken: HighlightToken | null = null;

    for (const token of remainingTokens) {
      const idx = text.indexOf(token.text, cursor);
      if (idx === -1) continue;
      if (nextIndex === -1 || idx < nextIndex) {
        nextIndex = idx;
        nextToken = token;
      }
    }

    if (nextIndex === -1 || !nextToken) {
      nodes.push(text.slice(cursor));
      break;
    }

    if (nextIndex > cursor) {
      nodes.push(text.slice(cursor, nextIndex));
    }

    nodes.push(
      <span
        key={`${nextIndex}-${nextToken.text}`}
        className={nextToken.className}
      >
        {nextToken.text}
      </span>,
    );

    cursor = nextIndex + nextToken.text.length;
  }

  return nodes;
};

const statusGradientTrackClass =
  "bg-gradient-to-r from-emerald-500/40 via-amber-500/35 to-rose-500/35 dark:from-emerald-400/35 dark:via-amber-400/30 dark:to-rose-400/30";

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
};

const parseSurfMaxFt = (range: string): number | null => {
  if (!range || range === "-") return null;
  const match = range.match(/(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?/);
  if (!match) return null;
  const maxStr = match[2] ?? match[1];
  const max = Number(maxStr);
  return Number.isFinite(max) ? max : null;
};

function MiniMarkerTrack({
  value,
  min,
  max,
  label,
}: {
  value: number | null;
  min: number;
  max: number;
  label: string;
}) {
  if (value == null || !Number.isFinite(value) || max <= min) return null;
  const t = clamp01((value - min) / (max - min));
  const markerW = "0.375rem"; // w-1.5
  return (
    <div className="mt-0.5">
      <div
        className="relative h-[4px] w-full overflow-visible"
        aria-hidden="true"
      >
        <div className="relative h-[4px] w-full overflow-hidden rounded-full bg-foreground/10">
          <div className={cn("absolute inset-0", statusGradientTrackClass)} />
        </div>
        <div
          className={cn(
            "absolute top-1/2 h-[10px] w-1.5 -translate-y-1/2 rounded-full",
            "bg-background dark:bg-foreground shadow-md ring-1 ring-foreground/40 dark:ring-background/55",
            "outline outline-2 outline-foreground/15 dark:outline-background/80",
          )}
          style={{
            left: `clamp(0px, calc(${
              t * 100
            }% - (${markerW} / 2)), calc(100% - ${markerW}))`,
          }}
        />
      </div>
      <span className="sr-only">{`${label}: ${Math.round(t * 100)}%`}</span>
    </div>
  );
}

function SegmentedFillMeter({
  value,
  min,
  max,
  label,
  segments = 4,
}: {
  value: number | null;
  min: number;
  max: number;
  label: string;
  segments?: number;
}) {
  if (value == null || !Number.isFinite(value) || max <= min) return null;
  const t = clamp01((value - min) / (max - min));
  const scaled = t * segments;

  const fillClassName =
    t <= 0.33
      ? "bg-gradient-to-r from-emerald-500/85 to-emerald-400/65 dark:from-emerald-400/75 dark:to-emerald-300/55"
      : t <= 0.66
        ? "bg-gradient-to-r from-amber-500/85 to-orange-400/65 dark:from-amber-400/75 dark:to-orange-300/55"
        : "bg-gradient-to-r from-rose-500/85 to-rose-400/65 dark:from-rose-400/75 dark:to-rose-300/55";
  const segmentBaseClass =
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]";

  return (
    <div className="mt-0.5">
      <div className="flex items-center gap-1" aria-hidden="true">
        {Array.from({ length: segments }).map((_, idx) => {
          const segFill = clamp01(scaled - idx);
          return (
            <span
              key={idx}
              className={cn(
                "relative h-2 flex-1 overflow-hidden rounded-[3px]",
                segmentBaseClass,
                "bg-foreground/10 dark:bg-foreground/14",
              )}
            >
              {segFill > 0 ? (
                <span
                  className={cn("absolute inset-y-0 left-0", fillClassName)}
                  style={{ width: `${segFill * 100}%` }}
                />
              ) : null}
            </span>
          );
        })}
      </div>
      <span className="sr-only">{`${label}: ${Math.round(t * 100)}%`}</span>
    </div>
  );
}

function DirectionWidget({
  rotation,
  label,
  ariaLabel,
}: {
  rotation: number;
  label: string | null | undefined;
  ariaLabel: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 grid place-items-center size-10 @min-md:size-12 rounded-xl @min-md:rounded-2xl",
        "border border-border/25 bg-foreground/[0.03] shadow-sm",
        "dark:bg-foreground/[0.07] dark:shadow-[0_12px_30px_rgba(0,0,0,0.25)]",
      )}
      aria-label={ariaLabel}
    >
      <div className="flex flex-col items-center justify-center gap-0.5 leading-none">
        <span className="leading-none">
          <Navigation2
            className="h-4 w-4 @min-md:h-5 @min-md:w-5 text-foreground/70"
            style={{ transform: `rotate(${rotation}deg)` }}
            aria-hidden="true"
          />
        </span>
        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground leading-none">
          {label ?? "--"}
        </span>
      </div>
    </div>
  );
}

const computeTidePeaks = (
  points: TidePointValue[],
  isToday: boolean = false,
  windowStartMs?: number,
): TidePeak[] => {
  if (!points || points.length < 2) return [];
  const sorted = [...points].sort((a, b) => a.x - b.x);

  // First pass: identify all potential peaks
  const potentialPeaks: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const prev = i > 0 ? sorted[i - 1] : null;
    const curr = sorted[i];
    const next = i < sorted.length - 1 ? sorted[i + 1] : null;

    // Special case: For today, don't mark the first point as a peak
    // because there's no previous data to confirm it's actually a peak.
    // This prevents false peaks at 12 AM or shortly after when no prior data exists.
    if (isToday && i === 0 && !prev) {
      continue;
    }

    // Must have at least one neighbor
    if (!prev && !next) continue;

    const tide = curr.tide;

    // Check if it's a high tide (local maximum)
    const isHigh =
      (!prev || tide >= prev.tide) &&
      (!next || tide >= next.tide) &&
      ((prev && tide > prev.tide) || (next && tide > next.tide));

    // Check if it's a low tide (local minimum)
    const isLow =
      (!prev || tide <= prev.tide) &&
      (!next || tide <= next.tide) &&
      ((prev && tide < prev.tide) || (next && tide < next.tide));

    if (isHigh || isLow) {
      potentialPeaks.push(i);
    }
  }

  // Second pass: remove duplicate peaks (consecutive points with same tide value)
  const peaks: TidePeak[] = [];
  for (let i = 0; i < potentialPeaks.length; i++) {
    const idx = potentialPeaks[i];
    const curr = sorted[idx];

    // Look ahead to find all consecutive peaks with the same tide value
    let j = i + 1;
    const sameTidePeaks = [idx];

    while (j < potentialPeaks.length) {
      const nextIdx = potentialPeaks[j];
      const nextPeak = sorted[nextIdx];

      // If same tide value (within 0.1 ft tolerance), add to group
      if (Math.abs(curr.tide - nextPeak.tide) < 0.1) {
        sameTidePeaks.push(nextIdx);
        j++;
      } else {
        break;
      }
    }

    // If we found multiple peaks with the same tide value, only keep the middle one
    let selectedIdx = idx;
    if (sameTidePeaks.length > 1) {
      const middleIndex = Math.floor(sameTidePeaks.length / 2);
      selectedIdx = sameTidePeaks[middleIndex];
      i = j - 1; // Skip all the peaks we just processed
    }

    const selectedPoint = sorted[selectedIdx];
    const prev = selectedIdx > 0 ? sorted[selectedIdx - 1] : null;
    const next =
      selectedIdx < sorted.length - 1 ? sorted[selectedIdx + 1] : null;
    const isHigh =
      (!prev || selectedPoint.tide >= prev.tide) &&
      (!next || selectedPoint.tide >= next.tide);

    peaks.push({
      kind: isHigh ? "high" : "low",
      time: new Date(selectedPoint.x),
      level: Number(selectedPoint.tide.toFixed(1)),
    });
  }

  return peaks;
};

const average = (values: number[]): number | null => {
  if (!values || values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
};

export const clampIntensity = (value: number, max: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(100, Math.round((value / max) * 100));
};

const describeSurf = (intensity?: number) => {
  if (intensity == null || !Number.isFinite(intensity)) return "calm";
  if (intensity >= 75) return "huge";
  if (intensity >= 50) return "pumping";
  if (intensity >= 25) return "moderate";
  return "calm";
};

const describeWind = (speed?: number) => {
  if (speed == null || !Number.isFinite(speed)) return "light";
  if (speed >= 25) return "strong";
  if (speed >= 15) return "moderate";
  if (speed >= 8) return "gentle";
  return "light";
};

const describeEnergy = (energyKj?: number | null) => {
  if (energyKj == null || !Number.isFinite(energyKj)) return null;
  if (energyKj >= 70) return "very high";
  if (energyKj >= 40) return "high";
  if (energyKj >= 20) return "moderate";
  return "low";
};

const SURF_HEIGHT_CAP = 12;
const WIND_SPEED_CAP = 40;
const TEMP_CAP = 100; // For temperature circles

function SummaryLoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-20 rounded-[22px]",
        "bg-background/20 dark:bg-background/10",
        "supports-[backdrop-filter]:bg-background/10 supports-[backdrop-filter]:backdrop-blur-[1px]",
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          "absolute inset-0 rounded-[22px]",
          "bg-gradient-to-b from-transparent via-background/20 to-background/25",
          "opacity-70 motion-safe:animate-pulse motion-reduce:opacity-60",
        )}
      />
    </div>
  );
}

const createInitialStats = (): SummaryStat[] => [
  {
    type: "surf",
    surf: {
      height: "-",
      period: 0,
      intensity: 0,
    },
  },
  {
    type: "wind",
    wind: {
      speed: 0,
      gust: 0,
      loc: "-",
      intensity: 0,
      direction: 0,
    },
  },
  {
    type: "tide",
    currentHeight: undefined,
    peaks: [],
    sunrise: "-:-- AM",
    sunset: "-:-- PM",
  },
  {
    type: "temperature",
    waterTempHigh: undefined,
    waterTempLow: undefined,
    airTempHigh: undefined,
    airTempLow: undefined,
    waterTempPercent: undefined,
    airTempPercent: undefined,
    weatherCode: undefined,
  },
  { type: "features", tags: [] },
];

import type { DailyConditions, ForecastData, TidePoint } from "@/lib/supabase";

const Summary = ({
  beachId,
  date,
  forecastRows,
  forecastLoading,
  variant = "default",
  previewData,
}: {
  beachId?: string;
  date?: Date;
  forecastRows?: ForecastData[] | null;
  forecastLoading?: boolean;
  variant?: "default" | "overview";
  previewData?: {
    current?: ForecastData | null;
    tides?: TidePoint[] | null;
    dailyConditions?: DailyConditions | null;
    beachDetails?:
      | (Record<string, unknown> & { COUNTY?: string | null })
      | null;
  };
}) => {
  const isOverviewVariant = variant === "overview";
  type CommittedSummary = {
    key: string;
    dayStartMs: number;
    dayEndMs: number;
    stats: SummaryStat[];
    tags: FeatureTag[];
    forecast: ForecastData[];
  };
  const [committed, setCommitted] = useState<CommittedSummary | null>(null);
  const committedRef = useRef<CommittedSummary | null>(null);

  const targetDateValue = date instanceof Date ? date : undefined;

  const timeWindow = useMemo(() => {
    const { start, end } = getPacificDayRange(targetDateValue);
    const tideBuffer = 6 * 60 * 60 * 1000;
    return {
      dayStart: start,
      dayEnd: end,
      tideStart: new Date(start.getTime() - tideBuffer),
      tideEnd: new Date(end.getTime() + tideBuffer),
    };
  }, [targetDateValue]);

  const pendingKey = useMemo(() => {
    if (!beachId) return null;
    return `${String(
      beachId,
    )}:${timeWindow.dayStart.getTime()}:${timeWindow.dayEnd.getTime()}`;
  }, [beachId, timeWindow.dayStart, timeWindow.dayEnd]);

  const hasExternalForecast = Array.isArray(forecastRows);

  // TODO(overview-perf): When a shared daily `ForecastDataContext` is present (as on `/[beach]/overview`),
  // prefer reusing those rows here instead of starting an independent `useBeachForecast` query for the
  // same day range, so Summary stays in lockstep with Highlights and the overview charts.
  const {
    data: forecastFromQuery = [],
    isSuccess: forecastSuccessRaw,
    isError: forecastErrorRaw,
  } = useBeachForecast(
    beachId ?? null,
    timeWindow.dayStart,
    timeWindow.dayEnd,
    Boolean(beachId) && !hasExternalForecast,
  );

  const forecast: ForecastData[] = hasExternalForecast
    ? (forecastRows ?? [])
    : (forecastFromQuery as ForecastData[]);

  const forecastSuccess =
    (hasExternalForecast && !forecastLoading && forecast.length > 0) ||
    (!hasExternalForecast && forecastSuccessRaw);

  const forecastError = !hasExternalForecast && forecastErrorRaw ? true : false;
  const usingPreview = Boolean(previewData);
  const shouldFetch = Boolean(beachId) && !usingPreview;

  const { data: currentFromQuery } = useCurrentConditions(
    beachId ?? null,
    shouldFetch,
  );
  const current = usingPreview
    ? (previewData?.current ?? null)
    : currentFromQuery;
  const {
    data: tidesFromQuery = [],
    isSuccess: tidesSuccess,
    isError: tidesError,
  } = useBeachTides(
    beachId ?? null,
    timeWindow.tideStart,
    timeWindow.tideEnd,
    shouldFetch,
  );
  const {
    data: beachDetailsFromQuery,
    isSuccess: beachDetailsSuccess,
    isError: beachDetailsError,
  } = useBeachDetails(beachId ?? null, shouldFetch);

  const tides = usingPreview ? (previewData?.tides ?? []) : tidesFromQuery;
  const beachDetails = usingPreview
    ? (previewData?.beachDetails ?? null)
    : (beachDetailsFromQuery as unknown as Record<string, unknown> | null);
  const county =
    (beachDetails as { COUNTY?: string | null } | null)?.COUNTY ?? null;
  const {
    data: dailyConditionsFromQuery,
    isSuccess: dailySuccess,
    isError: dailyError,
  } = useDailyConditions(
    county,
    targetDateValue ?? timeWindow.dayStart,
    Boolean(county) && !usingPreview,
  );
  const dailyConditions = usingPreview
    ? (previewData?.dailyConditions ?? null)
    : (dailyConditionsFromQuery as DailyConditions | null);
  const forecastReady = usingPreview
    ? forecast.length > 0
    : forecastSuccess || forecastError;
  const tidesReady = usingPreview ? true : tidesSuccess || tidesError;
  const beachDetailsReady = usingPreview
    ? true
    : beachDetailsSuccess || beachDetailsError;
  const dailyReady = usingPreview
    ? true
    : beachDetailsReady
      ? county
        ? dailySuccess || dailyError
        : true
      : false;

  useEffect(() => {
    if (!beachId) {
      setCommitted(null);
      committedRef.current = null;
      return;
    }

    // Once we've committed a snapshot for this (beach, day) key, keep it stable.
    // This prevents cached-date switches from "staggering" updates as individual
    // queries refetch and resolve at different times.
    if (pendingKey && committedRef.current?.key === pendingKey) {
      return;
    }

    if (!forecastReady || !tidesReady || !dailyReady) {
      return;
    }

    const base = targetDateValue ? forecast[0] : (current ?? forecast[0]);
    if (!base) {
      return;
    }

    const nextStats: SummaryStat[] = [];

    const representativeRows = forecast
      .map((row) => {
        const h1 = row?.swell?.primary?.height ?? 0;
        const p1 = row?.swell?.primary?.period ?? 10;
        const h2 = row?.swell?.secondary?.height ?? 0;
        const p2 = row?.swell?.secondary?.period ?? 10;
        const h3 = row?.swell?.tertiary?.height ?? 0;
        const p3 = row?.swell?.tertiary?.period ?? 10;
        const s1 = h1 * Math.sqrt(Math.max(0, p1) / 10);
        const s2 = h2 * Math.sqrt(Math.max(0, p2) / 10);
        const s3 = h3 * Math.sqrt(Math.max(0, p3) / 10);
        const combined = Math.sqrt(
          Math.pow(1.0 * s1, 2) +
            Math.pow(0.6 * s2, 2) +
            Math.pow(0.3 * s3, 2),
        );
        const wind = row?.conditions?.windSpeed ?? 0;
        const windPenalty = Math.min(0.5, Math.max(0, (wind - 5) / 35));
        const effective = Math.max(0, combined * (1 - windPenalty));
        const minH = row?.surf?.heightMin;
        const maxH = row?.surf?.heightMax;
        const estimate =
          minH != null && maxH != null
            ? (minH + maxH) / 2
            : maxH != null
              ? maxH
              : minH != null
                ? minH
                : 0;
        const representative =
          effective > 0 && estimate > 0
            ? effective * 0.7 + estimate * 0.3
            : effective > 0
              ? effective
              : estimate;
        if (!Number.isFinite(representative)) return null;
        const period = row?.swell?.primary?.period;
        return {
          representative: Math.max(0, representative),
          period:
            typeof period === "number" && !Number.isNaN(period) ? period : null,
        };
      })
      .filter(
        (
          value,
        ): value is { representative: number; period: number | null } =>
          value != null,
      );

    const avgRep = average(representativeRows.map((row) => row.representative));
    const periodValues = representativeRows
      .map((row) => row.period)
      .filter((v): v is number => v != null);
    const avgPeriod = average(periodValues);

    let surfHeightLabel: string | null = null;
    if (avgRep != null) {
      const low = Math.max(0, Math.floor(avgRep));
      const high = Math.max(low + 1, Math.ceil(avgRep));
      surfHeightLabel = `${low}-${high}`;
    }
    const surfPeriod = avgPeriod != null ? Math.round(avgPeriod) : null;

    if (surfHeightLabel && surfPeriod != null) {
      const surfIntensity = clampIntensity(avgRep ?? 0, SURF_HEIGHT_CAP);
      nextStats.push({
        type: "surf",
        surf: {
          height: surfHeightLabel,
          period: surfPeriod,
          intensity: surfIntensity,
        },
      });
    }

    const windSpeeds = forecast
      .map((row) => row?.conditions?.windSpeed)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value),
      );
    const windGusts = forecast
      .map((row) => row?.conditions?.windGust)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value),
      );
    const windDirections = forecast
      .map((row) => row?.conditions?.windDirection)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value),
      );

    const avgWindSpeed = average(windSpeeds);
    const avgWindGust = average(windGusts);
    const avgWindDirection = average(windDirections);

    const resolvedWindSpeed =
      avgWindSpeed != null ? Math.round(avgWindSpeed) : null;
    const resolvedWindGust =
      avgWindGust != null ? Math.round(avgWindGust) : undefined;
    const resolvedWindDirection =
      avgWindDirection != null ? Math.round(avgWindDirection) : undefined;

    if (resolvedWindSpeed != null) {
      const windIntensity = clampIntensity(resolvedWindSpeed, WIND_SPEED_CAP);

      nextStats.push({
        type: "wind",
        wind: {
          speed: resolvedWindSpeed,
          gust: resolvedWindGust,
          loc: resolvedWindGust == null ? "-" : undefined,
          intensity: windIntensity,
          direction: resolvedWindDirection,
        },
      });
    }

    const tideSeries: TidePointValue[] = tides
      .map((row) => {
        const tideFt =
          typeof row?.tideLevelFt === "number"
            ? row.tideLevelFt
            : typeof row?.tideLevelM === "number"
              ? row.tideLevelM * 3.28084
              : null;
        if (tideFt == null || Number.isNaN(tideFt)) return null;
        return {
          x: new Date(row.timestamp).getTime(),
          tide: tideFt,
        };
      })
      .filter((point): point is TidePointValue => point !== null)
      .sort((a, b) => a.x - b.x);

    const today = new Date();
    // Check if the displayed day is today (regardless of whether targetDateValue is set)
    const displayedDate = targetDateValue ?? timeWindow.dayStart;
    const isToday =
      displayedDate.getFullYear() === today.getFullYear() &&
      displayedDate.getMonth() === today.getMonth() &&
      displayedDate.getDate() === today.getDate();

    const windowStartMs = timeWindow.dayStart.getTime();
    const windowEndMs = timeWindow.dayEnd.getTime();

    let tidePeaks = computeTidePeaks(tideSeries, isToday, windowStartMs);
    if (tidePeaks.length === 0 && forecast.length > 0) {
      const fallbackSeries: TidePointValue[] = forecast
        .map((row) => {
          const tideLevel = row?.conditions?.tideLevel;
          if (tideLevel == null || Number.isNaN(tideLevel)) return null;
          return {
            x: new Date(row.timestamp).getTime(),
            tide: tideLevel,
          };
        })
        .filter((point): point is TidePointValue => point !== null)
        .sort((a, b) => a.x - b.x);
      tidePeaks = computeTidePeaks(fallbackSeries, isToday, windowStartMs);
    }

    const peaksInWindow = tidePeaks.filter((peak) => {
      if (peak.time) {
        const peakTime = peak.time.getTime();
        return peakTime >= windowStartMs && peakTime <= windowEndMs;
      }
    });

    const tideStatPeaks = peaksInWindow.slice(0, 4);
    if (tideStatPeaks.length < 4) {
      let peakHighEvens = true;
      if (tideStatPeaks[0] && tideStatPeaks[0].kind === "low") {
        peakHighEvens = false;
      }
      for (let i = 0; i < 4; i++) {
        const peakCheck = peakHighEvens ? i % 2 === 0 : i % 2 !== 0;
        const peakType = peakCheck ? "high" : "low";
        if (!tideStatPeaks[i]) {
          tideStatPeaks.push({ kind: peakType, time: null, level: null });
        }
      }
    }

    let currentTideHeight: number | undefined;
    if (tides.length > 0) {
      const nowMs = Date.now();
      let bestDiff = Number.POSITIVE_INFINITY;
      tides.forEach((row) => {
        const tideFt =
          typeof row?.tideLevelFt === "number"
            ? row.tideLevelFt
            : typeof row?.tideLevelM === "number"
              ? row.tideLevelM * 3.28084
              : null;
        if (tideFt == null) {
          return;
        }
        const diff = Math.abs(new Date(row.timestamp).getTime() - nowMs);
        if (diff < bestDiff) {
          bestDiff = diff;
          currentTideHeight = Number(tideFt.toFixed(1));
        }
      });
    }
    if (
      currentTideHeight == null &&
      base.conditions.tideLevel != null &&
      Number.isFinite(base.conditions.tideLevel)
    ) {
      currentTideHeight = Number(base.conditions.tideLevel.toFixed(1));
    }

    let sunrise: string | undefined;
    let sunset: string | undefined;
    if (dailyConditions) {
      const dayForFormat = dailyConditions?.date
        ? new Date(`${dailyConditions.date}T00:00:00`)
        : new Date(targetDateValue ?? timeWindow.dayStart);
      const formatClock = (raw: string | null | undefined) => {
        if (!raw) return undefined;
        const match = /^([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?/.exec(
          raw.trim(),
        );
        if (!match) return undefined;
        const h = Number(match[1]);
        const m = Number(match[2]);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return undefined;

        const ts = new Date(dayForFormat);
        ts.setHours(h, m, 0, 0);

        return ts.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });
      };
      const resolvedSunrise = formatClock(dailyConditions?.sunrise);
      const resolvedSunset = formatClock(dailyConditions?.sunset);
      sunrise = resolvedSunrise ?? dailyConditions?.sunrise ?? undefined;
      sunset = resolvedSunset ?? dailyConditions?.sunset ?? undefined;
    }

    if (
      currentTideHeight != null ||
      tideStatPeaks.length > 0 ||
      sunrise ||
      sunset
    ) {
      nextStats.push({
        type: "tide",
        currentHeight: currentTideHeight,
        peaks: tideStatPeaks,
        sunrise,
        sunset,
      });
    }

    const waterTemps = forecast
      .map((row) => row?.conditions?.waterTemp)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value),
      );
    const airTemps = forecast
      .map((row) => row?.conditions?.airTemp)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value),
      );

    const waterTempHigh =
      waterTemps.length > 0 ? Math.round(Math.max(...waterTemps)) : undefined;
    const waterTempLow =
      waterTemps.length > 0 ? Math.round(Math.min(...waterTemps)) : undefined;
    const airTempHigh =
      airTemps.length > 0 ? Math.round(Math.max(...airTemps)) : undefined;
    const airTempLow =
      airTemps.length > 0 ? Math.round(Math.min(...airTemps)) : undefined;

    const weatherCodes = forecast
      .map((row) => row?.conditions?.weather)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value),
      );

    let dominantWeatherCode: number | null = null;
    if (weatherCodes.length > 0) {
      const codeCounts: Record<number, number> = {};
      for (const code of weatherCodes) {
        codeCounts[code] = (codeCounts[code] ?? 0) + 1;
      }
      let bestCount = -1;
      for (const code of Object.keys(codeCounts)) {
        const count = codeCounts[Number(code)];
        if (count > bestCount) {
          dominantWeatherCode = Number(code);
          bestCount = count;
        }
      }
    }

    if (waterTempHigh != null || airTempHigh != null) {
      nextStats.push({
        type: "temperature",
        waterTempHigh,
        waterTempLow,
        airTempHigh,
        airTempLow,
        waterTempPercent:
          waterTempHigh != null
            ? clampIntensity(waterTempHigh, TEMP_CAP)
            : undefined,
        airTempPercent:
          airTempHigh != null
            ? clampIntensity(airTempHigh, TEMP_CAP)
            : undefined,
        weatherCode: dominantWeatherCode,
      });
    }

    const featureTags: {
      label: string;
      icon: React.ReactNode;
      color: string;
      rank?: number;
    }[] = [];
    if (beachDetails) {
      const keys: string[] =
        typeof FEATURE_COLUMNS !== "undefined" && Array.isArray(FEATURE_COLUMNS)
          ? (FEATURE_COLUMNS as string[])
          : [
              "FISHING",
              "RESTROOMS",
              "PARKING",
              "DOG_FRIEND",
              "SNDY_BEACH",
              "LIFEGUARD",
            ];
      for (const key of keys) {
        if (key === "RSTRCTNS") continue;
        const val = (beachDetails as unknown as Record<string, unknown>)[key];
        if (val === true) {
          const label =
            typeof getFeatureDisplayName === "function"
              ? getFeatureDisplayName(key)
              : key;
          const def = BEACH_FEATURE_ICONS[key] ?? DEFAULT_FEATURE_ICON;
          featureTags.push({
            label,
            icon: def.icon,
            color: def.color,
            rank: def.rank,
          });
        }
      }
      featureTags.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    }
    nextStats.push({ type: "features", tags: featureTags });

    if (nextStats.length > 0 && pendingKey) {
      const nextCommitted: CommittedSummary = {
        key: pendingKey,
        dayStartMs: timeWindow.dayStart.getTime(),
        dayEndMs: timeWindow.dayEnd.getTime(),
        stats: nextStats,
        tags: featureTags,
        forecast,
      };
      committedRef.current = nextCommitted;
      setCommitted(nextCommitted);
    }
  }, [
    beachId,
    targetDateValue,
    forecast,
    current,
    tides,
    dailyConditions,
    beachDetails,
    timeWindow.dayStart.getTime(),
    timeWindow.dayEnd.getTime(),
    forecastReady,
    tidesReady,
    dailyReady,
    pendingKey,
  ]);

  const committedValue = committed ?? committedRef.current;
  const statsForRender = committedValue?.stats ?? createInitialStats();
  const tags = committedValue?.tags ?? [];
  const renderForecast = committedValue?.forecast ?? forecast;
  const showSkeletons = committedValue == null;
  const showOverlay = committedValue == null;
  const overviewStatsReady = committedValue != null;

  const surfStat = statsForRender.find(
    (stat): stat is Extract<SummaryStat, { type: "surf" }> =>
      stat.type === "surf",
  );
  const windStat = statsForRender.find(
    (stat): stat is Extract<SummaryStat, { type: "wind" }> =>
      stat.type === "wind",
  );
  const tideStat = statsForRender.find(
    (stat): stat is Extract<SummaryStat, { type: "tide" }> =>
      stat.type === "tide",
  );
  const tempStat = statsForRender.find(
    (stat): stat is Extract<SummaryStat, { type: "temperature" }> =>
      stat.type === "temperature",
  );

  const energyDay = useMemo(() => {
    const startMs = committedValue?.dayStartMs ?? timeWindow.dayStart.getTime();
    const endMs = committedValue?.dayEndMs ?? timeWindow.dayEnd.getTime();
    const values = renderForecast
      .map((row) => {
        const energy = row?.surf?.waveEnergy;
        if (typeof energy !== "number" || Number.isNaN(energy)) return null;
        const tMs = new Date(row.timestamp).getTime();
        if (!Number.isFinite(tMs)) return null;
        if (tMs < startMs || tMs > endMs) return null;
        return energy;
      })
      .filter((v): v is number => v != null);

    if (!values.length) {
      return {
        avg: null as number | null,
        min: null as number | null,
        max: null as number | null,
        intensity: null as string | null,
      };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = average(values);

    const minRounded = Number.isFinite(min) ? Math.round(min) : null;
    const maxRounded = Number.isFinite(max) ? Math.round(max) : null;
    const avgRounded = avg != null && Number.isFinite(avg) ? Math.round(avg) : null;
    const intensity = describeEnergy(avgRounded ?? maxRounded);

    return {
      avg: avgRounded,
      min: minRounded,
      max: maxRounded,
      intensity,
    };
  }, [
    committedValue?.dayEndMs,
    committedValue?.dayStartMs,
    renderForecast,
    timeWindow.dayEnd.getTime(),
    timeWindow.dayStart.getTime(),
  ]);

  const computedOverviewText = useMemo(() => {
    if (!overviewStatsReady) return null;

    const surfHeight = surfStat?.surf?.height || "N/A";
    const windSpeed = windStat?.wind?.speed;

    const surfCondition = describeSurf(surfStat?.surf?.intensity);

    const windCondition = describeWind(windSpeed);
    const windAction =
      windSpeed != null && windSpeed >= 25
        ? "whipping"
        : windSpeed != null && windSpeed >= 8
          ? "coming in"
          : "blowing";

    // Build sentence based on conditions
    let sentence = `The waves are ${surfHeight} ft and ${surfCondition}.`;

    if (windSpeed != null) {
      if (windSpeed >= 15) {
        sentence += ` Watch out for ${windCondition} winds ${windAction} at ${windSpeed} mph.`;
      } else {
        sentence += ` Winds are ${windCondition}, ${windAction} at ${windSpeed} mph.`;
      }
    } else {
      sentence += ` Wind conditions unavailable.`;
    }

    // Add wave energy information (replaces the temperature sentence)
    if (
      energyDay.avg != null &&
      energyDay.min != null &&
      energyDay.max != null &&
      energyDay.intensity
    ) {
      sentence += ` Wave energy is ${energyDay.intensity}, averaging ${energyDay.avg} kJ (${energyDay.min}\u2013${energyDay.max} kJ).`;
    } else if (energyDay.min != null && energyDay.max != null && energyDay.intensity) {
      sentence += ` Wave energy is ${energyDay.intensity} (${energyDay.min}\u2013${energyDay.max} kJ).`;
    } else {
      sentence += ` Wave energy unavailable.`;
    }

    return sentence;
  }, [
    overviewStatsReady,
    surfStat?.surf?.height,
    surfStat?.surf?.intensity,
    windStat?.wind?.speed,
    energyDay.avg,
    energyDay.intensity,
    energyDay.max,
    energyDay.min,
  ]);

  const gapPx = 12;
  const moreButtonReservePx = 60;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // widths for each tag (stable numbers used for layout decisions)
  const [tagWidths, setTagWidths] = useState<number[]>(() =>
    Array(tags.length).fill(0),
  );

  const [visibleCount, setVisibleCount] = useState(() => tags.length);

  // Create measurement nodes once (keys stable)
  const measurementNodes = useMemo(
    () =>
      tags.map((t, i) => (
        <div
          key={t.label ? `${t.label}-${i}` : String(i)}
          data-measure-index={i}
          style={{ display: "inline-block" }}
        >
          <Tag data={t} />
        </div>
      )),
    [tags],
  );

  // Synchronously measure tag widths in the off-screen measurement container
  const measureTagWidths = useCallback(() => {
    const measure = measureRef.current;
    if (!measure) return;
    const children = Array.from(measure.children) as HTMLElement[];
    const widths = children.map((el) => {
      const w = Math.ceil(el.getBoundingClientRect().width);
      return w;
    });
    if (widths.length === tags.length) {
      // Only update when changed to avoid extra re-renders
      let changed = false;
      if (tagWidths.length !== widths.length) changed = true;
      else {
        for (let i = 0; i < widths.length; i++) {
          if (tagWidths[i] !== widths[i]) {
            changed = true;
            break;
          }
        }
      }
      if (changed) setTagWidths(widths);
    }
  }, [tagWidths, tags.length]);

  // Compute visibleCount from container width and stable tagWidths
  const computeVisibleCount = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!tagWidths.length) return;

    const maxRows = (() => {
      try {
        const article = container.closest("article");
        if (!article) return 2;
        const end = globalThis.getComputedStyle(article).gridColumnEnd;
        const match = /span\s+(\d+)/.exec(end);
        const span = match ? Number(match[1]) : null;
        return span === 12 ? 1 : 2;
      } catch {
        return 2;
      }
    })();
    const fullWidth = (() => {
      const rawWidth = container.clientWidth;
      try {
        const style = globalThis.getComputedStyle(container);
        const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
        const paddingRight = Number.parseFloat(style.paddingRight) || 0;
        const contentWidth = rawWidth - paddingLeft - paddingRight;
        return Math.max(0, Math.floor(contentWidth));
      } catch {
        return Math.max(0, Math.floor(rawWidth));
      }
    })();

    const fits = (visible: number, includeMore: boolean) => {
      const widths: number[] = tagWidths.slice(0, visible);
      if (includeMore) widths.push(moreButtonReservePx);

      let row = 0;
      let rowTotal = 0;
      let rowCount = 0;

      for (let i = 0; i < widths.length; i++) {
        const w = widths[i] ?? 0;
        if (w > fullWidth) return false;

        const gapAdd = rowCount > 0 ? gapPx : 0;
        if (rowTotal + gapAdd + w <= fullWidth) {
          rowTotal += gapAdd + w;
          rowCount += 1;
          continue;
        }

        row += 1;
        if (row >= maxRows) return false;
        rowTotal = 0;
        rowCount = 0;
        i -= 1; // retry this item on the next row
      }

      return true;
    };

    // If everything fits without "+n", show everything.
    if (fits(tagWidths.length, false)) {
      setVisibleCount((prev) =>
        prev !== tagWidths.length ? tagWidths.length : prev,
      );
      return;
    }

    // Otherwise, find max visible such that "+n" also fits (only on the last row).
    let lo = 0;
    let hi = tagWidths.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (fits(mid, true)) lo = mid;
      else hi = mid - 1;
    }

    const count = lo;
    // update only if different (prevents oscillation)
    setVisibleCount((prev) => (prev !== count ? count : prev));
  }, [tagWidths, gapPx, moreButtonReservePx]);

  // Schedule compute with RAF (debounce)
  const scheduleCompute = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      computeVisibleCount();
      rafRef.current = null;
    });
  }, [computeVisibleCount]);

  const syncCompute = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    flushSync(() => {
      computeVisibleCount();
    });
  }, [computeVisibleCount]);

  // initial measurement after mount/update of measurement nodes
  React.useLayoutEffect(() => {
    // measure nodes synchronously once they are rendered into measureRef
    measureTagWidths();
    // compute visible count once widths are known
    scheduleCompute();
  }, [measurementNodes, measureTagWidths, scheduleCompute]);

  // Recompute when tagWidths change or container size changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // observe container resize
    const ro = new ResizeObserver(() => {
      // ResizeObserver fires before paint; flushing avoids a frame where the tags
      // render with the old row limit during breakpoint switches.
      syncCompute();
    });
    ro.observe(container);

    // also recompute if tagWidths update
    scheduleCompute();

    return () => {
      ro.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleCompute, syncCompute]);

  // If DOM fonts or images load might affect widths, also observe the measurement container for mutations
  useEffect(
    () => {
      const measure = measureRef.current;
      if (!measure) return;
      const mo = new MutationObserver(() => {
        measureTagWidths();
        scheduleCompute();
      });
      mo.observe(measure, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      return () => mo.disconnect();
    },
    [
      /* tags */
    ],
  );

  // Build visible/hidden slices
  const visibleItems = tags.slice(0, visibleCount);
  const hiddenItems = tags.slice(visibleCount);

  const primarySwellDirection = useMemo(() => {
    const directions = renderForecast
      .map((row) => row?.swell?.primary?.direction)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value),
      );
    return averageDirectionDeg(directions);
  }, [renderForecast]);

  const swellCompass = toCompass(primarySwellDirection);
  const swellRotation = primarySwellDirection ?? 0;

  const surfCondition = describeSurf(surfStat?.surf?.intensity);
  const windCondition = describeWind(windStat?.wind?.speed);

  const windCompass = toCompass(windStat?.wind?.direction);
  const windRotation =
    windStat?.wind?.direction != null ? windStat.wind.direction : 0;

  const outlookHeadline = overviewStatsReady
    ? `${toTitleCase(surfCondition)} surf`
    : null;
  const surfRangeLabel =
    surfStat?.surf?.height && surfStat.surf.height !== "-"
      ? toFtRangeLabel(surfStat.surf.height)
      : null;
  const surfPeriod =
    surfStat?.surf?.period != null ? `${surfStat.surf.period}s` : null;
  const windGust =
    windStat?.wind?.gust != null ? `${windStat.wind.gust}` : null;

  const tideNow = tideStat?.currentHeight ?? null;
  const tidePeaksWithTime = (tideStat?.peaks ?? [])
    .filter((p): p is TidePeak & { time: Date } => p.time instanceof Date)
    .sort((a, b) => a.time.getTime() - b.time.getTime());
  const tideReferenceMs = Date.now();
  const nextPeaks = (() => {
    if (!tidePeaksWithTime.length) return [];
    const upcoming = tidePeaksWithTime.filter(
      (p) => p.time.getTime() >= tideReferenceMs,
    );
    const source = upcoming.length ? upcoming : tidePeaksWithTime;
    return source.slice(0, 2);
  })();
  const nextPeak = nextPeaks[0] ?? null;
  const tideTrend =
    nextPeak?.kind === "high"
      ? "rising"
      : nextPeak?.kind === "low"
        ? "falling"
        : null;
  const tideLevels = [
    ...(tideStat?.peaks ?? [])
      .map((p) => p.level)
      .filter((v): v is number => v != null),
    ...(tideNow != null ? [tideNow] : []),
  ];
  const tideMin = tideLevels.length > 0 ? Math.min(...tideLevels) : null;
  const tideMax = tideLevels.length > 0 ? Math.max(...tideLevels) : null;

  const cardBase =
    "relative rounded-[22px] border border-border/25 bg-highlight-7/70 shadow-even supports-[backdrop-filter]:bg-highlight-7/40 supports-[backdrop-filter]:backdrop-blur-md";
  const cardHover = isOverviewVariant
    ? ""
    : "transition-shadow duration-200 ease-out motion-reduce:transition-none hover:z-10 hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_18px_50px_rgba(0,0,0,0.70),0_0_0_1px_rgba(255,255,255,0.08),0_12px_26px_rgba(255,255,255,0.04)] focus-within:ring-1 focus-within:ring-foreground/10";

  const kickerClass =
    "text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground";

  const outlookSentences = useMemo(() => {
    if (!computedOverviewText) return null;
    const parts = computedOverviewText
      .split(". ")
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p) => (p.endsWith(".") ? p : `${p}.`));
    return parts.length ? parts : null;
  }, [computedOverviewText]);

  const surfDayRange = useMemo(() => {
    const mins = renderForecast
      .map((row) => row?.surf?.heightMin)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value),
      );
    const maxes = renderForecast
      .map((row) => row?.surf?.heightMax)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value),
      );
    if (!mins.length && !maxes.length) return null;
    const minVal = mins.length ? Math.min(...mins) : Math.min(...maxes);
    const maxVal = maxes.length ? Math.max(...maxes) : Math.max(...mins);
    const minRounded = Math.round(minVal);
    const maxRounded = Math.round(maxVal);
    return {
      min: Number.isFinite(minRounded) ? minRounded : null,
      max: Number.isFinite(maxRounded) ? maxRounded : null,
    };
  }, [renderForecast]);

  const windDayRange = useMemo(() => {
    const speeds = renderForecast
      .map((row) => row?.conditions?.windSpeed)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value),
      );
    if (!speeds.length) return null;
    const minVal = Math.round(Math.min(...speeds));
    const maxVal = Math.round(Math.max(...speeds));
    return {
      min: Number.isFinite(minVal) ? minVal : null,
      max: Number.isFinite(maxVal) ? maxVal : null,
    };
  }, [renderForecast]);

  const surfNarrativeToken =
    surfStat?.surf?.height && surfStat.surf.height !== "-"
      ? `${surfStat.surf.height} ft`
      : null;
  const windSpeedToken =
    windStat?.wind?.speed != null ? `${windStat.wind.speed} mph` : null;
  const energyIntensityToken = energyDay.intensity;
  const energyAvgToken = energyDay.avg != null ? `${energyDay.avg} kJ` : null;
  const energyRangeToken =
    energyDay.min != null && energyDay.max != null
      ? `${energyDay.min}\u2013${energyDay.max} kJ`
      : null;

  const surfMaxFt = parseSurfMaxFt(surfStat?.surf?.height ?? "");

  if (isOverviewVariant) {
    return (
      <div className="grid grid-cols-12 gap-3 @min-md:gap-4">
        <article
          className={cn(
            cardBase,
            cardHover,
            usingPreview
              ? "col-span-12"
              : "col-span-12 @min-xl:col-span-8 @min-2xl:col-span-7 @min-3xl:col-span-9 @min-4xl:col-span-6",
            "p-4 flex flex-col gap-3 min-h-35 overflow-hidden",
          )}
          aria-label="Forecast outlook"
        >
          <SummaryLoadingOverlay show={showOverlay} />
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={kickerClass}>Summary</p>
              {!showSkeletons && outlookHeadline ? (
                <h2 className="mt-0.5 text-xl @min-md:text-2xl font-semibold tracking-tight">
                  {outlookHeadline}
                </h2>
              ) : (
                <div className="mt-1.5 max-w-[20rem]" aria-hidden="true">
                  <div className="h-6 w-3/5 rounded-md bg-foreground/12 animate-pulse motion-reduce:animate-none" />
                </div>
              )}
            </div>

            <div className="shrink-0 rounded-xl border border-border/25 bg-foreground/5 px-3 py-2 text-[11px] leading-4 text-muted-foreground tabular-nums">
              <dl className="grid grid-cols-[auto_48px] gap-x-2 gap-y-1 items-center">
                <dt className="flex items-center gap-1.5 uppercase tracking-[0.06em]">
                  <Sunrise
                    fill="#ff9f45ff"
                    className="stroke-muted-foreground w-4 h-4"
                    aria-hidden="true"
                  />
                  <span>Rise</span>
                </dt>
                <dd className="text-foreground font-medium tabular-nums">
                  {showSkeletons ? (
                    <span className="-mb-0.5 inline-block h-3 w-12 rounded bg-foreground/10 animate-pulse motion-reduce:animate-none" />
                  ) : (
                    (tideStat?.sunrise ?? "--")
                  )}
                </dd>
                <dt className="flex items-center gap-1.5 uppercase tracking-[0.06em]">
                  <Sunset
                    fill="#ff9f45ff"
                    className="stroke-muted-foreground w-4 h-4"
                    aria-hidden="true"
                  />
                  <span>Set</span>
                </dt>
                <dd className="text-foreground font-medium tabular-nums">
                  {showSkeletons ? (
                    <span className="-mb-0.5 inline-block h-3 w-12 rounded bg-foreground/10 animate-pulse motion-reduce:animate-none" />
                  ) : (
                    (tideStat?.sunset ?? "--")
                  )}
                </dd>
              </dl>
            </div>
          </header>

          <div className="mt-auto">
            {!showSkeletons && outlookSentences ? (
              <ul className="space-y-1">
                {outlookSentences.map((line, idx) => {
                  const Icon =
                    idx === 0 ? Waves : idx === 1 ? Wind : Zap;

                  const tokens: HighlightToken[] = [
                    ...(idx === 0 && surfNarrativeToken
                      ? [
                          {
                            text: surfNarrativeToken,
                            className: "font-semibold text-foreground",
                          },
                        ]
                      : []),
                    ...(idx === 0
                      ? [
                          {
                            text: surfCondition,
                            className: "font-semibold text-foreground",
                          },
                        ]
                      : []),
                    ...(idx === 1 && windSpeedToken
                      ? [
                          {
                            text: windSpeedToken,
                            className: "font-semibold text-foreground",
                          },
                        ]
                      : []),
                    ...(idx === 2 && energyIntensityToken
                      ? [
                          {
                            text: energyIntensityToken,
                            className: "font-semibold text-foreground",
                          },
                        ]
                      : []),
                    ...(idx === 2 && energyAvgToken
                      ? [
                          {
                            text: energyAvgToken,
                            className: "font-semibold text-foreground",
                          },
                        ]
                      : []),
                    ...(idx === 2 && energyRangeToken
                      ? [
                          {
                            text: energyRangeToken,
                            className: "font-semibold text-foreground",
                          },
                        ]
                      : []),
                  ];

                  return (
                    <li
                      key={`${idx}-${line}`}
                      className="flex items-start gap-2"
                    >
                      <span
                        className="-mt-0.5 shrink-0 grid place-items-center size-6 rounded-full bg-foreground/5 text-foreground/70"
                        aria-hidden="true"
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <p className="text-sm leading-snug text-muted-foreground">
                        {emphasizeText(line, tokens)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ul className="space-y-1" aria-hidden="true">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="-mt-0.5 shrink-0 grid place-items-center size-6 rounded-full bg-foreground/5" />
                    <span className="h-5 w-2/5 rounded-md bg-foreground/8 animate-pulse motion-reduce:animate-none" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>

        <article
          className={cn(
            cardBase,
            cardHover,
            usingPreview
              ? "col-span-6"
              : "col-span-6 @min-xl:col-span-4 @min-2xl:col-span-5 @min-3xl:col-span-3",
            "p-4 flex flex-col min-h-35 overflow-hidden",
          )}
          aria-label="Surf summary"
        >
          <SummaryLoadingOverlay show={showOverlay} />
          <header className="flex items-baseline justify-between gap-3">
            <p className={kickerClass}>Surf</p>
            {overviewStatsReady ? (
              <span className="rounded-full border border-border/25 bg-foreground/5 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {toTitleCase(surfCondition)}
              </span>
            ) : showSkeletons ? (
              <span
                className="h-[15px] w-18 rounded-full bg-foreground/8 animate-pulse motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : null}
          </header>

          <div className="mt-3 flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {showSkeletons ? (
                  <div className="space-y-2" aria-hidden="true">
                    <div className="h-7 w-20 rounded-md bg-foreground/10 animate-pulse motion-reduce:animate-none" />
                    <div className="h-4 w-16 rounded-md bg-foreground/8 animate-pulse motion-reduce:animate-none" />
                  </div>
                ) : (
                  <>
                    <div className="inline-flex items-baseline gap-1">
                      <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                        {surfRangeLabel ?? "--"}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        ft
                      </span>
                    </div>
                    <p className="mt-0 text-xs leading-snug text-muted-foreground">
                      {surfPeriod ? (
                        <span className="inline-flex items-center gap-1">
                          <Timer
                            className="h-3.5 w-3.5 text-muted-foreground/80"
                            aria-hidden="true"
                          />
                          <span className="font-medium tabular-nums text-foreground/80">
                            {surfPeriod}
                          </span>
                          <span className="sr-only">period</span>
                        </span>
                      ) : (
                        "\u00a0"
                      )}
                    </p>
                  </>
                )}
              </div>
              {showSkeletons ? (
                <div
                  className={cn(
                    "mt-[3px] shrink-0 grid place-items-center size-10 @min-md:size-12 rounded-xl @min-md:rounded-2xl",
                    "border border-border/25 bg-foreground/[0.03] shadow-sm",
                    "dark:bg-foreground/[0.07]",
                    "animate-pulse motion-reduce:animate-none",
                  )}
                  aria-hidden="true"
                />
              ) : (
                <DirectionWidget
                  rotation={swellRotation}
                  label={swellCompass}
                  ariaLabel="Swell direction"
                />
              )}
            </div>

            <div className="mt-auto pt-1.5 space-y-1.5">
              {!showSkeletons && surfMaxFt != null ? (
                <SegmentedFillMeter
                  label="Surf height"
                  value={surfMaxFt}
                  min={0}
                  max={SURF_HEIGHT_CAP}
                />
              ) : showSkeletons ? (
                <div
                  className="h-2 w-full rounded-[3px] bg-foreground/10 animate-pulse motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : null}
              <div className="flex items-center justify-between text-[11px] leading-4 text-muted-foreground">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          </div>
        </article>

        <article
          className={cn(
            cardBase,
            cardHover,
            usingPreview
              ? "col-span-6"
              : "col-span-6 @min-md:col-span-6 @min-xl:col-span-4 @min-2xl:col-span-4 @min-3xl:col-span-4 @min-4xl:col-span-3",
            "p-4 flex flex-col min-h-40 @min-sm:min-h-45 overflow-hidden",
          )}
          aria-label="Wind summary"
        >
          <SummaryLoadingOverlay show={showOverlay} />
          <header className="flex items-baseline justify-between gap-3">
            <p className={kickerClass}>Wind</p>
            {overviewStatsReady ? (
              <span className="rounded-full border border-border/25 bg-foreground/5 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {toTitleCase(windCondition)}
              </span>
            ) : showSkeletons ? (
              <span
                className="h-[15px] w-18 rounded-full bg-foreground/8 animate-pulse motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : null}
          </header>

          <div className="mt-3 flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {showSkeletons ? (
                  <div className="space-y-2" aria-hidden="true">
                    <div className="h-7 w-20 rounded-md bg-foreground/10 animate-pulse motion-reduce:animate-none" />
                    <div className="h-4 w-16 rounded-md bg-foreground/8 animate-pulse motion-reduce:animate-none" />
                  </div>
                ) : (
                  <>
                    <div className="inline-flex items-baseline gap-1">
                      <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                        {windStat?.wind?.speed ?? "--"}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        mph
                      </span>
                    </div>
                    <p className="mt-0 text-xs leading-snug text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Wind
                          className="h-3.5 w-3.5 text-muted-foreground/80"
                          aria-hidden="true"
                        />
                        <span className="font-medium tabular-nums text-foreground/80">
                          {windGust ?? "--"}
                        </span>
                        <span className="sr-only">gust</span>
                      </span>
                    </p>
                  </>
                )}
              </div>
              {showSkeletons ? (
                <div
                  className={cn(
                    "mt-[3px] shrink-0 grid place-items-center size-10 @min-md:size-12 rounded-xl @min-md:rounded-2xl",
                    "border border-border/25 bg-foreground/[0.03] shadow-sm",
                    "dark:bg-foreground/[0.07]",
                    "animate-pulse motion-reduce:animate-none",
                  )}
                  aria-hidden="true"
                />
              ) : (
                <DirectionWidget
                  rotation={windRotation}
                  label={windCompass}
                  ariaLabel="Wind direction"
                />
              )}
            </div>

            <div className="mt-auto pt-1.5 space-y-1.5">
              {showSkeletons ? (
                <div
                  className="h-2 w-full rounded-[3px] bg-foreground/10 animate-pulse motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <SegmentedFillMeter
                  label="Wind speed"
                  value={
                    windStat?.wind?.speed != null ? windStat.wind.speed : null
                  }
                  min={0}
                  max={WIND_SPEED_CAP}
                />
              )}
              <div className="flex items-center justify-between text-[11px] leading-4 text-muted-foreground">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          </div>
        </article>

        <article
          className={cn(
            cardBase,
            cardHover,
            usingPreview
              ? "col-span-6"
              : "col-span-6 @min-xl:col-span-8 @min-2xl:col-span-4 @min-3xl:col-span-5 @min-4xl:col-span-3 @min-6xl:col-span-4",
            "p-4 flex flex-col min-h-35 overflow-hidden",
          )}
          aria-label="Tide summary"
        >
          <SummaryLoadingOverlay show={showOverlay} />
          <header className="flex items-start justify-between gap-3">
            <p className={kickerClass}>Tide</p>
            {!showSkeletons && tideTrend ? (
              <span className="-mt-1 inline-flex items-center gap-1 rounded-full border border-border/25 bg-foreground/5 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {tideTrend === "rising" ? (
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {toTitleCase(tideTrend)}
              </span>
            ) : showSkeletons ? (
              <span
                className="h-5 w-18 rounded-full bg-foreground/8 animate-pulse motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : null}
          </header>

          <div className="mt-2 grid grid-cols-1 @min-[240px]:grid-cols-2 gap-x-4 gap-y-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                Current
              </p>
              {showSkeletons ? (
                <div
                  className="mt-0.5 h-8 w-18 rounded-md bg-foreground/10 animate-pulse motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <p className="mt-0.5 text-2xl font-semibold tracking-tight">
                  {tideNow != null ? `${tideNow}` : "--"}
                  <span className="ml-1 text-sm font-medium text-muted-foreground">
                    ft
                  </span>
                </p>
              )}
            </div>

            <div className="min-w-0 @min-[240px]:justify-self-end">
              <p className="text-start @min-md:text-start text-[11px] uppercase tracking-[0.06em] text-muted-foreground mb-0.5">
                Next
              </p>
              {showSkeletons ? (
                <div className="grid justify-end gap-y-0.5" aria-hidden="true">
                  <div className="h-4 w-12 @min-md:w-24 rounded-md bg-foreground/10 animate-pulse motion-reduce:animate-none" />
                  <div className="h-4 w-12 @min-md:w-24 rounded-md bg-foreground/8 animate-pulse motion-reduce:animate-none" />
                </div>
              ) : nextPeaks.length > 0 ? (
                <div className="grid justify-end grid-cols-[auto_auto] @min-md:grid-cols-[auto_auto_auto] items-baseline gap-x-1 gap-y-0 whitespace-nowrap text-left leading-4">
                  {nextPeaks.map((peak) => (
                    <div
                      key={`${peak.kind}-${peak.time.getTime()}`}
                      className="contents"
                    >
                      <span className="hidden @min-md:block text-[11px] font-semibold text-muted-foreground tabular-nums">
                        {peak.time.toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      <span
                        className="text-[11px] text-muted-foreground/70"
                        aria-hidden="true"
                      >
                        {peak.kind === "high" ? (
                          <ArrowUp className="h-3 w-3 text-emerald-500/80 -mb-0.5" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-rose-500/80 -mb-0.5" />
                        )}
                      </span>
                      <span className="text-[11px] font-semibold text-foreground tabular-nums">
                        {peak.level != null ? `${peak.level} ft` : "--"}
                      </span>
                      <span className="sr-only">
                        {peak.kind === "high" ? "High tide" : "Low tide"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-right text-muted-foreground tabular-nums">
                  --
                </p>
              )}
            </div>
          </div>

          <div className="mt-auto pt-3 space-y-2">
            {showSkeletons ? (
              <>
                <div
                  className="mt-0.5 h-[4px] w-full rounded-full bg-foreground/10 animate-pulse motion-reduce:animate-none"
                  aria-hidden="true"
                />
                <div
                  className="mt-1 flex items-center justify-between text-[11px] leading-4"
                  aria-hidden="true"
                >
                  <span className="h-3.5 w-12 rounded bg-foreground/8 animate-pulse motion-reduce:animate-none" />
                  <span className="h-3.5 w-12 rounded bg-foreground/8 animate-pulse motion-reduce:animate-none" />
                </div>
              </>
            ) : tideNow != null && tideMin != null && tideMax != null ? (
              <>
                <MiniMarkerTrack
                  label="Tide level"
                  value={tideNow}
                  min={tideMin}
                  max={tideMax}
                />
                <div className="mt-1 flex items-center justify-between text-[11px] leading-4 text-muted-foreground">
                  <span>
                    {tideMin != null ? `${tideMin.toFixed(1)} ft` : "\u00a0"}
                  </span>
                  <span>
                    {tideMax != null ? `${tideMax.toFixed(1)} ft` : "\u00a0"}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="mt-0.5 h-[4px] w-full rounded-full bg-foreground/10" />
                <div className="mt-1 flex items-center justify-between text-[11px] leading-4 text-muted-foreground">
                  <span>{"\u00a0"}</span>
                  <span>{"\u00a0"}</span>
                </div>
              </>
            )}
          </div>
        </article>

        <article
          className={cn(
            cardBase,
            cardHover,
            usingPreview
              ? "col-span-6"
              : "col-span-6 @min-xl:col-span-4 @min-3xl:col-span-3 @min-6xl:col-span-2",
            "p-4 flex flex-col overflow-hidden",
            "min-h-35 @min-xl:min-h-40 @min-2xl:min-h-35 @min-5xl:min-h-40",
          )}
          aria-label="Temperature summary"
        >
          <SummaryLoadingOverlay show={showOverlay} />
          <header className="flex items-baseline justify-between gap-3">
            <p className={kickerClass}>Temperature</p>
          </header>

          <div className="mt-3 grid grid-cols-2 gap-3 justify-items-center w-full px-0 h-full items-center">
            {(tempStat?.waterTempHigh != null || showSkeletons) && (
              <div className="flex flex-col gap-1 items-center min-w-0">
                <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                  WATER
                </span>
                {showSkeletons ? (
                  <div
                    className={cn(
                      "h-[54px] w-[54px] rounded-full border border-border/25 bg-foreground/5",
                      "animate-pulse motion-reduce:animate-none",
                    )}
                    aria-hidden="true"
                  />
                ) : (
                  <GradientCircle
                    condition="water"
                    percent={tempStat?.waterTempPercent}
                    size={54}
                    strokeWidth={3}
                    color="bg-background dark:bg-highlight-4"
                    content={
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[0.95rem] font-semibold mt-1 flex items-start">
                          {tempStat?.waterTempHigh ?? "--"}
                          <span className="text-[0.6rem] mt-0.5">{DEGREE}</span>
                        </span>
                        {tempStat?.waterTempLow != null && (
                          <span className="text-[0.7rem] text-muted-foreground">
                            {tempStat.waterTempLow}
                          </span>
                        )}
                      </div>
                    }
                  />
                )}
              </div>
            )}
            {(tempStat?.airTempHigh != null || showSkeletons) && (
              <div className="flex flex-col gap-1 items-center min-w-0">
                <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                  AIR
                </span>
                {showSkeletons ? (
                  <div
                    className={cn(
                      "h-[54px] w-[54px] rounded-full border border-border/25 bg-foreground/5",
                      "animate-pulse motion-reduce:animate-none",
                    )}
                    aria-hidden="true"
                  />
                ) : (
                  <GradientCircle
                    condition="sun"
                    percent={tempStat?.airTempPercent}
                    weatherCode={tempStat?.weatherCode}
                    size={54}
                    strokeWidth={3}
                    color="bg-background dark:bg-highlight-4"
                    content={
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[0.95rem] font-semibold mt-1 flex items-start">
                          {tempStat?.airTempHigh ?? "--"}
                          <span className="text-[0.6rem] mt-0.5">{DEGREE}</span>
                        </span>
                        {tempStat?.airTempLow != null && (
                          <span className="text-[0.7rem] text-muted-foreground">
                            {tempStat.airTempLow}
                          </span>
                        )}
                      </div>
                    }
                  />
                )}
              </div>
            )}
          </div>
        </article>

        <article
          className={cn(
            cardBase,
            cardHover,
            usingPreview
              ? "col-span-12"
              : "col-span-12 @min-xl:col-span-8 @min-2xl:col-span-12 @min-4xl:col-span-6",
            "p-4 overflow-hidden flex flex-col",
          )}
          aria-label="Beach features"
        >
          <SummaryLoadingOverlay show={showOverlay} />
          <header className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className={kickerClass}>Features</p>
            </div>
          </header>

          <div className="mt-3 flex-1 flex items-start">
            <div
              ref={containerRef}
              className={cn(
                "p-0.5 flex flex-1 min-w-0 items-start overflow-x-hidden min-h-12",
                showSkeletons
                  ? "flex-nowrap"
                  : "flex-wrap content-start overflow-y-visible",
              )}
              style={{ gap: `${gapPx}px` }}
            >
              {showSkeletons
                ? [96, 120, 88].map((w, idx) => (
                    <div
                      key={`tag-skeleton-${idx}`}
                      className={cn(
                        "shrink-0 inline-flex items-center gap-2 rounded-full px-2.5 py-1.5",
                        "bg-foreground/5 shadow-even",
                        "animate-pulse motion-reduce:animate-none",
                      )}
                      style={{ width: `${w}px` }}
                      aria-hidden="true"
                    >
                      <span className="grid place-items-center size-6 rounded-full border border-border/25 bg-foreground/10" />
                      <span className="h-3 flex-1 rounded bg-foreground/10" />
                    </div>
                  ))
                : visibleItems.map((tag) => <Tag key={tag.label} data={tag} />)}

              {!showSkeletons && hiddenItems.length > 0 ? (
                <TagsOverflowPopover
                  tags={hiddenItems}
                  contentClassName="z-50 w-80 touch-pan-y"
                  wrapClassName="flex flex-wrap gap-2"
                />
              ) : null}
            </div>

            <div
              ref={measureRef}
              aria-hidden
              style={{
                position: "absolute",
                left: -9999,
                top: 0,
                visibility: "hidden",
                whiteSpace: "nowrap",
                display: "inline-block",
                pointerEvents: "none",
              }}
            >
              {measurementNodes}
            </div>
          </div>
        </article>
      </div>
    );
  }

  return (
    <ul
      className={cn(
        "grid grid-cols-2 @min-md:grid-cols-3 @min-4xl:grid-cols-6",
        isOverviewVariant ? "gap-4 @min-md:gap-4" : "gap-3",
      )}
    >
      {/* Overview card */}
      <li
        className={cn(
          "highlight-card shadow-even flex flex-col gap-3 xl:gap-0 overflow-hidden col-span-2 min-h-35",
          isOverviewVariant &&
            "p-4 rounded-[22px] bg-highlight-7/40 border-border/25 backdrop-blur-md transition-shadow duration-200 ease-out motion-reduce:transition-none hover:z-10 hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_18px_50px_rgba(0,0,0,0.70),0_0_0_1px_rgba(255,255,255,0.08),0_12px_26px_rgba(255,255,255,0.04)] focus-within:ring-1 focus-within:ring-foreground/10",
        )}
      >
        <div className="flex items-top justify-between flex-shrink-0">
          <h3
            className={cn(
              "highlight-title bg-highlight-5 h-1/2 flex items-center px-2 py-1 rounded-xl",
              isOverviewVariant &&
                "bg-foreground/5 text-muted-foreground tracking-wider uppercase",
            )}
          >
            SUMMARY
          </h3>
          <div
            className={cn(
              "py-1 px-2 rounded-md bg-highlight-6 grid grid-cols-[80px_1fr] grid-rows-2 space-y-0.5 items-center text-xs text-muted-foreground uppercase tracking-wide leading-tight",
              isOverviewVariant &&
                "bg-foreground/5 border border-border/25 rounded-xl px-3 py-2",
            )}
          >
            <span className="flex gap-2 items-center">
              <Sunrise
                fill="#ff9f45ff"
                className="stroke-muted-foreground w-4 h-4"
              />
              <span>Sunrise</span>
            </span>
            <span className="ml-1 text-foreground normal-case font-medium">
              {tideStat?.sunrise ?? "-:-- AM"}
            </span>
            <span className="flex gap-2 items-center">
              <Sunset
                fill="#ff9f45ff"
                className="stroke-muted-foreground w-4 h-4"
              />
              <span className="-mb-0.5">Sunset</span>
            </span>
            <span className="ml-1 text-foreground normal-case font-medium">
              {tideStat?.sunset ?? "-:-- PM"}
            </span>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-1 mt-2 justify-center min-h-0">
          {computedOverviewText ? (
            <p
              className={cn(
                "text-center text-sm leading-snug text-foreground/90",
                isOverviewVariant && "text-[0.9rem] @min-md:text-sm",
              )}
            >
              {computedOverviewText}
            </p>
          ) : (
            <div className="w-full max-w-[26rem] px-4">
              <div
                className={cn(
                  "mx-auto h-3 w-full rounded-md animate-pulse motion-reduce:animate-none",
                  isOverviewVariant ? "bg-foreground/12" : "bg-highlight-6/70",
                )}
              />
              <div
                className={cn(
                  "mx-auto mt-2 h-3 w-5/6 rounded-md animate-pulse motion-reduce:animate-none",
                  isOverviewVariant ? "bg-foreground/8" : "bg-highlight-6/50",
                )}
              />
            </div>
          )}
        </div>
      </li>
      {statsForRender.map((stat) => {
        let content;
        switch (stat.type) {
          case "temperature":
            content = (
              <div className="flex gap-6 items-center justify-center w-full px-1">
                {(stat.waterTempHigh != null || showSkeletons) && (
                  <div className="flex flex-col gap-1 items-center min-w-0">
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                      WATER
                    </span>
                    <GradientCircle
                      condition="water"
                      percent={stat.waterTempPercent}
                      size={55}
                      strokeWidth={3}
                      content={
                        <div className="flex flex-col items-center leading-tight">
                          <span className="text-[0.9rem] font-semibold mt-1 flex items-start">
                            {stat.waterTempHigh}
                            <span className="text-[0.6rem] mt-0.5">
                              {DEGREE}F
                            </span>
                          </span>
                          {stat.waterTempLow != null && (
                            <span className="text-[0.7rem] text-muted-foreground">
                              {stat.waterTempLow}
                            </span>
                          )}
                        </div>
                      }
                    />
                  </div>
                )}
                {(stat.airTempHigh != null || showSkeletons) && (
                  <div className="flex flex-col gap-1 items-center min-w-0">
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                      AIR
                    </span>
                    <GradientCircle
                      condition="sun"
                      percent={stat.airTempPercent}
                      weatherCode={stat.weatherCode}
                      size={55}
                      strokeWidth={3}
                      content={
                        <div className="flex flex-col items-center leading-tight">
                          <span className="text-[0.9rem] font-semibold mt-1 flex items-start">
                            {stat.airTempHigh}
                            <span className="text-[0.6rem] mt-0.5">
                              {DEGREE}F
                            </span>
                          </span>
                          {stat.airTempLow != null && (
                            <span className="text-[0.7rem] text-muted-foreground">
                              {stat.airTempLow}
                            </span>
                          )}
                        </div>
                      }
                    />
                  </div>
                )}
              </div>
            );
            break;
          case "tide":
            content = (
              <div className="touch-pan-y flex flex-col w-full gap-2 h-full overflow-hidden">
                <div className="flex items-baseline justify-between text-sm flex-shrink-0">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Current
                  </span>
                  <span className="text-lg font-semibold">
                    {stat.currentHeight != null ? stat.currentHeight : "--"}
                    {stat.currentHeight != null && (
                      <span className="text-xs ml-0.5">ft</span>
                    )}
                  </span>
                </div>
                <div className="touch-pan-y flex flex-col overflow-y-auto flex-1">
                  {stat.peaks.length > 0 ? (
                    stat.peaks.slice(0, 4).map((peak, i) => (
                      <div
                        key={`${peak.kind}-${
                          peak.time ? peak.time.getTime() : "undefined"
                        }-${i}`}
                        className="flex items-center justify-between flex-shrink-0 gap-1 @container"
                      >
                        <div className="flex gap-2">
                          <span className="text-sm font-medium hidden @min-[145px]:flex min-w-8.5">
                            {peak.kind === "high" ? "High" : "Low"}
                          </span>
                          <span className="font-medium text-xs @min-[125px]:text-sm @min-[130px]:text-sm @min-[145px]:hidden min-w-4">
                            {peak.kind === "high" ? "Hi" : "Lo"}
                          </span>
                          <span className="text-xs @min-[125px]:text-sm @min-[130px]:text-sm">
                            {peak.time
                              ? `${peak.time.toLocaleTimeString([], {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}`
                              : "--:--"}
                          </span>
                        </div>
                        <span className="text-muted-foreground flex items-baseline font-semibold text-xs @min-[125px]:text-sm @min-[130px]:text-sm">
                          {peak.level != null ? peak.level : "--"}
                          {peak.level != null && (
                            <span className="ml-0.5 text-[10px] font-light">
                              ft
                            </span>
                          )}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground text-center h-16 flex items-center">
                      Tide peaks unavailable
                    </span>
                  )}
                </div>
              </div>
            );
            break;
          case "wind":
            content = stat.wind && <WindStat data={stat.wind} />;
            break;
          case "surf":
            content = stat.surf && <SurfStat data={stat.surf} />;
            break;
          case "features":
            content =
              stat.tags &&
              stat.tags.map((tag) => <Tag key={tag.label} data={tag} />);
            break;
        }
        if (content) {
          return (
            <li
              key={stat.type}
              className={cn(
                "highlight-card shadow-even flex flex-col overflow-hidden",
                isOverviewVariant &&
                  "p-4 rounded-[22px] bg-highlight-7/40 border-border/25 backdrop-blur-md transition-shadow duration-200 ease-out motion-reduce:transition-none hover:z-10 hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_18px_50px_rgba(0,0,0,0.70),0_0_0_1px_rgba(255,255,255,0.08),0_12px_26px_rgba(255,255,255,0.04)] focus-within:ring-1 focus-within:ring-foreground/10",
                stat.type === "surf" &&
                  stat.surf.height === "-" &&
                  "animate-pulse motion-reduce:animate-none",
                stat.type === "wind" &&
                  stat.wind.loc === "-" &&
                  "animate-pulse motion-reduce:animate-none",
                stat.type === "tide" &&
                  stat.sunrise?.includes("--:--") &&
                  "animate-pulse motion-reduce:animate-none",
                stat.type === "temperature" &&
                  !stat.airTempPercent &&
                  "animate-pulse motion-reduce:animate-none",
                stat.type === "features" &&
                  stat.tags.length === 0 &&
                  (isOverviewVariant ? "opacity-70" : "animate-pulse"),
                stat.type === "features"
                  ? "col-span-2 @min-md:col-span-3 @min-4xl:col-span-6"
                  : "min-h-43",
              )}
            >
              <div className="flex items-start justify-between">
                <h3
                  className={cn(
                    "highlight-title mt-0.5 bg-highlight-5 px-2 py-1 rounded-xl",
                    isOverviewVariant &&
                      "bg-foreground/5 text-muted-foreground tracking-wider uppercase",
                  )}
                >
                  {stat.type.toUpperCase()}
                </h3>
              </div>
              {stat.type === "features" ? (
                <div>
                  {/* Visible container */}
                  <div
                    ref={containerRef}
                    className="flex flex-1 min-w-0 items-center gap-2 overflow-hidden mt-2 p-1 min-h-10"
                    style={{ gap: `${gapPx}px` }}
                  >
                    {visibleItems.map((tag) => (
                      <Tag key={tag.label} data={tag} />
                    ))}

                    {hiddenItems.length > 0 ? (
                      <TagsOverflowPopover
                        tags={hiddenItems}
                        contentClassName="w-80 touch-pan-y"
                        tagClassName="m-1"
                      />
                    ) : null}
                  </div>

                  {/* off-screen measurement area (clones of every tag) */}
                  <div
                    ref={measureRef}
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: -9999,
                      top: 0,
                      visibility: "hidden",
                      whiteSpace: "nowrap",
                      display: "inline-block",
                      pointerEvents: "none",
                    }}
                  >
                    {measurementNodes}
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "flex-1 flex items-center gap-1 mt-1",
                    "justify-center",
                  )}
                >
                  {content}
                </div>
              )}
            </li>
          );
        }
      })}
    </ul>
  );
};

export default Summary;
