import { fetchBeachForecast, fetchDailyConditions } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  getAggregateScopeKeysForReport,
  recomputeAggregateScopes,
  recomputeContributorTrustProfile,
} from "@/lib/community/aggregates";
import { CommunityHttpError } from "@/lib/community/errors";
import {
  normalizeNotes,
  normalizePlainText,
  normalizePrivateLabel,
  normalizePublicLabel,
  resolveDefaultVisibilityTier,
  resolveInitialPublicationState,
} from "@/lib/community/utils";
import { canExposePublicReportCard } from "@/lib/community/policies";
import type { CommunityReportHydrated, CommunityReportRow } from "@/lib/community/types";
import type {
  CreateCommunityReportInput,
  FlagCommunityReportInput,
  UpdateCommunityReportInput,
} from "@/lib/community/schemas";

type RouteClient = Awaited<
  ReturnType<typeof import("@/lib/community/auth").createCommunityRouteClient>
>;

const castReportRow = (value: unknown) => value as CommunityReportRow;

const getNearestForecastSnapshot = async (beachId: string, occurredAt: Date) => {
  const start = new Date(occurredAt.getTime() - 3 * 60 * 60 * 1000);
  const end = new Date(occurredAt.getTime() + 3 * 60 * 60 * 1000);
  const rows = await fetchBeachForecast(beachId, start, end).catch(() => []);
  if (!rows.length) return null;

  const nearest = rows
    .map((row) => ({
      row,
      distance: Math.abs(new Date(row.timestamp).getTime() - occurredAt.getTime()),
    }))
    .sort((left, right) => left.distance - right.distance)[0]?.row;

  if (!nearest) return null;

  return {
    source_beach_id: beachId,
    forecast_timestamp: nearest.timestamp,
    forecast_window_start: start.toISOString(),
    forecast_window_end: end.toISOString(),
    tide_ft: nearest.conditions.tideLevel,
    surf_min_ft: nearest.surf.heightMin,
    surf_max_ft: nearest.surf.heightMax,
    wave_energy_kj: nearest.surf.waveEnergy,
    water_temp_f: nearest.conditions.waterTemp,
    wind_speed_mph: nearest.conditions.windSpeed,
    wind_direction_deg: nearest.conditions.windDirection,
    primary_swell_height_ft: nearest.swell.primary.height,
    primary_swell_period_s: nearest.swell.primary.period,
    primary_swell_direction_deg: nearest.swell.primary.direction,
  };
};

const getDailyConditionSnapshotDate = async (beachId: string, occurredAt: Date) => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("beaches")
    .select("COUNTY")
    .eq("id", beachId)
    .maybeSingle();

  if (error || !data || typeof data.COUNTY !== "string") {
    return null;
  }

  const dailyConditions = await fetchDailyConditions(data.COUNTY, occurredAt).catch(
    () => null,
  );
  return dailyConditions?.date ?? null;
};

const buildSnapshotInsert = async (
  payload: CreateCommunityReportInput | UpdateCommunityReportInput,
) => {
  if (!payload.beachId) return null;
  const occurredAt = new Date(payload.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) return null;

  const forecastSnapshot = await getNearestForecastSnapshot(payload.beachId, occurredAt);
  if (!forecastSnapshot) return null;

  return {
    ...forecastSnapshot,
    daily_conditions_date: await getDailyConditionSnapshotDate(
      payload.beachId,
      occurredAt,
    ),
  };
};

const buildBaseReportInsert = (
  userId: string,
  payload: CreateCommunityReportInput | UpdateCommunityReportInput,
) => {
  const visibilityTier = resolveDefaultVisibilityTier(payload);
  const moderationState = "active" as const;
  const publicationState = resolveInitialPublicationState(
    visibilityTier,
    moderationState,
  );

  return {
    author_id: userId,
    report_type: payload.reportType,
    domain:
      payload.reportType === "surf_check"
        ? "surf"
        : payload.reportType === "catch_report"
        ? "fishing"
        : payload.domain,
    occurred_at: payload.occurredAt,
    beach_id: payload.beachId ?? null,
    region_id: payload.regionId ?? null,
    public_label: normalizePublicLabel(payload.publicLabel) ?? null,
    notes: normalizeNotes(payload.notes),
    visibility_tier: visibilityTier,
    publication_state: publicationState,
    moderation_state: moderationState,
    trust_state: "unverified",
    trust_score: 50,
  };
};

const upsertSubtypeRow = async (
  supabase: RouteClient,
  reportId: string,
  payload: CreateCommunityReportInput | UpdateCommunityReportInput,
) => {
  switch (payload.reportType) {
    case "surf_check": {
      const { error } = await supabase.from("community_surf_checks").upsert(
        {
          report_id: reportId,
          surf_quality: payload.surfQuality,
          crowd_level: payload.crowdLevel,
          observed_wind_mismatch: payload.observedWindMismatch ?? false,
          observed_swell_mismatch: payload.observedSwellMismatch ?? false,
        },
        { onConflict: "report_id" },
      );
      if (error) throw new CommunityHttpError(500, "Failed to save surf check detail.");
      return;
    }
    case "catch_report": {
      const { error } = await supabase.from("community_catch_reports").upsert(
        {
          report_id: reportId,
          species: normalizePlainText(payload.species, 80),
          species_group: normalizePlainText(payload.speciesGroup, 80),
          method: payload.method,
          kept: payload.kept ?? false,
          released: payload.released ?? false,
          length_value: payload.lengthValue ?? null,
          length_unit: payload.lengthUnit ?? null,
          weight_value: payload.weightValue ?? null,
          weight_unit: payload.weightUnit ?? null,
        },
        { onConflict: "report_id" },
      );
      if (error) throw new CommunityHttpError(500, "Failed to save catch detail.");
      return;
    }
    case "conditions_report": {
      const { error } = await supabase
        .from("community_conditions_reports")
        .upsert(
          {
            report_id: reportId,
            water_clarity: payload.waterClarity ?? null,
            current_strength: payload.currentStrength ?? null,
            bite_activity: payload.biteActivity ?? null,
            observed_chop: payload.observedChop ?? false,
            observed_debris: payload.observedDebris ?? false,
          },
          { onConflict: "report_id" },
        );
      if (error) throw new CommunityHttpError(500, "Failed to save conditions detail.");
      return;
    }
    case "access_report": {
      const { error } = await supabase.from("community_access_reports").upsert(
        {
          report_id: reportId,
          access_status: payload.accessStatus,
          parking_status: payload.parkingStatus ?? null,
          gate_status: payload.gateStatus ?? null,
          hazard_level: payload.hazardLevel ?? null,
          closure_kind: payload.closureKind ?? null,
        },
        { onConflict: "report_id" },
      );
      if (error) throw new CommunityHttpError(500, "Failed to save access detail.");
      return;
    }
  }
};

const upsertSnapshotRow = async (
  supabase: RouteClient,
  reportId: string,
  payload: CreateCommunityReportInput | UpdateCommunityReportInput,
) => {
  const snapshot = await buildSnapshotInsert(payload);
  if (!snapshot) {
    await supabase.from("community_condition_snapshots").delete().eq("report_id", reportId);
    return;
  }

  const { error } = await supabase.from("community_condition_snapshots").upsert(
    {
      report_id: reportId,
      ...snapshot,
    },
    { onConflict: "report_id" },
  );
  if (error) throw new CommunityHttpError(500, "Failed to save condition snapshot.");
};

const upsertPrivateLocationRow = async (
  supabase: RouteClient,
  reportId: string,
  payload: CreateCommunityReportInput | UpdateCommunityReportInput,
) => {
  if (!payload.privateLocation) {
    await supabase.from("community_private_locations").delete().eq("report_id", reportId);
    return;
  }

  const { error } = await supabase.from("community_private_locations").upsert(
    {
      report_id: reportId,
      exact_lat: payload.privateLocation.exactLat ?? null,
      exact_lng: payload.privateLocation.exactLng ?? null,
      private_label: normalizePrivateLabel(payload.privateLocation.privateLabel),
      waterbody_name: normalizePlainText(
        payload.privateLocation.waterbodyName,
        160,
      ),
      launch_point: normalizePlainText(payload.privateLocation.launchPoint, 160),
    },
    { onConflict: "report_id" },
  );

  if (error) {
    throw new CommunityHttpError(500, "Failed to save private location.");
  }
};

const loadMapByReportId = async (
  admin: ReturnType<typeof getSupabaseAdmin>,
  tableName:
    | "community_surf_checks"
    | "community_catch_reports"
    | "community_conditions_reports"
    | "community_access_reports"
    | "community_condition_snapshots"
    | "community_private_locations",
  reportIds: ReadonlyArray<string>,
) => {
  if (reportIds.length === 0) return new Map<string, Record<string, unknown>>();
  const { data, error } = await admin
    .from(tableName)
    .select("*")
    .in("report_id", [...reportIds]);
  if (error) {
    throw new CommunityHttpError(500, `Failed to hydrate ${tableName}.`);
  }
  return (((data as Record<string, unknown>[] | null) ?? []).reduce(
    (map, row) => {
      const reportId = String(row.report_id ?? "");
      if (reportId) map.set(reportId, row);
      return map;
    },
    new Map<string, Record<string, unknown>>(),
  ));
};

const loadMediaByReportId = async (
  admin: ReturnType<typeof getSupabaseAdmin>,
  reportIds: ReadonlyArray<string>,
) => {
  if (reportIds.length === 0) return new Map<string, Record<string, unknown>[]>();
  const { data, error } = await admin
    .from("community_media")
    .select("*")
    .in("report_id", [...reportIds])
    .neq("status", "removed")
    .order("created_at", { ascending: false });
  if (error) {
    throw new CommunityHttpError(500, "Failed to hydrate report media.");
  }
  return (((data as Record<string, unknown>[] | null) ?? []).reduce(
    (map, row) => {
      const reportId = String(row.report_id ?? "");
      if (!reportId) return map;
      const existing = map.get(reportId);
      if (existing) {
        existing.push(row);
        return map;
      }
      map.set(reportId, [row]);
      return map;
    },
    new Map<string, Record<string, unknown>[]>(),
  ));
};

const hydrateReports = async (rows: ReadonlyArray<CommunityReportRow>) => {
  const reportIds = rows.map((row) => row.id);
  const admin = getSupabaseAdmin();
  const [surfChecks, catchReports, conditionsReports, accessReports, snapshots, privateLocations, media] =
    await Promise.all([
      loadMapByReportId(admin, "community_surf_checks", reportIds),
      loadMapByReportId(admin, "community_catch_reports", reportIds),
      loadMapByReportId(admin, "community_conditions_reports", reportIds),
      loadMapByReportId(admin, "community_access_reports", reportIds),
      loadMapByReportId(admin, "community_condition_snapshots", reportIds),
      loadMapByReportId(admin, "community_private_locations", reportIds),
      loadMediaByReportId(admin, reportIds),
    ]);

  return rows.map<CommunityReportHydrated>((report) => ({
    report,
    surfCheck: surfChecks.get(report.id) ?? null,
    catchReport: catchReports.get(report.id) ?? null,
    conditionsReport: conditionsReports.get(report.id) ?? null,
    accessReport: accessReports.get(report.id) ?? null,
    conditionSnapshot: snapshots.get(report.id) ?? null,
    privateLocation: privateLocations.get(report.id) ?? null,
    media: media.get(report.id) ?? [],
  }));
};

const fetchAuthorReport = async (
  supabase: RouteClient,
  userId: string,
  reportId: string,
) => {
  const { data, error } = await supabase
    .from("community_reports")
    .select("*")
    .eq("id", reportId)
    .eq("author_id", userId)
    .maybeSingle();

  if (error) throw new CommunityHttpError(500, "Failed to load report.");
  if (!data) throw new CommunityHttpError(404, "Report not found.");
  return castReportRow(data);
};

export const createCommunityReport = async (
  supabase: RouteClient,
  userId: string,
  payload: CreateCommunityReportInput,
) => {
  const reportInsert = buildBaseReportInsert(userId, payload);
  const { data, error } = await supabase
    .from("community_reports")
    .insert(reportInsert)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new CommunityHttpError(500, "Failed to create report.");
  }

  const createdReport = castReportRow(data);

  try {
    await upsertSubtypeRow(supabase, createdReport.id, payload);
    await upsertSnapshotRow(supabase, createdReport.id, payload);
    await upsertPrivateLocationRow(supabase, createdReport.id, payload);
  } catch (errorToRollback) {
    await supabase.from("community_reports").delete().eq("id", createdReport.id);
    throw errorToRollback;
  }

  await recomputeAggregateScopes(getAggregateScopeKeysForReport(createdReport));
  await recomputeContributorTrustProfile(userId);
  const hydrated = await hydrateReports([createdReport]);
  return hydrated[0] ?? null;
};

export const updateCommunityReport = async (
  supabase: RouteClient,
  userId: string,
  reportId: string,
  payload: UpdateCommunityReportInput,
) => {
  const existing = await fetchAuthorReport(supabase, userId, reportId);
  if (existing.report_type !== payload.reportType) {
    throw new CommunityHttpError(400, "Report type cannot be changed.");
  }

  const previousScopeKeys = getAggregateScopeKeysForReport(existing);
  const { data, error } = await supabase
    .from("community_reports")
    .update(buildBaseReportInsert(userId, payload))
    .eq("id", reportId)
    .eq("author_id", userId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new CommunityHttpError(500, "Failed to update report.");
  }

  const updatedReport = castReportRow(data);
  await upsertSubtypeRow(supabase, updatedReport.id, payload);
  await upsertSnapshotRow(supabase, updatedReport.id, payload);
  await upsertPrivateLocationRow(supabase, updatedReport.id, payload);

  await recomputeAggregateScopes([
    ...previousScopeKeys,
    ...getAggregateScopeKeysForReport(updatedReport),
  ]);
  await recomputeContributorTrustProfile(userId);
  const hydrated = await hydrateReports([updatedReport]);
  return hydrated[0] ?? null;
};

export const deleteCommunityReport = async (
  supabase: RouteClient,
  userId: string,
  reportId: string,
) => {
  const existing = await fetchAuthorReport(supabase, userId, reportId);
  const previousScopeKeys = getAggregateScopeKeysForReport(existing);
  const { error } = await supabase
    .from("community_reports")
    .update({
      deleted_at: new Date().toISOString(),
      publication_state: "suppressed",
      moderation_state: "removed",
    })
    .eq("id", reportId)
    .eq("author_id", userId);

  if (error) {
    throw new CommunityHttpError(500, "Failed to delete report.");
  }

  await recomputeAggregateScopes(previousScopeKeys);
  await recomputeContributorTrustProfile(userId);
};

export const flagCommunityReport = async (
  supabase: RouteClient,
  userId: string,
  reportId: string,
  payload: FlagCommunityReportInput,
) => {
  const admin = getSupabaseAdmin();
  const { data: report, error: reportError } = await admin
    .from("community_reports")
    .select("id, moderation_state, author_id, beach_id, region_id, visibility_tier, occurred_at")
    .eq("id", reportId)
    .is("deleted_at", null)
    .maybeSingle();

  if (reportError) throw new CommunityHttpError(500, "Failed to find report to flag.");
  if (!report) throw new CommunityHttpError(404, "Report not found.");
  if (report.author_id === userId) {
    throw new CommunityHttpError(400, "You cannot flag your own report.");
  }

  const { error } = await supabase.from("community_report_flags").insert({
    report_id: reportId,
    reporter_id: userId,
    reason: payload.reason,
    details: normalizePlainText(payload.details, 400),
  });

  if (error) throw new CommunityHttpError(400, "Failed to save report flag.");

  if (report.moderation_state === "active") {
    await admin
      .from("community_reports")
      .update({ moderation_state: "under_review", publication_state: "suppressed" })
      .eq("id", reportId);
  }

  await recomputeAggregateScopes(
    getAggregateScopeKeysForReport({
      beach_id: typeof report.beach_id === "string" ? report.beach_id : null,
      region_id: typeof report.region_id === "string" ? report.region_id : null,
      visibility_tier: report.visibility_tier as CommunityReportRow["visibility_tier"],
      occurred_at: String(report.occurred_at),
    }),
  );
  await recomputeContributorTrustProfile(String(report.author_id));
};

export const getCommunityLogbook = async (
  userId: string,
  filters: {
    reportType?: string;
    domain?: string;
    visibilityTier?: string;
    includeDeleted?: boolean;
    limit: number;
    offset: number;
  },
) => {
  const admin = getSupabaseAdmin();
  let query = admin
    .from("community_reports")
    .select("*")
    .eq("author_id", userId)
    .order("occurred_at", { ascending: false })
    .range(filters.offset, filters.offset + filters.limit - 1);

  if (!filters.includeDeleted) {
    query = query.is("deleted_at", null);
  }
  if (filters.reportType) {
    query = query.eq("report_type", filters.reportType);
  }
  if (filters.domain) {
    query = query.eq("domain", filters.domain);
  }
  if (filters.visibilityTier) {
    query = query.eq("visibility_tier", filters.visibilityTier);
  }

  const { data, error } = await query;
  if (error) {
    throw new CommunityHttpError(500, "Failed to load your logbook.");
  }

  const rows = ((data as CommunityReportRow[] | null) ?? []).map((row) => row);
  return hydrateReports(rows);
};

export const getPublicCommunityReportCards = async (filters: {
  beachId?: string;
  regionId?: string;
  reportType?: string;
  days: number;
  limit: number;
}) => {
  const admin = getSupabaseAdmin();
  let query = admin
    .from("community_reports")
    .select("*")
    .is("deleted_at", null)
    .eq("moderation_state", "active")
    .eq("publication_state", "public_published")
    .in("report_type", ["surf_check", "conditions_report", "access_report"])
    .order("occurred_at", { ascending: false })
    .limit(filters.limit);

  const threshold = new Date(Date.now() - filters.days * 24 * 60 * 60 * 1000);
  query = query.gte("occurred_at", threshold.toISOString());

  if (filters.beachId) {
    query = query.eq("beach_id", filters.beachId).in("visibility_tier", [
      "beach",
      "spot_name",
    ]);
  }
  if (filters.regionId) {
    query = query.eq("region_id", filters.regionId).eq("visibility_tier", "public_region");
  }
  if (filters.reportType) {
    query = query.eq("report_type", filters.reportType);
  }

  const { data, error } = await query;
  if (error) {
    throw new CommunityHttpError(500, "Failed to load public reports.");
  }

  const rows = ((data as CommunityReportRow[] | null) ?? []).filter((row) =>
    canExposePublicReportCard(row),
  );
  return hydrateReports(rows);
};
