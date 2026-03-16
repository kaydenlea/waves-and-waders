"use client";

import * as React from "react";

import {
  FISHING_METHOD_LABELS,
  FISHING_REGION_LABELS,
  FISHING_SPECIES_LABELS,
  FISHING_SPECIES_ORDER,
  getFishingIntelligenceFixture,
  type FishingConfidenceState,
  type FishingFeedItem,
  type FishingIntelligenceFixture,
  type FishingMethodKey,
  type FishingSignalState,
  type FishingSpeciesKey,
  type FishingTimeWindow,
  type FishingTrendState,
} from "./fishingIntelligenceMock";

export type FishingIntelligenceData = FishingIntelligenceFixture;
export type FishingIntelligenceDataSource = "mock" | "real";

export type FishingIntelligenceDataResult = {
  data: FishingIntelligenceData;
  error: string | null;
  isLoading: boolean;
  source: FishingIntelligenceDataSource;
};

export function getFishingIntelligenceDataSnapshot(
  beachName?: string,
): FishingIntelligenceData {
  return getFishingIntelligenceFixture(beachName);
}

export function useFishingIntelligenceData(
  beachName?: string,
): FishingIntelligenceDataResult {
  const data = React.useMemo(
    () => getFishingIntelligenceDataSnapshot(beachName),
    [beachName],
  );

  return React.useMemo(
    () => ({
      data,
      error: null,
      isLoading: false,
      source: "mock" as const,
    }),
    [data],
  );
}

export {
  FISHING_METHOD_LABELS,
  FISHING_REGION_LABELS,
  FISHING_SPECIES_LABELS,
  FISHING_SPECIES_ORDER,
};

export type {
  FishingConfidenceState,
  FishingFeedItem,
  FishingMethodKey,
  FishingSignalState,
  FishingSpeciesKey,
  FishingTimeWindow,
  FishingTrendState,
};
