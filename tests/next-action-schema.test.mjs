import "./helpers/register-typescript.mjs";
import test from "node:test";
import assert from "node:assert/strict";
const { nextActionFieldsSchema, actionDueLabel } =
  await import("../src/lib/applications/next-action-schema.ts");
test("다음 행동은 제목을 요구하고 기한 없는 작업과 유효한 날짜를 허용한다", () => {
  const value = { title: "면접 준비", note: "", dueOn: "", completed: false };
  assert.equal(nextActionFieldsSchema.safeParse(value).success, true);
  assert.equal(
    nextActionFieldsSchema.safeParse({ ...value, title: "  " }).success,
    false,
  );
  assert.equal(
    nextActionFieldsSchema.safeParse({ ...value, dueOn: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    nextActionFieldsSchema.safeParse({ ...value, dueOn: "2026-10-08" }).success,
    true,
  );
});
test("기한 지남·오늘·예정·완료를 구별한다", () => {
  const today = "2026-10-06";
  assert.equal(actionDueLabel(null, false, today), "기한 없음");
  assert.equal(
    actionDueLabel("2026-10-05", false, today),
    "기한 지남 · 2026-10-05",
  );
  assert.equal(actionDueLabel(today, false, today), "오늘까지");
  assert.equal(actionDueLabel("2026-10-07", false, today), "2026-10-07까지");
  assert.equal(actionDueLabel("2026-10-05", true, today), "완료");
});
