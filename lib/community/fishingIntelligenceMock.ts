"use client";

export type FishingConfidenceState =
  | "community_confirmed"
  | "moderate_signal"
  | "single_report"
  | "historical_pattern"
  | "not_enough_data";

export type FishingTrendState =
  | "heating_up"
  | "steady"
  | "cooling_down"
  | "emerging"
  | "insufficient";

export type FishingSignalState =
  | "strong_signal"
  | "moderate_signal"
  | "weak_signal"
  | "insufficient_data";

export type FishingSpeciesKey = "halibut" | "corbina" | "calico_bass" | "perch";
export type FishingMethodKey =
  | "artificial_lure"
  | "live_bait"
  | "surf_rig"
  | "fly";
export type FishingRegionKey =
  | "dana_point"
  | "san_clemente"
  | "newport"
  | "huntington";

type FishingReportType = "catch_report" | "conditions_report" | "access_report";
type FishingTidePhase = "incoming_tide" | "outgoing_tide" | "slack_high" | "slack_low";
type FishingWindBand = "light_wind" | "moderate_wind" | "windy";
type FishingWaterClarityBand = "clear" | "moderate" | "poor";
type FishingTimeBand = "dawn" | "morning" | "midday" | "afternoon" | "sunset" | "night";

export type FishingSpeciesMomentum = {
  species: FishingSpeciesKey;
  label: string;
  recentReports: number;
  recentWindowCount: number;
  previousWindowCount: number;
  trend: FishingTrendState;
  confidence: FishingConfidenceState;
  strength: number;
  momentumLabel: string;
  leadRegions: FishingRegionKey[];
  leadMethod: FishingMethodKey | null;
  sparkline: number[];
};

export type FishingRegionSignal = {
  region: FishingRegionKey;
  label: string;
  strength: number;
  confidence: FishingConfidenceState;
  trend: FishingTrendState;
  recentLabel: string;
  topSpecies: FishingSpeciesKey[];
  leadMethod: FishingMethodKey | null;
  recentReports: number;
  uniqueContributors: number;
  sparkline: number[];
};

export type FishingMethodSignal = {
  method: FishingMethodKey;
  label: string;
  signal: number;
  deltaPercent: number;
  trend: FishingTrendState;
  confidence: FishingConfidenceState;
  note: string;
  recentReports: number;
  leadSpecies: FishingSpeciesKey | null;
};

export type FishingConditionSignal = {
  id: string;
  label: string;
  detail: string;
  confidence: FishingConfidenceState;
  weight: number;
  deltaPercent: number;
  trend: FishingTrendState;
  supportingReports: number;
};

export type FishingActivityPoint = {
  bucket: string;
  halibut: number;
  corbina: number;
  calico_bass: number;
  perch: number;
  total: number;
};

export type FishingTimeWindow = {
  id: string;
  label: string;
  timeRange: string;
  strength: number;
  confidence: FishingConfidenceState;
  callout: string;
  totalReports: number;
  dominantSpecies: FishingSpeciesKey | null;
};

export type FishingRegionSpeciesCell = {
  species: FishingSpeciesKey;
  value: number;
  confidence: FishingConfidenceState;
};

export type FishingRegionSpeciesRow = {
  region: FishingRegionKey;
  label: string;
  cells: FishingRegionSpeciesCell[];
};

export type FishingMethodSpeciesRow = {
  species: FishingSpeciesKey;
  label: string;
  methods: Array<{
    method: FishingMethodKey;
    label: string;
    value: number;
  }>;
};

export type FishingConfidenceSummary = {
  label: string;
  overall: number;
  uniqueContributors: number;
  recentReports: number;
  freshnessLabel: string;
  strongestRegion: string;
  signalState: FishingSignalState;
  weakRegions: string[];
};

export type FishingAccessAlert = {
  id: string;
  title: string;
  regionLabel: string;
  severity: "warning" | "caution";
  postedLabel: string;
};

export type FishingFeedItem = {
  id: string;
  type: FishingReportType;
  region: FishingRegionKey;
  regionLabel: string;
  occurredAt: string;
  postedLabel: string;
  confidence: FishingConfidenceState;
  privacyLabel: "Public region only" | "Exact location hidden";
  species?: FishingSpeciesKey;
  speciesLabel?: string;
  method?: FishingMethodKey;
  methodLabel?: string;
  title: string;
  summary: string;
  conditions: string[];
  thumbnailTone: "halibut" | "corbina" | "calico" | "clarity" | "alert";
  media?: {
    src: string;
    alt: string;
  };
};

export type FishingIntelligenceFixture = {
  regionLabel: string;
  summaryHeadline: string;
  summarySubhead: string;
  confidence: FishingConfidenceState;
  speciesMomentum: FishingSpeciesMomentum[];
  regionalSignals: FishingRegionSignal[];
  methodSignals: FishingMethodSignal[];
  conditionSignals: FishingConditionSignal[];
  activityTrend: FishingActivityPoint[];
  timeWindows: FishingTimeWindow[];
  regionSpeciesMatrix: FishingRegionSpeciesRow[];
  methodSpeciesMatrix: FishingMethodSpeciesRow[];
  confidenceSummary: FishingConfidenceSummary;
  accessAlerts: FishingAccessAlert[];
  feed: FishingFeedItem[];
};

type FishingAnalyticsReport = {
  id: string;
  contributorId: string;
  type: FishingReportType;
  region: FishingRegionKey;
  occurredAt: string;
  visibilityLabel: "Public region only" | "Exact location hidden";
  title: string;
  summary: string;
  thumbnailTone: FishingFeedItem["thumbnailTone"];
  media?: FishingFeedItem["media"];
  species?: FishingSpeciesKey;
  method?: FishingMethodKey;
  conditions: string[];
  tidePhase: FishingTidePhase;
  windBand: FishingWindBand;
  waterClarity: FishingWaterClarityBand;
  timeBand: FishingTimeBand;
  severity?: FishingAccessAlert["severity"];
};

const FIXTURE_NOW = new Date("2026-03-14T10:00:00-07:00");
const RECENT_WINDOW_HOURS = 24;
const MOMENTUM_WINDOW_HOURS = 6;
const LOOKBACK_HOURS = 48;
const SPECIES_SPARKLINE_LOOKBACK_HOURS = 72;

export const FISHING_REGION_LABELS: Record<FishingRegionKey, string> = {
  dana_point: "Dana Point",
  san_clemente: "San Clemente",
  newport: "Newport",
  huntington: "Huntington",
};

export const FISHING_SPECIES_ORDER: FishingSpeciesKey[] = [
  "halibut",
  "corbina",
  "calico_bass",
  "perch",
];

export const FISHING_SPECIES_LABELS: Record<FishingSpeciesKey, string> = {
  halibut: "Halibut",
  corbina: "Corbina",
  calico_bass: "Calico Bass",
  perch: "Perch",
};

export const FISHING_METHOD_LABELS: Record<FishingMethodKey, string> = {
  artificial_lure: "Artificial lure",
  live_bait: "Live bait",
  surf_rig: "Surf rig",
  fly: "Fly",
};

const TIDE_LABELS: Record<FishingTidePhase, string> = {
  incoming_tide: "Incoming tide",
  outgoing_tide: "Outgoing tide",
  slack_high: "High-slack tide",
  slack_low: "Low-slack tide",
};

const WIND_LABELS: Record<FishingWindBand, string> = {
  light_wind: "Light wind",
  moderate_wind: "Moderate wind",
  windy: "Windy",
};

const CLARITY_LABELS: Record<FishingWaterClarityBand, string> = {
  clear: "Clear water",
  moderate: "Moderate clarity",
  poor: "Poor clarity",
};

const TIME_BAND_LABELS: Record<FishingTimeBand, string> = {
  dawn: "Dawn window",
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  sunset: "Sunset window",
  night: "Night",
};

const TIME_RANGE_LABELS: Record<FishingTimeBand, string> = {
  dawn: "5:00 AM–8:00 AM",
  morning: "8:00 AM–11:00 AM",
  midday: "11:00 AM–2:00 PM",
  afternoon: "2:00 PM–5:00 PM",
  sunset: "5:00 PM–8:00 PM",
  night: "8:00 PM–5:00 AM",
};

const ACTIVITY_BUCKETS = [
  { id: "dawn", label: "5:00 AM–8:00 AM", hours: [5, 6, 7] },
  { id: "morning", label: "8:00 AM–11:00 AM", hours: [8, 9, 10] },
  { id: "midday", label: "11:00 AM–2:00 PM", hours: [11, 12, 13] },
  { id: "afternoon", label: "2:00 PM–5:00 PM", hours: [14, 15, 16] },
  { id: "sunset", label: "5:00 PM–8:00 PM", hours: [17, 18, 19] },
  { id: "night", label: "8:00 PM–5:00 AM", hours: [20, 21, 22, 23, 0, 1, 2, 3, 4] },
] as const;

const createMockFeedMedia = ({
  title,
  accent,
  surface,
}: {
  title: string;
  accent: string;
  surface: string;
}): string => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${surface}" />
          <stop offset="100%" stop-color="#07111e" />
        </linearGradient>
        <linearGradient id="wave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#d8efff" stop-opacity="0.18" />
        </linearGradient>
      </defs>
      <rect width="640" height="480" fill="url(#bg)" />
      <circle cx="548" cy="98" r="68" fill="${accent}" fill-opacity="0.12" />
      <circle cx="92" cy="86" r="94" fill="#ffffff" fill-opacity="0.05" />
      <path d="M0 296 C72 264 130 258 198 272 C254 284 312 320 386 314 C454 308 522 262 640 240 L640 480 L0 480 Z" fill="#051221" />
      <path d="M0 256 C80 236 148 230 222 246 C292 260 350 298 430 292 C502 286 562 246 640 222" fill="none" stroke="url(#wave)" stroke-width="10" stroke-linecap="round" />
      <path d="M0 290 C86 270 154 262 236 276 C314 290 368 330 444 324 C514 318 574 280 640 254" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="5" stroke-linecap="round" />
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const isoHoursAgo = (hoursAgo: number) =>
  new Date(FIXTURE_NOW.getTime() - hoursAgo * 60 * 60 * 1000).toISOString();

const relativeLabelFromIso = (value: string): string => {
  const diffMs = Math.max(0, FIXTURE_NOW.getTime() - new Date(value).getTime());
  const minutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(diffMs / (60 * 60 * 1000));

  if (hours <= 0) {
    return `${Math.max(1, minutes)}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
};

const toHoursAgo = (value: string) =>
  (FIXTURE_NOW.getTime() - new Date(value).getTime()) / (60 * 60 * 1000);

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const uniqueCount = <T,>(items: readonly T[], getKey: (item: T) => string) =>
  new Set(items.map(getKey)).size;

const normalize = (value: number, maxValue: number) =>
  maxValue <= 0 ? 0 : clamp01(value / maxValue);

const getConfidenceState = (
  reportCount: number,
  uniqueContributors: number,
): FishingConfidenceState => {
  if (reportCount <= 0) return "not_enough_data";
  if (reportCount === 1 || uniqueContributors === 1) return "single_report";
  if (reportCount >= 6 && uniqueContributors >= 4) return "community_confirmed";
  if (reportCount >= 3 && uniqueContributors >= 2) return "moderate_signal";
  return "historical_pattern";
};

const getSignalState = (
  reportCount: number,
  uniqueContributors: number,
): FishingSignalState => {
  if (reportCount >= 12 && uniqueContributors >= 7) return "strong_signal";
  if (reportCount >= 6 && uniqueContributors >= 4) return "moderate_signal";
  if (reportCount >= 2) return "weak_signal";
  return "insufficient_data";
};

const getTrendState = (
  recentValue: number,
  previousValue: number,
  uniqueContributors: number,
): FishingTrendState => {
  if (recentValue + previousValue <= 1) return "insufficient";
  if (previousValue <= 0) {
    return recentValue >= 2 && uniqueContributors >= 2 ? "emerging" : "insufficient";
  }
  const ratio = recentValue / previousValue;
  if (recentValue >= 2 && previousValue <= 1) return "emerging";
  if (ratio >= 1.35 || recentValue - previousValue >= 2) return "heating_up";
  if (ratio <= 0.75 || previousValue - recentValue >= 2) return "cooling_down";
  return "steady";
};

const getSparklineCounts = <T extends { occurredAt: string }>(
  reports: readonly T[],
  lookbackHours = LOOKBACK_HOURS,
): number[] =>
  Array.from(
    { length: Math.max(1, Math.ceil(lookbackHours / MOMENTUM_WINDOW_HOURS)) },
    (_, index) => {
      const bucketStart =
        lookbackHours - (index + 1) * MOMENTUM_WINDOW_HOURS;
      const bucketEnd = lookbackHours - index * MOMENTUM_WINDOW_HOURS;
      return reports.filter((report) => {
        const hoursAgo = toHoursAgo(report.occurredAt);
        return hoursAgo <= bucketEnd && hoursAgo > bucketStart;
      }).length;
    },
  );

const getFreshnessLabel = (reports: readonly FishingAnalyticsReport[]): string => {
  if (reports.length === 0) return "No recent reports";
  const latestHours = Math.min(...reports.map((report) => toHoursAgo(report.occurredAt)));
  if (latestHours < 1) return "Fresh in the last hour";
  if (latestHours < 6) return `Fresh in the last ${Math.ceil(latestHours)}h`;
  if (latestHours < 24) return `Latest report ${Math.ceil(latestHours)}h ago`;
  return "Older pattern only";
};

const getReportsInWindow = <T extends { occurredAt: string }>(
  reports: readonly T[],
  startHoursAgo: number,
  endHoursAgo: number,
) =>
  reports.filter((report) => {
    const hoursAgo = toHoursAgo(report.occurredAt);
    return hoursAgo <= startHoursAgo && hoursAgo > endHoursAgo;
  });

const getDeltaPercent = (recentCount: number, previousCount: number) => {
  const baseline = Math.max(previousCount, 1);
  const raw = ((recentCount - previousCount) / baseline) * 100;
  return Math.round(Math.max(-100, Math.min(200, raw)));
};

const rawReports: FishingAnalyticsReport[] = [
  {
    id: "catch-halibut-dana-1",
    contributorId: "local-01",
    type: "catch_report",
    region: "dana_point",
    occurredAt: isoHoursAgo(2),
    visibilityLabel: "Public region only",
    title: "Halibut bite building",
    summary: "Clean water and the rising tide are still lining up on the regional sand edge.",
    thumbnailTone: "halibut",
    media: {
      src: createMockFeedMedia({
        title: "Halibut",
        accent: "#3b82f6",
        surface: "#0b2746",
      }),
      alt: "Mock halibut catch photo",
    },
    species: "halibut",
    method: "artificial_lure",
    conditions: ["Incoming tide", "Clear water", "Light wind"],
    tidePhase: "incoming_tide",
    windBand: "light_wind",
    waterClarity: "clear",
    timeBand: "dawn",
  },
  {
    id: "catch-halibut-dana-2",
    contributorId: "local-02",
    type: "catch_report",
    region: "dana_point",
    occurredAt: isoHoursAgo(3),
    visibilityLabel: "Public region only",
    title: "Halibut holding on the push",
    summary: "Same rising-tide lane is still producing with small artificial presentations.",
    thumbnailTone: "halibut",
    species: "halibut",
    method: "artificial_lure",
    conditions: ["Incoming tide", "Clear water"],
    tidePhase: "incoming_tide",
    windBand: "light_wind",
    waterClarity: "clear",
    timeBand: "dawn",
  },
  {
    id: "catch-halibut-dana-3",
    contributorId: "local-03",
    type: "catch_report",
    region: "dana_point",
    occurredAt: isoHoursAgo(4),
    visibilityLabel: "Public region only",
    title: "Early halibut window still alive",
    summary: "Signal remains strongest in the dawn band before the wind builds.",
    thumbnailTone: "halibut",
    species: "halibut",
    method: "artificial_lure",
    conditions: ["Incoming tide", "Moderate clarity"],
    tidePhase: "incoming_tide",
    windBand: "light_wind",
    waterClarity: "moderate",
    timeBand: "dawn",
  },
  {
    id: "catch-halibut-dana-4",
    contributorId: "local-04",
    type: "catch_report",
    region: "dana_point",
    occurredAt: isoHoursAgo(5),
    visibilityLabel: "Exact location hidden",
    title: "Private halibut log still matches the dawn push",
    summary: "Private report reinforces the same incoming-tide pattern without exposing the spot.",
    thumbnailTone: "halibut",
    species: "halibut",
    method: "live_bait",
    conditions: ["Incoming tide", "Clear water"],
    tidePhase: "incoming_tide",
    windBand: "light_wind",
    waterClarity: "clear",
    timeBand: "dawn",
  },
  {
    id: "catch-halibut-dana-5",
    contributorId: "local-05",
    type: "catch_report",
    region: "dana_point",
    occurredAt: isoHoursAgo(11),
    visibilityLabel: "Public region only",
    title: "Night push held longer than expected",
    summary: "One late-night contributor still found halibut before the morning pulse took over.",
    thumbnailTone: "halibut",
    species: "halibut",
    method: "artificial_lure",
    conditions: ["Light wind", "Clear water"],
    tidePhase: "slack_high",
    windBand: "light_wind",
    waterClarity: "clear",
    timeBand: "night",
  },
  {
    id: "catch-halibut-dana-6",
    contributorId: "local-02",
    type: "catch_report",
    region: "dana_point",
    occurredAt: isoHoursAgo(20),
    visibilityLabel: "Public region only",
    title: "Afternoon halibut still fair",
    summary: "Less consistent than dawn, but enough to keep Dana Point leading the region.",
    thumbnailTone: "halibut",
    species: "halibut",
    method: "artificial_lure",
    conditions: ["Moderate clarity", "Afternoon"],
    tidePhase: "incoming_tide",
    windBand: "moderate_wind",
    waterClarity: "moderate",
    timeBand: "afternoon",
  },
  {
    id: "catch-halibut-dana-prev-1",
    contributorId: "local-01",
    type: "catch_report",
    region: "dana_point",
    occurredAt: isoHoursAgo(26),
    visibilityLabel: "Public region only",
    title: "Earlier halibut report",
    summary: "Previous-day report that still supports the same broad Dana Point pattern.",
    thumbnailTone: "halibut",
    species: "halibut",
    method: "artificial_lure",
    conditions: ["Incoming tide", "Clear water"],
    tidePhase: "incoming_tide",
    windBand: "light_wind",
    waterClarity: "clear",
    timeBand: "dawn",
  },
  {
    id: "catch-halibut-dana-prev-2",
    contributorId: "local-03",
    type: "catch_report",
    region: "dana_point",
    occurredAt: isoHoursAgo(33),
    visibilityLabel: "Exact location hidden",
    title: "Previous-day halibut check",
    summary: "Older report, still useful for comparing the recent jump in signal.",
    thumbnailTone: "halibut",
    species: "halibut",
    method: "surf_rig",
    conditions: ["Moderate clarity", "Morning"],
    tidePhase: "slack_low",
    windBand: "moderate_wind",
    waterClarity: "moderate",
    timeBand: "morning",
  },
  {
    id: "catch-halibut-dana-prev-3",
    contributorId: "local-06",
    type: "catch_report",
    region: "dana_point",
    occurredAt: isoHoursAgo(42),
    visibilityLabel: "Public region only",
    title: "Older halibut note",
    summary: "Useful as historical context but not driving the current pulse.",
    thumbnailTone: "halibut",
    species: "halibut",
    method: "live_bait",
    conditions: ["Clear water", "Morning"],
    tidePhase: "incoming_tide",
    windBand: "light_wind",
    waterClarity: "clear",
    timeBand: "morning",
  },
  {
    id: "catch-halibut-sc-1",
    contributorId: "local-07",
    type: "catch_report",
    region: "san_clemente",
    occurredAt: isoHoursAgo(1),
    visibilityLabel: "Public region only",
    title: "San Clemente halibut pulse",
    summary: "The same dawn tide push is showing up south of Dana on lower volume.",
    thumbnailTone: "halibut",
    species: "halibut",
    method: "surf_rig",
    conditions: ["Incoming tide", "Light wind"],
    tidePhase: "incoming_tide",
    windBand: "light_wind",
    waterClarity: "moderate",
    timeBand: "morning",
  },
  {
    id: "catch-halibut-sc-2",
    contributorId: "local-08",
    type: "catch_report",
    region: "san_clemente",
    occurredAt: isoHoursAgo(6),
    visibilityLabel: "Exact location hidden",
    title: "Pre-dawn San Clemente hit",
    summary: "Surf rig reports are still supporting the regional dawn window.",
    thumbnailTone: "halibut",
    species: "halibut",
    method: "surf_rig",
    conditions: ["Incoming tide", "Moderate clarity"],
    tidePhase: "incoming_tide",
    windBand: "light_wind",
    waterClarity: "moderate",
    timeBand: "dawn",
  },
  {
    id: "catch-halibut-sc-3",
    contributorId: "local-09",
    type: "catch_report",
    region: "san_clemente",
    occurredAt: isoHoursAgo(22),
    visibilityLabel: "Public region only",
    title: "San Clemente stayed fishable",
    summary: "Signal is quieter than Dana Point but still reliable enough to watch.",
    thumbnailTone: "halibut",
    species: "halibut",
    method: "artificial_lure",
    conditions: ["Moderate clarity", "Midday"],
    tidePhase: "slack_high",
    windBand: "moderate_wind",
    waterClarity: "moderate",
    timeBand: "midday",
  },
  {
    id: "catch-halibut-sc-prev",
    contributorId: "local-07",
    type: "catch_report",
    region: "san_clemente",
    occurredAt: isoHoursAgo(28),
    visibilityLabel: "Public region only",
    title: "Earlier San Clemente report",
    summary: "Older surf-rig report that supports the same broad regional pattern.",
    thumbnailTone: "halibut",
    species: "halibut",
    method: "surf_rig",
    conditions: ["Incoming tide", "Morning"],
    tidePhase: "incoming_tide",
    windBand: "moderate_wind",
    waterClarity: "moderate",
    timeBand: "morning",
  },
  {
    id: "catch-corbina-newport-1",
    contributorId: "local-10",
    type: "catch_report",
    region: "newport",
    occurredAt: isoHoursAgo(15),
    visibilityLabel: "Exact location hidden",
    title: "Corbina still steady into sunset",
    summary: "Newport remains consistent, but the signal is flatter than the Dana Point halibut burst.",
    thumbnailTone: "corbina",
    media: {
      src: createMockFeedMedia({
        title: "Corbina",
        accent: "#14b8a6",
        surface: "#08292b",
      }),
      alt: "Mock corbina catch photo",
    },
    species: "corbina",
    method: "surf_rig",
    conditions: ["Sunset window", "Light wind"],
    tidePhase: "slack_high",
    windBand: "light_wind",
    waterClarity: "clear",
    timeBand: "sunset",
  },
  {
    id: "catch-corbina-newport-2",
    contributorId: "local-11",
    type: "catch_report",
    region: "newport",
    occurredAt: isoHoursAgo(17),
    visibilityLabel: "Public region only",
    title: "Newport corbina holding",
    summary: "Still enough steady reports to keep Newport on the board for corbina.",
    thumbnailTone: "corbina",
    species: "corbina",
    method: "live_bait",
    conditions: ["Sunset window", "Moderate clarity"],
    tidePhase: "incoming_tide",
    windBand: "light_wind",
    waterClarity: "moderate",
    timeBand: "sunset",
  },
  {
    id: "catch-corbina-newport-3",
    contributorId: "local-12",
    type: "catch_report",
    region: "newport",
    occurredAt: isoHoursAgo(21),
    visibilityLabel: "Public region only",
    title: "Corbina midday check",
    summary: "Midday activity stayed serviceable, but not especially sharp.",
    thumbnailTone: "corbina",
    species: "corbina",
    method: "surf_rig",
    conditions: ["Moderate clarity", "Midday"],
    tidePhase: "slack_low",
    windBand: "moderate_wind",
    waterClarity: "moderate",
    timeBand: "midday",
  },
  {
    id: "catch-corbina-newport-4",
    contributorId: "local-13",
    type: "catch_report",
    region: "newport",
    occurredAt: isoHoursAgo(23),
    visibilityLabel: "Public region only",
    title: "Newport still producing",
    summary: "Enough overlap in methods to call this steady instead of trending up.",
    thumbnailTone: "corbina",
    species: "corbina",
    method: "surf_rig",
    conditions: ["Morning", "Light wind"],
    tidePhase: "incoming_tide",
    windBand: "light_wind",
    waterClarity: "clear",
    timeBand: "morning",
  },
  {
    id: "catch-corbina-newport-prev-1",
    contributorId: "local-10",
    type: "catch_report",
    region: "newport",
    occurredAt: isoHoursAgo(29),
    visibilityLabel: "Public region only",
    title: "Older Newport corbina note",
    summary: "Previous-window report that keeps the Newport pattern from being treated as a one-off.",
    thumbnailTone: "corbina",
    species: "corbina",
    method: "surf_rig",
    conditions: ["Dawn window", "Light wind"],
    tidePhase: "incoming_tide",
    windBand: "light_wind",
    waterClarity: "clear",
    timeBand: "dawn",
  },
  {
    id: "catch-corbina-newport-prev-2",
    contributorId: "local-11",
    type: "catch_report",
    region: "newport",
    occurredAt: isoHoursAgo(32),
    visibilityLabel: "Exact location hidden",
    title: "Earlier Newport corbina report",
    summary: "The older window looked similar to today: useful, but not explosive.",
    thumbnailTone: "corbina",
    species: "corbina",
    method: "live_bait",
    conditions: ["Morning", "Clear water"],
    tidePhase: "slack_high",
    windBand: "light_wind",
    waterClarity: "clear",
    timeBand: "morning",
  },
  {
    id: "catch-corbina-newport-prev-3",
    contributorId: "local-13",
    type: "catch_report",
    region: "newport",
    occurredAt: isoHoursAgo(36),
    visibilityLabel: "Public region only",
    title: "Older Newport pocket",
    summary: "Still useful as pattern support, but not enough to push the region above moderate confidence.",
    thumbnailTone: "corbina",
    species: "corbina",
    method: "surf_rig",
    conditions: ["Midday", "Moderate clarity"],
    tidePhase: "slack_low",
    windBand: "moderate_wind",
    waterClarity: "moderate",
    timeBand: "midday",
  },
  {
    id: "catch-calico-hb-1",
    contributorId: "local-14",
    type: "catch_report",
    region: "huntington",
    occurredAt: isoHoursAgo(9),
    visibilityLabel: "Exact location hidden",
    title: "Single calico report",
    summary: "One contributor found a short bite window, but not enough support yet.",
    thumbnailTone: "calico",
    species: "calico_bass",
    method: "live_bait",
    conditions: ["Night", "Moderate clarity"],
    tidePhase: "outgoing_tide",
    windBand: "moderate_wind",
    waterClarity: "moderate",
    timeBand: "night",
  },
  {
    id: "catch-calico-hb-prev",
    contributorId: "local-15",
    type: "catch_report",
    region: "huntington",
    occurredAt: isoHoursAgo(25),
    visibilityLabel: "Public region only",
    title: "Previous calico note",
    summary: "Useful as comparison, but the region is still too thin overall.",
    thumbnailTone: "calico",
    species: "calico_bass",
    method: "artificial_lure",
    conditions: ["Moderate clarity", "Sunset window"],
    tidePhase: "outgoing_tide",
    windBand: "moderate_wind",
    waterClarity: "moderate",
    timeBand: "sunset",
  },
  {
    id: "catch-calico-sc-prev",
    contributorId: "local-17",
    type: "catch_report",
    region: "san_clemente",
    occurredAt: isoHoursAgo(29),
    visibilityLabel: "Public region only",
    title: "Older calico crossover report",
    summary: "An older live-bait report that has not repeated strongly enough this morning.",
    thumbnailTone: "calico",
    species: "calico_bass",
    method: "live_bait",
    conditions: ["Moderate clarity", "Afternoon"],
    tidePhase: "outgoing_tide",
    windBand: "moderate_wind",
    waterClarity: "moderate",
    timeBand: "afternoon",
  },
  {
    id: "catch-perch-hb-1",
    contributorId: "local-16",
    type: "catch_report",
    region: "huntington",
    occurredAt: isoHoursAgo(8),
    visibilityLabel: "Public region only",
    title: "Single perch check",
    summary: "Not enough overlapping reports to say Huntington is on.",
    thumbnailTone: "clarity",
    species: "perch",
    method: "surf_rig",
    conditions: ["Poor clarity", "Night"],
    tidePhase: "slack_low",
    windBand: "windy",
    waterClarity: "poor",
    timeBand: "night",
  },
  {
    id: "conditions-san-clemente",
    contributorId: "local-21",
    type: "conditions_report",
    region: "san_clemente",
    occurredAt: isoHoursAgo(4),
    visibilityLabel: "Public region only",
    title: "Water clarity slipped",
    summary: "Darker water and kelp lines are making the shore read tougher through late morning.",
    thumbnailTone: "clarity",
    media: {
      src: createMockFeedMedia({
        title: "Clarity",
        accent: "#22d3ee",
        surface: "#0a2940",
      }),
      alt: "Mock water clarity report image",
    },
    conditions: ["Poor clarity", "Heavy kelp"],
    tidePhase: "outgoing_tide",
    windBand: "moderate_wind",
    waterClarity: "poor",
    timeBand: "morning",
  },
  {
    id: "conditions-newport",
    contributorId: "local-22",
    type: "conditions_report",
    region: "newport",
    occurredAt: isoHoursAgo(5),
    visibilityLabel: "Public region only",
    title: "Newport still clean enough",
    summary: "Clearer water is keeping Newport viable even without a big trend move.",
    thumbnailTone: "clarity",
    conditions: ["Clear water", "Light wind"],
    tidePhase: "incoming_tide",
    windBand: "light_wind",
    waterClarity: "clear",
    timeBand: "morning",
  },
  {
    id: "access-dana",
    contributorId: "local-31",
    type: "access_report",
    region: "dana_point",
    occurredAt: isoHoursAgo(0.75),
    visibilityLabel: "Public region only",
    title: "Parking full by 7am",
    summary: "Harbor lots hit capacity before first light. Expect delay unless you get there early.",
    thumbnailTone: "alert",
    conditions: ["Parking full", "Reduced capacity"],
    tidePhase: "incoming_tide",
    windBand: "light_wind",
    waterClarity: "clear",
    timeBand: "morning",
    severity: "warning",
  },
  {
    id: "access-san-clemente",
    contributorId: "local-32",
    type: "access_report",
    region: "san_clemente",
    occurredAt: isoHoursAgo(3),
    visibilityLabel: "Public region only",
    title: "North stair access closed",
    summary: "Closure is forcing a longer walk and slowing early-morning setup.",
    thumbnailTone: "alert",
    conditions: ["Access closed", "Long walk"],
    tidePhase: "incoming_tide",
    windBand: "light_wind",
    waterClarity: "moderate",
    timeBand: "morning",
    severity: "warning",
  },
  {
    id: "access-newport",
    contributorId: "local-33",
    type: "access_report",
    region: "newport",
    occurredAt: isoHoursAgo(6),
    visibilityLabel: "Public region only",
    title: "Heavy kelp line affecting shore access",
    summary: "Not a closure, but shore coverage is slower and less clean than normal.",
    thumbnailTone: "alert",
    conditions: ["Heavy kelp", "Slow shore access"],
    tidePhase: "outgoing_tide",
    windBand: "moderate_wind",
    waterClarity: "moderate",
    timeBand: "dawn",
    severity: "caution",
  },
];

const catchReports = rawReports.filter(
  (report): report is FishingAnalyticsReport & {
    type: "catch_report";
    species: FishingSpeciesKey;
    method: FishingMethodKey;
  } => report.type === "catch_report" && Boolean(report.species) && Boolean(report.method),
);

const accessReports = rawReports.filter(
  (report): report is FishingAnalyticsReport & { type: "access_report" } =>
    report.type === "access_report",
);

const getConditionBuckets = (
  reports: readonly (FishingAnalyticsReport & {
    species: FishingSpeciesKey;
    method: FishingMethodKey;
  })[],
) => {
  const recent = getReportsInWindow(reports, RECENT_WINDOW_HOURS, 0);
  const previous = getReportsInWindow(reports, LOOKBACK_HOURS, RECENT_WINDOW_HOURS);

  const descriptors = [
    {
      id: "incoming_tide",
      label: TIDE_LABELS.incoming_tide,
      matcher: (report: typeof recent[number]) => report.tidePhase === "incoming_tide",
    },
    {
      id: "light_wind",
      label: WIND_LABELS.light_wind,
      matcher: (report: typeof recent[number]) => report.windBand === "light_wind",
    },
    {
      id: "clear_water",
      label: CLARITY_LABELS.clear,
      matcher: (report: typeof recent[number]) => report.waterClarity === "clear",
    },
    {
      id: "dawn_window",
      label: TIME_BAND_LABELS.dawn,
      matcher: (report: typeof recent[number]) => report.timeBand === "dawn",
    },
  ] as const;

  return descriptors.map((descriptor) => {
    const recentReports = recent.filter(descriptor.matcher);
    const previousReports = previous.filter(descriptor.matcher);
    const confidence = getConfidenceState(
      recentReports.length,
      uniqueCount(recentReports, (report) => report.contributorId),
    );

    return {
      id: descriptor.id,
      label: descriptor.label,
      recentReports,
      previousReports,
      confidence,
      trend: getTrendState(
        recentReports.length,
        previousReports.length,
        uniqueCount(recentReports, (report) => report.contributorId),
      ),
      weight:
        recent.length === 0 ? 0 : clamp01(recentReports.length / recent.length),
    };
  });
};

const buildFeedItems = (): FishingFeedItem[] =>
  rawReports
    .filter((report) => report.visibilityLabel === "Public region only")
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    )
    .slice(0, 6)
    .map((report) => {
      const relatedCatchReports =
        report.type === "catch_report"
          ? getReportsInWindow(
              catchReports.filter(
                (item) =>
                  item.region === report.region &&
                  item.species === report.species &&
                  item.method === report.method,
              ),
              RECENT_WINDOW_HOURS,
              0,
            )
          : [];

      return {
        id: report.id,
        type: report.type,
        region: report.region,
        regionLabel: `${FISHING_REGION_LABELS[report.region]} Area`,
        occurredAt: report.occurredAt,
        postedLabel: relativeLabelFromIso(report.occurredAt),
        confidence:
          report.type === "catch_report"
            ? getConfidenceState(
                relatedCatchReports.length,
                uniqueCount(relatedCatchReports, (item) => item.contributorId),
              )
            : report.type === "access_report"
              ? "moderate_signal"
              : "single_report",
        privacyLabel: report.visibilityLabel,
        species: report.species,
        speciesLabel: report.species
          ? FISHING_SPECIES_LABELS[report.species]
          : undefined,
        method: report.method,
        methodLabel: report.method ? FISHING_METHOD_LABELS[report.method] : undefined,
        title: report.title,
        summary: report.summary,
        conditions: report.conditions,
        thumbnailTone: report.thumbnailTone,
        media: report.media,
      };
    });

const buildSpeciesMomentum = (): FishingSpeciesMomentum[] => {
  const recent24Max = Math.max(
    1,
    ...FISHING_SPECIES_ORDER.map(
      (species) =>
        getReportsInWindow(
          catchReports.filter((report) => report.species === species),
          RECENT_WINDOW_HOURS,
          0,
        ).length,
    ),
  );
  const recent6Max = Math.max(
    1,
    ...FISHING_SPECIES_ORDER.map(
      (species) =>
        getReportsInWindow(
          catchReports.filter((report) => report.species === species),
          MOMENTUM_WINDOW_HOURS,
          0,
        ).length,
    ),
  );

  return FISHING_SPECIES_ORDER.map((species) => {
    const speciesReports = catchReports.filter((report) => report.species === species);
    const recent24 = getReportsInWindow(speciesReports, RECENT_WINDOW_HOURS, 0);
    const previous24 = getReportsInWindow(
      speciesReports,
      LOOKBACK_HOURS,
      RECENT_WINDOW_HOURS,
    );
    const recent6 = getReportsInWindow(speciesReports, MOMENTUM_WINDOW_HOURS, 0);
    const regionCounts = new Map<FishingRegionKey, number>();
    const methodCounts = new Map<FishingMethodKey, number>();

    recent24.forEach((report) => {
      regionCounts.set(report.region, (regionCounts.get(report.region) ?? 0) + 1);
      methodCounts.set(report.method, (methodCounts.get(report.method) ?? 0) + 1);
    });

    const leadRegions = [...regionCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 2)
      .map(([region]) => region);

    const leadMethod =
      [...methodCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ??
      null;
    const confidence = getConfidenceState(
      recent24.length,
      uniqueCount(recent24, (report) => report.contributorId),
    );
    const trend = getTrendState(
      recent24.length,
      previous24.length,
      uniqueCount(recent24, (report) => report.contributorId),
    );
    const strength =
      normalize(recent24.length, recent24Max) * 0.72 +
      normalize(recent6.length, recent6Max) * 0.28;

    return {
      species,
      label: FISHING_SPECIES_LABELS[species],
      recentReports: recent24.length,
      recentWindowCount: recent6.length,
      previousWindowCount: previous24.length,
      trend,
      confidence,
      strength: clamp01(strength),
      momentumLabel:
        confidence === "not_enough_data"
          ? "Not enough recent signal"
          : trend === "heating_up"
            ? `${recent24.length} recent reports vs ${previous24.length} in the prior window`
            : trend === "steady"
              ? `Holding near the previous ${RECENT_WINDOW_HOURS}h pace`
              : trend === "cooling_down"
                ? "Recent pace is tapering from the prior day"
                : trend === "emerging"
                  ? "New activity is appearing, but sample is still thin"
                  : "Signal is still too thin to trust",
      leadRegions,
      leadMethod,
      sparkline: getSparklineCounts(
        speciesReports,
        SPECIES_SPARKLINE_LOOKBACK_HOURS,
      ),
    };
  }).sort((left, right) => right.strength - left.strength);
};

const buildRegionalSignals = (): FishingRegionSignal[] => {
  const weightedScores = new Map<FishingRegionKey, number>();
  (Object.keys(FISHING_REGION_LABELS) as FishingRegionKey[]).forEach((region) => {
    const regionReports = catchReports.filter((report) => report.region === region);
    weightedScores.set(
      region,
      regionReports.reduce((total, report) => {
        const hoursAgo = toHoursAgo(report.occurredAt);
        if (hoursAgo <= MOMENTUM_WINDOW_HOURS) return total + 1;
        if (hoursAgo <= RECENT_WINDOW_HOURS) return total + 0.65;
        return total + 0.25;
      }, 0),
    );
  });
  const maxWeighted = Math.max(1, ...weightedScores.values());

  return (Object.keys(FISHING_REGION_LABELS) as FishingRegionKey[])
    .map((region) => {
      const regionReports = catchReports.filter((report) => report.region === region);
      const recent24 = getReportsInWindow(regionReports, RECENT_WINDOW_HOURS, 0);
      const previous24 = getReportsInWindow(regionReports, LOOKBACK_HOURS, RECENT_WINDOW_HOURS);
      const speciesCounts = new Map<FishingSpeciesKey, number>();
      const methodCounts = new Map<FishingMethodKey, number>();
      recent24.forEach((report) => {
        speciesCounts.set(report.species, (speciesCounts.get(report.species) ?? 0) + 1);
        methodCounts.set(report.method, (methodCounts.get(report.method) ?? 0) + 1);
      });

      return {
        region,
        label: FISHING_REGION_LABELS[region],
        strength: normalize(weightedScores.get(region) ?? 0, maxWeighted),
        confidence: getConfidenceState(
          recent24.length,
          uniqueCount(recent24, (report) => report.contributorId),
        ),
        trend: getTrendState(
          recent24.length,
          previous24.length,
          uniqueCount(recent24, (report) => report.contributorId),
        ),
        recentLabel: getFreshnessLabel(recent24.length ? recent24 : regionReports),
        topSpecies: [...speciesCounts.entries()]
          .sort((left, right) => right[1] - left[1])
          .slice(0, 2)
          .map(([species]) => species),
        leadMethod:
          [...methodCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ??
          null,
        recentReports: recent24.length,
        uniqueContributors: uniqueCount(recent24, (report) => report.contributorId),
        sparkline: getSparklineCounts(regionReports),
      };
    })
    .sort((left, right) => right.strength - left.strength);
};

const buildMethodSignals = (): FishingMethodSignal[] => {
  const recent24Max = Math.max(
    1,
    ...Object.keys(FISHING_METHOD_LABELS).map((method) =>
      getReportsInWindow(
        catchReports.filter((report) => report.method === method),
        RECENT_WINDOW_HOURS,
        0,
      ).length,
    ),
  );

  return (Object.keys(FISHING_METHOD_LABELS) as FishingMethodKey[])
    .map((method) => {
      const methodReports = catchReports.filter((report) => report.method === method);
      const recent24 = getReportsInWindow(methodReports, RECENT_WINDOW_HOURS, 0);
      const previous24 = getReportsInWindow(methodReports, LOOKBACK_HOURS, RECENT_WINDOW_HOURS);
      const recent6 = getReportsInWindow(methodReports, MOMENTUM_WINDOW_HOURS, 0);
      const speciesCounts = new Map<FishingSpeciesKey, number>();
      recent24.forEach((report) => {
        speciesCounts.set(report.species, (speciesCounts.get(report.species) ?? 0) + 1);
      });

      const leadSpecies =
        [...speciesCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ??
        null;
      const confidence = getConfidenceState(
        recent24.length,
        uniqueCount(recent24, (report) => report.contributorId),
      );
      const trend = getTrendState(
        recent24.length,
        previous24.length,
        uniqueCount(recent24, (report) => report.contributorId),
      );

      return {
        method,
        label: FISHING_METHOD_LABELS[method],
        signal: clamp01(
          normalize(recent24.length, recent24Max) * 0.7 +
            normalize(recent6.length, recent24Max) * 0.3,
        ),
        deltaPercent: getDeltaPercent(recent24.length, previous24.length),
        trend,
        confidence,
        note:
          confidence === "not_enough_data"
            ? "Low sample"
            : leadSpecies !== null
              ? `${FISHING_SPECIES_LABELS[leadSpecies]} leading`
              : "Mixed pattern",
        recentReports: recent24.length,
        leadSpecies,
      };
    })
    .sort((left, right) => right.signal - left.signal);
};

const buildConditionSignals = (): FishingConditionSignal[] =>
  getConditionBuckets(catchReports).map((bucket) => ({
    id: bucket.id,
    label: bucket.label,
    detail:
      bucket.recentReports.length === 0
        ? "No recent match"
        : bucket.label === "Rising tide"
          ? "Most common recent condition"
          : bucket.label === "Light wind"
            ? "Recurring in active windows"
            : bucket.label === "Clear water"
              ? "Often present in clean bites"
              : "Recurring recent condition",
    confidence: bucket.confidence,
    weight: bucket.weight,
    deltaPercent: getDeltaPercent(
      bucket.recentReports.length,
      bucket.previousReports.length,
    ),
    trend: bucket.trend,
    supportingReports: bucket.recentReports.length,
  }));

const buildActivityTrend = (): FishingActivityPoint[] =>
  ACTIVITY_BUCKETS.map((bucket) => {
    const values = {
      halibut: 0,
      corbina: 0,
      calico_bass: 0,
      perch: 0,
    };

    catchReports.forEach((report) => {
      const localHour = new Date(report.occurredAt).getHours();
      if (bucket.hours.includes(localHour as never)) {
        values[report.species] += 1;
      }
    });

    return {
      bucket: bucket.label,
      ...values,
      total: values.halibut + values.corbina + values.calico_bass + values.perch,
    };
  });

const buildTimeWindows = (
  activityTrend: readonly FishingActivityPoint[],
): FishingTimeWindow[] => {
  const totalMax = Math.max(1, ...activityTrend.map((point) => point.total));
  const labelToBand: Record<string, FishingTimeBand> = {
    "5:00 AM–8:00 AM": "dawn",
    "8:00 AM–11:00 AM": "morning",
    "11:00 AM–2:00 PM": "midday",
    "2:00 PM–5:00 PM": "afternoon",
    "5:00 PM–8:00 PM": "sunset",
    "8:00 PM–5:00 AM": "night",
  };

  return activityTrend
    .map((point) => {
      const contributingReports = catchReports.filter((report) => {
        const localHour = new Date(report.occurredAt).getHours();
        return ACTIVITY_BUCKETS.find((bucket) => bucket.label === point.bucket)?.hours.includes(
          localHour as never,
        );
      });
      const speciesCounts = new Map<FishingSpeciesKey, number>();
      contributingReports.forEach((report) => {
        speciesCounts.set(report.species, (speciesCounts.get(report.species) ?? 0) + 1);
      });
      const dominantSpecies =
        [...speciesCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ??
        null;
      const band = labelToBand[point.bucket] ?? "morning";

      return {
        id: band,
        label:
          point.total >= totalMax
            ? "Peak window"
            : point.total >= totalMax * 0.65
              ? "Secondary window"
              : TIME_BAND_LABELS[band],
        timeRange: TIME_RANGE_LABELS[band],
        strength: normalize(point.total, totalMax),
        confidence: getConfidenceState(
          point.total,
          uniqueCount(contributingReports, (report) => report.contributorId),
        ),
        callout:
          point.total >= totalMax
            ? "Primary cluster"
            : point.total >= totalMax * 0.65
              ? "Follow-on window"
              : point.total <= 1
                ? "Thin signal"
                : "Mixed window",
        totalReports: point.total,
        dominantSpecies,
      };
    })
    .filter((item) => item.totalReports > 0)
    .sort((left, right) => right.strength - left.strength)
    .slice(0, 3);
};

const buildRegionSpeciesMatrix = (): FishingRegionSpeciesRow[] => {
  const recent24 = getReportsInWindow(catchReports, RECENT_WINDOW_HOURS, 0);
  const maxCellCount = Math.max(
    1,
    ...FISHING_SPECIES_ORDER.flatMap((species) =>
      (Object.keys(FISHING_REGION_LABELS) as FishingRegionKey[]).map(
        (region) =>
          recent24.filter(
            (report) => report.region === region && report.species === species,
          ).length,
      ),
    ),
  );

  return (Object.keys(FISHING_REGION_LABELS) as FishingRegionKey[]).map((region) => ({
    region,
    label: FISHING_REGION_LABELS[region],
    cells: FISHING_SPECIES_ORDER.map((species) => {
      const reports = recent24.filter(
        (report) => report.region === region && report.species === species,
      );
      return {
        species,
        value: normalize(reports.length, maxCellCount),
        confidence: getConfidenceState(
          reports.length,
          uniqueCount(reports, (report) => report.contributorId),
        ),
      };
    }),
  }));
};

const buildMethodSpeciesMatrix = (): FishingMethodSpeciesRow[] => {
  const recent24 = getReportsInWindow(catchReports, RECENT_WINDOW_HOURS, 0);
  return FISHING_SPECIES_ORDER.map((species) => {
    const reports = recent24.filter((report) => report.species === species);
    const total = reports.length;
    return {
      species,
      label: FISHING_SPECIES_LABELS[species],
      methods: (Object.keys(FISHING_METHOD_LABELS) as FishingMethodKey[]).map((method) => {
        const count = reports.filter((report) => report.method === method).length;
        return {
          method,
          label: FISHING_METHOD_LABELS[method],
          value: total === 0 ? 0 : clamp01(count / total),
        };
      }),
    };
  });
};

const buildConfidenceSummary = (
  regionalSignals: readonly FishingRegionSignal[],
): FishingConfidenceSummary => {
  const recent24 = getReportsInWindow(catchReports, RECENT_WINDOW_HOURS, 0);
  const signalState = getSignalState(
    recent24.length,
    uniqueCount(recent24, (report) => report.contributorId),
  );

  return {
    label: "Community confidence",
    overall:
      signalState === "strong_signal"
        ? 0.82
        : signalState === "moderate_signal"
          ? 0.64
          : signalState === "weak_signal"
            ? 0.38
            : 0.16,
    uniqueContributors: uniqueCount(recent24, (report) => report.contributorId),
    recentReports: recent24.length,
    freshnessLabel: getFreshnessLabel(recent24),
    strongestRegion: regionalSignals[0]?.label ?? "No region",
    signalState,
    weakRegions: regionalSignals
      .filter(
        (region) =>
          region.confidence === "historical_pattern" ||
          region.confidence === "single_report" ||
          region.confidence === "not_enough_data",
      )
      .map((region) => region.label),
  };
};

const buildAccessAlerts = (): FishingAccessAlert[] =>
  accessReports
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    )
    .map((report) => ({
      id: report.id,
      title: report.title,
      regionLabel: FISHING_REGION_LABELS[report.region],
      severity: report.severity ?? "caution",
      postedLabel: relativeLabelFromIso(report.occurredAt),
    }));

const buildSummaryHeadline = (
  speciesMomentum: readonly FishingSpeciesMomentum[],
  regionalSignals: readonly FishingRegionSignal[],
  timeWindows: readonly FishingTimeWindow[],
): string => {
  const leadSpecies = speciesMomentum[0];
  const leadRegion = regionalSignals[0];
  const leadWindow = timeWindows[0];
  const trendWord =
    leadSpecies?.trend === "heating_up"
      ? "building"
      : leadSpecies?.trend === "steady"
        ? "holding"
        : leadSpecies?.trend === "cooling_down"
          ? "fading"
          : leadSpecies?.trend === "emerging"
            ? "emerging"
            : "thin";

  if (!leadSpecies || !leadRegion || !leadWindow) {
    return "Fishing signal is too thin for a reliable regional read";
  }

  return `${leadSpecies.label} is ${trendWord} in ${leadRegion.label} through the ${leadWindow.label.toLowerCase()}`;
};

const buildSummarySubhead = (
  speciesMomentum: readonly FishingSpeciesMomentum[],
  regionalSignals: readonly FishingRegionSignal[],
  confidenceSummary: FishingConfidenceSummary,
  beachName?: string,
): string => {
  const secondSpecies = speciesMomentum[1];
  const secondRegion = regionalSignals[1];
  const weakText =
    confidenceSummary.weakRegions.length > 0
      ? `${confidenceSummary.weakRegions.join(" and ")} stay too sparse to trust.`
      : "Signal is broad enough to compare regions cleanly.";
  const localContext = beachName
    ? ` Around ${beachName}, use the regional read for planning rather than exact-spot inference.`
    : "";

  return `${secondSpecies?.label ?? "Secondary species"} is ${
    secondSpecies?.trend === "steady" ? "steady" : "mixed"
  } in ${secondRegion?.label ?? confidenceSummary.strongestRegion}, while ${weakText}${localContext}`;
};

export function getFishingIntelligenceFixture(
  beachName?: string,
): FishingIntelligenceFixture {
  const speciesMomentum = buildSpeciesMomentum();
  const regionalSignals = buildRegionalSignals();
  const methodSignals = buildMethodSignals();
  const conditionSignals = buildConditionSignals();
  const activityTrend = buildActivityTrend();
  const timeWindows = buildTimeWindows(activityTrend);
  const confidenceSummary = buildConfidenceSummary(regionalSignals);

  return {
    regionLabel: "South OC Coast",
    summaryHeadline: buildSummaryHeadline(
      speciesMomentum,
      regionalSignals,
      timeWindows,
    ),
    summarySubhead: buildSummarySubhead(
      speciesMomentum,
      regionalSignals,
      confidenceSummary,
      beachName,
    ),
    confidence:
      confidenceSummary.signalState === "strong_signal"
        ? "community_confirmed"
        : confidenceSummary.signalState === "moderate_signal"
          ? "moderate_signal"
          : confidenceSummary.signalState === "weak_signal"
            ? "single_report"
            : "not_enough_data",
    speciesMomentum,
    regionalSignals,
    methodSignals,
    conditionSignals,
    activityTrend,
    timeWindows,
    regionSpeciesMatrix: buildRegionSpeciesMatrix(),
    methodSpeciesMatrix: buildMethodSpeciesMatrix(),
    confidenceSummary,
    accessAlerts: buildAccessAlerts(),
    feed: buildFeedItems(),
  };
}
