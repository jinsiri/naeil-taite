"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rollbackJobReview, saveJobReview } from "@/app/jobs/review-actions";
import {
  APPLICATION_EFFORTS,
  CAREER_PATHS,
  PIPELINE_STAGES,
  calculateOpportunityScore,
  classifyOpportunity,
  type ReviewScores,
} from "@/lib/jobs/scoring";
import type { ReviewSnapshot } from "@/lib/jobs/review-schema";

const scoreFields: { key: keyof ReviewScores; label: string }[] = [
  { key: "companyQuality", label: "회사 매력도" },
  { key: "roleFit", label: "직무 적합도" },
  { key: "careerCapital", label: "커리어 자산" },
  { key: "targetAlignment", label: "목표 정렬도" },
  { key: "personalFit", label: "개인 적합도" },
];

const pathLabels = {
  DIRECT: "직접 진입",
  BRIDGE: "징검다리",
  OPTION: "선택지",
  REPEAT: "반복",
  DETOUR: "우회",
};

export function JobReviewPanel({
  jobId,
  resumeId,
  resumeVersion,
  deadline,
  initial,
  history,
}: {
  jobId: string;
  resumeId: string;
  resumeVersion: number;
  deadline: string | null;
  initial: ReviewSnapshot | null;
  history: ReviewSnapshot[];
}) {
  const [scores, setScores] = useState<ReviewScores>(
    initial?.scores ?? {
      companyQuality: 50,
      roleFit: 50,
      careerCapital: 50,
      targetAlignment: 50,
      personalFit: 50,
    },
  );
  const [passEstimate, setPassEstimate] = useState(
    initial?.pass_estimate ?? 50,
  );
  const [careerPath, setCareerPath] = useState(
    initial?.career_path ?? "DIRECT",
  );
  const [effort, setEffort] = useState(initial?.application_effort ?? "Medium");
  const [stage, setStage] = useState(initial?.pipeline_stage ?? "검토중");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const opportunity = calculateOpportunityScore(scores);
  const category = classifyOpportunity(
    opportunity,
    passEstimate,
    careerPath,
    scores.targetAlignment,
    scores.careerCapital,
    scores.roleFit,
  );

  function submit(formData: FormData) {
    if (
      stage === "지원완료" &&
      !window.confirm("이 공고를 실제로 지원 완료한 것으로 기록할까요?")
    )
      return;
    if (stage === "지원완료") formData.set("confirmedApply", "true");
    setMessage("");
    startTransition(async () => {
      const result = await saveJobReview(formData);
      setMessage(result.error ?? "평가와 지원 단계 이력을 저장했어요.");
      if (!result.error) window.location.reload();
    });
  }

  function restore(snapshot: ReviewSnapshot) {
    if (
      !window.confirm(
        `평가 #${snapshot.snapshot_number}의 값으로 새 이력을 추가할까요? 기존 기록은 유지됩니다.`,
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
        <h2 className="text-2xl font-semibold">기회 평가와 지원 이력</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          점수는 직접 입력하는 참고용 평가입니다. 기회 점수는 커리어 자산·직무
          적합도 각 25%, 회사·목표 정렬도 각 20%, 개인 적합도 10%로 계산합니다.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>현재 평가</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={submit} className="space-y-5">
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="resumeId" value={resumeId} />
            <input type="hidden" name="resumeVersion" value={resumeVersion} />
            <div className="grid gap-4 sm:grid-cols-2">
              {scoreFields.map(({ key, label }) => (
                <label key={key} className="space-y-2 text-sm">
                  {label}: <strong>{scores[key]}</strong>
                  <input
                    name={key}
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={scores[key]}
                    onChange={(event) =>
                      setScores({
                        ...scores,
                        [key]: Number(event.target.value),
                      })
                    }
                    className="block w-full accent-primary"
                  />
                </label>
              ))}
              <label className="space-y-2 text-sm">
                예상 서류 통과 가능성: <strong>{passEstimate}</strong>
                <input
                  name="passEstimate"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={passEstimate}
                  onChange={(event) =>
                    setPassEstimate(Number(event.target.value))
                  }
                  className="block w-full accent-primary"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-2 text-sm">
                커리어 경로
                <select
                  name="careerPath"
                  value={careerPath}
                  onChange={(event) =>
                    setCareerPath(event.target.value as typeof careerPath)
                  }
                  className="min-h-11 w-full rounded-lg border bg-background px-3"
                >
                  {CAREER_PATHS.map((path) => (
                    <option key={path} value={path}>
                      {pathLabels[path]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                지원 부담
                <select
                  name="applicationEffort"
                  value={effort}
                  onChange={(event) =>
                    setEffort(event.target.value as typeof effort)
                  }
                  className="min-h-11 w-full rounded-lg border bg-background px-3"
                >
                  {APPLICATION_EFFORTS.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                지원 단계
                <select
                  name="pipelineStage"
                  value={stage}
                  onChange={(event) =>
                    setStage(event.target.value as typeof stage)
                  }
                  className="min-h-11 w-full rounded-lg border bg-background px-3"
                >
                  {PIPELINE_STAGES.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block space-y-2 text-sm">
              변경 메모
              <input
                name="reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={5}
                maxLength={500}
                required
                placeholder={initial ? "평가를 수정한 이유" : "첫 평가 기록"}
                className="min-h-11 w-full rounded-lg border bg-background px-3"
              />
            </label>
            <p className="text-sm">
              기회 점수 <strong>{opportunity}</strong> · 분류{" "}
              <strong>{category}</strong> · 마감 {deadline ?? "미정"}
            </p>
            {message && (
              <p role="status" className="text-sm text-muted-foreground">
                {message}
              </p>
            )}
            <Button disabled={pending} type="submit">
              {pending ? "저장 중…" : "평가 기록 추가"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>평가 변경 이력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 기록이 없습니다. 평가를 저장하면 버전별 이력이 남습니다.
            </p>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0"
              >
                <div className="text-sm">
                  <strong>
                    #{item.snapshot_number} · {item.category}{" "}
                    {item.opportunity_score}점
                  </strong>
                  <p className="text-muted-foreground">
                    {item.pipeline_stage} ·{" "}
                    {new Date(item.created_at).toLocaleString("ko-KR")} ·{" "}
                    {item.change_reason}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => restore(item)}
                >
                  이 기록으로 복원
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
