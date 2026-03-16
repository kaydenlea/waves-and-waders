import type {
  CommunityReportHydrated,
  PrivateCommunityReportDto,
  PublicAggregateDto,
} from "@/lib/community/types";
import { canExposePublicReportCard } from "./policies";

const getDetail = (report: CommunityReportHydrated) =>
  report.surfCheck ??
  report.catchReport ??
  report.conditionsReport ??
  report.accessReport ??
  null;

export const serializePrivateCommunityReport = (
  hydrated: CommunityReportHydrated,
): PrivateCommunityReportDto => ({
  id: hydrated.report.id,
  reportType: hydrated.report.report_type,
  domain: hydrated.report.domain,
  occurredAt: hydrated.report.occurred_at,
  beachId: hydrated.report.beach_id,
  regionId: hydrated.report.region_id,
  publicLabel: hydrated.report.public_label,
  notes: hydrated.report.notes,
  visibilityTier: hydrated.report.visibility_tier,
  publicationState: hydrated.report.publication_state,
  moderationState: hydrated.report.moderation_state,
  trustState: hydrated.report.trust_state,
  trustScore: hydrated.report.trust_score,
  createdAt: hydrated.report.created_at,
  updatedAt: hydrated.report.updated_at,
  deletedAt: hydrated.report.deleted_at,
  detail: getDetail(hydrated),
  conditionSnapshot: hydrated.conditionSnapshot ?? null,
  privateLocation: hydrated.privateLocation ?? null,
  media: hydrated.media ?? [],
});

export const serializePublicAggregate = (
  row: Record<string, unknown>,
): PublicAggregateDto => ({
  scopeType: String(row.scope_type) as PublicAggregateDto["scopeType"],
  scopeId: String(row.scope_id ?? ""),
  domain: String(row.domain) as PublicAggregateDto["domain"],
  reportType: String(row.report_type) as PublicAggregateDto["reportType"],
  speciesGroup:
    typeof row.species_group_key === "string" && row.species_group_key.length > 0
      ? row.species_group_key
      : null,
  bucketStart: String(row.bucket_start ?? ""),
  bucketEnd: String(row.bucket_end ?? ""),
  eligibleReportCount: Number(row.eligible_report_count ?? 0),
  uniqueContributors: Number(row.unique_contributors ?? 0),
  confidenceState: String(
    row.confidence_state ?? "not_enough_data",
  ) as PublicAggregateDto["confidenceState"],
  recencyState: String(
    row.recency_state ?? "stale",
  ) as PublicAggregateDto["recencyState"],
  lastReportAt:
    typeof row.last_report_at === "string" ? row.last_report_at : null,
  publishedAt: typeof row.published_at === "string" ? row.published_at : null,
  summary:
    row.summary_json && typeof row.summary_json === "object"
      ? (row.summary_json as Record<string, unknown>)
      : {},
});

export const serializePublicCommunityReportCard = (
  hydrated: CommunityReportHydrated,
) => {
  if (!canExposePublicReportCard(hydrated.report)) {
    return null;
  }

  return {
    id: hydrated.report.id,
    reportType: hydrated.report.report_type,
    domain: hydrated.report.domain,
    occurredAt: hydrated.report.occurred_at,
    beachId: hydrated.report.beach_id,
    regionId: hydrated.report.region_id,
    publicLabel: hydrated.report.public_label,
    notes: hydrated.report.notes,
    visibilityTier: hydrated.report.visibility_tier,
    trustState: hydrated.report.trust_state,
    detail:
      hydrated.surfCheck ??
      hydrated.conditionsReport ??
      hydrated.accessReport ??
      null,
  };
};
