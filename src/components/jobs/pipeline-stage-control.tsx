"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updatePipelineStage } from "@/app/jobs/review-actions";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/jobs/scoring";

export function PipelineStageControl({
  jobId,
  resumeId,
  resumeVersion,
  currentStage,
}: {
  jobId: string;
  resumeId: string;
  resumeVersion: number;
  currentStage: PipelineStage;
}) {
  const [stage, setStage] = useState<PipelineStage>(currentStage);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    if (stage === currentStage) {
      setMessage("현재 단계와 같습니다.");
      return;
    }
    if (
      stage === "지원완료" &&
      !window.confirm("이 공고에 실제로 지원을 완료했나요?")
    )
      return;
    if (stage === "지원완료") formData.set("confirmedApply", "true");
    setMessage("");
    startTransition(async () => {
      try {
        const result = await updatePipelineStage(formData);
        if (result.error) {
          setMessage(result.error);
          return;
        }
        window.location.reload();
      } catch {
        setMessage("단계를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    });
  }

  return (
    <form action={submit} className="space-y-2 border-t pt-4">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="resumeId" value={resumeId} />
      <input type="hidden" name="resumeVersion" value={resumeVersion} />
      <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
        지원 단계
        <select
          name="pipelineStage"
          value={stage}
          onChange={(event) => setStage(event.target.value as PipelineStage)}
          disabled={pending}
          className="min-h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground"
        >
          {PIPELINE_STAGES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      )}
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "저장 중…" : "단계 변경"}
      </Button>
    </form>
  );
}
