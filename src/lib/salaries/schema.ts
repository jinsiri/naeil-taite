import { z } from "zod";

export const salaryFieldsSchema = z.object({
  effectiveOn: z.iso.date("연봉 적용일을 입력해 주세요."),
  careerYear: z
    .number()
    .int()
    .min(1, "전체 경력 연차를 입력해 주세요.")
    .max(60),
  company: z.string().trim().max(100),
  amount: z
    .number()
    .int()
    .min(1, "세전 연봉을 만원 단위 정수로 입력해 주세요.")
    .max(1000000),
  note: z.string().trim().max(1000),
});
export const salaryInputSchema = salaryFieldsSchema.extend({
  id: z.uuid(),
  expectedRevision: z.number().int().min(0),
});
export const salaryRecordSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  effective_on: z.iso.date(),
  career_year: z.number().int().positive(),
  company: z.string(),
  amount: z.number().int().positive(),
  note: z.string(),
  revision: z.number().int().positive(),
  created_at: z.iso.datetime({ offset: true }),
});
export const salaryDeleteSchema = z.object({
  id: z.uuid(),
  expectedRevision: z.number().int().positive(),
  approved: z.literal(true),
});
export type SalaryFields = z.infer<typeof salaryFieldsSchema>;
export type SalaryRecord = z.infer<typeof salaryRecordSchema>;
