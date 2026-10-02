import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SCORE_WEIGHTS,
  normalizeScoreWeights,
  scoringPreferencesWeightsSchema,
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

test("preferences allocate exactly 100 percent and reject invalid totals", () => {
  assert.equal(
    Object.values(DEFAULT_SCORE_WEIGHTS).reduce((a, b) => a + b, 0),
    100,
  );
  assert.ok(
    scoringPreferencesWeightsSchema.safeParse(DEFAULT_SCORE_WEIGHTS).success,
  );
  for (const value of [0, 8, 10, 9.5]) {
    assert.equal(
      scoringPreferencesWeightsSchema.safeParse({
        ...DEFAULT_SCORE_WEIGHTS,
        publicTransitFit: value,
      }).success,
      false,
    );
  }
});

test("legacy weights are apportioned to 100 without changing stored weights", () => {
  const old = {
    careerCapital: 25,
    roleFit: 25,
    companyQuality: 20,
    targetAlignment: 20,
    personalFit: 10,
    publicTransitFit: 10,
  };
  assert.deepEqual(normalizeScoreWeights(old), DEFAULT_SCORE_WEIGHTS);
  assert.equal(old.careerCapital, 25);
  assert.deepEqual(
    normalizeScoreWeights(DEFAULT_SCORE_WEIGHTS),
    DEFAULT_SCORE_WEIGHTS,
  );
  assert.deepEqual(
    normalizeScoreWeights(
      Object.fromEntries(Object.keys(old).map((key) => [key, 0])),
    ),
    DEFAULT_SCORE_WEIGHTS,
  );
});

test("unavailable transit score is excluded from the allocated weights", () => {
  assert.equal(
    calculateOpportunityScore({
      companyQuality: 80,
      roleFit: 80,
      careerCapital: 80,
      targetAlignment: 80,
      personalFit: 80,
    }),
    80,
  );
  assert.equal(
    calculateOpportunityScore({
      companyQuality: 100,
      roleFit: 100,
      careerCapital: 100,
      targetAlignment: 100,
      personalFit: 100,
      publicTransitFit: 0,
    }),
    91,
  );
});
