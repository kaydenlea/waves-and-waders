import {
  COMMUNITY_REGION_GENERIC_MIN_CONTRIBUTORS,
  COMMUNITY_REGION_SPECIES_MIN_CONTRIBUTORS,
} from "./constants";
import type {
  CommunityModerationState,
  CommunityPublicationState,
  CommunityRecencyState,
  CommunityReportRow,
  CommunityReportType,
  CommunityVisibilityTier,
} from "./types";

export const canManageCommunityReport = (
  requesterUserId: string,
  authorUserId: string,
) => requesterUserId === authorUserId;

export const canReadPrivateCommunityReport = (
  requesterUserId: string,
  authorUserId: string,
) => requesterUserId === authorUserId;

export const isExcludedFromPublic = (input: {
  deletedAt: string | null;
  moderationState: CommunityModerationState;
  publicationState: CommunityPublicationState;
}) =>
  input.deletedAt != null ||
  input.moderationState !== "active" ||
  input.publicationState !== "public_published";

export const canExposePublicReportCard = (
  report: Pick<
    CommunityReportRow,
    "report_type" | "visibility_tier" | "publication_state" | "moderation_state" | "deleted_at"
  >,
) => {
  if (
    isExcludedFromPublic({
      deletedAt: report.deleted_at,
      moderationState: report.moderation_state,
      publicationState: report.publication_state,
    })
  ) {
    return false;
  }

  if (report.report_type === "catch_report") {
    return false;
  }

  return (
    report.visibility_tier === "beach" || report.visibility_tier === "spot_name"
  );
};

export const getAggregateContributorThreshold = (input: {
  reportType: CommunityReportType;
  visibilityTier: CommunityVisibilityTier;
  speciesGroupKey: string;
}) => {
  if (input.reportType !== "catch_report") {
    return 1;
  }

  if (input.visibilityTier !== "public_region") {
    return Number.POSITIVE_INFINITY;
  }

  return input.speciesGroupKey.length > 0
    ? COMMUNITY_REGION_SPECIES_MIN_CONTRIBUTORS
    : COMMUNITY_REGION_GENERIC_MIN_CONTRIBUTORS;
};

export const getAggregateConfidenceState = (input: {
  reportCount: number;
  uniqueContributors: number;
  recencyState: CommunityRecencyState;
}) => {
  if (input.reportCount <= 0) return "not_enough_data" as const;
  if (input.recencyState === "stale") return "stale" as const;
  if (input.uniqueContributors <= 1) return "single_report" as const;
  return "community_confirmed" as const;
};
