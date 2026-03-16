export const COMMUNITY_REPORT_TYPES = [
  "surf_check",
  "catch_report",
  "conditions_report",
  "access_report",
] as const;

export const COMMUNITY_DOMAINS = ["surf", "fishing", "shared"] as const;

export const COMMUNITY_VISIBILITY_TIERS = [
  "private",
  "beach",
  "spot_name",
  "public_region",
] as const;

export const COMMUNITY_PUBLICATION_STATES = [
  "private",
  "public_candidate",
  "public_published",
  "suppressed",
] as const;

export const COMMUNITY_MODERATION_STATES = [
  "active",
  "under_review",
  "flagged",
  "spam",
  "duplicate",
  "removed",
] as const;

export const COMMUNITY_TRUST_STATES = [
  "unverified",
  "single_report",
  "community_confirmed",
  "historical_pattern",
  "stale",
] as const;

export const COMMUNITY_CONFIDENCE_STATES = [
  "single_report",
  "community_confirmed",
  "historical_pattern",
  "not_enough_data",
  "stale",
] as const;

export const COMMUNITY_SCOPE_TYPES = ["beach", "region"] as const;
export const COMMUNITY_RECENCY_STATES = ["fresh", "aging", "stale"] as const;

export const CATCH_METHODS = [
  "shore",
  "kayak",
  "boat",
  "bait",
  "lure",
  "fly",
  "spearfishing",
  "other",
] as const;

export const WATER_CLARITY_VALUES = [
  "dirty",
  "stained",
  "fair",
  "clear",
  "very_clear",
] as const;

export const CURRENT_STRENGTH_VALUES = ["low", "moderate", "strong"] as const;
export const BITE_ACTIVITY_VALUES = [
  "unknown",
  "slow",
  "fair",
  "good",
  "hot",
] as const;

export const ACCESS_STATUS_VALUES = [
  "open",
  "restricted",
  "closed",
  "hazard",
] as const;

export const PARKING_STATUS_VALUES = [
  "easy",
  "limited",
  "full",
  "closed",
  "unknown",
] as const;

export const GATE_STATUS_VALUES = ["open", "closed", "unknown"] as const;
export const HAZARD_LEVEL_VALUES = ["none", "minor", "major"] as const;
export const CLOSURE_KIND_VALUES = [
  "none",
  "temporary",
  "seasonal",
  "private_property",
  "construction",
  "other",
] as const;

export const FLAG_REASON_VALUES = [
  "spam",
  "privacy",
  "abuse",
  "misinformation",
  "duplicate",
  "other",
] as const;

export const MEDIA_STATUS_VALUES = [
  "pending",
  "ready",
  "rejected",
  "removed",
] as const;

export const COMMUNITY_NOTES_MAX_LENGTH = 600;
export const COMMUNITY_PUBLIC_LABEL_MAX_LENGTH = 120;
export const COMMUNITY_PRIVATE_LABEL_MAX_LENGTH = 160;
export const COMMUNITY_FLAG_DETAILS_MAX_LENGTH = 400;
export const COMMUNITY_BUCKET_DELAY_HOURS = 12;
export const COMMUNITY_REGION_GENERIC_MIN_CONTRIBUTORS = 3;
export const COMMUNITY_REGION_SPECIES_MIN_CONTRIBUTORS = 5;
export const COMMUNITY_DEFAULT_LOGBOOK_LIMIT = 20;
export const COMMUNITY_MAX_LOGBOOK_LIMIT = 100;
export const COMMUNITY_UPLOAD_URL_TTL_SECONDS = 300;
