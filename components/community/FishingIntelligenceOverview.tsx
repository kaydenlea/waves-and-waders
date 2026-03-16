"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Droplets,
  Fish,
  Gauge,
  Layers3,
  MapPin,
  Minus,
  Radar,
  Rows3,
  ShieldCheck,
  Sunrise,
  Target,
  Users,
  Waves,
  Wind,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  XAxis,
  YAxis,
} from "recharts";
import Image from "next/image";

import {
  OverviewCard,
  OverviewCardHeader,
  OverviewPill,
} from "@/components/general/overview/OverviewPrimitives";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import {
  FISHING_METHOD_LABELS,
  FISHING_REGION_LABELS,
  FISHING_SPECIES_LABELS,
  useFishingIntelligenceData,
  type FishingConfidenceState,
  type FishingIntelligenceData,
  type FishingFeedItem,
  type FishingMethodKey,
  type FishingSignalState,
  type FishingSpeciesKey,
  type FishingTimeWindow,
  type FishingTrendState,
} from "@/lib/community/fishingIntelligence";

type Props = {
  beachName?: string;
};

export type FishingIntelligenceSectionTab = "analytics" | "feed";

type FishingIntelligenceSummaryProps = Props & {
  sectionTab?: FishingIntelligenceSectionTab;
  onSectionTabChange?: (tab: FishingIntelligenceSectionTab) => void;
  surfaceControl?: React.ReactNode;
  feedActions?: React.ReactNode;
  feedContent?: React.ReactNode;
  mapVisible?: boolean;
};

export type FeedFilters = {
  species: "all" | keyof typeof FISHING_SPECIES_LABELS;
  method: "all" | FishingMethodKey;
  region: "all" | string;
};

const confidenceLabelMap: Record<FishingConfidenceState, string> = {
  community_confirmed: "Community confirmed",
  moderate_signal: "Moderate signal",
  single_report: "Single report",
  historical_pattern: "Historical pattern",
  not_enough_data: "Not enough data",
};

const compactConfidenceLabelMap: Record<FishingConfidenceState, string> = {
  community_confirmed: "Confirmed",
  moderate_signal: "Moderate",
  single_report: "Single",
  historical_pattern: "Pattern",
  not_enough_data: "Thin",
};

const confidenceToneMap: Record<FishingConfidenceState, string> = {
  community_confirmed:
    "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  moderate_signal:
    "border-sky-500/25 bg-sky-500/12 text-sky-700 dark:text-sky-300",
  single_report:
    "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  historical_pattern:
    "border-violet-500/25 bg-violet-500/12 text-violet-700 dark:text-violet-300",
  not_enough_data: "border-border/30 bg-foreground/5 text-muted-foreground",
};

const trendMeta: Record<
  FishingTrendState,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  heating_up: {
    label: "Heating up",
    icon: ArrowUpRight,
    className: "text-emerald-600 dark:text-emerald-300",
  },
  steady: {
    label: "Steady",
    icon: Minus,
    className: "text-sky-600 dark:text-sky-300",
  },
  cooling_down: {
    label: "Cooling",
    icon: ArrowDownRight,
    className: "text-amber-600 dark:text-amber-300",
  },
  emerging: {
    label: "Emerging",
    icon: ArrowUpRight,
    className: "text-violet-600 dark:text-violet-300",
  },
  insufficient: {
    label: "Thin data",
    icon: Minus,
    className: "text-muted-foreground",
  },
};

const signalStateMeta: Record<
  FishingSignalState,
  {
    label: string;
    detail: string;
    tone: string;
  }
> = {
  strong_signal: {
    label: "Strong signal",
    detail: "Enough volume to compare regions with confidence.",
    tone: "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  moderate_signal: {
    label: "Moderate signal",
    detail: "Useful regional read, but still worth verifying on arrival.",
    tone: "border-sky-500/25 bg-sky-500/12 text-sky-700 dark:text-sky-300",
  },
  weak_signal: {
    label: "Weak signal",
    detail: "Enough activity to watch, but not enough to trust cleanly.",
    tone: "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
  insufficient_data: {
    label: "Insufficient data",
    detail: "Use forecast and private history over community signal.",
    tone: "border-border/30 bg-foreground/5 text-muted-foreground",
  },
};

const speciesToneMap: Record<
  FishingSpeciesKey,
  {
    pill: string;
    bar: string;
    soft: string;
  }
> = {
  halibut: {
    pill: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    bar: "bg-sky-500",
    soft: "bg-sky-500/10",
  },
  corbina: {
    pill: "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300",
    bar: "bg-teal-500",
    soft: "bg-teal-500/10",
  },
  calico_bass: {
    pill: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    bar: "bg-orange-500",
    soft: "bg-orange-500/10",
  },
  perch: {
    pill: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    bar: "bg-violet-500",
    soft: "bg-violet-500/10",
  },
};

const speciesBarHexMap: Record<FishingSpeciesKey, string> = {
  halibut: "#3b82f6",
  corbina: "#14b8a6",
  calico_bass: "#f97316",
  perch: "#8b5cf6",
};

const activityChartConfig = {
  halibut: { label: "Halibut", color: "#3b82f6" },
  corbina: { label: "Corbina", color: "#14b8a6" },
  calico_bass: { label: "Calico Bass", color: "#f97316" },
  perch: { label: "Perch", color: "#8b5cf6" },
};

type ActivitySeriesKey = keyof typeof activityChartConfig;

const signalSourceMeta = {
  spot: {
    label: "Spot signal",
    shortLabel: "Spot",
    className:
      "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  nearby: {
    label: "Nearby signal",
    shortLabel: "Nearby",
    className: "border-sky-500/25 bg-sky-500/12 text-sky-700 dark:text-sky-300",
  },
  regional: {
    label: "Regional pattern",
    shortLabel: "Regional",
    className:
      "border-violet-500/25 bg-violet-500/12 text-violet-700 dark:text-violet-300",
  },
  predicted: {
    label: "Predicted pattern",
    shortLabel: "Predicted",
    className: "border-border/30 bg-foreground/5 text-muted-foreground",
  },
} as const;

type FishingSignalSource = keyof typeof signalSourceMeta;

function getSignalSource(
  confidence: FishingConfidenceState,
): FishingSignalSource {
  switch (confidence) {
    case "community_confirmed":
      return "spot";
    case "moderate_signal":
      return "nearby";
    case "historical_pattern":
      return "regional";
    case "single_report":
    case "not_enough_data":
    default:
      return "predicted";
  }
}

function getConfidencePercent(
  strength: number,
  confidence: FishingConfidenceState,
) {
  const base =
    confidence === "community_confirmed"
      ? 78
      : confidence === "moderate_signal"
        ? 62
        : confidence === "historical_pattern"
          ? 54
          : confidence === "single_report"
            ? 38
            : 22;
  return Math.max(base, Math.min(96, Math.round(base + strength * 18)));
}

function getMomentumPercent(recentValue: number, previousValue: number) {
  if (recentValue <= 0 && previousValue <= 0) return 0;
  if (previousValue <= 0) return Math.min(100, recentValue * 25);
  return Math.max(
    -99,
    Math.min(
      199,
      Math.round(((recentValue - previousValue) / previousValue) * 100),
    ),
  );
}

function formatSignedPercent(value: number) {
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}

function DeltaPill({ value }: { value: number }) {
  const tone =
    value > 0
      ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
      : value < 0
        ? "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300"
        : "border-sky-500/25 bg-sky-500/12 text-sky-700 dark:text-sky-300";

  return (
    <OverviewPill className={cn("px-2 py-0.5 text-[10px] font-semibold", tone)}>
      {formatSignedPercent(value)}
    </OverviewPill>
  );
}

function FreshnessPill({ label }: { label: string }) {
  return (
    <OverviewPill className="border-border/30 bg-foreground/5 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
      {label}
    </OverviewPill>
  );
}

function getDensityLabel(signal: FishingSignalState) {
  switch (signal) {
    case "strong_signal":
      return "High";
    case "moderate_signal":
      return "Moderate";
    case "weak_signal":
      return "Light";
    case "insufficient_data":
    default:
      return "Thin";
  }
}

function getFreshnessShortLabel(label: string) {
  if (label === "Fresh in the last hour") return "1h ago";
  const freshMatch = label.match(/Fresh in the last (\d+)h/i);
  if (freshMatch) return `${freshMatch[1]}h ago`;
  const latestMatch = label.match(/Latest report (\d+)h ago/i);
  if (latestMatch) return `${latestMatch[1]}h ago`;
  if (label === "Older pattern only") return "Older";
  if (label === "No recent reports") return "No data";
  return label;
}

function getUpdatedLabel(label: string, compact = false) {
  const short = getFreshnessShortLabel(label);

  if (compact) {
    if (/^\d+h$/.test(short)) return `Updated ${short} ago`;
    return short === "No data" ? "No data" : `Updated ${short}`;
  }

  return `Updated ${label}`;
}

function formatReportCountShort(count: number) {
  return `${count} report${count === 1 ? "" : "s"}`;
}

function formatLiftShort(value: number) {
  return `+${Math.round(value * 100)}%`;
}

function getConditionDetailShort(detail: string) {
  switch (detail) {
    case "Most common recent condition":
      return "Common recent setup";
    case "Recurring in active windows":
      return "Common in active windows";
    case "Often present in clean bites":
      return "Often in clean bites";
    case "Recurring recent condition":
      return "Recurring setup";
    default:
      return detail;
  }
}

function compactTimeRange(range: string) {
  const normalized = range.replace(/â€“/g, "–");
  const match = normalized.match(
    /^(\d{1,2}):00\s(AM|PM)[–-](\d{1,2}):00\s(AM|PM)$/i,
  );
  if (!match) return normalized;

  const [, startHour, startPeriod, endHour, endPeriod] = match;
  const sPeriod = startPeriod.toUpperCase();
  const ePeriod = endPeriod.toUpperCase();

  if (sPeriod === ePeriod) {
    return `${startHour}–${endHour} ${sPeriod}`;
  }

  return `${startHour} ${sPeriod}–${endHour} ${ePeriod}`;
}

function getConfidenceLevelLabel(confidence: FishingConfidenceState) {
  switch (confidence) {
    case "community_confirmed":
      return "High";
    case "moderate_signal":
      return "Moderate";
    case "historical_pattern":
      return "Pattern";
    case "single_report":
      return "Low";
    case "not_enough_data":
    default:
      return "Thin";
  }
}

function ConfidencePill({
  confidence,
}: {
  confidence: FishingConfidenceState;
}) {
  return (
    <OverviewPill
      className={cn(
        "border px-2 py-0.5 text-[10px] font-semibold",
        confidenceToneMap[confidence],
      )}
    >
      {compactConfidenceLabelMap[confidence]}
    </OverviewPill>
  );
}

function TrendPill({ trend }: { trend: FishingTrendState }) {
  const meta = trendMeta[trend];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold",
        meta.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden @min-lg:inline">{meta.label}</span>
    </span>
  );
}

function SignalStatePill({
  signal,
  shortLabel = false,
}: {
  signal: FishingSignalState;
  shortLabel?: boolean;
}) {
  const meta = signalStateMeta[signal];
  return (
    <OverviewPill
      className={cn("border px-2 py-0.5 text-[10px] font-semibold", meta.tone)}
    >
      {shortLabel ? meta.label.replace(/\s+signal$/i, "") : meta.label}
    </OverviewPill>
  );
}

function SparkBars({
  values,
  color = "#3b82f6",
}: {
  values: readonly number[];
  color?: string;
}) {
  const lookbackHours = values.length * 6;
  const maxValue = Math.max(1, ...values);

  return (
    <div className="flex h-8 w-full min-w-0 items-end justify-center gap-2">
      <span className="shrink-0 text-[8px] font-medium leading-none tracking-tight text-muted-foreground/80">
        {lookbackHours}h
      </span>
      <div className="flex h-full w-full max-w-[152px] min-w-0 items-end gap-1 overflow-hidden">
        {values.map((value, index) => (
          <span
            key={index}
            className="block flex-1 rounded-[4px] opacity-90"
            style={{
              height: `${Math.max(12, Math.round((value / maxValue) * 100))}%`,
              backgroundColor: color,
              opacity: 0.42 + (value / maxValue) * 0.5,
            }}
          />
        ))}
      </div>
      <span className="shrink-0 text-[8px] font-medium leading-none tracking-tight text-muted-foreground/80">
        Now
      </span>
    </div>
  );
}

function DensityBars({
  value,
  color = "#06b6d4",
}: {
  value: number;
  color?: string;
}) {
  const active = Math.max(1, Math.round(value * 5));

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          className="h-4 w-2.5 rounded-[3px] border border-border/35 bg-foreground/[0.055]"
          style={{
            backgroundColor:
              index < active ? color : "rgba(148, 163, 184, 0.08)",
            opacity: index < active ? 0.42 + ((index + 1) / 5) * 0.5 : 1,
            borderColor: index < active ? `${color}40` : undefined,
          }}
        />
      ))}
    </div>
  );
}

function SegmentMeter({
  value,
  segments = 4,
  color = "#10b981",
}: {
  value: number;
  segments?: number;
  color?: string;
}) {
  const fill = Math.max(0, Math.min(1, value));
  const scaled = fill * segments;

  return (
    <div className="flex w-full min-w-0 items-center gap-1">
      {Array.from({ length: segments }).map((_, index) => (
        <span
          key={index}
          className={cn("h-2 flex-1 rounded-full bg-foreground/10")}
        >
          {scaled > index ? (
            <span
              className="block h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.round((scaled - index) * 100))}%`,
                opacity: 0.55 + Math.min(0.35, fill * 0.35),
                backgroundColor: color,
              }}
            />
          ) : null}
        </span>
      ))}
    </div>
  );
}

function SpeciesBadge({ species }: { species: FishingSpeciesKey }) {
  return (
    <OverviewPill
      className={cn(
        "px-2 py-0.5 text-[10px] font-semibold",
        speciesToneMap[species].pill,
      )}
    >
      {FISHING_SPECIES_LABELS[species]}
    </OverviewPill>
  );
}

function formatWindowLabel(label: string) {
  return label.replace(/\s*window$/i, "");
}

function formatActivityBucketLabel(label: string) {
  const normalized = label.trim().toLowerCase();

  if (normalized === "5:00 am–8:00 am" || normalized === "5:00 amâ€“8:00 am") {
    return "5-8A";
  }
  if (
    normalized === "8:00 am–11:00 am" ||
    normalized === "8:00 amâ€“11:00 am"
  ) {
    return "8-11A";
  }
  if (
    normalized === "11:00 am–2:00 pm" ||
    normalized === "11:00 amâ€“2:00 pm"
  ) {
    return "11-2P";
  }
  if (normalized === "2:00 pm–5:00 pm" || normalized === "2:00 pmâ€“5:00 pm") {
    return "2-5P";
  }
  if (normalized === "5:00 pm–8:00 pm" || normalized === "5:00 pmâ€“8:00 pm") {
    return "5-8P";
  }
  if (normalized === "8:00 pm–5:00 am" || normalized === "8:00 pmâ€“5:00 am") {
    return "8P-5A";
  }

  switch (normalized) {
    case "dawn":
      return "Dawn";
    case "morning":
      return "AM";
    case "midday":
      return "Midday";
    case "afternoon":
      return "PM";
    case "sunset":
      return "Sunset";
    case "night":
      return "Night";
    default:
      return label;
  }
}

function formatActivityBucketTooltipLabel(label: string) {
  const normalized = label.trim().toLowerCase();

  switch (normalized) {
    case "5:00 am–8:00 am":
    case "5:00 amâ€“8:00 am":
      return "5:00-8:00 AM";
    case "8:00 am–11:00 am":
    case "8:00 amâ€“11:00 am":
      return "8:00-11:00 AM";
    case "11:00 am–2:00 pm":
    case "11:00 amâ€“2:00 pm":
      return "11:00 AM-2:00 PM";
    case "2:00 pm–5:00 pm":
    case "2:00 pmâ€“5:00 pm":
      return "2:00-5:00 PM";
    case "5:00 pm–8:00 pm":
    case "5:00 pmâ€“8:00 pm":
      return "5:00-8:00 PM";
    case "8:00 pm–5:00 am":
    case "8:00 pmâ€“5:00 am":
      return "8:00 PM-5:00 AM";
    default:
      return label;
  }
}

function getVisibleActivitySeries(
  points: FishingIntelligenceData["activityTrend"],
): ActivitySeriesKey[] {
  const totals = Object.keys(activityChartConfig).map((key) => {
    const typedKey = key as ActivitySeriesKey;
    const total = points.reduce(
      (
        sum: number,
        point: FishingIntelligenceData["activityTrend"][number],
      ) => {
        const value = point[typedKey];
        return sum + (typeof value === "number" ? value : 0);
      },
      0,
    );

    return { key: typedKey, total };
  });

  return totals
    .filter((item) => item.total > 0)
    .sort((left, right) => right.total - left.total)
    .slice(0, 4)
    .map((item) => item.key);
}

function getConditionSignalIcon(id: string) {
  if (id.includes("tide")) return Waves;
  if (id.includes("wind")) return Wind;
  if (id.includes("clear") || id.includes("clarity")) return Droplets;
  return Sunrise;
}

function getConditionSignalTone(id: string) {
  if (id.includes("tide")) {
    return {
      tile: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
      stat: "border-sky-500/20 bg-sky-500/10",
      bar: "bg-sky-500",
    };
  }
  if (id.includes("wind")) {
    return {
      tile: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
      stat: "border-emerald-500/20 bg-emerald-500/10",
      bar: "bg-emerald-500",
    };
  }
  if (id.includes("clear") || id.includes("clarity")) {
    return {
      tile: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
      stat: "border-cyan-500/20 bg-cyan-500/10",
      bar: "bg-cyan-500",
    };
  }
  return {
    tile: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    stat: "border-amber-500/20 bg-amber-500/10",
    bar: "bg-amber-500",
  };
}

function SignalBar({
  value,
  label,
  color = "#8b5cf6",
}: {
  value: number;
  label?: string;
  color?: string;
}) {
  const width = Math.max(8, Math.round(value * 100));

  return (
    <div className="space-y-1.5">
      {(label ?? "").length > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-sm font-semibold text-foreground">{width}%</span>
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function TrustDots({
  value,
  color = "#4f46e5",
}: {
  value: number;
  color?: string;
}) {
  const active = Math.max(1, Math.round(Math.max(0, Math.min(1, value)) * 4));

  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <span
          key={index}
          className="size-2 rounded-full border border-border/25 bg-foreground/[0.08]"
          style={
            index < active
              ? {
                  backgroundColor: color,
                  borderColor: `${color}33`,
                  opacity: 0.45 + ((index + 1) / 4) * 0.4,
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}

function getConditionBarHex(id: string) {
  if (id.includes("wind")) return "#22c55e";
  if (id.includes("clear") || id.includes("clarity")) return "#06b6d4";
  return "#3b82f6";
}

function getMethodIcon(method?: FishingMethodKey) {
  switch (method) {
    case "artificial_lure":
      return Target;
    case "live_bait":
      return Fish;
    case "surf_rig":
      return Waves;
    case "fly":
      return Wind;
    default:
      return Target;
  }
}

function getMethodTone(method?: FishingMethodKey) {
  switch (method) {
    case "artificial_lure":
      return {
        icon: "border-fuchsia-500/25 bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300",
        badge:
          "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
        bar: "#c026d3",
      };
    case "live_bait":
      return {
        icon: "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        badge:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        bar: "#10b981",
      };
    case "surf_rig":
      return {
        icon: "border-sky-500/25 bg-sky-500/12 text-sky-700 dark:text-sky-300",
        badge: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        bar: "#0ea5e9",
      };
    case "fly":
      return {
        icon: "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300",
        badge:
          "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        bar: "#f59e0b",
      };
    default:
      return {
        icon: "border-border/25 bg-foreground/[0.05] text-foreground/80",
        badge: "border-border/25 bg-foreground/[0.05] text-foreground/75",
        bar: "#64748b",
      };
  }
}

function getActivityStackRadius(
  point: FishingIntelligenceData["activityTrend"][number],
  key: ActivitySeriesKey,
  visibleKeys: ReadonlyArray<ActivitySeriesKey>,
): [number, number, number, number] {
  const topKey = [...visibleKeys]
    .reverse()
    .find((candidate) => (point[candidate] ?? 0) > 0);

  return topKey === key ? [4, 4, 0, 0] : [0, 0, 0, 0];
}

type ActivityBarShapeProps = React.ComponentProps<typeof Rectangle> & {
  payload?: FishingIntelligenceData["activityTrend"][number];
};

function SparseState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-border/40 bg-foreground/[0.03] px-4 py-5">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

function TopSignalCard({
  label,
  value,
  detail,
  icon,
  visual,
  accentClass,
}: {
  label: string;
  value: React.ReactNode;
  detail: React.ReactNode;
  icon: React.ReactNode;
  visual?: React.ReactNode;
  accentClass: string;
}) {
  return (
    <div className="group relative h-full min-h-[122px] overflow-hidden rounded-[20px] border border-border/25 bg-highlight-7/70 p-2.5 shadow-even transition-colors supports-[backdrop-filter]:bg-highlight-7/40 supports-[backdrop-filter]:backdrop-blur-md @min-md:min-h-[128px] @min-md:p-3">
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-4 top-0 h-px rounded-full opacity-80",
          accentClass,
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "absolute -right-10 -top-10 size-24 rounded-full opacity-[0.07] blur-2xl",
          accentClass,
        )}
      />
      <div className="relative grid h-full min-w-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-1.5 @min-md:gap-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-[10px] border border-border/25 bg-foreground/[0.06] shadow-inner dark:border-border/20 dark:bg-foreground/5 @min-md:size-8 @min-md:rounded-xl",
                accentClass.replace("bg-", "text-"),
              )}
            >
              {icon}
            </span>
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {label}
            </p>
          </div>
        </div>

        <div className="min-w-0 space-y-0.5 self-start pt-0.5 @min-md:space-y-1">
          <div className="min-w-0 break-words text-[0.95rem] font-semibold leading-[1.02] tracking-tight text-foreground @min-md:text-[1rem]">
            {value}
          </div>
          <div className="break-words text-[9px] leading-snug text-muted-foreground @min-md:text-[10px]">
            {detail}
          </div>
        </div>

        {visual ? (
          <div className="flex min-h-0 w-full min-w-0 flex-col justify-end self-end">
            {visual}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function WindowTiles({
  primary,
  secondary,
}: {
  primary?: FishingTimeWindow;
  secondary?: FishingTimeWindow;
}) {
  const windows = [primary, secondary].filter(Boolean) as FishingTimeWindow[];

  return (
    <div className="grid grid-cols-1 gap-2">
      {windows.map((window, index) => (
        <div
          key={window.id}
          className={cn(
            "rounded-xl border px-2.5 py-2",
            index > 0 && "hidden",
            index === 0
              ? "border-amber-500/25 bg-amber-500/10"
              : "border-border/25 bg-foreground/[0.04]",
          )}
        >
          <div className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {index === 0 ? (
              <span className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-foreground/70">
                  <Fish className="h-3 w-3" />
                  <span className="sr-only">Peak catches</span>
                </span>
                <span className="text-right text-foreground">
                  {window.totalReports} catches
                </span>
              </span>
            ) : (
              "Next"
            )}
          </div>
          {index !== 0 ? (
            <p className="mt-1 whitespace-nowrap text-[11px] font-semibold text-foreground">
              {compactTimeRange(window.timeRange)}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function LegacyFeedCard({ item }: { item: FishingFeedItem }) {
  const typeLabel =
    item.type === "catch_report"
      ? "Catch"
      : item.type === "conditions_report"
        ? "Conditions"
        : "Access";
  const detailLine = [
    item.speciesLabel ??
      (item.type === "access_report" ? "Access" : "Conditions"),
    item.methodLabel,
    item.regionLabel,
  ]
    .filter(Boolean)
    .join(" • ");
  const privacyHint =
    item.privacyLabel === "Exact location hidden"
      ? "Spot hidden"
      : "Region only";

  return (
    <OverviewCard className="overflow-hidden">
      <div className="grid gap-3 p-4 @min-md:grid-cols-[52px_minmax(0,1fr)] @min-xl:grid-cols-[52px_minmax(0,1fr)_104px] @min-md:items-start">
        <div className="grid size-13 shrink-0 place-items-center rounded-[18px] border border-border/25 bg-foreground/[0.04] text-foreground/70">
          {item.type === "access_report" ? (
            <AlertTriangle className="h-5.5 w-5.5" />
          ) : item.type === "conditions_report" ? (
            <Droplets className="h-5.5 w-5.5" />
          ) : (
            <Fish className="h-5.5 w-5.5" />
          )}
        </div>

        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <OverviewPill className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
                  {typeLabel}
                </OverviewPill>
                <span>{item.postedLabel}</span>
              </div>
              <h4 className="text-lg font-semibold tracking-tight text-foreground">
                {item.title}
              </h4>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {item.summary}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground/85">
                  {detailLine}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {privacyHint}
                </span>
              </div>
            </div>
            <div className="shrink-0">
              <ConfidencePill confidence={item.confidence} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {item.conditions.slice(0, 2).map((condition) => (
              <OverviewPill key={condition} className="px-2.5 py-1 text-[11px]">
                {condition}
              </OverviewPill>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "relative hidden aspect-[4/3] overflow-hidden rounded-[18px] border border-border/25 @min-xl:block",
            item.thumbnailTone === "alert"
              ? "bg-gradient-to-br from-rose-500/25 to-transparent"
              : item.thumbnailTone === "clarity"
                ? "bg-gradient-to-br from-cyan-500/20 to-transparent"
                : item.thumbnailTone === "corbina"
                  ? "bg-gradient-to-br from-teal-500/25 to-transparent"
                  : item.thumbnailTone === "calico"
                    ? "bg-gradient-to-br from-orange-500/25 to-transparent"
                    : "bg-gradient-to-br from-sky-500/25 to-transparent",
          )}
        >
          <div className="absolute inset-0 grid place-items-center text-foreground/50">
            {item.type === "access_report" ? (
              <AlertTriangle className="h-7 w-7" />
            ) : item.type === "conditions_report" ? (
              <Droplets className="h-7 w-7" />
            ) : (
              <Fish className="h-7 w-7" />
            )}
          </div>
        </div>
      </div>
    </OverviewCard>
  );
}

function getFeedTypeMeta(type: FishingFeedItem["type"]) {
  if (type === "catch_report") {
    return {
      label: "Catch",
      icon: Fish,
      iconWrap:
        "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
      cardAccent:
        "before:bg-gradient-to-b before:from-emerald-500/85 before:to-sky-500/55",
      typePill:
        "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    } as const;
  }

  if (type === "conditions_report") {
    return {
      label: "Conditions",
      icon: Droplets,
      iconWrap:
        "border-cyan-500/25 bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
      cardAccent:
        "before:bg-gradient-to-b before:from-cyan-500/85 before:to-sky-500/50",
      typePill:
        "border-cyan-500/25 bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
    } as const;
  }

  return {
    label: "Access",
    icon: AlertTriangle,
    iconWrap:
      "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300",
    cardAccent:
      "before:bg-gradient-to-b before:from-amber-500/90 before:to-rose-500/55",
    typePill:
      "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  } as const;
}

function FeedCard({
  item,
  anchorId,
}: {
  item: FishingFeedItem;
  anchorId?: string;
}) {
  const typeMeta = getFeedTypeMeta(item.type);
  const Icon = typeMeta.icon;
  const privacyHint =
    item.privacyLabel === "Exact location hidden"
      ? "Spot hidden"
      : "Region only";
  const mediaFallbackTone =
    item.type === "catch_report"
      ? "from-emerald-500/20 via-sky-500/8 to-transparent"
      : item.type === "conditions_report"
        ? "from-cyan-500/20 via-sky-500/8 to-transparent"
        : "from-amber-500/20 via-rose-500/8 to-transparent";
  const primaryContextLabel =
    item.type === "catch_report"
      ? (item.speciesLabel ?? "Catch signal")
      : item.type === "conditions_report"
        ? "Observed conditions"
        : "Trip access";
  const secondaryContextLabel =
    item.type === "catch_report"
      ? (item.methodLabel ?? item.regionLabel)
      : item.type === "conditions_report"
        ? (item.conditions[0] ?? item.regionLabel)
        : item.regionLabel;
  const conditionIconFor = (condition: string) => {
    const value = condition.toLowerCase();
    if (value.includes("tide")) return Waves;
    if (value.includes("wind")) return Wind;
    if (
      value.includes("clarity") ||
      value.includes("water") ||
      value.includes("vis")
    ) {
      return Droplets;
    }
    if (
      value.includes("morning") ||
      value.includes("midday") ||
      value.includes("sunrise") ||
      value.includes("sunset")
    ) {
      return Clock3;
    }
    if (value.includes("parking") || value.includes("capacity")) {
      return AlertTriangle;
    }
    return Waves;
  };

  return (
    <OverviewCard id={anchorId} className="overflow-hidden">
      <div className="overflow-hidden">
        <div
          className={cn(
            "relative min-w-0 p-3.5 before:absolute before:inset-y-0 before:left-0 before:w-1 sm:p-4",
            typeMeta.cardAccent,
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <OverviewPill
                className={cn(
                  "px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]",
                  typeMeta.typePill,
                )}
              >
                {typeMeta.label}
              </OverviewPill>
              <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
                <span className="shrink-0">{item.postedLabel}</span>
                {item.regionLabel ? (
                  <span className="inline-flex min-w-0 items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.regionLabel}</span>
                  </span>
                ) : null}
              </div>
            </div>
            <ConfidencePill confidence={item.confidence} />
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0 flex flex-1 flex-col">
              <div className="flex items-start gap-2.5">
                <div
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-[14px] border",
                    typeMeta.iconWrap,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-[15px] font-semibold tracking-tight text-foreground">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-[12px] font-medium text-foreground/78">
                    {primaryContextLabel}
                    {secondaryContextLabel ? ` • ${secondaryContextLabel}` : ""}
                  </p>
                </div>
              </div>
              <p className="mt-2.5 line-clamp-2 text-[12px] leading-[1.5] text-muted-foreground">
                {item.summary}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <OverviewPill className="border-border/30 bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-foreground/80">
                  <MapPin className="mr-1 h-3 w-3" />
                  {privacyHint}
                </OverviewPill>
                {item.conditions.slice(0, 1).map((condition) => {
                  const ConditionIcon = conditionIconFor(condition);
                  return (
                    <OverviewPill
                      key={condition}
                      className="border-foreground/10 bg-foreground/[0.045] px-2 py-0.5 text-[10px] text-foreground/75"
                    >
                      <ConditionIcon className="mr-1 h-3 w-3" />
                      {condition}
                    </OverviewPill>
                  );
                })}
              </div>
            </div>
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[16px] border border-border/20 bg-foreground/[0.03] shadow-inner sm:min-h-[7.25rem] sm:w-28 sm:shrink-0 sm:aspect-[4/3]">
              {item.media ? (
                <Image
                  src={item.media.src}
                  alt={item.media.alt}
                  fill
                  unoptimized
                  sizes="112px"
                  className="object-cover object-center"
                />
              ) : (
                <>
                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-br",
                      mediaFallbackTone,
                    )}
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_55%)]" />
                  <div className="absolute inset-0 grid place-items-center">
                    <div
                      className={cn(
                        "grid size-9 place-items-center rounded-full border backdrop-blur-sm",
                        typeMeta.iconWrap,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="hidden mt-1.5 line-clamp-2 text-[12px] leading-[1.5] text-muted-foreground">
            {item.summary}
          </p>

          <div className="hidden mt-2.5 flex flex-wrap items-center gap-1.5">
            <OverviewPill className="border-border/30 bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-foreground/80">
              <MapPin className="mr-1 h-3 w-3" />
              {privacyHint}
            </OverviewPill>
            {item.conditions.slice(0, 1).map((condition) =>
              (() => {
                const ConditionIcon = conditionIconFor(condition);
                return (
                  <OverviewPill
                    key={condition}
                    className="border-foreground/10 bg-foreground/[0.045] px-2 py-0.5 text-[10px] text-foreground/75"
                  >
                    <ConditionIcon className="mr-1 h-3 w-3" />
                    {condition}
                  </OverviewPill>
                );
              })(),
            )}
          </div>
        </div>
      </div>
    </OverviewCard>
  );
}

export function FishingIntelligenceSummary({
  beachName,
  sectionTab = "analytics",
  onSectionTabChange,
  surfaceControl,
  feedActions,
  feedContent,
  mapVisible = true,
}: FishingIntelligenceSummaryProps) {
  const { data: fixture } = useFishingIntelligenceData(beachName);
  const primarySpecies = fixture.speciesMomentum[0];
  const primaryWindow = fixture.timeWindows[0];
  const primaryMethod = fixture.methodSignals[0];
  const primaryCondition = fixture.conditionSignals[0];
  const densityValue = Math.max(
    0.12,
    Math.min(1, fixture.confidenceSummary.recentReports / 12),
  );
  const densityLevel = Math.max(1, Math.round(densityValue * 5));
  const primarySpeciesTrendPercent = primarySpecies
    ? getMomentumPercent(
        primarySpecies.recentWindowCount,
        primarySpecies.previousWindowCount,
      )
    : 0;
  const confidencePercent = getConfidencePercent(
    fixture.confidenceSummary.overall,
    fixture.confidence,
  );
  const visibleAlerts = fixture.accessAlerts.slice(0, 2);
  const topMethods = fixture.methodSignals.slice(0, 3);
  const topConditions = fixture.conditionSignals.slice(0, 3);
  const topWindows = fixture.timeWindows.slice(0, 2);
  const visibleActivitySeries = React.useMemo(
    () => getVisibleActivitySeries(fixture.activityTrend),
    [fixture.activityTrend],
  );
  const activityChartLegend = visibleActivitySeries.map((key) => ({
    key,
    ...activityChartConfig[key],
  }));
  const fallbackSpeciesCount = fixture.speciesMomentum.filter((item) => {
    const source = getSignalSource(item.confidence);
    return source !== "spot" && source !== "nearby";
  }).length;
  const topSignalCardsScrollerRef = React.useRef<HTMLDivElement | null>(null);
  const speciesMatrixScrollerRef = React.useRef<HTMLDivElement | null>(null);
  const [topCardsCanScrollLeft, setTopCardsCanScrollLeft] =
    React.useState(false);
  const [topCardsCanScrollRight, setTopCardsCanScrollRight] =
    React.useState(false);
  const speciesMatrixDesktopBreakpoint = mapVisible ? "@min-5xl" : "@min-6xl";
  const speciesMatrixDesktopVisibleClass = `${speciesMatrixDesktopBreakpoint}:block`;
  const speciesMatrixCompactHiddenClass = `${speciesMatrixDesktopBreakpoint}:hidden`;
  const speciesMatrixCompactControlsClass = `${speciesMatrixDesktopBreakpoint}:hidden`;
  const updateTopCardsScrollState = React.useCallback(() => {
    const node = topSignalCardsScrollerRef.current;
    if (!node) return;
    const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth);
    setTopCardsCanScrollLeft(node.scrollLeft > 2);
    setTopCardsCanScrollRight(maxScrollLeft - node.scrollLeft > 2);
  }, []);
  const scrollTopSignalCards = React.useCallback(
    (direction: "prev" | "next") => {
      const node = topSignalCardsScrollerRef.current;
      if (!node) return;
      const amount = Math.max(240, Math.round(node.clientWidth * 0.78));
      node.scrollBy({
        left: direction === "next" ? amount : -amount,
        behavior: "smooth",
      });
    },
    [],
  );
  const scrollSpeciesMatrix = React.useCallback(
    (direction: "prev" | "next") => {
      const node = speciesMatrixScrollerRef.current;
      if (!node) return;
      const amount = Math.max(220, Math.round(node.clientWidth * 0.82));
      node.scrollBy({
        left: direction === "next" ? amount : -amount,
        behavior: "smooth",
      });
    },
    [],
  );
  React.useLayoutEffect(() => {
    const topCardsNode = topSignalCardsScrollerRef.current;
    const speciesNode = speciesMatrixScrollerRef.current;

    const resetScroll = (node: HTMLDivElement | null) => {
      if (!node) return;
      node.scrollLeft = 0;
    };

    resetScroll(topCardsNode);
    resetScroll(speciesNode);

    const frameId = window.requestAnimationFrame(() => {
      resetScroll(topCardsNode);
      resetScroll(speciesNode);
      updateTopCardsScrollState();
    });

    updateTopCardsScrollState();

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [beachName, mapVisible, sectionTab, updateTopCardsScrollState]);
  React.useEffect(() => {
    const node = topSignalCardsScrollerRef.current;
    if (!node) return;

    updateTopCardsScrollState();

    const handleScroll = () => {
      updateTopCardsScrollState();
    };

    node.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            updateTopCardsScrollState();
          })
        : null;

    resizeObserver?.observe(node);

    return () => {
      node.removeEventListener("scroll", handleScroll);
      resizeObserver?.disconnect();
    };
  }, [updateTopCardsScrollState]);
  const sectionTabs = (
    <div className="relative inline-flex h-[46px] w-[9.75rem] shrink-0 items-center rounded-full border border-border/25 bg-highlight-7/70 p-1 shadow-even @min-sm:w-[10.25rem] supports-[backdrop-filter]:bg-highlight-7/40 supports-[backdrop-filter]:backdrop-blur-md">
      <div
        aria-hidden="true"
        className="absolute inset-y-1 left-1 z-0 rounded-full bg-highlight-3/50 dark:bg-highlight-5/80 shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{
          width: "calc((100% - 0.5rem) / 2)",
          transform: `translateX(${(sectionTab === "feed" ? 1 : 0) * 100}%)`,
        }}
      />
      <button
        type="button"
        onClick={() => onSectionTabChange?.("analytics")}
        className={cn(
          "relative z-10 inline-flex h-[38px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 transition-colors duration-300",
          sectionTab === "analytics"
            ? "text-foreground"
            : "text-foreground/80 hover:text-foreground",
        )}
        aria-pressed={sectionTab === "analytics"}
      >
        <Radar className="h-4 w-4 shrink-0" />
        <span className="whitespace-nowrap text-[12px] font-semibold leading-none @min-sm:text-[13px]">
          Data
        </span>
      </button>
      <button
        type="button"
        onClick={() => onSectionTabChange?.("feed")}
        className={cn(
          "relative z-10 inline-flex h-[38px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 transition-colors duration-300",
          sectionTab === "feed"
            ? "text-foreground"
            : "text-foreground/80 hover:text-foreground",
        )}
        aria-pressed={sectionTab === "feed"}
      >
        <Rows3 className="h-4 w-4 shrink-0" />
        <span className="whitespace-nowrap text-[12px] font-semibold leading-none @min-sm:text-[13px]">
          Feed
        </span>
      </button>
    </div>
  );

  const topSignalCards = (
    <div className="relative">
      {topCardsCanScrollLeft ? (
        <button
          type="button"
          onClick={() => scrollTopSignalCards("prev")}
          className="absolute left-1 top-1/2 z-10 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border/25 bg-background/78 text-foreground/70 shadow-even backdrop-blur-sm transition-colors hover:bg-background/88 hover:text-foreground @min-6xl:hidden"
          aria-label="Scroll fishing cards left"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {topCardsCanScrollRight ? (
        <button
          type="button"
          onClick={() => scrollTopSignalCards("next")}
          className="absolute right-1 top-1/2 z-10 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border/25 bg-background/78 text-foreground/70 shadow-even backdrop-blur-sm transition-colors hover:bg-background/88 hover:text-foreground @min-6xl:hidden"
          aria-label="Scroll fishing cards right"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <div
        ref={topSignalCardsScrollerRef}
        className="flex gap-2.5 overflow-x-auto px-0.5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden @min-lg:gap-3"
      >
        <div className="min-w-[11rem] shrink-0 @min-md:min-w-[11.5rem] @min-6xl:min-w-0 @min-6xl:flex-1">
          <TopSignalCard
            label="Top species"
            value={primarySpecies?.label ?? "Mixed"}
            detail={
              primarySpecies?.leadRegions[0]
                ? FISHING_REGION_LABELS[primarySpecies.leadRegions[0]]
                : "No clear edge"
            }
            icon={<Fish className="h-4 w-4" />}
            accentClass="bg-sky-500"
            visual={
              primarySpecies ? (
                <div className="min-w-0 space-y-1.5">
                  <SparkBars
                    values={primarySpecies.sparkline}
                    color="#3b82f6"
                  />
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-1.5 text-[10px] text-muted-foreground">
                    <span>
                      {formatReportCountShort(primarySpecies.recentReports)}
                    </span>
                    <OverviewPill
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-semibold",
                        speciesToneMap[primarySpecies.species].pill,
                      )}
                    >
                      {React.createElement(
                        trendMeta[primarySpecies.trend].icon,
                        {
                          className: "mr-1 inline h-3 w-3",
                        },
                      )}
                      {formatSignedPercent(primarySpeciesTrendPercent)}
                    </OverviewPill>
                  </div>
                </div>
              ) : undefined
            }
          />
        </div>

        <div className="min-w-[11rem] shrink-0 @min-md:min-w-[11.5rem] @min-6xl:min-w-0 @min-6xl:flex-1">
          <TopSignalCard
            label="Density"
            value={
              <div className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 break-words">
                  {getDensityLabel(fixture.confidenceSummary.signalState)}
                </span>
                <div className="shrink-0">
                  <SignalStatePill
                    signal={fixture.confidenceSummary.signalState}
                    shortLabel
                  />
                </div>
              </div>
            }
            detail={fixture.confidenceSummary.strongestRegion}
            icon={<Gauge className="h-4 w-4" />}
            accentClass="bg-cyan-500"
            visual={
              <div className="min-w-0 space-y-2">
                <DensityBars value={densityValue} color="#06b6d4" />
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-muted-foreground">
                  <span>
                    {formatReportCountShort(
                      fixture.confidenceSummary.recentReports,
                    )}
                  </span>
                  <FreshnessPill
                    label={getFreshnessShortLabel(
                      fixture.confidenceSummary.freshnessLabel,
                    )}
                  />
                </div>
              </div>
            }
          />
        </div>

        <div className="min-w-[11rem] shrink-0 @min-md:min-w-[11.5rem] @min-6xl:min-w-0 @min-6xl:flex-1">
          <TopSignalCard
            label="Method"
            value={primaryMethod?.label ?? "Mixed"}
            detail={
              primaryMethod?.leadSpecies
                ? FISHING_SPECIES_LABELS[primaryMethod.leadSpecies]
                : "Signal forming"
            }
            icon={<Target className="h-4 w-4" />}
            accentClass="bg-violet-500"
            visual={
              primaryMethod ? (
                <div className="min-w-0 space-y-1.5">
                  <SignalBar
                    value={primaryMethod.signal}
                    label="Success"
                    color="#8b5cf6"
                  />
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-1.5 text-[10px] text-muted-foreground">
                    <span>
                      {formatReportCountShort(primaryMethod.recentReports)}
                    </span>
                    <DeltaPill value={primaryMethod.deltaPercent} />
                  </div>
                </div>
              ) : undefined
            }
          />
        </div>

        <div className="min-w-[11rem] shrink-0 @min-md:min-w-[11.5rem] @min-6xl:min-w-0 @min-6xl:flex-1">
          <TopSignalCard
            label="Window"
            value={
              primaryWindow
                ? compactTimeRange(primaryWindow.timeRange)
                : "No read"
            }
            detail={primaryWindow ? "Peak" : "Timing still thin"}
            icon={<Clock3 className="h-4 w-4" />}
            accentClass="bg-amber-500"
            visual={
              <div className="space-y-1.5 min-w-0">
                <WindowTiles
                  primary={primaryWindow}
                  secondary={topWindows[1]}
                />
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-muted-foreground">
                  <span>Next</span>
                  <span>
                    {topWindows[1]
                      ? compactTimeRange(topWindows[1].timeRange)
                      : "No next"}
                  </span>
                </div>
              </div>
            }
          />
        </div>

        <div className="min-w-[11rem] shrink-0 @min-md:min-w-[11.5rem] @min-6xl:min-w-0 @min-6xl:flex-1">
          <TopSignalCard
            label="Conditions"
            detail={
              primaryCondition
                ? getConditionDetailShort(primaryCondition.detail)
                : "No pattern yet"
            }
            icon={<Waves className="h-4 w-4" />}
            accentClass="bg-emerald-500"
            value={
              <div className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 break-words">
                  {primaryCondition?.label ?? "Mixed"}
                </span>
              </div>
            }
            visual={
              <div className="min-w-0 space-y-2">
                <SegmentMeter
                  value={primaryCondition?.weight ?? 0}
                  color="#10b981"
                />
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-muted-foreground">
                  <span>
                    {formatReportCountShort(
                      primaryCondition?.supportingReports ?? 0,
                    )}
                  </span>
                  <DeltaPill value={primaryCondition?.deltaPercent ?? 0} />
                </div>
              </div>
            }
          />
        </div>

        <div className="min-w-[11rem] shrink-0 @min-md:min-w-[11.5rem] @min-6xl:min-w-0 @min-6xl:flex-1">
          <TopSignalCard
            label="Trust"
            value={
              <div className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 break-words">
                  {getConfidenceLevelLabel(fixture.confidence)}
                </span>
                <div className="shrink-0">
                  <OverviewPill className="border-indigo-500/25 bg-indigo-500/12 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                    {confidencePercent}%
                  </OverviewPill>
                </div>
              </div>
            }
            detail={fixture.confidenceSummary.strongestRegion}
            icon={<ShieldCheck className="h-4 w-4" />}
            accentClass="bg-indigo-500"
            visual={
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <TrustDots
                    value={fixture.confidenceSummary.overall}
                    color="#4f46e5"
                  />
                  <FreshnessPill
                    label={getFreshnessShortLabel(
                      fixture.confidenceSummary.freshnessLabel,
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Sources
                      </p>
                      <p className="text-[11px] font-semibold text-foreground">
                        {fixture.confidenceSummary.uniqueContributors}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );

  return (
    <section className="mb-4 space-y-4">
      <div className="space-y-4">
        <div className="mx-0 flex flex-col gap-3 @min-3xl:flex-row @min-3xl:items-start @min-3xl:justify-between">
          <div className="flex w-full items-start justify-between gap-2">
            <div className="min-h-[3.5rem] min-w-0 space-y-1">
              <h2 className="truncate text-2xl font-semibold tracking-tight @min-md:text-3xl">
                {sectionTab === "feed" ? "Fishing Reports" : "Fishing insights"}
              </h2>
              <p className="truncate text-sm text-muted-foreground @min-md:text-base">
                {sectionTab === "feed"
                  ? "Recent reports at this spot."
                  : "Analytics at this spot."}
              </p>
            </div>
          </div>
          <div className="w-full shrink-0 @min-3xl:ml-auto @min-3xl:w-auto">
            <div className="flex w-full items-center justify-between gap-2 @min-3xl:justify-end">
              {surfaceControl}
              {sectionTabs}
            </div>
            {sectionTab === "feed" && feedActions ? (
              <div className="mt-2 w-full @min-3xl:ml-auto @min-3xl:w-auto">
                {feedActions}
              </div>
            ) : null}
          </div>
        </div>

        {sectionTab === "analytics" ? topSignalCards : null}

        {sectionTab === "analytics" ? (
          <>
            <OverviewCard>
              <OverviewCardHeader
                title="Species matrix"
                icon={<Fish className="h-4 w-4" />}
                right={
                  <div className="flex items-center gap-2">
                    <span className="hidden min-h-8 items-center text-[11px] uppercase tracking-[0.14em] text-muted-foreground @min-md:inline-flex">
                      <span className="hidden @min-lg:inline">
                        {getUpdatedLabel(
                          fixture.confidenceSummary.freshnessLabel,
                        )}
                      </span>
                      <span className="inline @min-lg:hidden">
                        {getUpdatedLabel(
                          fixture.confidenceSummary.freshnessLabel,
                          true,
                        )}
                      </span>
                    </span>
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        speciesMatrixCompactControlsClass,
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => scrollSpeciesMatrix("prev")}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/25 bg-highlight-7/60 text-foreground/80 shadow-even transition-colors hover:bg-highlight-6/60 hover:text-foreground"
                        aria-label="Scroll species cards left"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollSpeciesMatrix("next")}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/25 bg-highlight-7/60 text-foreground/80 shadow-even transition-colors hover:bg-highlight-6/60 hover:text-foreground"
                        aria-label="Scroll species cards right"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                }
              />
              <div
                className={cn(
                  "hidden px-4 pb-4",
                  speciesMatrixDesktopVisibleClass,
                )}
              >
                <div className="grid grid-cols-[minmax(220px,1.5fr)_144px_124px_152px_176px_96px] gap-4 border-b border-border/35 px-3 py-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <div>Species profile</div>
                  <div className="border-l border-border/30 pl-4 text-center">
                    Density & trend
                  </div>
                  <div className="border-l border-border/30 pl-4 text-center">
                    Best window
                  </div>
                  <div className="border-l border-border/30 pl-4 text-center">
                    Top method
                  </div>
                  <div className="border-l border-border/30 pl-4 text-center">
                    Condition lock
                  </div>
                  <div className="border-l border-border/30 pl-4 text-center">
                    Confidence
                  </div>
                </div>
                <div className="divide-y divide-border/25">
                  {fixture.speciesMomentum.map((item, index) => {
                    const bestWindow =
                      fixture.timeWindows.find(
                        (window) => window.dominantSpecies === item.species,
                      ) ??
                      fixture.timeWindows[index % fixture.timeWindows.length];
                    const condition =
                      item.species === "halibut"
                        ? fixture.conditionSignals[0]
                        : item.species === "corbina"
                          ? (fixture.conditionSignals[2] ??
                            fixture.conditionSignals[0])
                          : item.species === "calico_bass"
                            ? (fixture.conditionSignals[1] ??
                              fixture.conditionSignals[0])
                            : (fixture.conditionSignals[
                                fixture.conditionSignals.length - 1
                              ] ?? fixture.conditionSignals[0]);
                    const source = getSignalSource(item.confidence);
                    const confidencePercent = getConfidencePercent(
                      item.strength,
                      item.confidence,
                    );

                    return (
                      <div
                        key={item.species}
                        className="grid grid-cols-[minmax(220px,1.5fr)_144px_124px_152px_176px_96px] gap-4 px-3 py-3.5"
                      >
                        <div className="flex min-w-0 items-center">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "grid size-11 shrink-0 place-items-center rounded-[18px] border",
                                speciesToneMap[item.species].pill,
                              )}
                            >
                              <Fish className="h-4.5 w-4.5" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <p className="text-base font-semibold leading-tight tracking-tight text-foreground">
                                {item.label}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] font-medium leading-none text-sky-600 dark:text-sky-300">
                                  {item.recentReports} reports
                                </span>
                                <OverviewPill
                                  className={cn(
                                    "px-2 py-0.5 text-[10px] font-semibold",
                                    signalSourceMeta[source].className,
                                  )}
                                >
                                  {signalSourceMeta[source].shortLabel}
                                </OverviewPill>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-2 border-l border-border/25 pl-4 text-center">
                          <DensityBars
                            value={item.strength}
                            color={speciesBarHexMap[item.species]}
                          />
                          <TrendPill trend={item.trend} />
                        </div>
                        <div className="flex items-center justify-center border-l border-border/25 pl-4">
                          <OverviewPill className="border-border/30 bg-foreground/[0.04] px-2.5 py-1 text-[11px] text-foreground/80">
                            {bestWindow?.timeRange ?? "Mixed"}
                          </OverviewPill>
                        </div>
                        <div className="flex items-center justify-center border-l border-border/25 pl-4">
                          <OverviewPill className="border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-700 dark:text-sky-300">
                            <Fish className="mr-1 h-3 w-3" />
                            {item.leadMethod
                              ? FISHING_METHOD_LABELS[item.leadMethod]
                              : "Mixed"}
                          </OverviewPill>
                        </div>
                        <div className="flex items-center justify-center border-l border-border/25 pl-4">
                          <OverviewPill className="border-foreground/10 bg-foreground/[0.045] px-2.5 py-1 text-[11px] text-foreground/80">
                            {React.createElement(
                              getConditionSignalIcon(condition.id),
                              {
                                className: "mr-1 h-3 w-3",
                              },
                            )}
                            {condition.label}
                          </OverviewPill>
                        </div>
                        <div className="border-l border-border/25 pl-4 text-center">
                          <p
                            className={cn(
                              "text-xl font-semibold",
                              item.confidence === "community_confirmed"
                                ? "text-emerald-600 dark:text-emerald-300"
                                : item.confidence === "moderate_signal"
                                  ? "text-amber-600 dark:text-amber-300"
                                  : "text-muted-foreground",
                            )}
                          >
                            {confidencePercent}%
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {confidenceLabelMap[item.confidence]}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={cn("px-4 pb-4", speciesMatrixCompactHiddenClass)}>
                <div
                  ref={speciesMatrixScrollerRef}
                  className="flex gap-3 overflow-x-auto px-0.5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {fixture.speciesMomentum.map((item, index) => {
                    const bestWindow =
                      fixture.timeWindows.find(
                        (window) => window.dominantSpecies === item.species,
                      ) ??
                      fixture.timeWindows[index % fixture.timeWindows.length];
                    const confidencePercent = getConfidencePercent(
                      item.strength,
                      item.confidence,
                    );

                    return (
                      <div
                        key={item.species}
                        className="w-[272px] shrink-0 rounded-[18px] border border-border/25 bg-foreground/[0.04] p-3.5"
                      >
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div
                              className={cn(
                                "grid size-11 shrink-0 place-items-center rounded-[18px] border",
                                speciesToneMap[item.species].pill,
                              )}
                            >
                              <Fish className="h-4.5 w-4.5" />
                            </div>
                            <div className="min-w-0 self-center space-y-0.5">
                              <p className="text-base font-semibold leading-tight tracking-tight text-foreground">
                                {item.label}
                              </p>
                              <p className="text-[11px] leading-none text-sky-600 dark:text-sky-300">
                                {item.recentReports} verified reports
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5 self-center">
                            <OverviewPill className="border-border/25 bg-foreground/[0.045] px-2 py-0.5 text-[10px] font-semibold text-foreground/75">
                              #{index + 1}
                            </OverviewPill>
                            <OverviewPill
                              className={cn(
                                "px-2 py-0.5 text-[10px] font-semibold",
                                confidenceToneMap[item.confidence],
                              )}
                            >
                              {Math.round(confidencePercent)}%
                            </OverviewPill>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2.5">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                              Density
                            </p>
                            <div className="mt-1.5">
                              <DensityBars
                                value={item.strength}
                                color={speciesBarHexMap[item.species]}
                              />
                            </div>
                          </div>
                          <TrendPill trend={item.trend} />
                        </div>
                        <div className="mt-3 grid justify-items-start gap-1.5">
                          <OverviewPill className="w-fit justify-start border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-700 dark:text-sky-300">
                            <Fish className="mr-1 h-3 w-3" />
                            {item.leadMethod
                              ? FISHING_METHOD_LABELS[item.leadMethod]
                              : "Mixed"}
                          </OverviewPill>
                          <OverviewPill className="w-fit justify-start border-border/30 bg-foreground/[0.04] px-2.5 py-1 text-[11px] text-foreground/80">
                            <Clock3 className="mr-1 h-3 w-3" />
                            {bestWindow?.timeRange ?? "Mixed"}
                          </OverviewPill>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border/15 px-4 py-3 text-xs text-muted-foreground @min-md:px-5">
                {fallbackSpeciesCount > 0
                  ? `Community signal limited — using nearby and regional fallback for ${fallbackSpeciesCount} lower-volume species.`
                  : "Spot signal is strong enough to prioritize local catch patterns over fallback guidance."}
              </div>
            </OverviewCard>

            <div className="grid gap-4 @min-6xl:grid-cols-12">
              <OverviewCard className="h-full @min-6xl:col-span-7">
                <OverviewCardHeader
                  title="Activity timeline"
                  icon={<Clock3 className="h-4 w-4" />}
                />
                <div className="space-y-3 px-3 pb-3 @min-md:space-y-4 @min-md:px-4 @min-md:pb-4">
                  <div className="grid grid-cols-2 gap-2.5 @min-md:gap-3">
                    {topWindows.map((window, index) => (
                      <div
                        key={window.id}
                        className={cn(
                          "relative overflow-hidden rounded-[16px] border p-2.5 @min-md:rounded-[18px] @min-md:p-3",
                          index === 0
                            ? "border-sky-500/16 bg-sky-500/[0.045] dark:border-sky-400/18 dark:bg-sky-400/[0.08]"
                            : "border-violet-500/16 bg-violet-500/[0.045] dark:border-violet-400/18 dark:bg-violet-400/[0.08]",
                        )}
                      >
                        <div
                          aria-hidden="true"
                          className={cn(
                            "pointer-events-none absolute inset-x-0 top-0 h-px",
                            index === 0
                              ? "bg-sky-500/22 dark:bg-sky-300/24"
                              : "bg-violet-500/22 dark:bg-violet-300/24",
                          )}
                        />
                        <div className="relative flex min-h-[4.6rem] flex-col justify-between">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/85 @min-md:text-[11px]">
                              {formatWindowLabel(window.label)}
                            </p>
                            <div className="mt-1.5 flex items-center gap-1.5 @min-md:mt-2">
                              <p className="whitespace-nowrap text-[13px] font-semibold tabular-nums tracking-[-0.02em] text-foreground @min-md:text-[15px] @min-xl:text-[17px]">
                                <span className="@min-md:hidden">
                                  {compactTimeRange(window.timeRange)}
                                </span>
                                <span className="hidden @min-md:inline">
                                  {window.timeRange}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full border border-foreground/12 bg-background/92 px-2 py-0.5 text-[10px] font-medium text-foreground/90 @min-md:text-[11px]">
                              <Users className="h-3 w-3" />
                              {window.totalReports}
                            </span>
                            {window.dominantSpecies ? (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium @min-md:text-[11px]",
                                  index === 0
                                    ? "border-sky-500/18 bg-sky-500/[0.065] text-sky-700/90 dark:text-sky-300/90"
                                    : "border-violet-500/18 bg-violet-500/[0.065] text-violet-700/90 dark:text-violet-300/90",
                                )}
                              >
                                <Fish className="h-3 w-3" />
                                {FISHING_SPECIES_LABELS[window.dominantSpecies]}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <p className="hidden mt-1.5 text-[11px] text-muted-foreground @min-md:mt-2 @min-md:text-xs">
                          <span className="font-medium text-foreground/78">
                            {window.totalReports} reports
                          </span>
                          {window.dominantSpecies ? (
                            <>
                              <span className="hidden @min-sm:inline">
                                {` led by ${FISHING_SPECIES_LABELS[window.dominantSpecies]}`}
                              </span>
                              <span className="@min-sm:hidden">
                                {` • ${FISHING_SPECIES_LABELS[window.dominantSpecies]}`}
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-[10px] text-muted-foreground @min-md:gap-x-3 @min-md:gap-y-2 @min-md:text-[11px]">
                    {activityChartLegend.map((item) => (
                      <span
                        key={item.key}
                        className="inline-flex shrink-0 items-center gap-1.5"
                      >
                        <span
                          aria-hidden="true"
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.label}
                      </span>
                    ))}
                    {fixture.speciesMomentum.length >
                    visibleActivitySeries.length ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-muted-foreground/85">
                        <Layers3 className="h-3.5 w-3.5" />
                        Top {visibleActivitySeries.length} active species shown
                      </span>
                    ) : null}
                  </div>
                  <ChartContainer
                    config={activityChartConfig}
                    className="h-[190px] w-full !aspect-auto @min-md:h-[220px]"
                  >
                    <BarChart
                      data={fixture.activityTrend}
                      margin={{ top: 8, right: 4, left: 2, bottom: 0 }}
                      barCategoryGap="22%"
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="bucket"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        interval={0}
                        padding={{ left: 8, right: 8 }}
                        tickFormatter={formatActivityBucketLabel}
                        tick={{ fontSize: 9 }}
                        minTickGap={6}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        width={28}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            indicator="line"
                            className="min-w-[7.25rem] gap-1 px-2 py-1.5"
                            labelFormatter={(value) =>
                              typeof value === "string"
                                ? formatActivityBucketTooltipLabel(value)
                                : String(value ?? "")
                            }
                          />
                        }
                      />
                      {visibleActivitySeries.map((key) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          stackId="activity"
                          fill={activityChartConfig[key].color}
                          fillOpacity={0.22}
                          stroke={activityChartConfig[key].color}
                          strokeOpacity={0.9}
                          strokeWidth={1}
                          shape={(props: unknown) => {
                            if (!props || typeof props !== "object") {
                              return <Rectangle radius={[0, 0, 0, 0]} />;
                            }

                            const shapeProps = props as ActivityBarShapeProps;

                            return (
                              <Rectangle
                                {...shapeProps}
                                radius={
                                  shapeProps.payload
                                    ? getActivityStackRadius(
                                        shapeProps.payload,
                                        key,
                                        visibleActivitySeries,
                                      )
                                    : [0, 0, 0, 0]
                                }
                              />
                            );
                          }}
                        ></Bar>
                      ))}
                    </BarChart>
                  </ChartContainer>
                </div>
              </OverviewCard>

              <OverviewCard className="flex h-full flex-col @min-6xl:col-span-5">
                <OverviewCardHeader
                  title="Methods"
                  icon={<Target className="h-4 w-4" />}
                />
                <div className="flex flex-1 flex-col px-4 pb-4 pt-1">
                  <div className="space-y-3">
                    {topMethods.map((method) => {
                      const MethodIcon = getMethodIcon(method.method);
                      const tone = getMethodTone(method.method);

                      return (
                        <div
                          key={method.method}
                          className="rounded-[18px] border border-border/25 bg-highlight-7/65 p-3.5 shadow-even supports-[backdrop-filter]:bg-highlight-7/40 supports-[backdrop-filter]:backdrop-blur-md"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <div
                                className={cn(
                                  "grid size-10 shrink-0 place-items-center rounded-2xl border shadow-sm",
                                  tone.icon,
                                )}
                              >
                                <MethodIcon className="h-4.5 w-4.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold tracking-tight text-foreground">
                                  {method.label}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <OverviewPill className="border-border/20 bg-foreground/[0.05] px-2.5 py-0.5 text-[10px] font-medium text-foreground/75">
                                    {method.recentReports} reports
                                  </OverviewPill>
                                  {method.leadSpecies ? (
                                    <OverviewPill
                                      className={cn(
                                        "px-2.5 py-0.5 text-[10px] font-medium",
                                        tone.badge,
                                      )}
                                    >
                                      {
                                        FISHING_SPECIES_LABELS[
                                          method.leadSpecies
                                        ]
                                      }
                                    </OverviewPill>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            <DeltaPill value={method.deltaPercent} />
                          </div>

                          <div className="mt-3">
                            <SignalBar
                              value={method.signal}
                              label="Strength"
                              color={tone.bar}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </OverviewCard>
            </div>

            <OverviewCard>
              <OverviewCardHeader
                title="Environmental signals"
                icon={<Droplets className="h-4 w-4" />}
              />
              <div className="space-y-3 px-4 pb-4 pt-1">
                <div className="grid gap-3 @min-3xl:grid-cols-2 @min-6xl:grid-cols-3">
                  {topConditions.map((item) => {
                    const tone = getConditionSignalTone(item.id);
                    return (
                      <div
                        key={item.id}
                        className="rounded-[18px] border border-border/25 bg-foreground/[0.04] p-3"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={cn(
                              "grid size-10 shrink-0 place-items-center rounded-2xl",
                              tone.tile,
                            )}
                          >
                            {React.createElement(
                              getConditionSignalIcon(item.id),
                              {
                                className: "h-4 w-4",
                              },
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {item.label}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {item.supportingReports} reports align
                                </p>
                              </div>
                              <ConfidencePill confidence={item.confidence} />
                            </div>
                            <div className="mt-3 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                  Match strength
                                </p>
                                <span className="text-xs font-medium text-foreground/80">
                                  +{Math.round(item.weight * 100)}% lift
                                </span>
                              </div>
                              <SegmentMeter
                                value={item.weight}
                                color={getConditionBarHex(item.id)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {visibleAlerts.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
                        Access watch
                      </p>
                    </div>
                    <div className="grid gap-2 @min-xl:grid-cols-2">
                      {visibleAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={cn(
                            "flex items-start gap-3 rounded-[18px] border px-3 py-2.5",
                            alert.severity === "warning"
                              ? "border-orange-500/20 bg-orange-500/8"
                              : "border-amber-500/20 bg-amber-500/8",
                          )}
                        >
                          <AlertTriangle
                            className={cn(
                              "mt-0.5 h-4 w-4 shrink-0",
                              alert.severity === "warning"
                                ? "text-orange-600 dark:text-orange-300"
                                : "text-amber-600 dark:text-amber-300",
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-foreground">
                                {alert.title}
                              </p>
                              <OverviewPill
                                className={cn(
                                  "px-2 py-0.5 text-[10px] font-semibold",
                                  alert.severity === "warning"
                                    ? "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300"
                                    : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                                )}
                              >
                                {alert.severity === "warning"
                                  ? "Watch"
                                  : "Heads up"}
                              </OverviewPill>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {alert.regionLabel} • {alert.postedLabel}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </OverviewCard>
          </>
        ) : (
          feedContent
        )}
      </div>
    </section>
  );
}

type FishingIntelligenceDashboardProps = Props & {
  filters?: FeedFilters;
  createdFeed?: ReadonlyArray<FishingFeedItem>;
  compactTopSpacing?: boolean;
  feedToolbar?: React.ReactNode;
};

export function FishingIntelligenceDashboard({
  beachName,
  filters: controlledFilters,
  createdFeed = [],
  compactTopSpacing = false,
  feedToolbar,
}: FishingIntelligenceDashboardProps) {
  const { data: fixture } = useFishingIntelligenceData(beachName);
  const [internalFilters, setInternalFilters] = React.useState<FeedFilters>({
    species: "all",
    method: "all",
    region: "all",
  });
  const [page, setPage] = React.useState(1);
  const perPage = 10;
  const filters = controlledFilters ?? internalFilters;

  const mergedFeed = React.useMemo(() => {
    return [...createdFeed, ...fixture.feed].sort((left, right) => {
      const leftTime = new Date(left.occurredAt).getTime();
      const rightTime = new Date(right.occurredAt).getTime();
      return rightTime - leftTime;
    });
  }, [createdFeed, fixture.feed]);

  const filteredFeed = React.useMemo(() => {
    return mergedFeed.filter((item) => {
      if (filters.species !== "all" && item.species !== filters.species) {
        return false;
      }
      if (filters.method !== "all" && item.method !== filters.method) {
        return false;
      }
      if (filters.region !== "all" && item.region !== filters.region) {
        return false;
      }
      return true;
    });
  }, [filters, mergedFeed]);

  React.useEffect(() => {
    if (!controlledFilters) return;
    setInternalFilters(controlledFilters);
  }, [controlledFilters]);

  React.useEffect(() => {
    setPage(1);
  }, [filters]);

  React.useEffect(() => {
    if (createdFeed.length > 0) {
      setPage(1);
    }
  }, [createdFeed]);

  const totalPages = Math.max(1, Math.ceil(filteredFeed.length / perPage));

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pagedFeed = React.useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredFeed.slice(start, start + perPage);
  }, [filteredFeed, page]);

  const getPageNumbers = React.useCallback(() => {
    const delta = 1;
    const pages: Array<number | string> = [];
    const range: number[] = [];

    for (
      let index = Math.max(2, page - delta);
      index <= Math.min(totalPages - 1, page + delta);
      index++
    ) {
      range.push(index);
    }

    if (page - delta > 2) {
      pages.push(1, "...");
    } else {
      pages.push(1);
    }

    pages.push(...range);

    if (page + delta < totalPages - 1) {
      pages.push("...", totalPages);
    } else if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages.filter((value, index, arr) => arr.indexOf(value) === index);
  }, [page, totalPages]);

  return (
    <section
      className={cn(
        compactTopSpacing ? "mt-0" : "mt-6",
        "flex flex-col gap-2.5",
      )}
    >
      {feedToolbar ? (
        <div className="mx-0 flex justify-end">{feedToolbar}</div>
      ) : null}
      <div className="grid gap-2.5 @min-5xl:grid-cols-2">
        {filteredFeed.length === 0 ? (
          <div className="@min-5xl:col-span-2">
            <SparseState
              title="Not enough recent reports"
              body="Signal is too weak for the current filters. Expand region or relax the filter set."
            />
          </div>
        ) : (
          pagedFeed.map((item) => (
            <FeedCard
              key={item.id}
              item={item}
              anchorId={`feed-card-${item.id}`}
            />
          ))
        )}
      </div>

      {filteredFeed.length > 0 && totalPages > 1 ? (
        <Pagination className="mt-2">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page === 1}
                tabIndex={page === 1 ? -1 : 0}
                className={cn(
                  page === 1 && "pointer-events-none text-muted-foreground",
                )}
                onClick={(event) => {
                  event.preventDefault();
                  if (page === 1) return;
                  setPage((current) => Math.max(1, current - 1));
                }}
              />
            </PaginationItem>
            {getPageNumbers().map((value, index) =>
              value === "..." ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={value}>
                  <PaginationLink
                    href="#"
                    isActive={value === page}
                    onClick={(event) => {
                      event.preventDefault();
                      setPage(value as number);
                    }}
                  >
                    {value}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page === totalPages}
                tabIndex={page === totalPages ? -1 : 0}
                className={cn(
                  page === totalPages &&
                    "pointer-events-none text-muted-foreground",
                )}
                onClick={(event) => {
                  event.preventDefault();
                  if (page === totalPages) return;
                  setPage((current) => Math.min(totalPages, current + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </section>
  );
}
