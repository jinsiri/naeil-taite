"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getIdentity } from "@/lib/supabase/server";
import {
  reviewInputSchema,
  reviewSnapshotSchema,
} from "@/lib/jobs/review-schema";
import {
  calculateOpportunityScore,
  calculatePriorityScore,
  classifyOpportunity,
  type ReviewScores,
} from "@/lib/jobs/scoring";

const rollbackIdSchema = z.uuid();

async function persistReview(
  input: z.infer<typeof reviewInputSchema>,
  rollbackSourceId: string | null = null,
): Promise<{ id?: string; error?: string }> {
  const identity = await getIdentity();
  if (!identity) return { error: "로그인이 만료됐어요. 다시 로그인해 주세요." };
  const { client, user } = identity;

  const { error: latestError } = await client
    .from("job_reviews")
    .select("*")
    .eq("user_id", user.id)
    .eq("job_posting_id", input.jobId)
    .eq("resume_id", input.resumeId)
    .eq("resume_version", input.resumeVersion)
    .order("snapshot_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError)
    return {
      error:
        latestError.code === "PGRST205" || latestError.code === "42P01"
          ? "평가 기록용 DB 변경이 적용되지 않았어요. 202609280002_job_reviews.sql을 먼저 적용해 주세요."
          : "이력서 평가 기록을 불러오지 못했어요.",
    };
  const { data: job, error: jobError } = await client
    .from("job_postings")
    .select("deadline")
    .eq("id", input.jobId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (jobError || !job) return { error: "채용공고를 확인하지 못했어요." };
  const opportunityScore = calculateOpportunityScore(input.scores);
  const category = classifyOpportunity(
    opportunityScore,
    input.passEstimate,
    input.careerPath,
    input.scores.targetAlignment,
    input.scores.careerCapital,
    input.scores.roleFit,
  );

  const { data, error } = await client.rpc("save_job_review", {
    p_job_posting_id: input.jobId,
    p_resume_id: input.resumeId,
    p_resume_version: input.resumeVersion,
    p_scores: input.scores,
    p_opportunity_score: opportunityScore,
    p_pass_estimate: input.passEstimate,
    p_career_path: input.careerPath,
    p_category: category,
    p_priority_score: calculatePriorityScore({
      opportunity: opportunityScore,
      pass: input.passEstimate,
      deadline: job.deadline,
      effort: input.applicationEffort,
    }),
    p_application_effort: input.applicationEffort,
    p_pipeline_stage: input.pipelineStage,
    p_change_reason: input.reason,
    p_rollback_source_id: rollbackSourceId,
  });
  if (error || !data)
    return {
      error:
        error?.code === "PGRST202" || error?.code === "42883"
          ? "평가 저장 기능을 찾지 못했어요. 202609280002_job_reviews.sql을 적용해 주세요."
          : "평가를 저장하지 못했어요. 입력한 내용은 유지됩니다.",
    };
  const id = z.uuid().parse(data);
  revalidatePath("/applications");
  revalidatePath("/jobs/" + input.jobId);
  return { id };
}

export async function saveJobReview(formData: FormData) {
  const score = (key: keyof ReviewScores) => formData.get(key);
  const parsed = reviewInputSchema.safeParse({
    jobId: formData.get("jobId"),
    resumeId: formData.get("resumeId"),
    resumeVersion: formData.get("resumeVersion"),
    scores: {
      companyQuality: score("companyQuality"),
      roleFit: score("roleFit"),
      careerCapital: score("careerCapital"),
      targetAlignment: score("targetAlignment"),
      personalFit: score("personalFit"),
    },
    passEstimate: formData.get("passEstimate"),
    careerPath: formData.get("careerPath"),
    applicationEffort: formData.get("applicationEffort"),
    pipelineStage: formData.get("pipelineStage"),
    reason: formData.get("reason"),
  });
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? "평가 내용을 확인해 주세요.",
    };
  if (
    parsed.data.pipelineStage === "지원완료" &&
    formData.get("confirmedApply") !== "true"
  )
    return { error: "지원 완료로 바꾸려면 확인 절차를 진행해 주세요." };
  return persistReview(parsed.data);
}

export async function rollbackJobReview(id: string) {
  const parsedId = rollbackIdSchema.safeParse(id);
  if (!parsedId.success) return { error: "복원할 평가를 확인해 주세요." };
  const identity = await getIdentity();
  if (!identity) return { error: "로그인이 만료됐어요. 다시 로그인해 주세요." };
  const { data, error } = await identity.client
    .from("job_reviews")
    .select("*")
    .eq("id", parsedId.data)
    .eq("user_id", identity.user.id)
    .maybeSingle();
  if (error || !data) return { error: "복원할 평가를 찾지 못했어요." };
  const snapshot = reviewSnapshotSchema.parse(data);
  return persistReview(
    {
      jobId: snapshot.job_posting_id,
      resumeId: snapshot.resume_id,
      resumeVersion: snapshot.resume_version,
      scores: snapshot.scores,
      passEstimate: snapshot.pass_estimate,
      careerPath: snapshot.career_path,
      applicationEffort: snapshot.application_effort,
      pipelineStage: snapshot.pipeline_stage,
      reason: "평가 #" + snapshot.snapshot_number + " 상태로 되돌림",
    },
    snapshot.id,
  );
}
