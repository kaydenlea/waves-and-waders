"use client";

import * as React from "react";

import { getFishingIntelligenceDataSnapshot } from "./fishingIntelligence";
import type { PublicAggregateDto } from "./types";

export type FishingMapSurfaceMode = "surf" | "fishing";
export type FishingMapLayerMode = "signals" | "access";
export type FishingMapDataSource = "real" | "mock" | "empty";
type FishingMapDataMode = "mock" | "auto" | "real";
export type FishingMapSignalState =
  | "strong_signal"
  | "moderate_signal"
  | "weak_signal"
  | "insufficient_data";
export type FishingMapSignalSource =
  | "spot"
  | "nearby"
  | "regional"
  | "predicted";

export type FishingMapBeachRef = {
  id: string | number;
  name: string;
  county: string;
  latitude: number;
  longitude: number;
};

export type FishingMapRegionAnchor = {
  regionId: string;
  label: string;
  anchorLat: number;
  anchorLng: number;
};

export type FishingMapRegionSignal = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  signalState: FishingMapSignalState;
  confidenceState: PublicAggregateDto["confidenceState"] | "moderate_signal";
  source: FishingMapSignalSource;
  reportCount: number;
  uniqueContributors: number;
  topSpecies: string | null;
  topMethod: string | null;
  topCondition: string | null;
  recencyLabel: string;
  accessLabel: string | null;
  accessSeverity: "warning" | "caution" | null;
};

export type FishingMapAccessAlert = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  scopeType: "region" | "beach";
  scopeId: string;
  reportCount: number;
  recencyLabel: string;
  severity: "warning" | "caution";
  detail: string;
};

export type FishingMapSelectedBeachSummary = {
  beachId: string;
  beachName: string;
  source: FishingMapSignalSource;
  signalState: FishingMapSignalState;
  confidenceLabel: string;
  reportCount: number;
  topSpecies: string | null;
  topMethod: string | null;
  topCondition: string | null;
  accessLabel: string | null;
  accessSeverity: "warning" | "caution" | null;
  sourceLabel: string;
  regionLabel: string | null;
};

export type FishingMapData = {
  source: FishingMapDataSource;
  regionSignals: FishingMapRegionSignal[];
  accessAlerts: FishingMapAccessAlert[];
  selectedBeachSummary: FishingMapSelectedBeachSummary | null;
  updatedLabel: string | null;
};

type FishingMapAccessSeverity = "warning" | "caution";

type FishingMapApiResponse = {
  success: boolean;
  data?: PublicAggregateDto[];
  state?: string;
};

type BuildFishingMapInput = {
  regionAggregates: PublicAggregateDto[];
  beachAggregates: PublicAggregateDto[];
  selectedBeach: FishingMapBeachRef | null;
};

const DEFAULT_DAYS = 7;

const resolveFishingMapDataMode = (): FishingMapDataMode => {
  const configured = process.env.NEXT_PUBLIC_FISHING_MAP_DATA_MODE;
  if (configured === "mock" || configured === "auto" || configured === "real") {
    return configured;
  }
  return process.env.NODE_ENV !== "production" ? "mock" : "auto";
};

export const FISHING_MAP_REGIONS: Record<string, FishingMapRegionAnchor> = {
  dana_point: {
    regionId: "dana_point",
    label: "Dana Point",
    anchorLat: 33.4622,
    anchorLng: -117.6981,
  },
  san_clemente: {
    regionId: "san_clemente",
    label: "San Clemente",
    anchorLat: 33.4208,
    anchorLng: -117.6193,
  },
  newport: {
    regionId: "newport",
    label: "Newport",
    anchorLat: 33.6089,
    anchorLng: -117.9298,
  },
  huntington: {
    regionId: "huntington",
    label: "Huntington",
    anchorLat: 33.6553,
    anchorLng: -118.0048,
  },
};

const CATCH_METHOD_LABELS: Record<string, string> = {
  shore: "Shore",
  kayak: "Kayak",
  boat: "Boat",
  bait: "Bait",
  lure: "Lure",
  fly: "Fly",
  spearfishing: "Spearfishing",
  other: "Other",
};

const CLARITY_LABELS: Record<string, string> = {
  dirty: "Dirty water",
  stained: "Stained water",
  fair: "Fair clarity",
  clear: "Clear water",
  very_clear: "Very clear water",
};

const BITE_ACTIVITY_LABELS: Record<string, string> = {
  unknown: "Unknown bite",
  slow: "Slow bite",
  fair: "Fair bite",
  good: "Good bite",
  hot: "Hot bite",
};

const ACCESS_STATUS_LABELS: Record<string, string> = {
  open: "Access open",
  restricted: "Restricted access",
  closed: "Access closed",
  hazard: "Hazard posted",
};

const HAZARD_LEVEL_LABELS: Record<string, string> = {
  none: "No hazard",
  minor: "Minor hazard",
  major: "Major hazard",
};

const titleCase = (value: string) =>
  value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const safeCountRecord = (
  value: unknown,
): Array<{ key: string; count: number }> => {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>)
    .map(([key, count]) => ({
      key,
      count: typeof count === "number" && Number.isFinite(count) ? count : 0,
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count);
};

const formatRegionLabel = (regionId: string) =>
  FISHING_MAP_REGIONS[regionId]?.label ?? titleCase(regionId);

const formatSpeciesLabel = (speciesGroup: string | null) => {
  if (!speciesGroup) return null;
  return titleCase(speciesGroup);
};

const formatConfidenceLabel = (
  confidenceState: PublicAggregateDto["confidenceState"] | "moderate_signal",
) => {
  switch (confidenceState) {
    case "community_confirmed":
      return "Confirmed";
    case "historical_pattern":
      return "Pattern";
    case "single_report":
      return "Single report";
    case "stale":
      return "Stale";
    case "moderate_signal":
      return "Moderate";
    case "not_enough_data":
    default:
      return "Thin";
  }
};

const formatSourceLabel = (source: FishingMapSignalSource) => {
  switch (source) {
    case "spot":
      return "Spot signal";
    case "nearby":
      return "Nearby signal";
    case "regional":
      return "Regional pattern";
    case "predicted":
    default:
      return "Predicted fallback";
  }
};

const getSignalState = (
  reportCount: number,
  uniqueContributors: number,
): FishingMapSignalState => {
  if (reportCount >= 12 && uniqueContributors >= 6) return "strong_signal";
  if (reportCount >= 6 && uniqueContributors >= 3) return "moderate_signal";
  if (reportCount >= 2) return "weak_signal";
  return "insufficient_data";
};

const getSourceFromConfidence = (
  confidenceState: PublicAggregateDto["confidenceState"] | "moderate_signal",
): FishingMapSignalSource => {
  switch (confidenceState) {
    case "community_confirmed":
      return "regional";
    case "historical_pattern":
      return "regional";
    case "moderate_signal":
      return "nearby";
    case "single_report":
      return "predicted";
    case "stale":
    case "not_enough_data":
    default:
      return "predicted";
  }
};

const formatRecencyLabel = (lastReportAt: string | null) => {
  if (!lastReportAt) return "No recent reports";
  const diffMs = Date.now() - new Date(lastReportAt).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "Updated recently";
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 1) return "Updated <1h ago";
  if (hours < 24) return `Updated ${hours}h ago`;
  return `Updated ${Math.floor(hours / 24)}d ago`;
};

const getTopMethodLabel = (summary: Record<string, unknown>) => {
  const method = safeCountRecord(summary.methodCounts)[0];
  if (!method) return null;
  return CATCH_METHOD_LABELS[method.key] ?? titleCase(method.key);
};

const getTopConditionLabel = (summary: Record<string, unknown>) => {
  const clarity = safeCountRecord(summary.clarityCounts)[0];
  if (clarity) {
    return CLARITY_LABELS[clarity.key] ?? titleCase(clarity.key);
  }
  const bite = safeCountRecord(summary.biteActivityCounts)[0];
  if (bite) {
    return BITE_ACTIVITY_LABELS[bite.key] ?? titleCase(bite.key);
  }
  const chopCount =
    typeof summary.observedChopCount === "number" ? summary.observedChopCount : 0;
  const debrisCount =
    typeof summary.observedDebrisCount === "number"
      ? summary.observedDebrisCount
      : 0;
  if (debrisCount > chopCount && debrisCount > 0) return "Debris noted";
  if (chopCount > 0) return "Chop noted";
  return null;
};

const getAccessMeta = (
  summary: Record<string, unknown>,
): {
  accessLabel: string | null;
  severity: FishingMapAccessSeverity | null;
} => {
  const accessStatus = safeCountRecord(summary.accessStatusCounts)[0];
  const hazardLevel = safeCountRecord(summary.hazardLevelCounts)[0];
  const accessLabel = accessStatus
    ? ACCESS_STATUS_LABELS[accessStatus.key] ?? titleCase(accessStatus.key)
    : hazardLevel
      ? HAZARD_LEVEL_LABELS[hazardLevel.key] ?? titleCase(hazardLevel.key)
      : null;
  const severity =
    accessStatus?.key === "closed" ||
    accessStatus?.key === "hazard" ||
    hazardLevel?.key === "major"
      ? "warning"
      : accessLabel
        ? "caution"
        : null;

  return { accessLabel, severity };
};

const distanceTo = (
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) => {
  const lat = latitudeA - latitudeB;
  const lng = longitudeA - longitudeB;
  return lat * lat + lng * lng;
};

const getNearestRegionAnchor = (selectedBeach: FishingMapBeachRef | null) => {
  if (!selectedBeach) return null;
  return Object.values(FISHING_MAP_REGIONS).reduce<FishingMapRegionAnchor | null>(
    (closest, candidate) => {
      if (!closest) return candidate;
      return distanceTo(
        selectedBeach.latitude,
        selectedBeach.longitude,
        candidate.anchorLat,
        candidate.anchorLng,
      ) <
        distanceTo(
          selectedBeach.latitude,
          selectedBeach.longitude,
          closest.anchorLat,
          closest.anchorLng,
        )
        ? candidate
        : closest;
    },
    null,
  );
};

const getMostRecentLabel = (rows: PublicAggregateDto[]) =>
  rows
    .map((row) => row.lastReportAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .reverse()[0] ?? null;

export function buildFishingBeachSummary(
  beach: FishingMapBeachRef,
  data: FishingMapData,
): FishingMapSelectedBeachSummary {
  if (
    data.selectedBeachSummary &&
    data.selectedBeachSummary.beachId === String(beach.id)
  ) {
    return data.selectedBeachSummary;
  }

  const nearestRegion = getNearestRegionAnchor(beach);
  const regionSignal =
    (nearestRegion &&
      data.regionSignals.find((signal) => signal.id === nearestRegion.regionId)) ??
    data.regionSignals[0] ??
    null;

  const accessAlert =
    (nearestRegion &&
      data.accessAlerts.find(
        (alert) =>
          alert.scopeType === "region" && alert.scopeId === nearestRegion.regionId,
      )) ??
    null;

  if (!regionSignal) {
    return {
      beachId: String(beach.id),
      beachName: beach.name,
      source: "predicted",
      signalState: "insufficient_data",
      confidenceLabel: "Thin",
      reportCount: 0,
      topSpecies: null,
      topMethod: null,
      topCondition: null,
      accessLabel: accessAlert?.label ?? null,
      accessSeverity: accessAlert?.severity ?? null,
      sourceLabel: "Not enough local data",
      regionLabel: nearestRegion?.label ?? null,
    };
  }

  const summarySource =
    regionSignal.source === "regional" ? "nearby" : regionSignal.source;

  return {
    beachId: String(beach.id),
    beachName: beach.name,
    source: summarySource,
    signalState: regionSignal.signalState,
    confidenceLabel: formatConfidenceLabel(regionSignal.confidenceState),
    reportCount: regionSignal.reportCount,
    topSpecies: regionSignal.topSpecies,
    topMethod: regionSignal.topMethod,
    topCondition: regionSignal.topCondition,
    accessLabel: regionSignal.accessLabel ?? accessAlert?.label ?? null,
    accessSeverity: regionSignal.accessSeverity ?? accessAlert?.severity ?? null,
    sourceLabel: formatSourceLabel(summarySource),
    regionLabel: regionSignal.label,
  };
}

export function buildFishingMapDataFromAggregates({
  regionAggregates,
  beachAggregates,
  selectedBeach,
}: BuildFishingMapInput): FishingMapData {
  const byRegion = new Map<string, PublicAggregateDto[]>();
  regionAggregates.forEach((row) => {
    const entries = byRegion.get(row.scopeId);
    if (entries) {
      entries.push(row);
      return;
    }
    byRegion.set(row.scopeId, [row]);
  });

  const regionSignals: FishingMapRegionSignal[] = [];
  const accessAlerts: FishingMapAccessAlert[] = [];

  for (const [regionId, rows] of byRegion.entries()) {
    const anchor = FISHING_MAP_REGIONS[regionId];
    if (!anchor) continue;

    const genericCatch =
      rows.find(
        (row) => row.reportType === "catch_report" && row.speciesGroup == null,
      ) ?? null;

    if (genericCatch) {
      const speciesRows = rows
        .filter(
          (row) =>
            row.reportType === "catch_report" &&
            typeof row.speciesGroup === "string" &&
            row.speciesGroup.length > 0,
        )
        .sort((left, right) => right.eligibleReportCount - left.eligibleReportCount);
      const conditionsRow =
        rows.find((row) => row.reportType === "conditions_report") ?? null;
      const accessRow =
        rows.find((row) => row.reportType === "access_report") ?? null;
      const accessMeta = accessRow ? getAccessMeta(accessRow.summary) : null;
      const confidenceState =
        genericCatch.confidenceState === "not_enough_data"
          ? "moderate_signal"
          : genericCatch.confidenceState;

      regionSignals.push({
        id: regionId,
        label: anchor.label,
        latitude: anchor.anchorLat,
        longitude: anchor.anchorLng,
        signalState: getSignalState(
          genericCatch.eligibleReportCount,
          genericCatch.uniqueContributors,
        ),
        confidenceState,
        source: getSourceFromConfidence(confidenceState),
        reportCount: genericCatch.eligibleReportCount,
        uniqueContributors: genericCatch.uniqueContributors,
        topSpecies: formatSpeciesLabel(speciesRows[0]?.speciesGroup ?? null),
        topMethod: getTopMethodLabel(genericCatch.summary),
        topCondition: conditionsRow ? getTopConditionLabel(conditionsRow.summary) : null,
        recencyLabel: formatRecencyLabel(genericCatch.lastReportAt),
        accessLabel: accessMeta?.accessLabel ?? null,
        accessSeverity: accessMeta?.severity ?? null,
      });
    }

    const accessRow = rows.find((row) => row.reportType === "access_report") ?? null;
    if (!accessRow) continue;
    const accessMeta = getAccessMeta(accessRow.summary);
    if (!accessMeta.accessLabel || !accessMeta.severity) continue;
    accessAlerts.push({
      id: `region:${regionId}`,
      label: accessMeta.accessLabel,
      latitude: anchor.anchorLat,
      longitude: anchor.anchorLng,
      scopeType: "region",
      scopeId: regionId,
      reportCount: accessRow.eligibleReportCount,
      recencyLabel: formatRecencyLabel(accessRow.lastReportAt),
      severity: accessMeta.severity,
      detail: `${formatRegionLabel(regionId)} access reports`,
    });
  }

  if (regionSignals.length > 0) {
    for (const anchor of Object.values(FISHING_MAP_REGIONS)) {
      const alreadyPresent = regionSignals.some(
        (signal) => signal.id === anchor.regionId,
      );
      if (alreadyPresent) continue;
      regionSignals.push({
        id: anchor.regionId,
        label: anchor.label,
        latitude: anchor.anchorLat,
        longitude: anchor.anchorLng,
        signalState: "insufficient_data",
        confidenceState: "not_enough_data",
        source: "predicted",
        reportCount: 0,
        uniqueContributors: 0,
        topSpecies: null,
        topMethod: null,
        topCondition: null,
        recencyLabel: "Not enough public data",
        accessLabel: null,
        accessSeverity: null,
      });
    }
  }

  regionSignals.sort((left, right) => right.reportCount - left.reportCount);

  const beachConditions =
    beachAggregates.find((row) => row.reportType === "conditions_report") ?? null;
  const beachAccess =
    beachAggregates.find((row) => row.reportType === "access_report") ?? null;
  const nearestRegionAnchor = getNearestRegionAnchor(selectedBeach);
  const nearestRegionSignal =
    (nearestRegionAnchor &&
      regionSignals.find((signal) => signal.id === nearestRegionAnchor.regionId)) ??
    regionSignals[0] ??
    null;
  const beachAccessMeta = beachAccess ? getAccessMeta(beachAccess.summary) : null;
  const beachAccessAlert =
    selectedBeach &&
    beachAccess &&
    beachAccessMeta?.accessLabel &&
    beachAccessMeta.severity
      ? ({
          id: `beach:${selectedBeach.id}`,
          label: beachAccessMeta.accessLabel,
          latitude: selectedBeach.latitude,
          longitude: selectedBeach.longitude,
          scopeType: "beach",
          scopeId: String(selectedBeach.id),
          reportCount: beachAccess.eligibleReportCount,
          recencyLabel: formatRecencyLabel(beachAccess.lastReportAt),
          severity: beachAccessMeta.severity,
          detail: `${selectedBeach.name} access reports`,
        } satisfies FishingMapAccessAlert)
      : null;
  if (beachAccessAlert) {
    accessAlerts.push(beachAccessAlert);
  }

  const selectedBeachSummary =
    selectedBeach != null
      ? ({
          beachId: String(selectedBeach.id),
          beachName: selectedBeach.name,
          source: nearestRegionSignal
            ? nearestRegionSignal.source === "regional"
              ? "nearby"
              : nearestRegionSignal.source
            : beachConditions || beachAccess
              ? "spot"
              : "predicted",
          signalState:
            nearestRegionSignal?.signalState ??
            (beachConditions || beachAccess ? "weak_signal" : "insufficient_data"),
          confidenceLabel: nearestRegionSignal
            ? formatConfidenceLabel(nearestRegionSignal.confidenceState)
            : beachConditions || beachAccess
              ? "Local only"
              : "Thin",
          reportCount: nearestRegionSignal?.reportCount ?? 0,
          topSpecies: nearestRegionSignal?.topSpecies ?? null,
          topMethod: nearestRegionSignal?.topMethod ?? null,
          topCondition:
            getTopConditionLabel(beachConditions?.summary ?? {}) ??
            nearestRegionSignal?.topCondition ??
            null,
          accessLabel:
            beachAccessMeta?.accessLabel ?? nearestRegionSignal?.accessLabel ?? null,
          accessSeverity:
            beachAccessMeta?.severity ?? nearestRegionSignal?.accessSeverity ?? null,
          sourceLabel: nearestRegionSignal
            ? formatSourceLabel(
                nearestRegionSignal.source === "regional"
                  ? "nearby"
                  : nearestRegionSignal.source,
              )
            : beachConditions || beachAccess
              ? "Spot conditions"
              : "Not enough local data",
          regionLabel: nearestRegionSignal?.label ?? nearestRegionAnchor?.label ?? null,
        } satisfies FishingMapSelectedBeachSummary)
      : null;

  const updatedLabel =
    formatRecencyLabel(getMostRecentLabel([...regionAggregates, ...beachAggregates])) ??
    null;

  const hasRealData =
    regionAggregates.length > 0 ||
    beachAggregates.length > 0 ||
    regionSignals.length > 0 ||
    accessAlerts.length > 0;

  return {
    source: hasRealData ? "real" : "empty",
    regionSignals,
    accessAlerts,
    selectedBeachSummary,
    updatedLabel,
  };
}

export function buildFishingMapDataFromMock(
  selectedBeach: FishingMapBeachRef | null,
  beachName?: string,
): FishingMapData {
  const fixture = getFishingIntelligenceDataSnapshot(beachName);
  const regionSignals: FishingMapRegionSignal[] = [];
  for (const signal of fixture.regionalSignals) {
    const anchor = FISHING_MAP_REGIONS[signal.region];
    if (!anchor) continue;
    const leadSpecies = signal.topSpecies[0] ?? null;
    regionSignals.push({
      id: signal.region,
      label: signal.label,
      latitude: anchor.anchorLat,
      longitude: anchor.anchorLng,
      signalState:
        signal.strength >= 0.75
          ? "strong_signal"
          : signal.strength >= 0.45
            ? "moderate_signal"
            : signal.strength > 0.2
              ? "weak_signal"
              : "insufficient_data",
      confidenceState: signal.confidence,
      source:
        signal.confidence === "community_confirmed"
          ? "regional"
          : signal.confidence === "moderate_signal"
            ? "nearby"
            : signal.confidence === "historical_pattern"
              ? "regional"
              : "predicted",
      reportCount: signal.recentReports,
      uniqueContributors: signal.uniqueContributors,
      topSpecies: leadSpecies ? titleCase(leadSpecies.replace(/_/g, " ")) : null,
      topMethod: signal.leadMethod
        ? titleCase(signal.leadMethod.replace(/_/g, " "))
        : null,
      topCondition: fixture.conditionSignals[0]?.label ?? null,
      recencyLabel: `Updated ${signal.recentLabel}`,
      accessLabel: null,
      accessSeverity: null,
    });
  }

  const accessAlerts: FishingMapAccessAlert[] = [];
  for (const alert of fixture.accessAlerts) {
    const regionKey =
      Object.entries(FISHING_MAP_REGIONS).find(
        ([, value]) => value.label === alert.regionLabel,
      )?.[0] ?? null;
    if (!regionKey) continue;
    const anchor = FISHING_MAP_REGIONS[regionKey];
    accessAlerts.push({
      id: alert.id,
      label: alert.title,
      latitude: anchor.anchorLat,
      longitude: anchor.anchorLng,
      scopeType: "region",
      scopeId: regionKey,
      reportCount: 1,
      recencyLabel: `Updated ${alert.postedLabel}`,
      severity: alert.severity,
      detail: alert.regionLabel,
    });
  }

  const nearestRegion = getNearestRegionAnchor(selectedBeach);
  const leadSignal =
    (nearestRegion &&
      regionSignals.find((signal) => signal.id === nearestRegion.regionId)) ??
    regionSignals[0] ??
    null;

  return {
    source: "mock",
    regionSignals,
    accessAlerts,
    selectedBeachSummary:
      selectedBeach && leadSignal
        ? {
            beachId: String(selectedBeach.id),
            beachName: selectedBeach.name,
            source: "nearby",
            signalState: leadSignal.signalState,
            confidenceLabel: formatConfidenceLabel(leadSignal.confidenceState),
            reportCount: leadSignal.reportCount,
            topSpecies: leadSignal.topSpecies,
            topMethod: leadSignal.topMethod,
            topCondition: leadSignal.topCondition,
            accessLabel: accessAlerts[0]?.label ?? null,
            accessSeverity: accessAlerts[0]?.severity ?? null,
            sourceLabel: "Nearby signal",
            regionLabel: leadSignal.label,
          }
        : null,
    updatedLabel: `Updated ${fixture.confidenceSummary.freshnessLabel}`,
  };
}

export function useFishingMapAggregates({
  enabled,
  selectedBeach,
  beachName,
  days = DEFAULT_DAYS,
}: {
  enabled: boolean;
  selectedBeach: FishingMapBeachRef | null;
  beachName?: string;
  days?: number;
}) {
  const dataMode = React.useMemo(resolveFishingMapDataMode, []);
  const [state, setState] = React.useState<{
    data: FishingMapData;
    isLoading: boolean;
    error: string | null;
  }>(() => ({
    data: {
      source: "empty",
      regionSignals: [],
      accessAlerts: [],
      selectedBeachSummary: null,
      updatedLabel: null,
    },
    isLoading: false,
    error: null,
  }));

  React.useEffect(() => {
    if (!enabled) {
      setState((current) => ({
        ...current,
        isLoading: false,
      }));
      return;
    }

    if (dataMode === "mock") {
      setState({
        data: buildFishingMapDataFromMock(selectedBeach, beachName),
        isLoading: false,
        error: null,
      });
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setState((current) => ({ ...current, isLoading: true, error: null }));
      try {
        const regionUrl = `/api/community/map/aggregates?scopeType=region&domain=fishing&days=${days}`;
        const beachUrl = selectedBeach
          ? `/api/community/summary/beach/${encodeURIComponent(String(selectedBeach.id))}?days=${days}`
          : null;

        const [regionResponse, beachResponse] = await Promise.all([
          fetch(regionUrl, { signal: controller.signal, cache: "no-store" }),
          beachUrl
            ? fetch(beachUrl, { signal: controller.signal, cache: "no-store" })
            : Promise.resolve(null),
        ]);

        const regionJson =
          ((await regionResponse.json()) as FishingMapApiResponse) ?? null;
        const beachJson = beachResponse
          ? (((await beachResponse.json()) as FishingMapApiResponse) ?? null)
          : null;

        const regionAggregates = Array.isArray(regionJson?.data)
          ? regionJson.data
          : [];
        const beachAggregates = Array.isArray(beachJson?.data)
          ? beachJson.data
          : [];

        let data = buildFishingMapDataFromAggregates({
          regionAggregates,
          beachAggregates,
          selectedBeach,
        });

        if (data.source === "empty" && dataMode === "auto") {
          data = buildFishingMapDataFromMock(selectedBeach, beachName);
        }

        setState({
          data,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        const fallback =
          dataMode === "auto"
            ? buildFishingMapDataFromMock(selectedBeach, beachName)
            : {
                source: "empty" as const,
                regionSignals: [],
                accessAlerts: [],
                selectedBeachSummary: selectedBeach
                  ? {
                      beachId: String(selectedBeach.id),
                      beachName: selectedBeach.name,
                      source: "predicted" as const,
                      signalState: "insufficient_data" as const,
                      confidenceLabel: "Thin",
                      reportCount: 0,
                      topSpecies: null,
                      topMethod: null,
                      topCondition: null,
                      accessLabel: null,
                      accessSeverity: null,
                      sourceLabel: "Not enough local data",
                      regionLabel: null,
                    }
                  : null,
                updatedLabel: null,
              };

        setState({
          data: fallback,
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to load fishing map data.",
        });
      }
    };

    void load();

    return () => controller.abort();
  }, [beachName, dataMode, days, enabled, selectedBeach]);

  return state;
}
