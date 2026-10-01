"use server";

import { revalidatePath } from "next/cache";
import { applicationReflectionInputSchema } from "@/lib/jobs/reflection-schema";
import { getIdentity } from "@/lib/supabase/server";

export async function saveApplicationReflection(formData: FormData) {
  const parsed = applicationReflectionInputSchema.safeParse({
    jobId: formData.get("jobId"),
    pipelineStage: formData.get("pipelineStage"),
    positiveNote: formData.get("positiveNote") ?? "",
    improvementNote: formData.get("improvementNote") ?? "",
    nextTimeNote: formData.get("nextTimeNote") ?? "",
  });
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? "회고 내용을 확인해 주세요.",
    };

  const identity = await getIdentity();
  if (!identity) return { error: "로그인이 만료됐어요. 다시 로그인해 주세요." };

  const { error } = await identity.client
    .from("application_reflections")
    .insert({
      user_id: identity.user.id,
      job_posting_id: parsed.data.jobId,
      pipeline_stage: parsed.data.pipelineStage,
      positive_note: parsed.data.positiveNote,
      improvement_note: parsed.data.improvementNote,
      next_time_note: parsed.data.nextTimeNote,
    });
  if (error)
    return {
      error:
        error.code === "42P01" || error.code === "PGRST205"
          ? "회고 기록 테이블이 없어요. 202610010001_application_reflections.sql 마이그레이션을 적용해 주세요."
          : "회고를 저장하지 못했어요. 입력 내용을 확인하고 다시 시도해 주세요.",
    };

  revalidatePath(`/jobs/${parsed.data.jobId}`);
  revalidatePath("/applications");
  revalidatePath("/");
  return { success: true };
}
