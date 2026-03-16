import {
  COMMUNITY_BUCKET_DELAY_HOURS,
  COMMUNITY_NOTES_MAX_LENGTH,
  COMMUNITY_PRIVATE_LABEL_MAX_LENGTH,
  COMMUNITY_PUBLIC_LABEL_MAX_LENGTH,
} from "./constants";
import type {
  CommunityModerationState,
  CommunityPublicationState,
  CommunityRecencyState,
  CommunityReportInput,
  CommunityReportType,
  CommunityVisibilityTier,
} from "./types";

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export const normalizePlainText = (
  value: string | null | undefined,
  maxLength: number,
) => {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(CONTROL_CHARACTERS, "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

export const normalizeNotes = (value: string | null | undefined) =>
  normalizePlainText(value, COMMUNITY_NOTES_MAX_LENGTH);

export const normalizePublicLabel = (value: string | null | undefined) =>
  normalizePlainText(value, COMMUNITY_PUBLIC_LABEL_MAX_LENGTH);

export const normalizePrivateLabel = (value: string | null | undefined) =>
  normalizePlainText(value, COMMUNITY_PRIVATE_LABEL_MAX_LENGTH);

export const getPacificDayBucket = (value: Date) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const formatted = formatter.format(value);
  const bucketStart = new Date(`${formatted}T00:00:00-08:00`);
  const bucketEnd = new Date(bucketStart.getTime() + 24 * 60 * 60 * 1000);
  return {
    bucketStart,
    bucketEnd,
  };
};

export const getRecencyState = (occurredAtIso: string | null): CommunityRecencyState => {
  if (!occurredAtIso) return "stale";
  const occurredAt = new Date(occurredAtIso);
  if (Number.isNaN(occurredAt.getTime())) return "stale";
  const ageHours = (Date.now() - occurredAt.getTime()) / (60 * 60 * 1000);
  if (ageHours <= 24) return "fresh";
  if (ageHours <= 72) return "aging";
  return "stale";
};

export const resolveDefaultVisibilityTier = (
  payload: CommunityReportInput,
): CommunityVisibilityTier => {
  if (payload.visibilityTier) {
    return payload.visibilityTier;
  }

  switch (payload.reportType) {
    case "surf_check":
      return "beach";
    case "catch_report":
      return "private";
    case "conditions_report":
    case "access_report":
      if (payload.beachId) return "beach";
      if (payload.regionId) return "public_region";
      return "private";
    default:
      return "private";
  }
};

export const resolveInitialPublicationState = (
  visibilityTier: CommunityVisibilityTier,
  moderationState: CommunityModerationState,
): CommunityPublicationState => {
  if (visibilityTier === "private") {
    return "private";
  }
  if (moderationState !== "active") {
    return "suppressed";
  }
  return "public_candidate";
};

export const isFishingPublicScope = (
  reportType: CommunityReportType,
  visibilityTier: CommunityVisibilityTier,
) => reportType === "catch_report" && visibilityTier === "public_region";

export const isDelayedFishingAggregate = (lastReportAt: string | null) => {
  if (!lastReportAt) return false;
  const timestamp = new Date(lastReportAt).getTime();
  if (!Number.isFinite(timestamp)) return false;
  const ageHours = (Date.now() - timestamp) / (60 * 60 * 1000);
  return ageHours < COMMUNITY_BUCKET_DELAY_HOURS;
};
