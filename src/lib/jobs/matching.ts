const STOP_WORDS = new Set([
  "경험",
  "가능",
  "업무",
  "우대",
  "역량",
  "이해",
  "이상",
  "이하",
  "관련",
  "기반",
  "위한",
  "있는",
  "있습니다",
  "합니다",
  "합니다.",
  "분",
  "및",
  "또는",
  "대한",
  "함께",
]);

export type CriterionMatch = {
  requirement: string;
  status: "matched" | "partial" | "unknown";
  evidence: string;
  matchedTerms: string[];
};

export function extractRequirements(originalText: string) {
  const lines = originalText
    .split(/\r?\n/)
    .flatMap((line) => {
      const cleaned = line.replace(/^\s*(?:[-*•▪◦‣]|\d+[.)])\s*/, "").trim();
      return cleaned.length > 500
        ? cleaned.split(/(?<=[.!?。！？])\s+/)
        : [cleaned];
    })
    .map((line) => line.trim())
    .filter((line) => line.length >= 10 && line.length <= 500)
    .filter(
      (line) =>
        !/^(자격\s*요건|지원\s*자격|우대\s*사항|담당\s*업무|주요\s*업무|복지|혜택|requirements|qualifications|preferred|responsibilities)\s*:?$/i.test(
          line,
        ),
    );
  return [...new Set(lines)].slice(0, 50);
}

function termsFor(text: string) {
  return [
    ...new Set(
      (text.match(/[a-z][a-z0-9+#.-]*|[가-힣]{2,}/gi) ?? [])
        .map((term) => term.toLocaleLowerCase("ko-KR"))
        .filter((term) => !STOP_WORDS.has(term)),
    ),
  ];
}

export function compareRequirement(
  requirement: string,
  resumeContent: string,
): CriterionMatch {
  const normalizedResume = resumeContent.toLocaleLowerCase("ko-KR");
  const terms = termsFor(requirement);
  const matchedTerms = terms.filter((term) => normalizedResume.includes(term));
  const exactMatch = normalizedResume.includes(
    requirement.toLocaleLowerCase("ko-KR"),
  );
  const status: CriterionMatch["status"] = exactMatch
    ? "matched"
    : matchedTerms.length > 0
      ? "partial"
      : "unknown";
  const evidence = resumeContent
    .split(/\r?\n|(?<=[.!?。！？])\s+/)
    .find((line) =>
      matchedTerms.some((term) =>
        line.toLocaleLowerCase("ko-KR").includes(term),
      ),
    )
    ?.trim();
  return { requirement, status, evidence: evidence ?? "", matchedTerms };
}
