import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  COMMUNITY_REGION_GENERIC_MIN_CONTRIBUTORS,
  COMMUNITY_REGION_SPECIES_MIN_CONTRIBUTORS,
} from "@/lib/community/constants";
import { CommunityHttpError } from "@/lib/community/errors";
import { getPacificDayBucket, getRecencyState, isDelayedFishingAggregate } from "@/lib/community/utils";
import type { CommunityReportRow } from "@/lib/community/types";

export type AggregateScopeKey = {
  scopeType: "beach" | "region";
  scopeId: string;
  bucketStartIso: string;
  bucketEndIso: string;
};

type CandidateAggregate = {
  scopeType: "beach" | "region";
  scopeId: string;
  domain: string;
  reportType: string;
  speciesGroupKey: string;
  reportIds: string[];
  uniqueContributors: Set<string>;
  rows: CommunityReportRow[];
  detailRows: Array<Record<string, unknown>>;
};

const toReportRows = (rows: unknown): CommunityReportRow[] =>
  ((rows as CommunityReportRow[] | null) ?? []).map((row) => row);

const groupBy = <T,>(rows: ReadonlyArray<T>, keyFn: (row: T) => string) => {
  const map = new Map<string, T[]>();
  rows.forEach((row) => {
    const key = keyFn(row);
    const existing = map.get(key);
    if (existing) {
      existing.push(row);
      return;
    }
    map.set(key, [row]);
  });
  return map;
};

const getScopeFilterColumn = (scopeType: "beach" | "region") =>
  scopeType === "beach" ? "beach_id" : "region_id";

const loadDetailsByType = async (reportType: string, reportIds: ReadonlyArray<string>) => {
  const admin = getSupabaseAdmin();
  const tableName =
    reportType === "surf_check"
      ? "community_surf_checks"
      : reportType === "catch_report"
      ? "community_catch_reports"
      : reportType === "conditions_report"
      ? "community_conditions_reports"
      : "community_access_reports";

  const { data, error } = await admin
    .from(tableName)
    .select("*")
    .in("report_id", [...reportIds]);

  if (error) {
    throw new CommunityHttpError(500, `Failed to load ${reportType} detail rows.`);
  }

  return (data as Record<string, unknown>[] | null) ?? [];
};

const buildSummaryJson = (aggregate: CandidateAggregate) => {
  const base: Record<string, unknown> = {
    reportCount: aggregate.rows.length,
    uniqueContributors: aggregate.uniqueContributors.size,
  };

  if (aggregate.reportType === "surf_check") {
    const surfQuality = aggregate.detailRows
      .map((row) => Number(row.surf_quality))
      .filter((value) => Number.isFinite(value));
    const crowdLevel = aggregate.detailRows
      .map((row) => Number(row.crowd_level))
      .filter((value) => Number.isFinite(value));

    return {
      ...base,
      averageSurfQuality:
        surfQuality.length > 0
          ? surfQuality.reduce((sum, value) => sum + value, 0) / surfQuality.length
          : null,
      averageCrowdLevel:
        crowdLevel.length > 0
          ? crowdLevel.reduce((sum, value) => sum + value, 0) / crowdLevel.length
          : null,
      windMismatchCount: aggregate.detailRows.filter(
        (row) => row.observed_wind_mismatch === true,
      ).length,
      swellMismatchCount: aggregate.detailRows.filter(
        (row) => row.observed_swell_mismatch === true,
      ).length,
    };
  }

  if (aggregate.reportType === "catch_report") {
    const methodCounts = aggregate.detailRows.reduce<Record<string, number>>(
      (result, row) => {
        const method = typeof row.method === "string" ? row.method : "other";
        result[method] = (result[method] ?? 0) + 1;
        return result;
      },
      {},
    );

    return {
      ...base,
      keptCount: aggregate.detailRows.filter((row) => row.kept === true).length,
      releasedCount: aggregate.detailRows.filter((row) => row.released === true)
        .length,
      methodCounts,
      speciesGroup: aggregate.speciesGroupKey || null,
    };
  }

  if (aggregate.reportType === "conditions_report") {
    const clarityCounts = aggregate.detailRows.reduce<Record<string, number>>(
      (result, row) => {
        if (typeof row.water_clarity === "string") {
          result[row.water_clarity] = (result[row.water_clarity] ?? 0) + 1;
        }
        return result;
      },
      {},
    );

    return {
      ...base,
      clarityCounts,
      biteActivityCounts: aggregate.detailRows.reduce<Record<string, number>>(
        (result, row) => {
          if (typeof row.bite_activity === "string") {
            result[row.bite_activity] = (result[row.bite_activity] ?? 0) + 1;
          }
          return result;
        },
        {},
      ),
      observedChopCount: aggregate.detailRows.filter((row) => row.observed_chop === true)
        .length,
      observedDebrisCount: aggregate.detailRows.filter(
        (row) => row.observed_debris === true,
      ).length,
    };
  }

  return {
    ...base,
    accessStatusCounts: aggregate.detailRows.reduce<Record<string, number>>(
      (result, row) => {
        if (typeof row.access_status === "string") {
          result[row.access_status] = (result[row.access_status] ?? 0) + 1;
        }
        return result;
      },
      {},
    ),
    hazardLevelCounts: aggregate.detailRows.reduce<Record<string, number>>(
      (result, row) => {
        if (typeof row.hazard_level === "string") {
          result[row.hazard_level] = (result[row.hazard_level] ?? 0) + 1;
        }
        return result;
      },
      {},
    ),
  };
};

const shouldPublishAggregate = (
  aggregate: CandidateAggregate,
  lastReportAt: string | null,
) => {
  const isFishingScope =
    aggregate.scopeType === "region" &&
    (aggregate.domain === "fishing" || aggregate.reportType === "catch_report");

  if (aggregate.reportType === "catch_report") {
    const minContributors =
      aggregate.speciesGroupKey.length > 0
        ? COMMUNITY_REGION_SPECIES_MIN_CONTRIBUTORS
        : COMMUNITY_REGION_GENERIC_MIN_CONTRIBUTORS;
    if (aggregate.uniqueContributors.size < minContributors) {
      return false;
    }
    if (isDelayedFishingAggregate(lastReportAt)) {
      return false;
    }
  }

  if (isFishingScope && aggregate.uniqueContributors.size < COMMUNITY_REGION_GENERIC_MIN_CONTRIBUTORS) {
    return false;
  }

  return aggregate.rows.length > 0;
};

const getConfidenceState = (
  aggregate: CandidateAggregate,
  lastReportAt: string | null,
) => {
  if (aggregate.rows.length === 0) return "not_enough_data";
  if (getRecencyState(lastReportAt) === "stale") return "stale";
  if (aggregate.uniqueContributors.size <= 1) return "single_report";
  return "community_confirmed";
};

const buildCandidateAggregates = async (
  scopeKey: AggregateScopeKey,
  rows: ReadonlyArray<CommunityReportRow>,
) => {
  const baseGroups = groupBy(rows, (row) => `${row.domain}:${row.report_type}`);
  const aggregates: CandidateAggregate[] = [];

  for (const groupedRows of baseGroups.values()) {
    const sample = groupedRows[0];
    const details = await loadDetailsByType(
      sample.report_type,
      groupedRows.map((row) => row.id),
    );
    const detailMap = new Map<string, Record<string, unknown>>();
    details.forEach((row) => {
      const reportId = String(row.report_id ?? "");
      if (reportId) {
        detailMap.set(reportId, row);
      }
    });

    aggregates.push({
      scopeType: scopeKey.scopeType,
      scopeId: scopeKey.scopeId,
      domain: sample.domain,
      reportType: sample.report_type,
      speciesGroupKey: "",
      reportIds: groupedRows.map((row) => row.id),
      uniqueContributors: new Set(groupedRows.map((row) => row.author_id)),
      rows: [...groupedRows],
      detailRows: groupedRows
        .map((row) => detailMap.get(row.id) ?? null)
        .filter((row): row is Record<string, unknown> => row !== null),
    });

    if (sample.report_type === "catch_report") {
      const catchesBySpecies = groupBy(
        groupedRows,
        (row) =>
          String(detailMap.get(row.id)?.species_group ?? "").trim().toLowerCase(),
      );

      for (const [speciesGroupKey, speciesRows] of catchesBySpecies.entries()) {
        if (!speciesGroupKey) continue;
        aggregates.push({
          scopeType: scopeKey.scopeType,
          scopeId: scopeKey.scopeId,
          domain: sample.domain,
          reportType: sample.report_type,
          speciesGroupKey,
          reportIds: speciesRows.map((row) => row.id),
          uniqueContributors: new Set(speciesRows.map((row) => row.author_id)),
          rows: [...speciesRows],
          detailRows: speciesRows
            .map((row) => detailMap.get(row.id) ?? null)
            .filter((row): row is Record<string, unknown> => row !== null),
        });
      }
    }
  }

  return aggregates;
};

const loadReportsForScope = async (scopeKey: AggregateScopeKey) => {
  const admin = getSupabaseAdmin();
  const scopeColumn = getScopeFilterColumn(scopeKey.scopeType);
  let query = admin
    .from("community_reports")
    .select("*")
    .eq(scopeColumn, scopeKey.scopeId)
    .gte("occurred_at", scopeKey.bucketStartIso)
    .lt("occurred_at", scopeKey.bucketEndIso)
    .is("deleted_at", null)
    .in("publication_state", ["public_candidate", "public_published"])
    .eq("moderation_state", "active");

  if (scopeKey.scopeType === "beach") {
    query = query
      .in("report_type", ["surf_check", "conditions_report", "access_report"])
      .in("visibility_tier", ["beach", "spot_name"]);
  } else {
    query = query.in("visibility_tier", ["public_region"]);
  }

  const { data, error } = await query.order("occurred_at", { ascending: false });
  if (error) {
    throw new CommunityHttpError(500, "Failed to load community aggregate candidates.");
  }

  return toReportRows(data);
};

const upsertAggregates = async (
  scopeKey: AggregateScopeKey,
  aggregates: ReadonlyArray<CandidateAggregate>,
) => {
  const admin = getSupabaseAdmin();
  await admin
    .from("community_public_aggregates")
    .delete()
    .eq("scope_type", scopeKey.scopeType)
    .eq("scope_id", scopeKey.scopeId)
    .eq("bucket_start", scopeKey.bucketStartIso)
    .eq("bucket_end", scopeKey.bucketEndIso);

  if (aggregates.length === 0) {
    return;
  }

  const rows = aggregates.map((aggregate) => {
    const lastReportAt = aggregate.rows[0]?.occurred_at ?? null;
    const isPublic = shouldPublishAggregate(aggregate, lastReportAt);
    return {
      scope_type: aggregate.scopeType,
      scope_id: aggregate.scopeId,
      domain: aggregate.domain,
      report_type: aggregate.reportType,
      species_group_key: aggregate.speciesGroupKey,
      bucket_start: scopeKey.bucketStartIso,
      bucket_end: scopeKey.bucketEndIso,
      unique_contributors: aggregate.uniqueContributors.size,
      eligible_report_count: aggregate.rows.length,
      confidence_state: getConfidenceState(aggregate, lastReportAt),
      recency_state: getRecencyState(lastReportAt),
      suppression_reason: isPublic
        ? null
        : aggregate.rows.length === 0
        ? "not_enough_data"
        : isDelayedFishingAggregate(lastReportAt)
        ? "delay_window"
        : "below_threshold",
      is_public: isPublic,
      summary_json: buildSummaryJson(aggregate),
      last_report_at: lastReportAt,
      published_at: isPublic ? new Date().toISOString() : null,
    };
  });

  const { error } = await admin.from("community_public_aggregates").insert(rows);
  if (error) {
    throw new CommunityHttpError(500, "Failed to store community aggregates.");
  }

  const candidateIds = Array.from(
    new Set(aggregates.flatMap((aggregate) => aggregate.reportIds)),
  );
  const publicIds = Array.from(
    new Set(
      aggregates.flatMap((aggregate, index) =>
        rows[index]?.is_public ? aggregate.reportIds : [],
      ),
    ),
  );

  if (candidateIds.length > 0) {
    await admin
      .from("community_reports")
      .update({ publication_state: "public_candidate" })
      .in("id", candidateIds)
      .in("publication_state", ["public_candidate", "public_published"]);
  }

  if (publicIds.length > 0) {
    await admin
      .from("community_reports")
      .update({ publication_state: "public_published" })
      .in("id", publicIds);
  }
};

export const getAggregateScopeKeysForReport = (
  report: Pick<
    CommunityReportRow,
    "beach_id" | "region_id" | "visibility_tier" | "occurred_at"
  >,
) => {
  const occurredAt = new Date(report.occurred_at);
  if (Number.isNaN(occurredAt.getTime())) {
    return [];
  }
  const { bucketStart, bucketEnd } = getPacificDayBucket(occurredAt);
  const keys: AggregateScopeKey[] = [];

  if (
    report.beach_id &&
    (report.visibility_tier === "beach" || report.visibility_tier === "spot_name")
  ) {
    keys.push({
      scopeType: "beach",
      scopeId: report.beach_id,
      bucketStartIso: bucketStart.toISOString(),
      bucketEndIso: bucketEnd.toISOString(),
    });
  }

  if (report.region_id && report.visibility_tier === "public_region") {
    keys.push({
      scopeType: "region",
      scopeId: report.region_id,
      bucketStartIso: bucketStart.toISOString(),
      bucketEndIso: bucketEnd.toISOString(),
    });
  }

  return keys;
};

export const recomputeAggregateScopes = async (
  scopeKeys: ReadonlyArray<AggregateScopeKey>,
) => {
  const uniqueKeys = Array.from(
    new Map(
      scopeKeys.map((scopeKey) => [
        `${scopeKey.scopeType}:${scopeKey.scopeId}:${scopeKey.bucketStartIso}:${scopeKey.bucketEndIso}`,
        scopeKey,
      ]),
    ).values(),
  );

  for (const scopeKey of uniqueKeys) {
    const rows = await loadReportsForScope(scopeKey);
    const aggregates = await buildCandidateAggregates(scopeKey, rows);
    await upsertAggregates(scopeKey, aggregates);
  }
};

export const fetchPublicAggregates = async (filters: {
  scopeType?: "beach" | "region";
  scopeIds?: ReadonlyArray<string>;
  domain?: string;
  reportType?: string;
  days?: number;
}) => {
  const admin = getSupabaseAdmin();
  let query = admin
    .from("community_public_aggregates")
    .select("*")
    .eq("is_public", true)
    .order("bucket_start", { ascending: false });

  if (filters.scopeType) {
    query = query.eq("scope_type", filters.scopeType);
  }
  if (filters.scopeIds && filters.scopeIds.length > 0) {
    query = query.in("scope_id", [...filters.scopeIds]);
  }
  if (filters.domain) {
    query = query.eq("domain", filters.domain);
  }
  if (filters.reportType) {
    query = query.eq("report_type", filters.reportType);
  }
  if (filters.days) {
    const threshold = new Date(Date.now() - filters.days * 24 * 60 * 60 * 1000);
    query = query.gte("bucket_start", threshold.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    throw new CommunityHttpError(500, "Failed to load public community aggregates.");
  }
  return (data as Record<string, unknown>[] | null) ?? [];
};

export const recomputeContributorTrustProfile = async (authorId: string) => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("community_reports")
    .select("moderation_state, deleted_at, occurred_at")
    .eq("author_id", authorId);

  if (error) {
    throw new CommunityHttpError(500, "Failed to refresh contributor trust profile.");
  }

  const rows = (data as Array<Record<string, unknown>> | null) ?? [];
  const activeReportCount = rows.filter((row) => row.deleted_at == null).length;
  const flaggedReportCount = rows.filter(
    (row) => row.moderation_state === "flagged" || row.moderation_state === "under_review",
  ).length;
  const duplicateReportCount = rows.filter(
    (row) => row.moderation_state === "duplicate",
  ).length;
  const latestReportAt = rows
    .map((row) => (typeof row.occurred_at === "string" ? row.occurred_at : null))
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1) ?? null;
  const trustScore = Math.max(
    0,
    Math.min(100, 50 + activeReportCount * 2 - flaggedReportCount * 10 - duplicateReportCount * 8),
  );

  const { error: upsertError } = await admin
    .from("community_contributor_trust_profiles")
    .upsert(
      {
        author_id: authorId,
        active_report_count: activeReportCount,
        flagged_report_count: flaggedReportCount,
        duplicate_report_count: duplicateReportCount,
        latest_report_at: latestReportAt,
        trust_score: trustScore,
      },
      { onConflict: "author_id" },
    );

  if (upsertError) {
    throw new CommunityHttpError(500, "Failed to save contributor trust profile.");
  }
};
