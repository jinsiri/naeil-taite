import "./helpers/register-typescript.mjs";
import test from "node:test";
import assert from "node:assert/strict";
const { submissionInputSchema, seoulDate } =
  await import("../src/lib/applications/submission-schema.ts");
const id = "61000000-0000-4000-8000-000000000001";
const input = {
  requestId: id,
  applicationId: id,
  submittedOn: "2026-01-01",
  kind: "text",
  resumeId: id,
  resumeVersion: 1,
  fileId: null,
  note: "",
  approved: true,
};
test("제출 본문과 파일은 명시적으로 구별하고 승인을 요구한다", () => {
  assert.equal(submissionInputSchema.safeParse(input).success, true);
  assert.equal(
    submissionInputSchema.safeParse({ ...input, fileId: id }).success,
    false,
  );
  assert.equal(
    submissionInputSchema.safeParse({ ...input, approved: false }).success,
    false,
  );
  assert.equal(
    submissionInputSchema.safeParse({
      ...input,
      kind: "file",
      resumeId: null,
      resumeVersion: null,
      fileId: id,
    }).success,
    true,
  );
  assert.equal(
    submissionInputSchema.safeParse({ ...input, submittedOn: "2999-01-01" })
      .success,
    false,
  );
});
test("제출일의 오늘은 한국 날짜를 사용한다", () => {
  assert.equal(seoulDate(new Date("2026-10-05T16:00:00Z")), "2026-10-06");
});
