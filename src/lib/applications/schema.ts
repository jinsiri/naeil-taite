import { z } from "zod";
import { PIPELINE_STAGES } from "../jobs/scoring";
import { reviewSnapshotSchema } from "../jobs/review-schema";

export const applicationSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  job_posting_id: z.uuid(),
  pipeline_stage: z.enum(PIPELINE_STAGES).nullable(),
  legacy_stage: z.enum(PIPELINE_STAGES).nullable(),
  revision: z.number().int().positive(),
});
export const applicationEventSchema = z.object({
  id: z.uuid(),
  pipeline_stage: z.enum(PIPELINE_STAGES).nullable(),
  change_reason: z.string(),
  created_at: z.iso.datetime({ offset: true }),
});
export const applicationOverviewSchema = applicationSchema.extend({
  title: z.string(),
  company: z.string(),
  deadline: z.iso.date().nullable(),
  job_created_at: z.iso.datetime({ offset: true }),
  latest_review: reviewSnapshotSchema.nullable(),
});
export const stageInputSchema = z
  .object({
    jobId: z.uuid(),
    expectedRevision: z.number().int().positive(),
    pipelineStage: z.enum(PIPELINE_STAGES),
    confirmedApply: z.boolean(),
  })
  .refine(
    (input) => input.pipelineStage !== "지원완료" || input.confirmedApply,
    "실제 지원 완료인지 확인해 주세요.",
  );
export type Application = z.infer<typeof applicationSchema>;
export type ApplicationOverview = z.infer<typeof applicationOverviewSchema>;
export type StageInput = z.infer<typeof stageInputSchema>;
