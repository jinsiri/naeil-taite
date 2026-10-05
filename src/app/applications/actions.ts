"use server";

import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/supabase/server";
import { stageInputSchema } from "@/lib/applications/schema";

export async function updateApplicationStage(input: unknown) {
  const parsed = stageInputSchema.safeParse(input);
  if (!parsed.success)
    return { error: "지원 단계와 완료 확인을 확인해 주세요." };
  const identity = await getIdentity();
  if (!identity) return { error: "로그인한 뒤 다시 시도해 주세요." };
  const { error } = await identity.client.rpc("set_application_stage", {
    p_job_id: parsed.data.jobId,
    p_expected_revision: parsed.data.expectedRevision,
    p_stage: parsed.data.pipelineStage,
    p_confirmed_apply: parsed.data.confirmedApply,
  });
  if (error)
    return {
      error:
        error.code === "40001"
          ? "다른 창에서 지원 기록이 바뀌었어요. 새로고침한 뒤 다시 확인해 주세요."
          : "지원 단계를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  revalidatePath("/");
  revalidatePath("/applications");
  revalidatePath(`/jobs/${parsed.data.jobId}`);
  return { success: true };
}
