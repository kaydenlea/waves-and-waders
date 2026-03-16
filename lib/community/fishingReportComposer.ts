import {
  ACCESS_STATUS_VALUES,
  BITE_ACTIVITY_VALUES,
  HAZARD_LEVEL_VALUES,
  PARKING_STATUS_VALUES,
  WATER_CLARITY_VALUES,
} from "./constants";
import {
  createAccessReportSchema,
  createCatchReportSchema,
  createConditionsReportSchema,
  type CreateCommunityReportInput,
} from "./schemas";
import type { CatchMethod } from "./types";
import {
  FISHING_METHOD_LABELS,
  FISHING_SPECIES_LABELS,
  type FishingConfidenceState,
  type FishingFeedItem,
  type FishingMethodKey,
  type FishingRegionKey,
} from "./fishingIntelligenceMock";

export type FishingComposerReportType =
  | "catch_report"
  | "conditions_report"
  | "access_report";

export type FishingComposerVisibilityTier =
  | "private"
  | "spot_name"
  | "public_region";

export type FishingCatchOutcome = "released" | "kept";

export type FishingWaterClarityValue = (typeof WATER_CLARITY_VALUES)[number];
export type FishingBiteActivityValue = (typeof BITE_ACTIVITY_VALUES)[number];
export type FishingAccessStatusValue = (typeof ACCESS_STATUS_VALUES)[number];
export type FishingParkingStatusValue = (typeof PARKING_STATUS_VALUES)[number];
export type FishingHazardLevelValue = (typeof HAZARD_LEVEL_VALUES)[number];

export type FishingComposerDraftState = {
  reportType: FishingComposerReportType;
  region: FishingRegionKey;
  occurredAt: string;
  visibilityTier: FishingComposerVisibilityTier;
  notes: string;
  catch: {
    species: keyof typeof FISHING_SPECIES_LABELS;
    method: FishingMethodKey;
    outcome: FishingCatchOutcome;
    lengthValue: string;
    weightValue: string;
  };
  conditions: {
    waterClarity: "" | FishingWaterClarityValue;
    biteActivity: "" | FishingBiteActivityValue;
  };
  access: {
    accessStatus: FishingAccessStatusValue;
    parkingStatus: "" | FishingParkingStatusValue;
    hazardLevel: "" | FishingHazardLevelValue;
  };
};

export type FishingComposerState = FishingComposerDraftState & {
  imageFile: File | null;
};

type BuildPayloadOptions = {
  state: FishingComposerDraftState;
  beachId?: string;
  beachName?: string;
  regionLabel: string;
};

type BuildFeedPreviewOptions = {
  state: FishingComposerDraftState;
  regionLabel: string;
  mediaSrc?: string;
};

const CATCH_METHOD_API_MAP: Record<FishingMethodKey, CatchMethod> = {
  artificial_lure: "lure",
  live_bait: "bait",
  surf_rig: "shore",
  fly: "fly",
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const DRAFT_VERSION = 1;

const isFishingSpeciesKey = (
  value: string,
): value is keyof typeof FISHING_SPECIES_LABELS => value in FISHING_SPECIES_LABELS;

const isFishingMethodKey = (value: string): value is FishingMethodKey =>
  value in FISHING_METHOD_LABELS;

const isFishingRegionKey = (value: string): value is FishingRegionKey =>
  value === "dana_point" ||
  value === "san_clemente" ||
  value === "newport" ||
  value === "huntington";

const isWaterClarityValue = (value: string): value is FishingWaterClarityValue =>
  WATER_CLARITY_VALUES.includes(value as FishingWaterClarityValue);

const isBiteActivityValue = (
  value: string,
): value is FishingBiteActivityValue =>
  BITE_ACTIVITY_VALUES.includes(value as FishingBiteActivityValue);

const isAccessStatusValue = (
  value: string,
): value is FishingAccessStatusValue =>
  ACCESS_STATUS_VALUES.includes(value as FishingAccessStatusValue);

const isParkingStatusValue = (
  value: string,
): value is FishingParkingStatusValue =>
  PARKING_STATUS_VALUES.includes(value as FishingParkingStatusValue);

const isHazardLevelValue = (
  value: string,
): value is FishingHazardLevelValue =>
  HAZARD_LEVEL_VALUES.includes(value as FishingHazardLevelValue);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toOptionalNumber = (value: string) => {
  if (!value.trim()) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const toPostedLabel = (occurredAt: string) => {
  const timestamp = new Date(occurredAt).getTime();
  if (!Number.isFinite(timestamp)) return "Just now";
  const deltaMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (deltaMinutes < 60) return `${Math.max(1, deltaMinutes)}m ago`;
  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) return `${Math.max(1, deltaHours)}h ago`;
  const deltaDays = Math.round(deltaHours / 24);
  return `${Math.max(1, deltaDays)}d ago`;
};

export const toLocalDateTimeValue = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

export const getInitialFishingComposerState = (
  region: FishingRegionKey,
): FishingComposerState => ({
  reportType: "catch_report",
  region,
  occurredAt: toLocalDateTimeValue(new Date()),
  visibilityTier: "private",
  notes: "",
  imageFile: null,
  catch: {
    species: "halibut",
    method: "artificial_lure",
    outcome: "released",
    lengthValue: "",
    weightValue: "",
  },
  conditions: {
    waterClarity: "clear",
    biteActivity: "good",
  },
  access: {
    accessStatus: "restricted",
    parkingStatus: "limited",
    hazardLevel: "",
  },
});

export const getVisibilityOptionsForReport = (
  reportType: FishingComposerReportType,
) => {
  const privateOption = {
    value: "private" as const,
    label: "Private logbook",
    description: "Only you can see it.",
  };

  const spotOption = {
    value: "spot_name" as const,
    label: "Spot name only",
    description: "Share the water name, not the exact location.",
  };

  const regionOption = {
    value: "public_region" as const,
    label: "Public region",
    description: "Share coarse regional signal only.",
  };

  if (reportType === "catch_report") {
    return [privateOption, spotOption, regionOption];
  }

  return [privateOption, spotOption, regionOption];
};

export const stripImageFromFishingComposerState = (
  state: FishingComposerState,
): FishingComposerDraftState => ({
  reportType: state.reportType,
  region: state.region,
  occurredAt: state.occurredAt,
  visibilityTier: state.visibilityTier,
  notes: state.notes,
  catch: { ...state.catch },
  conditions: { ...state.conditions },
  access: { ...state.access },
});

export const serializeFishingComposerDraft = (
  state: FishingComposerState,
): string =>
  JSON.stringify({
    version: DRAFT_VERSION,
    state: stripImageFromFishingComposerState(state),
  });

export const parseFishingComposerDraft = (
  raw: string | null,
  fallbackRegion: FishingRegionKey,
): FishingComposerState | null => {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== DRAFT_VERSION) {
      return null;
    }
    const state = parsed.state;
    if (!isRecord(state)) return null;

    const base = getInitialFishingComposerState(fallbackRegion);

    const reportType =
      state.reportType === "catch_report" ||
      state.reportType === "conditions_report" ||
      state.reportType === "access_report"
        ? state.reportType
        : base.reportType;

    const visibilityTier =
      state.visibilityTier === "private" ||
      state.visibilityTier === "spot_name" ||
      state.visibilityTier === "public_region"
        ? state.visibilityTier
        : base.visibilityTier;

    const region =
      typeof state.region === "string" && isFishingRegionKey(state.region)
        ? state.region
        : fallbackRegion;

    const catchState = isRecord(state.catch) ? state.catch : {};
    const conditionsState = isRecord(state.conditions) ? state.conditions : {};
    const accessState = isRecord(state.access) ? state.access : {};

    return {
      ...base,
      reportType,
      visibilityTier,
      region,
      occurredAt:
        typeof state.occurredAt === "string" && state.occurredAt.length > 0
          ? state.occurredAt
          : base.occurredAt,
      notes: typeof state.notes === "string" ? state.notes : base.notes,
      imageFile: null,
      catch: {
        species:
          typeof catchState.species === "string" &&
          isFishingSpeciesKey(catchState.species)
            ? catchState.species
            : base.catch.species,
        method:
          typeof catchState.method === "string" &&
          isFishingMethodKey(catchState.method)
            ? catchState.method
            : base.catch.method,
        outcome:
          catchState.outcome === "kept" || catchState.outcome === "released"
            ? catchState.outcome
            : base.catch.outcome,
        lengthValue:
          typeof catchState.lengthValue === "string"
            ? catchState.lengthValue
            : base.catch.lengthValue,
        weightValue:
          typeof catchState.weightValue === "string"
            ? catchState.weightValue
            : base.catch.weightValue,
      },
      conditions: {
        waterClarity:
          typeof conditionsState.waterClarity === "string" &&
          conditionsState.waterClarity.length > 0 &&
          isWaterClarityValue(conditionsState.waterClarity)
            ? conditionsState.waterClarity
            : base.conditions.waterClarity,
        biteActivity:
          typeof conditionsState.biteActivity === "string" &&
          conditionsState.biteActivity.length > 0 &&
          isBiteActivityValue(conditionsState.biteActivity)
            ? conditionsState.biteActivity
            : base.conditions.biteActivity,
      },
      access: {
        accessStatus:
          typeof accessState.accessStatus === "string" &&
          isAccessStatusValue(accessState.accessStatus)
            ? accessState.accessStatus
            : base.access.accessStatus,
        parkingStatus:
          typeof accessState.parkingStatus === "string" &&
          accessState.parkingStatus.length > 0 &&
          isParkingStatusValue(accessState.parkingStatus)
            ? accessState.parkingStatus
            : base.access.parkingStatus,
        hazardLevel:
          typeof accessState.hazardLevel === "string" &&
          accessState.hazardLevel.length > 0 &&
          isHazardLevelValue(accessState.hazardLevel)
            ? accessState.hazardLevel
            : base.access.hazardLevel,
      },
    };
  } catch {
    return null;
  }
};

export const validateFishingComposerImage = (input: {
  name: string;
  type: string;
  size: number;
}) => {
  const extension = input.name.split(".").pop()?.toLowerCase() ?? "";
  if (
    !ALLOWED_IMAGE_TYPES.has(input.type) ||
    !ALLOWED_IMAGE_EXTENSIONS.has(extension)
  ) {
    return "Use a JPG, PNG, or WEBP image.";
  }

  if (input.size > MAX_IMAGE_BYTES) {
    return "Image must be 5MB or smaller.";
  }

  return null;
};

export const getUploadExtension = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    return extension as "jpg" | "jpeg" | "png" | "webp";
  }
  return null;
};

export const buildFishingReportPayload = ({
  state,
  beachId,
  beachName,
  regionLabel,
}: BuildPayloadOptions): CreateCommunityReportInput => {
  const occurredAt = new Date(state.occurredAt).toISOString();
  const publicLabel =
    state.visibilityTier === "public_region"
      ? regionLabel
      : state.visibilityTier === "spot_name"
        ? beachName ?? regionLabel
        : null;

  const common = {
    occurredAt,
    beachId: beachId ?? null,
    regionId: state.region,
    publicLabel,
    notes: state.notes.trim() || null,
    visibilityTier: state.visibilityTier,
  };

  if (state.reportType === "catch_report") {
    const payload = {
      ...common,
      reportType: "catch_report" as const,
      domain: "fishing" as const,
      species: FISHING_SPECIES_LABELS[state.catch.species],
      speciesGroup: FISHING_SPECIES_LABELS[state.catch.species],
      method: CATCH_METHOD_API_MAP[state.catch.method],
      kept: state.catch.outcome === "kept",
      released: state.catch.outcome === "released",
      lengthValue: toOptionalNumber(state.catch.lengthValue),
      lengthUnit: state.catch.lengthValue ? ("in" as const) : null,
      weightValue: toOptionalNumber(state.catch.weightValue),
      weightUnit: state.catch.weightValue ? ("lb" as const) : null,
    };

    return createCatchReportSchema.parse(payload);
  }

  if (state.reportType === "conditions_report") {
    return createConditionsReportSchema.parse({
      ...common,
      reportType: "conditions_report",
      domain: "fishing",
      waterClarity: state.conditions.waterClarity || null,
      biteActivity: state.conditions.biteActivity || null,
    });
  }

  return createAccessReportSchema.parse({
    ...common,
    reportType: "access_report",
    domain: "fishing",
    accessStatus: state.access.accessStatus,
    parkingStatus: state.access.parkingStatus || null,
    hazardLevel: state.access.hazardLevel || null,
  });
};

export const shouldAddFishingReportToPublicFeed = (
  state: Pick<FishingComposerDraftState, "visibilityTier">,
) => state.visibilityTier === "public_region";

export const buildFishingFeedPreviewItem = ({
  state,
  regionLabel,
  mediaSrc,
}: BuildFeedPreviewOptions): FishingFeedItem => {
  const media = mediaSrc
    ? {
        src: mediaSrc,
        alt:
          state.reportType === "catch_report"
            ? `${FISHING_SPECIES_LABELS[state.catch.species]} catch photo`
            : state.reportType === "conditions_report"
              ? "Fishing conditions photo"
              : "Fishing access photo",
      }
    : undefined;

  const confidence: FishingConfidenceState = "single_report";

  if (state.reportType === "catch_report") {
    const sizeChips = [
      state.catch.lengthValue ? `${state.catch.lengthValue} in` : null,
      state.catch.weightValue ? `${state.catch.weightValue} lb` : null,
    ].filter((value): value is string => Boolean(value));

    return {
      id: `draft-${Date.now()}`,
      type: "catch_report",
      region: state.region,
      regionLabel,
      occurredAt: new Date(state.occurredAt).toISOString(),
      postedLabel: toPostedLabel(state.occurredAt),
      confidence,
      privacyLabel: "Public region only",
      species: state.catch.species,
      speciesLabel: FISHING_SPECIES_LABELS[state.catch.species],
      method: state.catch.method,
      methodLabel: FISHING_METHOD_LABELS[state.catch.method],
      title: `${FISHING_SPECIES_LABELS[state.catch.species]} report`,
      summary:
        state.notes.trim() ||
        `${FISHING_METHOD_LABELS[state.catch.method]} pattern logged for ${regionLabel}.`,
      conditions:
        sizeChips.length > 0
          ? sizeChips
          : [state.catch.outcome === "kept" ? "Kept" : "Released"],
      thumbnailTone:
        state.catch.species === "halibut"
          ? "halibut"
          : state.catch.species === "corbina"
            ? "corbina"
            : state.catch.species === "calico_bass"
              ? "calico"
              : "clarity",
      media,
    };
  }

  if (state.reportType === "conditions_report") {
    return {
      id: `draft-${Date.now()}`,
      type: "conditions_report",
      region: state.region,
      regionLabel,
      occurredAt: new Date(state.occurredAt).toISOString(),
      postedLabel: toPostedLabel(state.occurredAt),
      confidence,
      privacyLabel: "Public region only",
      title: "Conditions update",
      summary:
        state.notes.trim() ||
        "Fresh water and bite conditions logged for this region.",
      conditions: [
        state.conditions.waterClarity
          ? state.conditions.waterClarity.replace("_", " ")
          : null,
        state.conditions.biteActivity
          ? state.conditions.biteActivity.replace("_", " ")
          : null,
      ].filter((value): value is string => Boolean(value)),
      thumbnailTone: "clarity",
      media,
    };
  }

  return {
    id: `draft-${Date.now()}`,
    type: "access_report",
    region: state.region,
    regionLabel,
    occurredAt: new Date(state.occurredAt).toISOString(),
    postedLabel: toPostedLabel(state.occurredAt),
    confidence,
    privacyLabel: "Public region only",
    title: "Access update",
    summary:
      state.notes.trim() || "New access and parking details logged for this region.",
    conditions: [
      state.access.accessStatus.replace("_", " "),
      state.access.parkingStatus
        ? state.access.parkingStatus.replace("_", " ")
        : null,
    ].filter((value): value is string => Boolean(value)),
    thumbnailTone: "alert",
    media,
  };
};
