import { z } from "zod";

export const CAREER_PATHS = [
  "DIRECT",
  "BRIDGE",
  "OPTION",
  "REPEAT",
  "DETOUR",
] as const;
export type CareerPath = (typeof CAREER_PATHS)[number];

export const PIPELINE_STAGES = [
  "검토중",
  "지원준비",
  "지원완료",
  "서류통과",
  "서류탈락",
  "1차면접",
  "2차면접",
  "처우협의",
  "최종합격",
  "최종탈락",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const APPLICATION_EFFORTS = ["Low", "Medium", "High"] as const;
export type ApplicationEffort = (typeof APPLICATION_EFFORTS)[number];

export type ReviewScores = {
  companyQuality: number;
  roleFit: number;
  careerCapital: number;
  targetAlignment: number;
  personalFit: number;
};

export type ScoreWeights = {
  careerCapital: number;
  roleFit: number;
  companyQuality: number;
  targetAlignment: number;
  personalFit: number;
  publicTransitFit: number;
};

export const scoreWeightsSchema = z.object({
  careerCapital: z.number().min(0).max(100),
  roleFit: z.number().min(0).max(100),
  companyQuality: z.number().min(0).max(100),
  targetAlignment: z.number().min(0).max(100),
  personalFit: z.number().min(0).max(100),
  publicTransitFit: z.number().min(0).max(100),
});

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  careerCapital: 23,
  roleFit: 23,
  companyQuality: 18,
  targetAlignment: 18,
  personalFit: 9,
  publicTransitFit: 9,
};

export const scoringPreferencesWeightsSchema = scoreWeightsSchema
  .refine((weights) => Object.values(weights).every(Number.isInteger), {
    message: "비중은 정수로 입력해 주세요.",
  })
  .refine(
    (weights) =>
      Object.values(weights).reduce((sum, value) => sum + value, 0) === 100,
    {
      message: "비중 합계를 100%로 맞춰 주세요.",
    },
  );

export function normalizeScoreWeights(weights: ScoreWeights): ScoreWeights {
  const keys = Object.keys(weights) as (keyof ScoreWeights)[];
  const total = keys.reduce((sum, key) => sum + weights[key], 0);
  if (total === 0) return { ...DEFAULT_SCORE_WEIGHTS };
  const shares = keys.map((key) => {
    const share = (weights[key] / total) * 100;
    return {
      key,
      value: Math.floor(share),
      remainder: share - Math.floor(share),
    };
  });
  const remaining = 100 - shares.reduce((sum, share) => sum + share.value, 0);
  [...shares]
    .sort((a, b) => b.remainder - a.remainder)
    .slice(0, remaining)
    .forEach((share) => {
      share.value += 1;
    });
  const result = { ...weights };
  shares.forEach(({ key, value }) => {
    result[key] = value;
  });
  return result;
}

export const LEGACY_SCORE_WEIGHTS: ScoreWeights = {
  careerCapital: 25,
  roleFit: 25,
  companyQuality: 20,
  targetAlignment: 20,
  personalFit: 10,
  publicTransitFit: 0,
};

export function calculateOpportunityScore(
  scores: ReviewScores & { publicTransitFit?: number },
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS,
) {
  const dimensions = Object.keys(weights) as (keyof ScoreWeights)[];
  const available = dimensions.filter((key) => scores[key] !== undefined);
  const totalWeight = available.reduce((sum, key) => sum + weights[key], 0);
  if (totalWeight === 0) return 0;
  return Math.round(
    available.reduce((sum, key) => sum + (scores[key] ?? 0) * weights[key], 0) /
      totalWeight,
  );
}

export function classifyOpportunity(
  opportunity: number,
  pass: number,
  path: CareerPath,
  targetAlignment: number,
  careerCapital: number,
  roleFit: number,
) {
  if (path === "REPEAT" || path === "DETOUR") return "후순위";
  if (path === "DIRECT" && targetAlignment >= 70 && roleFit >= 60)
    return pass >= 45 ? "우선지원" : "상향지원";
  if (
    path === "BRIDGE" &&
    targetAlignment >= 55 &&
    careerCapital >= 60 &&
    roleFit >= 55
  )
    return pass >= 50 ? "우선지원" : "상향지원";
  if (path === "OPTION" && careerCapital >= 60 && roleFit >= 60 && pass >= 50)
    return "안정지원";
  if (opportunity >= 72 && pass >= 50) return "우선지원";
  if (opportunity >= 68) return "상향지원";
  if (opportunity >= 58 && pass >= 55 && careerCapital >= 55) return "안정지원";
  return "후순위";
}

function deadlineScore(deadline: string | null, today = new Date()) {
  if (!deadline) return 45;
  const days = Math.ceil(
    (new Date(deadline + "T00:00:00").getTime() -
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      ).getTime()) /
      86_400_000,
  );
  if (days < 0) return 0;
  if (days <= 1) return 100;
  if (days <= 3) return 90;
  if (days <= 7) return 75;
  if (days <= 14) return 55;
  return 35;
}

export function calculatePriorityScore(input: {
  opportunity: number;
  pass: number;
  deadline: string | null;
  effort: ApplicationEffort;
  today?: Date;
}) {
  const effort =
    input.effort === "Low" ? 100 : input.effort === "Medium" ? 65 : 35;
  return Math.round(
    input.opportunity * 0.6 +
      input.pass * 0.15 +
      deadlineScore(input.deadline, input.today) * 0.15 +
      effort * 0.1,
  );
}
