import assert from "node:assert/strict";

import {
  canExposePublicReportCard,
  canManageCommunityReport,
  canReadPrivateCommunityReport,
  getAggregateConfidenceState,
  getAggregateContributorThreshold,
  isExcludedFromPublic,
} from "../lib/community/policies";
import {
  createAccessReportSchema,
  createCatchReportSchema,
  createConditionsReportSchema,
  createSurfCheckSchema,
} from "../lib/community/schemas";
import {
  buildFishingFeedPreviewItem,
  buildFishingReportPayload,
  getInitialFishingComposerState,
  parseFishingComposerDraft,
  serializeFishingComposerDraft,
  shouldAddFishingReportToPublicFeed,
  validateFishingComposerImage,
} from "../lib/community/fishingReportComposer";
import {
  FISHING_METHOD_LABELS,
  getFishingIntelligenceDataSnapshot,
} from "../lib/community/fishingIntelligence";
import {
  buildFishingBeachSummary,
  buildFishingMapDataFromAggregates,
  FISHING_MAP_REGIONS,
} from "../lib/community/fishingMap";
import {
  doesUploadPathBelongToReport,
  isAllowedUploadExtension,
  normalizeUploadExtension,
} from "../lib/community/uploadRules";

const run = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

run("author-only management helpers enforce ownership", () => {
  assert.equal(canManageCommunityReport("user-1", "user-1"), true);
  assert.equal(canManageCommunityReport("user-1", "user-2"), false);
  assert.equal(canReadPrivateCommunityReport("user-1", "user-1"), true);
  assert.equal(canReadPrivateCommunityReport("user-1", "user-2"), false);
});

run("public report cards exclude catch reports and excluded states", () => {
  assert.equal(
    canExposePublicReportCard({
      report_type: "catch_report",
      visibility_tier: "public_region",
      publication_state: "public_published",
      moderation_state: "active",
      deleted_at: null,
    }),
    false,
  );
  assert.equal(
    canExposePublicReportCard({
      report_type: "surf_check",
      visibility_tier: "beach",
      publication_state: "public_published",
      moderation_state: "active",
      deleted_at: null,
    }),
    true,
  );
  assert.equal(
    isExcludedFromPublic({
      deletedAt: null,
      moderationState: "under_review",
      publicationState: "public_published",
    }),
    true,
  );
});

run("aggregate thresholds and confidence states enforce sparse-data safety", () => {
  assert.equal(
    getAggregateContributorThreshold({
      reportType: "catch_report",
      visibilityTier: "public_region",
      speciesGroupKey: "",
    }),
    3,
  );
  assert.equal(
    getAggregateContributorThreshold({
      reportType: "catch_report",
      visibilityTier: "public_region",
      speciesGroupKey: "striped-bass",
    }),
    5,
  );
  assert.equal(
    getAggregateConfidenceState({
      reportCount: 1,
      uniqueContributors: 1,
      recencyState: "fresh",
    }),
    "single_report",
  );
  assert.equal(
    getAggregateConfidenceState({
      reportCount: 0,
      uniqueContributors: 0,
      recencyState: "stale",
    }),
    "not_enough_data",
  );
});

run("surf check validation requires beach scope and valid structured fields", () => {
  const parsed = createSurfCheckSchema.parse({
    reportType: "surf_check",
    occurredAt: "2026-03-10T10:00:00.000Z",
    beachId: "123",
    surfQuality: 4,
    crowdLevel: 2,
  });
  assert.equal(parsed.reportType, "surf_check");
  assert.equal(parsed.beachId, "123");
});

run("catch report validation rejects missing kept/released outcome", () => {
  assert.throws(() =>
    createCatchReportSchema.parse({
      reportType: "catch_report",
      occurredAt: "2026-03-10T10:00:00.000Z",
      regionId: "socal-north",
      species: "Halibut",
      method: "shore",
    }),
  );
});

run("conditions reports require at least one public scope", () => {
  assert.throws(() =>
    createConditionsReportSchema.parse({
      reportType: "conditions_report",
      domain: "shared",
      occurredAt: "2026-03-10T10:00:00.000Z",
    }),
  );
});

run("access report validation preserves structured logistics fields", () => {
  const parsed = createAccessReportSchema.parse({
    reportType: "access_report",
    domain: "shared",
    occurredAt: "2026-03-10T10:00:00.000Z",
    regionId: "orange-county",
    accessStatus: "closed",
    parkingStatus: "full",
    gateStatus: "closed",
    hazardLevel: "major",
    closureKind: "construction",
  });
  assert.equal(parsed.accessStatus, "closed");
  assert.equal(parsed.parkingStatus, "full");
});

run("upload extensions are normalized and restricted to images", () => {
  assert.equal(normalizeUploadExtension("jpeg"), "jpg");
  assert.equal(isAllowedUploadExtension("jpg"), true);
  assert.equal(isAllowedUploadExtension("png"), true);
  assert.equal(isAllowedUploadExtension("gif"), false);
});

run("upload path ownership check stays scoped to report and author", () => {
  assert.equal(
    doesUploadPathBelongToReport(
      "user-1",
      "report-1",
      "reports/user-1/report-1/file.jpg",
    ),
    true,
  );
  assert.equal(
    doesUploadPathBelongToReport(
      "user-1",
      "report-1",
      "reports/user-2/report-1/file.jpg",
    ),
    false,
  );
});

run("fishing composer defaults catch reports to private visibility", () => {
  const state = getInitialFishingComposerState("dana_point");
  assert.equal(state.reportType, "catch_report");
  assert.equal(state.visibilityTier, "private");
});

run("fishing composer payload maps catch reports to backend-safe structured input", () => {
  const state = getInitialFishingComposerState("dana_point");
  state.visibilityTier = "spot_name";
  state.catch.species = "halibut";
  state.catch.method = "artificial_lure";
  state.catch.lengthValue = "24";
  state.notes = "Clean inside edge.";

  const payload = buildFishingReportPayload({
    state,
    beachId: "beach-1",
    beachName: "Dana Point",
    regionLabel: "Dana Point Area",
  });

  assert.equal(payload.reportType, "catch_report");
  assert.equal(payload.visibilityTier, "spot_name");
  assert.equal(payload.beachId, "beach-1");
  assert.equal(payload.regionId, "dana_point");
  assert.equal(payload.method, "lure");
  assert.equal(payload.publicLabel, "Dana Point");
});

run("fishing composer image validation rejects unsafe image types and oversized files", () => {
  assert.equal(
    validateFishingComposerImage({
      name: "fish.gif",
      type: "image/gif",
      size: 1200,
    }),
    "Use a JPG, PNG, or WEBP image.",
  );
  assert.equal(
    validateFishingComposerImage({
      name: "fish.jpg",
      type: "image/jpeg",
      size: 6 * 1024 * 1024,
    }),
    "Image must be 5MB or smaller.",
  );
  assert.equal(
    validateFishingComposerImage({
      name: "fish.webp",
      type: "image/webp",
      size: 1024,
    }),
    null,
  );
});

run("fishing composer draft persistence round-trips safe structured state", () => {
  const state = getInitialFishingComposerState("newport");
  state.reportType = "conditions_report";
  state.visibilityTier = "public_region";
  state.notes = "Water cleaned up.";

  const parsed = parseFishingComposerDraft(
    serializeFishingComposerDraft(state),
    "dana_point",
  );

  assert.ok(parsed);
  assert.equal(parsed?.reportType, "conditions_report");
  assert.equal(parsed?.visibilityTier, "public_region");
  assert.equal(parsed?.region, "newport");
  assert.equal(parsed?.notes, "Water cleaned up.");
  assert.equal(parsed?.imageFile, null);
});

run("fishing composer only injects public-region reports into the public feed preview", () => {
  const state = getInitialFishingComposerState("san_clemente");
  state.visibilityTier = "public_region";
  state.catch.method = "artificial_lure";

  assert.equal(shouldAddFishingReportToPublicFeed(state), true);

  const preview = buildFishingFeedPreviewItem({
    state,
    regionLabel: "San Clemente Coast",
    mediaSrc: "blob:test",
  });

  assert.equal(preview.type, "catch_report");
  assert.equal(preview.regionLabel, "San Clemente Coast");
  assert.equal(preview.methodLabel, FISHING_METHOD_LABELS.artificial_lure);
});

run("fishing intelligence fixture derives meaningful species and regional trends", () => {
  const fixture = getFishingIntelligenceDataSnapshot("Dana Point");

  assert.equal(fixture.speciesMomentum[0]?.species, "halibut");
  assert.equal(fixture.speciesMomentum[0]?.trend, "heating_up");
  assert.equal(fixture.regionalSignals[0]?.region, "dana_point");
  assert.equal(fixture.regionalSignals[0]?.confidence, "community_confirmed");
});

run("fishing intelligence fixture preserves weak-signal honesty", () => {
  const fixture = getFishingIntelligenceDataSnapshot();
  const huntington = fixture.regionalSignals.find((region) => region.region === "huntington");

  assert.ok(huntington);
  assert.equal(huntington?.confidence, "historical_pattern");
  assert.ok(fixture.confidenceSummary.weakRegions.includes("Huntington"));
});

run("fishing intelligence fixture highlights method and conditions patterns", () => {
  const fixture = getFishingIntelligenceDataSnapshot();

  assert.equal(fixture.methodSignals[0]?.method, "artificial_lure");
  assert.equal(fixture.conditionSignals[0]?.id, "incoming_tide");
  assert.ok(fixture.timeWindows[0]);
  assert.ok(fixture.timeWindows[0].totalReports >= fixture.timeWindows[1].totalReports);
});

run("fishing map aggregates stay coarse and build selected-beach fallback", () => {
  const data = buildFishingMapDataFromAggregates({
    regionAggregates: [
      {
        scopeType: "region",
        scopeId: "dana_point",
        domain: "fishing",
        reportType: "catch_report",
        speciesGroup: null,
        bucketStart: "2026-03-10T00:00:00.000Z",
        bucketEnd: "2026-03-11T00:00:00.000Z",
        eligibleReportCount: 11,
        uniqueContributors: 5,
        confidenceState: "community_confirmed",
        recencyState: "fresh",
        lastReportAt: "2026-03-10T10:00:00.000Z",
        publishedAt: "2026-03-10T12:00:00.000Z",
        summary: {
          methodCounts: { lure: 7, bait: 4 },
        },
      },
      {
        scopeType: "region",
        scopeId: "dana_point",
        domain: "fishing",
        reportType: "catch_report",
        speciesGroup: "halibut",
        bucketStart: "2026-03-10T00:00:00.000Z",
        bucketEnd: "2026-03-11T00:00:00.000Z",
        eligibleReportCount: 8,
        uniqueContributors: 4,
        confidenceState: "community_confirmed",
        recencyState: "fresh",
        lastReportAt: "2026-03-10T10:00:00.000Z",
        publishedAt: "2026-03-10T12:00:00.000Z",
        summary: {},
      },
      {
        scopeType: "region",
        scopeId: "dana_point",
        domain: "fishing",
        reportType: "conditions_report",
        speciesGroup: null,
        bucketStart: "2026-03-10T00:00:00.000Z",
        bucketEnd: "2026-03-11T00:00:00.000Z",
        eligibleReportCount: 3,
        uniqueContributors: 2,
        confidenceState: "community_confirmed",
        recencyState: "fresh",
        lastReportAt: "2026-03-10T09:00:00.000Z",
        publishedAt: "2026-03-10T12:00:00.000Z",
        summary: {
          clarityCounts: { clear: 2, fair: 1 },
        },
      },
      {
        scopeType: "region",
        scopeId: "dana_point",
        domain: "fishing",
        reportType: "access_report",
        speciesGroup: null,
        bucketStart: "2026-03-10T00:00:00.000Z",
        bucketEnd: "2026-03-11T00:00:00.000Z",
        eligibleReportCount: 2,
        uniqueContributors: 2,
        confidenceState: "community_confirmed",
        recencyState: "fresh",
        lastReportAt: "2026-03-10T08:00:00.000Z",
        publishedAt: "2026-03-10T12:00:00.000Z",
        summary: {
          accessStatusCounts: { closed: 1, restricted: 1 },
          hazardLevelCounts: { major: 1 },
        },
      },
    ],
    beachAggregates: [
      {
        scopeType: "beach",
        scopeId: "beach-1",
        domain: "fishing",
        reportType: "access_report",
        speciesGroup: null,
        bucketStart: "2026-03-10T00:00:00.000Z",
        bucketEnd: "2026-03-11T00:00:00.000Z",
        eligibleReportCount: 1,
        uniqueContributors: 1,
        confidenceState: "single_report",
        recencyState: "fresh",
        lastReportAt: "2026-03-10T11:00:00.000Z",
        publishedAt: "2026-03-10T12:00:00.000Z",
        summary: {
          accessStatusCounts: { restricted: 1 },
        },
      },
    ],
    selectedBeach: {
      id: "beach-1",
      name: "Dana Point Jetty",
      county: "Orange County",
      latitude: 33.46,
      longitude: -117.7,
    },
  });

  assert.equal(data.source, "real");
  assert.equal(data.regionSignals[0]?.latitude, FISHING_MAP_REGIONS.dana_point.anchorLat);
  assert.equal(data.regionSignals[0]?.topSpecies, "Halibut");
  assert.equal(data.regionSignals[0]?.topMethod, "Lure");
  assert.equal(data.regionSignals[0]?.topCondition, "Clear water");
  assert.equal(data.accessAlerts[0]?.severity, "warning");
  assert.equal(data.selectedBeachSummary?.source, "nearby");
  assert.equal(data.selectedBeachSummary?.accessLabel, "Restricted access");
});

run("fishing map aggregates stay empty when no public data exists", () => {
  const data = buildFishingMapDataFromAggregates({
    regionAggregates: [],
    beachAggregates: [],
    selectedBeach: {
      id: "beach-2",
      name: "Sparse Coast",
      county: "Orange County",
      latitude: 33.5,
      longitude: -117.8,
    },
  });

  assert.equal(data.source, "empty");
  assert.equal(data.regionSignals.length, 0);
  assert.equal(data.accessAlerts.length, 0);
  assert.equal(data.selectedBeachSummary?.source, "predicted");
});

run("fishing map can derive a beach-safe summary from coarse regional signal", () => {
  const data = buildFishingMapDataFromAggregates({
    regionAggregates: [
      {
        scopeType: "region",
        scopeId: "newport",
        domain: "fishing",
        reportType: "catch_report",
        speciesGroup: null,
        bucketStart: "2026-03-10T00:00:00.000Z",
        bucketEnd: "2026-03-11T00:00:00.000Z",
        eligibleReportCount: 6,
        uniqueContributors: 3,
        confidenceState: "not_enough_data",
        recencyState: "fresh",
        lastReportAt: "2026-03-10T10:00:00.000Z",
        publishedAt: "2026-03-10T12:00:00.000Z",
        summary: {
          methodCounts: { bait: 4 },
        },
      },
      {
        scopeType: "region",
        scopeId: "newport",
        domain: "fishing",
        reportType: "catch_report",
        speciesGroup: "corbina",
        bucketStart: "2026-03-10T00:00:00.000Z",
        bucketEnd: "2026-03-11T00:00:00.000Z",
        eligibleReportCount: 4,
        uniqueContributors: 2,
        confidenceState: "not_enough_data",
        recencyState: "fresh",
        lastReportAt: "2026-03-10T10:00:00.000Z",
        publishedAt: "2026-03-10T12:00:00.000Z",
        summary: {},
      },
    ],
    beachAggregates: [],
    selectedBeach: null,
  });

  const summary = buildFishingBeachSummary(
    {
      id: "beach-3",
      name: "Newport Pier",
      county: "Orange County",
      latitude: FISHING_MAP_REGIONS.newport.anchorLat,
      longitude: FISHING_MAP_REGIONS.newport.anchorLng,
    },
    data,
  );

  assert.equal(summary.source, "nearby");
  assert.equal(summary.signalState, "moderate_signal");
  assert.equal(summary.topSpecies, "Corbina");
  assert.equal(summary.topMethod, "Bait");
  assert.equal(summary.regionLabel, "Newport");
});

console.log("Community backend checks completed.");
