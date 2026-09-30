"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getIdentity } from "@/lib/supabase/server";
import {
  isJobPostingsTableMissing,
  jobPostingInputSchema,
} from "@/lib/jobs/schema";

export async function saveJobPosting(formData: FormData) {
  const parsed = jobPostingInputSchema.safeParse({
    title: formData.get("title"),
    company: formData.get("company"),
    sourceUrl: formData.get("sourceUrl"),
    deadline: formData.get("deadline"),
    originalText: formData.get("originalText"),
  });
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? "입력 내용을 확인해 주세요.",
    };

  try {
    const identity = await getIdentity();
    if (!identity)
      return {
        error: "로그인이 만료됐어요. 로그인한 뒤 다시 시도해 주세요.",
      };
    const { client, user } = identity;
    const { data, error } = await client
      .from("job_postings")
      .insert({
        user_id: user.id,
        title: parsed.data.title,
        company: parsed.data.company,
        source_url: parsed.data.sourceUrl,
        deadline: parsed.data.deadline || null,
        original_text: parsed.data.originalText,
      })
      .select("id")
      .single();
    if (error && isJobPostingsTableMissing(error.code))
      return {
        error:
          "채용공고 테이블이 아직 없어요. Supabase에 202609280001_job_postings.sql 마이그레이션을 적용해 주세요.",
      };
    if (error || !data)
      return {
        error:
          "공고를 저장하지 못했어요. 입력 내용을 유지한 채 다시 시도해 주세요.",
      };
    const id = z.uuid().parse(data.id);
    revalidatePath("/jobs");
    return { id };
  } catch {
    return { error: "공고를 저장하지 못했어요. 로그인 상태를 확인해 주세요." };
  }
}

export async function deleteJobPosting(jobId: string) {
  const parsedId = z.uuid().safeParse(jobId);
  if (!parsedId.success) return { error: "삭제할 공고를 확인하지 못했어요." };

  try {
    const identity = await getIdentity();
    if (!identity)
      return { error: "로그인이 만료됐어요. 다시 로그인해 주세요." };
    const { client, user } = identity;
    const { data, error } = await client
      .from("job_postings")
      .delete()
      .eq("id", parsedId.data)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error)
      return { error: "공고를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요." };
    if (!data) return { error: "삭제할 공고가 없거나 권한이 없어요." };

    revalidatePath("/jobs");
    revalidatePath("/applications");
    return { success: true };
  } catch {
    return { error: "공고를 삭제하지 못했어요. 로그인 상태를 확인해 주세요." };
  }
}
