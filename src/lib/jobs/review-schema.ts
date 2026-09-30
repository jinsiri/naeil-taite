import { z } from "zod";
import {
  APPLICATION_EFFORTS,
  CAREER_PATHS,
  LEGACY_SCORE_WEIGHTS,
  PIPELINE_STAGES,
  scoreWeightsSchema,
} from "./scoring";
import { jobAiAnalysisSchema } from "./ai-analysis";

export const reviewInputSchema = z.object({
  jobId: z.uuid(),
  resumeId: z.uuid(),
  resumeVersion: z.coerce.number().int().positive(),
  scores: z
    .object({
      companyQuality: z.coerce.number().int().min(0).max(100),
      roleFit: z.coerce.number().int().min(0).max(100),
      careerCapital: z.coerce.number().int().min(0).max(100),
      targetAlignment: z.coerce.number().int().min(0).max(100),
      personalFit: z.coerce.number().int().min(0).max(100),
      publicTransitFit: z.coerce.number().int().min(0).max(100).optional(),
      _weights: z
        .object({
          careerCapital: z.number().min(0).max(100),
          roleFit: z.number().min(0).max(100),
          companyQuality: z.number().min(0).max(100),
          targetAlignment: z.number().min(0).max(100),
          personalFit: z.number().min(0).max(100),
          publicTransitFit: z.number().min(0).max(100),
        })
        .optional(),
    })
    .passthrough(),
  passEstimate: z.coerce.number().int().min(0).max(100),
  careerPath: z.enum(CAREER_PATHS),
  applicationEffort: z.enum(APPLICATION_EFFORTS),
  pipelineStage: z.enum(PIPELINE_STAGES),
  reason: z.string().trim().min(5).max(500),
});

export const reviewSnapshotSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  job_posting_id: z.uuid(),
  resume_id: z.uuid(),
  resume_version: z.number().int().positive(),
  snapshot_number: z.number().int().positive(),
  parent_review_id: z.uuid().nullable(),
  rollback_source_id: z.uuid().nullable(),
  change_reason: z.string(),
  scores: reviewInputSchema.shape.scores
    .extend({ _weights: scoreWeightsSchema.default(LEGACY_SCORE_WEIGHTS) })
    .passthrough(),
  opportunity_score: z.number().int().min(0).max(100),
  pass_estimate: z.number().int().min(0).max(100),
  career_path: z.enum(CAREER_PATHS),
  category: z.enum(["우선지원", "상향지원", "안정지원", "후순위"]),
  priority_score: z.number().int().min(0).max(100),
  application_effort: z.enum(APPLICATION_EFFORTS),
  pipeline_stage: z.enum(PIPELINE_STAGES),
  pass_at_apply: z.number().int().min(0).max(100).nullable(),
  ai_analysis: jobAiAnalysisSchema.nullable().default(null),
  ai_consent_at: z.iso.datetime({ offset: true }).nullable().default(null),
  created_at: z.iso.datetime({ offset: true }),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;
export type ReviewSnapshot = z.infer<typeof reviewSnapshotSchema>;
