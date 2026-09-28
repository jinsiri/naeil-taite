import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateOpportunityScore,
  calculatePriorityScore,
  classifyOpportunity,
} from "../src/lib/jobs/scoring.ts";

test("opportunity score applies weighted five-dimension formula", () => {
  assert.equal(
    calculateOpportunityScore({
      companyQuality: 100,
      roleFit: 80,
      careerCapital: 60,
      targetAlignment: 40,
      personalFit: 20,
    }),
    65,
  );
});

test("classification respects career path and score thresholds", () => {
  assert.equal(classifyOpportunity(90, 90, "REPEAT", 100, 100, 100), "후순위");
  assert.equal(classifyOpportunity(70, 50, "DIRECT", 80, 50, 70), "우선지원");
});

test("priority score includes deadline and effort inputs", () => {
  const base = {
    opportunity: 70,
    pass: 50,
    deadline: "2026-09-30",
    effort: "Medium",
    today: new Date(2026, 8, 28),
  };
  assert.equal(calculatePriorityScore(base), 70);
  assert.ok(
    calculatePriorityScore({ ...base, effort: "Low" }) >
      calculatePriorityScore({ ...base, effort: "High" }),
  );
});
