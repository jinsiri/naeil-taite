import test from "node:test";
import assert from "node:assert/strict";
import {
  getRequirementMatchSummary,
  jobAiAnalysisSchema,
} from "../src/lib/jobs/ai-analysis.ts";

const validAnalysis = {
  summary: "직무 요구와 이력서 경험을 비교했습니다.",
  roleIdentity: {
    role: "프론트엔드 개발자",
    focus: "제품 기능 개발",
    careerDirection: "DIRECT",
    careerDirectionReason: "현재 경력과 직무가 연결됩니다.",
  },
  dimensions: Object.fromEntries(
    [
      "companyQuality",
      "roleFit",
      "careerCapital",
      "targetAlignment",
      "personalFit",
    ].map((key) => [
      key,
      {
        score: 70,
        confidence: "보통",
        reason: "공고와 이력서 근거를 확인했습니다.",
        jobQuote: "React 제품 개발",
        resumeQuote: "React 기반 제품 개발",
      },
    ]),
  ),
  passEstimate: 60,
  passEstimateCaveat: "합격 확률이 아닌 참고 의견입니다.",
  opportunityReason: "관련 경험이 확인됩니다.",
  mainRisk: "업무 범위는 면접에서 확인하세요.",
  requirements: [
    {
      requirement: "React 제품 개발 경험",
      priority: "필수",
      assessment: "matched",
      jobQuote: "React 제품 개발",
      resumeQuote: "React 기반 제품 개발",
      reason: "이력서에서 직접 근거를 찾았습니다.",
    },
  ],
  companyResearch: {
    summary: "공식 공개 자료를 확인했습니다.",
    sources: [{ title: "공식 사이트", url: "https://example.com" }],
  },
};

test("AI job analysis accepts grounded structured results", () => {
  assert.equal(jobAiAnalysisSchema.parse(validAnalysis).requirements.length, 1);
});

test("AI job analysis rejects invalid score and unknown assessment states", () => {
  assert.equal(
    jobAiAnalysisSchema.safeParse({
      ...validAnalysis,
      passEstimate: 140,
    }).success,
    false,
  );
  assert.equal(
    jobAiAnalysisSchema.safeParse({
      ...validAnalysis,
      requirements: [
        { ...validAnalysis.requirements[0], assessment: "probably matched" },
      ],
    }).success,
    false,
  );
});

test("요구사항 근거 일치율은 판단 보류를 제외해 계산한다", () => {
  const result = getRequirementMatchSummary({
    ...validAnalysis,
    requirements: [
      { ...validAnalysis.requirements[0], assessment: "matched" },
      { ...validAnalysis.requirements[0], assessment: "partial" },
      { ...validAnalysis.requirements[0], assessment: "missing" },
      { ...validAnalysis.requirements[0], assessment: "unknown" },
    ],
  });

  assert.deepEqual(result, {
    matched: 1,
    partial: 1,
    missing: 1,
    unknown: 1,
    assessable: 3,
    aligned: 2,
    rate: 67,
  });
});
