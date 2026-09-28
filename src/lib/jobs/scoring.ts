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

export function calculateOpportunityScore(scores: ReviewScores) {
  return Math.round(
    scores.careerCapital * 0.25 +
      scores.roleFit * 0.25 +
      scores.companyQuality * 0.2 +
      scores.targetAlignment * 0.2 +
      scores.personalFit * 0.1,
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
