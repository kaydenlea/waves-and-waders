import { z } from "zod";
import {
  ACCESS_STATUS_VALUES,
  BITE_ACTIVITY_VALUES,
  CATCH_METHODS,
  CLOSURE_KIND_VALUES,
  COMMUNITY_DEFAULT_LOGBOOK_LIMIT,
  COMMUNITY_FLAG_DETAILS_MAX_LENGTH,
  COMMUNITY_MAX_LOGBOOK_LIMIT,
  COMMUNITY_NOTES_MAX_LENGTH,
  COMMUNITY_PUBLIC_LABEL_MAX_LENGTH,
  COMMUNITY_VISIBILITY_TIERS,
  CURRENT_STRENGTH_VALUES,
  FLAG_REASON_VALUES,
  GATE_STATUS_VALUES,
  HAZARD_LEVEL_VALUES,
  PARKING_STATUS_VALUES,
  WATER_CLARITY_VALUES,
} from "./constants";

const trimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maxLength);

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .nullable();

const optionalVisibility = z.enum(COMMUNITY_VISIBILITY_TIERS).optional();

const privateLocationSchema = z
  .object({
    exactLat: z.number().min(-90).max(90).optional().nullable(),
    exactLng: z.number().min(-180).max(180).optional().nullable(),
    privateLabel: optionalTrimmedString(160),
    waterbodyName: optionalTrimmedString(160),
    launchPoint: optionalTrimmedString(160),
  })
  .optional()
  .nullable();

const baseSchema = z.object({
  occurredAt: z.string().datetime(),
  beachId: optionalTrimmedString(80),
  regionId: optionalTrimmedString(80),
  publicLabel: optionalTrimmedString(COMMUNITY_PUBLIC_LABEL_MAX_LENGTH),
  notes: optionalTrimmedString(COMMUNITY_NOTES_MAX_LENGTH),
  visibilityTier: optionalVisibility,
  privateLocation: privateLocationSchema,
});

export const createSurfCheckSchema = baseSchema
  .extend({
    reportType: z.literal("surf_check"),
    domain: z.literal("surf").optional(),
    beachId: trimmedString(80),
    surfQuality: z.number().int().min(1).max(5),
    crowdLevel: z.number().int().min(1).max(5),
    observedWindMismatch: z.boolean().optional(),
    observedSwellMismatch: z.boolean().optional(),
  })
  .strict();

export const createCatchReportSchema = baseSchema
  .extend({
    reportType: z.literal("catch_report"),
    domain: z.literal("fishing").optional(),
    regionId: trimmedString(80),
    species: trimmedString(80),
    speciesGroup: optionalTrimmedString(80),
    method: z.enum(CATCH_METHODS),
    kept: z.boolean().optional(),
    released: z.boolean().optional(),
    lengthValue: z.number().nonnegative().optional().nullable(),
    lengthUnit: z.enum(["in", "cm"]).optional().nullable(),
    weightValue: z.number().nonnegative().optional().nullable(),
    weightUnit: z.enum(["lb", "kg"]).optional().nullable(),
    visibilityTier: z.enum(["private", "spot_name", "public_region"]).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.kept && !value.released) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Catch reports must be marked kept or released.",
        path: ["released"],
      });
    }
  });

export const createConditionsReportSchema = baseSchema
  .extend({
    reportType: z.literal("conditions_report"),
    domain: z.enum(["surf", "fishing", "shared"]),
    waterClarity: z.enum(WATER_CLARITY_VALUES).optional().nullable(),
    currentStrength: z.enum(CURRENT_STRENGTH_VALUES).optional().nullable(),
    biteActivity: z.enum(BITE_ACTIVITY_VALUES).optional().nullable(),
    observedChop: z.boolean().optional(),
    observedDebris: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.beachId && !value.regionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Conditions reports require a beach or region scope.",
        path: ["beachId"],
      });
    }
  });

export const createAccessReportSchema = baseSchema
  .extend({
    reportType: z.literal("access_report"),
    domain: z.enum(["surf", "fishing", "shared"]),
    accessStatus: z.enum(ACCESS_STATUS_VALUES),
    parkingStatus: z.enum(PARKING_STATUS_VALUES).optional().nullable(),
    gateStatus: z.enum(GATE_STATUS_VALUES).optional().nullable(),
    hazardLevel: z.enum(HAZARD_LEVEL_VALUES).optional().nullable(),
    closureKind: z.enum(CLOSURE_KIND_VALUES).optional().nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.beachId && !value.regionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Access reports require a beach or region scope.",
        path: ["beachId"],
      });
    }
  });

export const createCommunityReportSchema = z.union([
  createSurfCheckSchema,
  createCatchReportSchema,
  createConditionsReportSchema,
  createAccessReportSchema,
]);

export const updateCommunityReportSchema = createCommunityReportSchema;

export const flagReportSchema = z
  .object({
    reason: z.enum(FLAG_REASON_VALUES),
    details: z.string().trim().max(COMMUNITY_FLAG_DETAILS_MAX_LENGTH).optional(),
  })
  .strict();

export const logbookQuerySchema = z.object({
  reportType: z
    .enum([
      "surf_check",
      "catch_report",
      "conditions_report",
      "access_report",
    ])
    .optional(),
  domain: z.enum(["surf", "fishing", "shared"]).optional(),
  visibilityTier: z
    .enum(["private", "beach", "spot_name", "public_region"])
    .optional(),
  includeDeleted: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => value === "true"),
  limit: z
    .coerce
    .number()
    .int()
    .min(1)
    .max(COMMUNITY_MAX_LOGBOOK_LIMIT)
    .optional()
    .default(COMMUNITY_DEFAULT_LOGBOOK_LIMIT),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const summaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).optional().default(7),
});

export const mapAggregatesQuerySchema = z.object({
  scopeType: z.enum(["beach", "region"]).optional(),
  scopeIds: z.string().trim().min(1).optional(),
  domain: z.enum(["surf", "fishing", "shared"]).optional(),
  reportType: z
    .enum([
      "surf_check",
      "catch_report",
      "conditions_report",
      "access_report",
    ])
    .optional(),
  days: z.coerce.number().int().min(1).max(30).optional().default(7),
});

export const publicReportsQuerySchema = z.object({
  beachId: z.string().trim().min(1).optional(),
  regionId: z.string().trim().min(1).optional(),
  reportType: z
    .enum(["surf_check", "conditions_report", "access_report"])
    .optional(),
  days: z.coerce.number().int().min(1).max(30).optional().default(7),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export const prepareUploadSchema = z
  .object({
    reportId: z.string().uuid(),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    extension: z.enum(["jpg", "jpeg", "png", "webp"]),
    byteSize: z.number().int().positive(),
  })
  .strict();

export const finalizeUploadSchema = z
  .object({
    reportId: z.string().uuid(),
    objectPath: trimmedString(512),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    byteSize: z.number().int().positive(),
    width: z.number().int().positive().optional().nullable(),
    height: z.number().int().positive().optional().nullable(),
  })
  .strict();

export type CreateCommunityReportInput = z.infer<
  typeof createCommunityReportSchema
>;
export type UpdateCommunityReportInput = z.infer<
  typeof updateCommunityReportSchema
>;
export type FlagCommunityReportInput = z.infer<typeof flagReportSchema>;
export type PrepareUploadInput = z.infer<typeof prepareUploadSchema>;
export type FinalizeUploadInput = z.infer<typeof finalizeUploadSchema>;
