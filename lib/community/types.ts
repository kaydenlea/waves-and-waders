import type {
  ACCESS_STATUS_VALUES,
  BITE_ACTIVITY_VALUES,
  CATCH_METHODS,
  CLOSURE_KIND_VALUES,
  COMMUNITY_CONFIDENCE_STATES,
  COMMUNITY_DOMAINS,
  COMMUNITY_MODERATION_STATES,
  COMMUNITY_PUBLICATION_STATES,
  COMMUNITY_RECENCY_STATES,
  COMMUNITY_REPORT_TYPES,
  COMMUNITY_SCOPE_TYPES,
  COMMUNITY_TRUST_STATES,
  COMMUNITY_VISIBILITY_TIERS,
  CURRENT_STRENGTH_VALUES,
  FLAG_REASON_VALUES,
  GATE_STATUS_VALUES,
  HAZARD_LEVEL_VALUES,
  MEDIA_STATUS_VALUES,
  PARKING_STATUS_VALUES,
  WATER_CLARITY_VALUES,
} from "./constants";

export type CommunityReportType = (typeof COMMUNITY_REPORT_TYPES)[number];
export type CommunityDomain = (typeof COMMUNITY_DOMAINS)[number];
export type CommunityVisibilityTier =
  (typeof COMMUNITY_VISIBILITY_TIERS)[number];
export type CommunityPublicationState =
  (typeof COMMUNITY_PUBLICATION_STATES)[number];
export type CommunityModerationState =
  (typeof COMMUNITY_MODERATION_STATES)[number];
export type CommunityTrustState = (typeof COMMUNITY_TRUST_STATES)[number];
export type CommunityConfidenceState =
  (typeof COMMUNITY_CONFIDENCE_STATES)[number];
export type CommunityScopeType = (typeof COMMUNITY_SCOPE_TYPES)[number];
export type CommunityRecencyState = (typeof COMMUNITY_RECENCY_STATES)[number];
export type CatchMethod = (typeof CATCH_METHODS)[number];
export type WaterClarity = (typeof WATER_CLARITY_VALUES)[number];
export type CurrentStrength = (typeof CURRENT_STRENGTH_VALUES)[number];
export type BiteActivity = (typeof BITE_ACTIVITY_VALUES)[number];
export type AccessStatus = (typeof ACCESS_STATUS_VALUES)[number];
export type ParkingStatus = (typeof PARKING_STATUS_VALUES)[number];
export type GateStatus = (typeof GATE_STATUS_VALUES)[number];
export type HazardLevel = (typeof HAZARD_LEVEL_VALUES)[number];
export type ClosureKind = (typeof CLOSURE_KIND_VALUES)[number];
export type FlagReason = (typeof FLAG_REASON_VALUES)[number];
export type CommunityMediaStatus = (typeof MEDIA_STATUS_VALUES)[number];

export type SurfCheckInput = {
  reportType: "surf_check";
  domain?: "surf";
  occurredAt: string;
  beachId: string;
  regionId?: string | null;
  publicLabel?: string | null;
  notes?: string | null;
  visibilityTier?: CommunityVisibilityTier;
  surfQuality: number;
  crowdLevel: number;
  observedWindMismatch?: boolean;
  observedSwellMismatch?: boolean;
  privateLocation?: PrivateLocationInput | null;
};

export type CatchReportInput = {
  reportType: "catch_report";
  domain?: "fishing";
  occurredAt: string;
  regionId: string;
  beachId?: string | null;
  publicLabel?: string | null;
  notes?: string | null;
  visibilityTier?: CommunityVisibilityTier;
  species: string;
  speciesGroup?: string | null;
  method: CatchMethod;
  kept?: boolean;
  released?: boolean;
  lengthValue?: number | null;
  lengthUnit?: "in" | "cm" | null;
  weightValue?: number | null;
  weightUnit?: "lb" | "kg" | null;
  privateLocation?: PrivateLocationInput | null;
};

export type ConditionsReportInput = {
  reportType: "conditions_report";
  domain: CommunityDomain;
  occurredAt: string;
  beachId?: string | null;
  regionId?: string | null;
  publicLabel?: string | null;
  notes?: string | null;
  visibilityTier?: CommunityVisibilityTier;
  waterClarity?: WaterClarity | null;
  currentStrength?: CurrentStrength | null;
  biteActivity?: BiteActivity | null;
  observedChop?: boolean;
  observedDebris?: boolean;
  privateLocation?: PrivateLocationInput | null;
};

export type AccessReportInput = {
  reportType: "access_report";
  domain: CommunityDomain;
  occurredAt: string;
  beachId?: string | null;
  regionId?: string | null;
  publicLabel?: string | null;
  notes?: string | null;
  visibilityTier?: CommunityVisibilityTier;
  accessStatus: AccessStatus;
  parkingStatus?: ParkingStatus | null;
  gateStatus?: GateStatus | null;
  hazardLevel?: HazardLevel | null;
  closureKind?: ClosureKind | null;
  privateLocation?: PrivateLocationInput | null;
};

export type CommunityReportInput =
  | SurfCheckInput
  | CatchReportInput
  | ConditionsReportInput
  | AccessReportInput;

export type PrivateLocationInput = {
  exactLat?: number | null;
  exactLng?: number | null;
  privateLabel?: string | null;
  waterbodyName?: string | null;
  launchPoint?: string | null;
};

export type UpdateCommunityReportInput = CommunityReportInput;

export type CommunityReportRow = {
  id: string;
  author_id: string;
  report_type: CommunityReportType;
  domain: CommunityDomain;
  occurred_at: string;
  beach_id: string | null;
  region_id: string | null;
  public_label: string | null;
  notes: string | null;
  visibility_tier: CommunityVisibilityTier;
  publication_state: CommunityPublicationState;
  moderation_state: CommunityModerationState;
  trust_state: CommunityTrustState;
  trust_score: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunityReportHydrated = {
  report: CommunityReportRow;
  surfCheck?: Record<string, unknown> | null;
  catchReport?: Record<string, unknown> | null;
  conditionsReport?: Record<string, unknown> | null;
  accessReport?: Record<string, unknown> | null;
  conditionSnapshot?: Record<string, unknown> | null;
  privateLocation?: Record<string, unknown> | null;
  media?: ReadonlyArray<Record<string, unknown>>;
};

export type PrivateCommunityReportDto = {
  id: string;
  reportType: CommunityReportType;
  domain: CommunityDomain;
  occurredAt: string;
  beachId: string | null;
  regionId: string | null;
  publicLabel: string | null;
  notes: string | null;
  visibilityTier: CommunityVisibilityTier;
  publicationState: CommunityPublicationState;
  moderationState: CommunityModerationState;
  trustState: CommunityTrustState;
  trustScore: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  detail: Record<string, unknown> | null;
  conditionSnapshot: Record<string, unknown> | null;
  privateLocation: Record<string, unknown> | null;
  media: ReadonlyArray<Record<string, unknown>>;
};

export type PublicAggregateDto = {
  scopeType: CommunityScopeType;
  scopeId: string;
  domain: CommunityDomain;
  reportType: CommunityReportType;
  speciesGroup: string | null;
  bucketStart: string;
  bucketEnd: string;
  eligibleReportCount: number;
  uniqueContributors: number;
  confidenceState: CommunityConfidenceState;
  recencyState: CommunityRecencyState;
  lastReportAt: string | null;
  publishedAt: string | null;
  summary: Record<string, unknown>;
};
