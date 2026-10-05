"use server";

import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/supabase/server";
import { submissionInputSchema } from "@/lib/applications/submission-schema";

export async function confirmSubmission(input: unknown) {
  const parsed = submissionInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      error:
        parsed.error.issues[0]?.message ??
        "제출본과 확인 항목을 확인해 주세요.",
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
  const { error } = await identity.client.rpc("confirm_submitted_resume", {
    p_id: value.requestId,
    p_application_id: value.applicationId,
    p_submitted_on: value.submittedOn,
    p_kind: value.kind,
    p_resume_id: value.resumeId,
    p_resume_version: value.resumeVersion,
    p_file_id: value.fileId,
    p_note: value.note,
    p_approved: value.approved,
  });
  if (error)
    return {
      error:
        "제출본 확정을 확인하지 못했어요. 자료와 연결 상태를 확인한 뒤 다시 시도해 주세요.",
    };
  revalidatePath(`/jobs/${application.job_posting_id}`);
  return { success: true };
}
