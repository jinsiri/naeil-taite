import "./helpers/register-typescript.mjs";
import test from "node:test";
import assert from "node:assert/strict";
const {
  latestByCareer,
  previousSalaryRecord,
  salaryDifference,
  sortSalaryRecords,
} = await import("../src/lib/salaries/comparison.ts");
const { salaryInputSchema, salaryDeleteSchema } =
  await import("../src/lib/salaries/schema.ts");
const id = "64000000-0000-4000-8000-000000000001";
function record(date, career, amount, suffix = "1") {
  return {
    id: id.slice(0, -1) + suffix,
    user_id: id,
    effective_on: date,
    career_year: career,
    amount,
    company: "",
    note: "",
    revision: 1,
    created_at: "2026-10-06T00:00:00Z",
  };
}
test("등록 순서와 관계없이 같은 해의 직전 적용 연봉을 비교한다", () => {
  const early = record("2024-01-01", 2, 4000);
  const late = record("2024-10-01", 2, 4500, "2");
  const current = record("2025-07-01", 3, 4950, "3");
  const sameYear = record("2025-01-01", 3, 4700, "4");
  assert.equal(
    previousSalaryRecord(current, [current, early, sameYear, late])?.id,
    sameYear.id,
  );
  assert.equal(
    previousSalaryRecord(late, [current, early, sameYear, late])?.id,
    early.id,
  );
});
test("2년 간격의 이직도 직전 연봉과 비교한다", () => {
  const previous = record("2024-01-01", 2, 4000);
  const current = record("2026-01-01", 4, 5000, "2");
  const reference = previousSalaryRecord(current, [previous, current]);
  assert.equal(reference?.id, previous.id);
  assert.deepEqual(salaryDifference(current.amount, reference.amount), {
    amount: 1000,
    percent: 25,
  });
});
test("첫 기록은 자신이나 미래 기록과 비교하지 않는다", () => {
  const first = record("2024-01-01", 1, 4000);
  assert.equal(previousSalaryRecord(first, [first]), null);
  assert.equal(
    previousSalaryRecord(first, [record("2026-01-01", 3, 5000, "2"), first]),
    null,
  );
});
test("하락·동결·0 기준값을 안전하게 처리한다", () => {
  assert.deepEqual(salaryDifference(3600, 4000), {
    amount: -400,
    percent: -10,
  });
  assert.deepEqual(salaryDifference(4000, 4000), { amount: 0, percent: 0 });
  assert.equal(salaryDifference(4000, 0).percent, null);
});
test("연차별 최신 적용일을 고르되 원본 배열과 같은 해 이직 기록을 유지한다", () => {
  const records = [
    record("2025-01-01", 3, 4500),
    record("2024-01-01", 2, 4000, "2"),
    record("2025-07-01", 3, 4900, "3"),
  ];
  const before = structuredClone(records);
  assert.deepEqual(
    latestByCareer(records).map((r) => r.amount),
    [4000, 4900],
  );
  assert.equal(sortSalaryRecords(records)[0].amount, 4900);
  assert.deepEqual(records, before);
});
test("적용일이 같으면 등록 시각, ID 순으로 비교 기준을 일관되게 선택한다", () => {
  const a = record("2024-01-01", 2, 4000, "1");
  const b = {
    ...record("2024-01-01", 2, 4500, "2"),
    created_at: "2026-10-06T01:00:00Z",
  };
  assert.equal(
    previousSalaryRecord(record("2025-01-01", 3, 5000, "3"), [a, b])?.amount,
    4500,
  );
  assert.equal(previousSalaryRecord(b, [b, a])?.id, a.id);
  assert.equal(previousSalaryRecord(a, [b, a]), null);
  const c = { ...b, id: id.slice(0, -1) + "3" };
  assert.equal(previousSalaryRecord(c, [c, b, a])?.id, b.id);
});
test("유효한 연차·금액·날짜와 명시적인 삭제 확인을 요구한다", () => {
  const input = {
    id,
    expectedRevision: 0,
    effectiveOn: "2025-01-01",
    careerYear: 3,
    amount: 4500,
    company: "",
    note: "",
  };
  assert.equal(salaryInputSchema.safeParse(input).success, true);
  for (const patch of [
    { amount: 0 },
    { amount: -100 },
    { amount: NaN },
    { amount: 4500.5 },
    { careerYear: 0 },
    { careerYear: 1.5 },
    { effectiveOn: "2025-02-30" },
    { expectedRevision: -1 },
  ])
    assert.equal(
      salaryInputSchema.safeParse({ ...input, ...patch }).success,
      false,
    );
  assert.equal(
    salaryDeleteSchema.safeParse({ id, expectedRevision: 1, approved: false })
      .success,
    false,
  );
  assert.equal(
    salaryDeleteSchema.safeParse({ id, expectedRevision: 1, approved: true })
      .success,
    true,
  );
});
