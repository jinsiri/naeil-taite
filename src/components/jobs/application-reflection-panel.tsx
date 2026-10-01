"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { saveApplicationReflection } from "@/app/jobs/reflection-actions";
import type { ApplicationReflection } from "@/lib/jobs/reflection-schema";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/jobs/scoring";

type StageChange = {
  id: string;
  pipeline_stage: PipelineStage;
  change_reason: string;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ApplicationReflectionPanel({
  jobId,
  currentStage,
  stageChanges,
  reflections,
}: {
  jobId: string;
  currentStage: PipelineStage;
  stageChanges: StageChange[];
  reflections: ApplicationReflection[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setMessage("");
    startTransition(async () => {
      const result = await saveApplicationReflection(formData);
      if ("error" in result) {
        setIsError(true);
        setMessage(result.error ?? "회고를 저장하지 못했어요.");
        return;
      }
      formRef.current?.reset();
      setIsError(false);
      setMessage("회고를 기록했어요.");
      router.refresh();
    });
  }

  const entries = [
    ...stageChanges.map((event) => ({
      id: `stage-${event.id}`,
      kind: "stage" as const,
      createdAt: event.created_at,
      stage: event.pipeline_stage,
      reason: event.change_reason,
    })),
    ...reflections.map((event) => ({
      id: `reflection-${event.id}`,
      kind: "reflection" as const,
      createdAt: event.created_at,
      stage: event.pipeline_stage,
      positiveNote: event.positive_note,
      improvementNote: event.improvement_note,
      nextTimeNote: event.next_time_note,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Card>
      <CardHeader>
        <CardTitle>지원 기록과 회고</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          단계가 바뀐 기록과 그때의 배움, 다음에 해볼 일을 공고별로 모아둡니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          ref={formRef}
          action={submit}
          className="space-y-4 rounded-xl border bg-secondary/30 p-4"
        >
          <input type="hidden" name="jobId" value={jobId} />
          <label className="block max-w-xs space-y-2 text-sm font-medium">
            기록할 당시의 지원 단계
            <select
              name="pipelineStage"
              defaultValue={currentStage}
              disabled={pending}
              className="min-h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground"
            >
              {PIPELINE_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm font-medium">
              좋았던 점
              <Textarea
                name="positiveNote"
                maxLength={2000}
                disabled={pending}
                className="min-h-24 bg-background"
                placeholder="잘 전달된 경험이나 준비 방법"
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              보완할 점
              <Textarea
                name="improvementNote"
                maxLength={2000}
                disabled={pending}
                className="min-h-24 bg-background"
                placeholder="아쉬웠거나 더 준비할 부분"
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              다음에 해볼 일
              <Textarea
                name="nextTimeNote"
                maxLength={2000}
                disabled={pending}
                className="min-h-24 bg-background"
                placeholder="다음 지원에서 시도할 행동"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="outline" disabled={pending}>
              {pending ? "기록 중…" : "회고 기록하기"}
            </Button>
            {message && (
              <p
                role={isError ? "alert" : "status"}
                className={`text-sm ${isError ? "text-destructive" : "text-muted-foreground"}`}
              >
                {message}
              </p>
            )}
          </div>
        </form>

        {entries.length ? (
          <ol className="divide-y">
            {entries.map((entry) => (
              <li key={entry.id} className="py-4 first:pt-0 last:pb-0">
                <article className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                        {entry.kind === "stage"
                          ? "단계 변경"
                          : `회고 · ${entry.stage}`}
                      </span>
                      {entry.kind === "stage" && (
                        <span className="text-sm text-muted-foreground">
                          {entry.stage}
                        </span>
                      )}
                    </div>
                    <time
                      dateTime={entry.createdAt}
                      className="text-xs text-muted-foreground"
                    >
                      {formatDate(entry.createdAt)}
                    </time>
                  </div>
                  {entry.kind === "stage" ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                      {entry.reason}
                    </p>
                  ) : (
                    <div className="grid gap-3 text-sm sm:grid-cols-3">
                      {entry.positiveNote && (
                        <div>
                          <h3 className="text-xs font-medium text-muted-foreground">
                            좋았던 점
                          </h3>
                          <p className="mt-1 leading-6 whitespace-pre-wrap">
                            {entry.positiveNote}
                          </p>
                        </div>
                      )}
                      {entry.improvementNote && (
                        <div>
                          <h3 className="text-xs font-medium text-muted-foreground">
                            보완할 점
                          </h3>
                          <p className="mt-1 leading-6 whitespace-pre-wrap">
                            {entry.improvementNote}
                          </p>
                        </div>
                      )}
                      {entry.nextTimeNote && (
                        <div>
                          <h3 className="text-xs font-medium text-muted-foreground">
                            다음에 해볼 일
                          </h3>
                          <p className="mt-1 leading-6 whitespace-pre-wrap">
                            {entry.nextTimeNote}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-3 text-sm text-muted-foreground">
            아직 기록이 없어요. 지원 단계 변경과 회고가 여기에 쌓입니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
