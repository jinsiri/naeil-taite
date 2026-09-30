"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { analyzeJobWithAI, rollbackJobReview } from "@/app/jobs/review-actions";
import {
  getRequirementMatchSummary,
  type JobAiAnalysis,
} from "@/lib/jobs/ai-analysis";
import type { ReviewSnapshot } from "@/lib/jobs/review-schema";
import type { ReviewScores } from "@/lib/jobs/scoring";
import { OLLAMA_MAX_JOB_POSTING_CHARACTERS } from "@/lib/jobs/ai-analysis-limits";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

const dimensionLabels: { key: keyof ReviewScores; label: string }[] = [
  { key: "companyQuality", label: "회사·공고 매력도" },
  { key: "roleFit", label: "직무 적합도" },
  { key: "careerCapital", label: "커리어 자산" },
  { key: "targetAlignment", label: "목표 정렬도" },
  { key: "personalFit", label: "개인 적합도" },
];

const assessmentLabels = {
  matched: "근거 확인",
  partial: "일부 근거",
  missing: "자료상 미확인",
  unknown: "판단 보류",
} as const;

export function JobReviewPanel({
  jobId,
  resumeId,
  resumeVersion,
  initial,
  history,
  openAiConfigured,
  jobTextLength,
  transitReady,
  transitMissing,
}: {
  jobId: string;
  resumeId: string;
  resumeVersion: number;
  initial: ReviewSnapshot | null;
  history: ReviewSnapshot[];
  openAiConfigured: boolean;
  jobTextLength: number;
  transitReady: boolean;
  transitMissing: string;
}) {
  const [message, setMessage] = useState("");
  const [aiProvider, setAiProvider] = useState<"ollama" | "openai">("ollama");
  const [analysisStartedAt, setAnalysisStartedAt] = useState<number | null>(
    null,
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pending, startTransition] = useTransition();
  const analysis = initial?.ai_analysis ?? null;
  const analysisInProgress = analysisStartedAt !== null;
  const ollamaTextTooLong = jobTextLength > OLLAMA_MAX_JOB_POSTING_CHARACTERS;
  const elapsedLabel = `${Math.floor(elapsedSeconds / 60)}:${String(
    elapsedSeconds % 60,
  ).padStart(2, "0")}`;

  useEffect(() => {
    if (analysisStartedAt === null) return;
    const updateElapsed = () =>
      setElapsedSeconds(Math.floor((Date.now() - analysisStartedAt) / 1000));
    updateElapsed();
    const interval = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(interval);
  }, [analysisStartedAt]);

  function analyze(formData: FormData) {
    setMessage("");
    setElapsedSeconds(0);
    setAnalysisStartedAt(Date.now());
    startTransition(async () => {
      try {
        const result = await analyzeJobWithAI(formData);
        if (result.error) {
          setMessage(result.error);
          setAnalysisStartedAt(null);
          return;
        }
        window.location.reload();
      } catch {
        setMessage("분석을 저장하지 못했어요. 기존 기록은 유지됩니다.");
        setAnalysisStartedAt(null);
      }
    });
  }

  function restore(snapshot: ReviewSnapshot) {
    if (
      !window.confirm(
        `평가 #${snapshot.snapshot_number}로 되돌릴까요? 기존 기록은 유지되고 새 이력이 추가됩니다.`,
      )
    )
      return;
    startTransition(async () => {
      const result = await rollbackJobReview(snapshot.id);
      setMessage(result.error ?? "선택한 평가를 새 이력으로 복원했어요.");
      if (!result.error) window.location.reload();
    });
  }

  return (
    <section className="space-y-5" id="review">
      <div>
        <h2 className="text-2xl font-semibold">AI 직무·경력 분석</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          선택한 이력서 버전과 공고를 대조해 직무 방향, 요구사항별 근거와 평가를
          정리합니다. 점수와 통과 가능성은 합격 예측이 아닌 참고 의견입니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>분석 실행</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={analyze} className="space-y-4">
            {!transitReady && (
              <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-sm leading-6">
                  대중교통 출퇴근 점수는 {transitMissing} 정보가 없어 정확히
                  계산되지 않을 수 있어요. 출퇴근 항목을 제외하고 그대로
                  분석하거나 평가 기준 설정으로 이동할 수 있습니다.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/settings/scoring"
                    className={buttonVariants({ variant: "outline" })}
                  >
                    평가 기준 설정
                  </Link>
                  <span className="self-center text-xs text-muted-foreground">
                    아래에서 ‘출퇴근 점수 없이 분석’을 선택할 수 있어요.
                  </span>
                </div>
              </div>
            )}
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="resumeId" value={resumeId} />
            <input type="hidden" name="resumeVersion" value={resumeVersion} />
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">분석 제공자</legend>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-secondary/40 p-4 text-sm leading-6 has-checked:border-primary">
                <input
                  className="mt-1 size-4 accent-primary"
                  type="radio"
                  name="aiProvider"
                  value="ollama"
                  checked={aiProvider === "ollama"}
                  onChange={() => setAiProvider("ollama")}
                />
                <span>
                  <strong className="font-medium">
                    Ollama · 무료 로컬 분석
                  </strong>
                  <span className="block text-muted-foreground">
                    공고 원문{" "}
                    {OLLAMA_MAX_JOB_POSTING_CHARACTERS.toLocaleString()}
                    자까지 분석합니다. 이력서와 공고는 이 앱 서버의 로컬
                    모델에서 분석하며 웹 검색은 하지 않습니다.
                  </span>
                </span>
              </label>
              <label
                className={`flex items-start gap-3 rounded-lg border p-4 text-sm leading-6 ${
                  openAiConfigured
                    ? "cursor-pointer bg-secondary/40 has-checked:border-primary"
                    : "cursor-not-allowed opacity-60"
                }`}
              >
                <input
                  className="mt-1 size-4 accent-primary"
                  type="radio"
                  name="aiProvider"
                  value="openai"
                  checked={aiProvider === "openai"}
                  onChange={() => setAiProvider("openai")}
                  disabled={!openAiConfigured}
                />
                <span>
                  <strong className="font-medium">OpenAI API</strong>
                  <span className="block text-muted-foreground">
                    {openAiConfigured
                      ? "회사 정보 웹 검색을 포함해 분석합니다. API 사용 요금이 발생할 수 있습니다."
                      : "사용하려면 서버 환경변수 OPENAI_API_KEY 설정이 필요합니다."}
                  </span>
                </span>
              </label>
            </fieldset>
            {aiProvider === "ollama" && (
              <p
                className={`text-sm ${ollamaTextTooLong ? "text-destructive" : "text-muted-foreground"}`}
                role={ollamaTextTooLong ? "alert" : undefined}
              >
                Ollama 공고 분량: {jobTextLength.toLocaleString()} /{" "}
                {OLLAMA_MAX_JOB_POSTING_CHARACTERS.toLocaleString()}자
                {ollamaTextTooLong &&
                  " · 분석 전에 원문을 줄여 주세요. 저장된 공고 원문은 변경되지 않습니다."}
              </p>
            )}
            <label className="flex items-start gap-3 rounded-lg border bg-secondary/40 p-4 text-sm leading-6">
              <input
                className="mt-1 size-4 accent-primary"
                type="checkbox"
                name="aiDataConsent"
                value="true"
                required
              />
              <span>
                {aiProvider === "ollama" ? (
                  "선택한 이력서와 공고 원문을 앱 서버의 Ollama 로컬 모델로 보내 분석하는 데 동의합니다. 로컬 분석은 회사 웹 검색을 수행하지 않습니다."
                ) : (
                  <>
                    선택한 이력서 원문, 공고 원문과 회사명을 OpenAI API로 보내
                    분석하는 데 동의합니다. 회사명으로 웹 검색도 수행할 수
                    있습니다. 응답 저장은 비활성화하지만 API 데이터 처리는 계정
                    설정과 정책을 따릅니다.{" "}
                    <a
                      href="https://platform.openai.com/docs/models/default-usage-policies-by-endpoint"
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4"
                    >
                      데이터 처리 안내
                    </a>
                  </>
                )}
              </span>
            </label>
            {analysisInProgress && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4"
              >
                <Loader2
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 animate-spin text-primary"
                />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">
                    {aiProvider === "ollama"
                      ? "로컬 모델이 분석 응답을 만들고 있어요."
                      : "OpenAI가 분석 응답을 만들고 있어요."}
                    <span className="ml-2 font-mono text-muted-foreground tabular-nums">
                      {elapsedLabel}
                    </span>
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {aiProvider === "ollama"
                      ? "첫 실행이나 모델이 잠든 뒤에는 준비 시간이 더 걸릴 수 있어요. 문서 분량과 기기 성능에 따라 분석 시간이 달라집니다."
                      : "공고와 이력서의 근거를 확인 중입니다. 분석이 끝나면 결과가 자동 저장됩니다."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    진행률 대신 실제 경과 시간을 표시합니다.
                  </p>
                </div>
              </div>
            )}
            {message && (
              <p role="status" className="text-sm text-muted-foreground">
                {message}
              </p>
            )}
            <Button
              type="submit"
              disabled={
                pending ||
                analysisInProgress ||
                (aiProvider === "ollama" && ollamaTextTooLong)
              }
              aria-busy={analysisInProgress}
            >
              {pending
                ? analysisInProgress
                  ? "분석 중…"
                  : "기록을 복원하고 있어요…"
                : analysis
                  ? "AI로 다시 분석하기"
                  : transitReady
                    ? "AI 분석 시작"
                    : "출퇴근 점수 없이 분석"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {analysis ? (
        <AnalysisResult
          analysis={analysis}
          review={initial}
          history={history}
          pending={pending}
          onRestore={restore}
          transitReady={transitReady}
        />
      ) : (
        <Card>
          <CardContent className="py-6 text-sm leading-6 text-muted-foreground">
            아직 AI 분석이 없습니다. 원문 전송에 동의하고 분석을 실행하면 결과와
            근거가 버전별 이력에 저장됩니다.
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function AnalysisResult({
  analysis,
  review,
  history,
  pending,
  onRestore,
  transitReady,
}: {
  analysis: JobAiAnalysis;
  review: ReviewSnapshot | null;
  history: ReviewSnapshot[];
  pending: boolean;
  onRestore: (snapshot: ReviewSnapshot) => void;
  transitReady: boolean;
}) {
  const matchSummary = getRequirementMatchSummary(analysis);
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>분석 결과</CardTitle>
              <p className="text-sm text-muted-foreground">
                {review
                  ? `평가 ${review.opportunity_score}점 · ${review.category} · ${new Date(review.created_at).toLocaleString("ko-KR")}`
                  : "AI 분석"}
              </p>
              {review && typeof review.scores._transitMinutes === "number" && (
                <p className="text-xs text-muted-foreground">
                  대중교통 예상 편도 {review.scores._transitMinutes}분 · 거주
                  시/구와 근무지 대표 위치 기준
                </p>
              )}
              {review && typeof review.scores.publicTransitFit === "number" && (
                <p className="text-xs text-muted-foreground">
                  대중교통 적합도 {review.scores.publicTransitFit}/100이 기회
                  점수에 반영됐습니다.
                </p>
              )}
              {review &&
                transitReady &&
                typeof review.scores._transitMinutes !== "number" && (
                  <p className="text-xs text-amber-700">
                    이번 분석에서 대중교통 경로를 조회하지 못해 해당 점수는 기회
                    점수에서 제외했습니다.
                  </p>
                )}
            </div>
            <div className="rounded-lg bg-secondary px-4 py-2 text-sm">
              예상 서류 경쟁력 <strong>{review?.pass_estimate ?? "—"}</strong>
              <span className="text-muted-foreground"> / 100</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm leading-7">{analysis.summary}</p>
          <div className="rounded-xl border bg-primary/5 p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium">요구사항 근거 일치율</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  AI가 판정 가능한 요구사항 중 근거 확인 또는 일부 근거가 연결된
                  비율입니다.
                </p>
              </div>
              <p className="text-3xl font-bold tabular-nums">
                {matchSummary.rate === null ? "—" : `${matchSummary.rate}%`}
              </p>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              근거 확인 {matchSummary.matched} · 일부 근거{" "}
              {matchSummary.partial} · 자료상 미확인 {matchSummary.missing} ·
              판단 보류 {matchSummary.unknown}
              {matchSummary.assessable === 0 &&
                " · 판정 가능한 요구사항이 없어 비율을 계산하지 않았습니다."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["직무 정체성", analysis.roleIdentity.role],
              ["주요 업무 초점", analysis.roleIdentity.focus],
              ["커리어 경로", analysis.roleIdentity.careerDirection],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-sm leading-6 font-medium">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {analysis.roleIdentity.careerDirectionReason}
          </p>

          <section className="space-y-3">
            <h3 className="font-semibold">세부 평가와 근거</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {dimensionLabels.map(({ key, label }) => {
                const dimension = analysis.dimensions[key];
                return (
                  <div key={key} className="space-y-2 rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-medium">{label}</h4>
                      <span className="text-sm font-semibold tabular-nums">
                        {dimension.score} · {dimension.confidence}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {dimension.reason}
                    </p>
                    {dimension.jobQuote && (
                      <blockquote className="border-l-2 border-primary/40 pl-3 text-xs leading-5 text-muted-foreground">
                        공고: {dimension.jobQuote}
                      </blockquote>
                    )}
                    {dimension.resumeQuote && (
                      <blockquote className="border-l-2 border-secondary-foreground/30 pl-3 text-xs leading-5 text-muted-foreground">
                        이력서: {dimension.resumeQuote}
                      </blockquote>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold">요구사항별 이력서 근거</h3>
            <p className="text-sm text-muted-foreground">
              의미와 인용 근거를 바탕으로 한 AI 판정입니다. 판단 보류는 일치율
              계산에서 제외했습니다.
            </p>
            {analysis.requirements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                비교 가능한 요구사항을 찾지 못했습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {analysis.requirements.map((item, index) => (
                  <div
                    key={`${item.requirement}-${index}`}
                    className="space-y-2 rounded-lg border p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{item.requirement}</p>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">
                        {item.priority} · {assessmentLabels[item.assessment]}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {item.reason}
                    </p>
                    {item.jobQuote && (
                      <blockquote className="border-l-2 border-primary/40 pl-3 text-xs leading-5 text-muted-foreground">
                        공고: {item.jobQuote}
                      </blockquote>
                    )}
                    {item.resumeQuote && (
                      <blockquote className="border-l-2 border-secondary-foreground/30 pl-3 text-xs leading-5 text-muted-foreground">
                        이력서: {item.resumeQuote}
                      </blockquote>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold">지원 검토 이유</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {analysis.opportunityReason}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold">주요 위험과 확인할 점</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {analysis.mainRisk}
              </p>
            </div>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            통과 경쟁력: {analysis.passEstimateCaveat}
          </p>

          <section className="space-y-2 border-t pt-5">
            <h3 className="font-semibold">회사 정보 검색</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {analysis.companyResearch.summary}
            </p>
            {analysis.companyResearch.sources.length > 0 && (
              <ul className="space-y-1 text-sm">
                {analysis.companyResearch.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline underline-offset-4"
                    >
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>분석 변경 이력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0"
            >
              <div className="text-sm">
                <strong>
                  #{item.snapshot_number} · {item.category} · 기회 점수{" "}
                  {item.opportunity_score}
                </strong>
                <p className="text-muted-foreground">
                  {item.pipeline_stage} · {item.change_reason} ·{" "}
                  {new Date(item.created_at).toLocaleString("ko-KR")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending || item.id === review?.id}
                onClick={() => onRestore(item)}
              >
                이 분석으로 복원
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
