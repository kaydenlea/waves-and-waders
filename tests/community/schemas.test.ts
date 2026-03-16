import test from "node:test";
import assert from "node:assert/strict";

import {
  createAccessReportSchema,
  createCatchReportSchema,
  createConditionsReportSchema,
  createSurfCheckSchema,
} from "../../lib/community/schemas";

test("surf check validation requires beach scope and valid structured fields", () => {
  const parsed = createSurfCheckSchema.parse({
    reportType: "surf_check",
    occurredAt: "2026-03-10T10:00:00.000Z",
    beachId: "123",
    surfQuality: 4,
    crowdLevel: 2,
  });

  assert.equal(parsed.reportType, "surf_check");
  assert.equal(parsed.beachId, "123");
});

test("catch report validation rejects missing kept/released outcome", () => {
  assert.throws(() =>
    createCatchReportSchema.parse({
      reportType: "catch_report",
      occurredAt: "2026-03-10T10:00:00.000Z",
      regionId: "socal-north",
      species: "Halibut",
      method: "shore",
    }),
  );
});

test("conditions reports require at least one public scope", () => {
  assert.throws(() =>
    createConditionsReportSchema.parse({
      reportType: "conditions_report",
      domain: "shared",
      occurredAt: "2026-03-10T10:00:00.000Z",
    }),
  );
});

test("access report validation preserves structured logistics fields", () => {
  const parsed = createAccessReportSchema.parse({
    reportType: "access_report",
    domain: "shared",
    occurredAt: "2026-03-10T10:00:00.000Z",
    regionId: "orange-county",
    accessStatus: "closed",
    parkingStatus: "full",
    gateStatus: "closed",
    hazardLevel: "major",
    closureKind: "construction",
  });

  assert.equal(parsed.accessStatus, "closed");
  assert.equal(parsed.parkingStatus, "full");
});
