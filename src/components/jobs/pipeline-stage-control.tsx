"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { updateApplicationStage } from "@/app/applications/actions";
import { PIPELINE_STAGES } from "@/lib/jobs/scoring";
import {
  stageInputSchema,
  type Application,
  type StageInput,
} from "@/lib/applications/schema";

export function PipelineStageControl({
  application,
  compact = false,
}: {
  application: Application;
  compact?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<StageInput>({
    resolver: zodResolver(stageInputSchema),
    values: {
      jobId: application.job_posting_id,
      expectedRevision: application.revision,
      pipelineStage:
        application.pipeline_stage ?? application.legacy_stage ?? "검토중",
      confirmedApply: false,
    },
  });
  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const stage = new FormData(event.currentTarget).get("pipelineStage");
        const confirmed =
          stage === "지원완료"
            ? window.confirm("이 공고에 실제로 지원을 완료했나요?")
            : false;
        if (stage === "지원완료" && !confirmed) return;
        setValue("confirmedApply", confirmed);
        await handleSubmit(
          async (values) => {
            setMessage("");
            try {
              const result = await updateApplicationStage(values);
              setMessage(result.error ?? "지원 단계를 저장했어요.");
              if (!result.error) router.refresh();
            } catch {
              setMessage(
                "저장 완료를 확인하지 못했어요. 새로고침해 기록을 확인해 주세요.",
              );
            }
          },
          () => setMessage("지원 단계를 확인해 주세요."),
        )(event);
      }}
    >
      {application.pipeline_stage === null && (
        <p className="text-xs leading-5 text-amber-700">
          기존 평가에 기록된 단계는 ‘{application.legacy_stage}’입니다. 현재
          실제 단계를 선택해 확인해 주세요.
        </p>
      )}
      <label className="block space-y-2 text-sm font-medium">
        지원 단계
        <select
          {...register("pipelineStage")}
          disabled={isSubmitting}
          className="min-h-10 w-full rounded-lg border bg-background px-3"
        >
          {PIPELINE_STAGES.map((stage) => (
            <option key={stage}>{stage}</option>
          ))}
        </select>
      </label>
      <Button
        type="submit"
        variant="outline"
        size={compact ? "sm" : "default"}
        disabled={isSubmitting}
      >
        {isSubmitting
          ? "저장 중…"
          : application.pipeline_stage === null
            ? "현재 단계 확인"
            : "단계 저장"}
      </Button>
      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </form>
  );
}
