import { z } from "zod";
import { PIPELINE_STAGES } from "./scoring";

export const applicationReflectionInputSchema = z
  .object({
    jobId: z.uuid(),
    pipelineStage: z.enum(PIPELINE_STAGES),
    positiveNote: z.string().trim().max(2000),
    improvementNote: z.string().trim().max(2000),
    nextTimeNote: z.string().trim().max(2000),
  })
  .refine(
    (value) =>
      value.positiveNote || value.improvementNote || value.nextTimeNote,
    "회고 내용을 하나 이상 입력해 주세요.",
  );

export const applicationReflectionSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  job_posting_id: z.uuid(),
  pipeline_stage: z.enum(PIPELINE_STAGES),
  positive_note: z.string(),
  improvement_note: z.string(),
  next_time_note: z.string(),
  created_at: z.iso.datetime({ offset: true }),
});

export type ApplicationReflection = z.infer<typeof applicationReflectionSchema>;
