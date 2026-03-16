import test from "node:test";
import assert from "node:assert/strict";

import {
  doesUploadPathBelongToReport,
  isAllowedUploadExtension,
  normalizeUploadExtension,
} from "../../lib/community/uploadRules";

test("upload extensions are normalized and restricted to images", () => {
  assert.equal(normalizeUploadExtension("jpeg"), "jpg");
  assert.equal(isAllowedUploadExtension("jpg"), true);
  assert.equal(isAllowedUploadExtension("png"), true);
  assert.equal(isAllowedUploadExtension("gif"), false);
});

test("upload path ownership check stays scoped to report and author", () => {
  assert.equal(
    doesUploadPathBelongToReport(
      "user-1",
      "report-1",
      "reports/user-1/report-1/file.jpg",
    ),
    true,
  );
  assert.equal(
    doesUploadPathBelongToReport(
      "user-1",
      "report-1",
      "reports/user-2/report-1/file.jpg",
    ),
    false,
  );
});
