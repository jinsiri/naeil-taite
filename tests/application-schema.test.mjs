import "./helpers/register-typescript.mjs";
import test from "node:test";
import assert from "node:assert/strict";
const { stageInputSchema, applicationSchema } =
  await import("../src/lib/applications/schema.ts");
const jobId = "60000000-0000-4000-8000-000000000011";
test("지원 완료는 명시적인 확인과 유효한 버전이 필요하다", () => {
  const input = {
    jobId,
    expectedRevision: 1,
    pipelineStage: "지원완료",
    confirmedApply: false,
  };
  assert.equal(stageInputSchema.safeParse(input).success, false);
  assert.equal(
    stageInputSchema.safeParse({ ...input, confirmedApply: true }).success,
    true,
  );
  assert.equal(
    stageInputSchema.safeParse({
      ...input,
      confirmedApply: true,
      expectedRevision: 0,
    }).success,
    false,
  );
});
test("이전 평가 단계는 현재 지원 상태로 확정하지 않고 보존한다", () => {
  const record = applicationSchema.parse({
    id: jobId,
    user_id: jobId,
    job_posting_id: jobId,
    revision: 1,
    pipeline_stage: null,
    legacy_stage: "지원완료",
  });
  assert.equal(record.pipeline_stage, null);
  assert.equal(record.legacy_stage, "지원완료");
});
