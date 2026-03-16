import test from "node:test";
import assert from "node:assert/strict";

import {
  canExposePublicReportCard,
  canManageCommunityReport,
  canReadPrivateCommunityReport,
  getAggregateConfidenceState,
  getAggregateContributorThreshold,
  isExcludedFromPublic,
} from "../../lib/community/policies";

test("author-only management helpers enforce ownership", () => {
  assert.equal(canManageCommunityReport("user-1", "user-1"), true);
  assert.equal(canManageCommunityReport("user-1", "user-2"), false);
  assert.equal(canReadPrivateCommunityReport("user-1", "user-1"), true);
  assert.equal(canReadPrivateCommunityReport("user-1", "user-2"), false);
});

test("public report cards exclude catch reports and excluded states", () => {
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

test("aggregate thresholds and confidence states enforce sparse-data safety", () => {
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
