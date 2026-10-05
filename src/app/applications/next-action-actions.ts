"use server";

import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/supabase/server";
import { nextActionInputSchema } from "@/lib/applications/next-action-schema";

export async function saveNextAction(input: unknown) {
  const parsed = nextActionInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? "입력 내용을 확인해 주세요.",
    };
  const identity = await getIdentity();
  if (!identity) return { error: "로그인한 뒤 다시 시도해 주세요." };
  const value = parsed.data;
  const { data: application, error: lookupError } = await identity.client
    .from("applications")
    .select("job_posting_id")
    .eq("id", value.applicationId)
    .eq("user_id", identity.user.id)
    .single();
  if (lookupError) return { error: "지원 기록을 찾지 못했어요." };
  const { error } = await identity.client.rpc("save_next_action", {
    p_id: value.id,
    p_application_id: value.applicationId,
    p_expected_revision: value.expectedRevision,
    p_title: value.title,
    p_note: value.note,
    p_due_on: value.dueOn || null,
    p_completed: value.completed,
    p_source_reflection_id: value.sourceReflectionId,
  });
  if (error)
    return {
      error:
        error.code === "40001"
          ? "다른 창에서 내용이 바뀌었어요. 새로고침해 최신 기록을 확인해 주세요."
          : "다음 행동을 저장하지 못했어요. 내용을 유지한 채 다시 시도해 주세요.",
    };
  revalidatePath("/");
  revalidatePath("/applications");
  revalidatePath(`/jobs/${application.job_posting_id}`);
  return { success: true };
}
