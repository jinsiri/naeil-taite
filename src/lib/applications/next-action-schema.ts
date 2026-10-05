import { z } from "zod";
import { seoulDate } from "./submission-schema";

export const nextActionFieldsSchema = z.object({
  title: z.string().trim().min(1, "다음 행동을 입력해 주세요.").max(160),
  note: z.string().trim().max(2000),
  dueOn: z.union([z.literal(""), z.iso.date()]),
  completed: z.boolean(),
});
export const nextActionInputSchema = nextActionFieldsSchema.extend({
  id: z.uuid(),
  applicationId: z.uuid(),
  expectedRevision: z.number().int().min(0),
  sourceReflectionId: z.uuid().nullable(),
});
export const nextActionSchema = z.object({
  id: z.uuid(),
  application_id: z.uuid(),
  source_reflection_id: z.uuid().nullable(),
  title: z.string(),
  note: z.string(),
  due_on: z.iso.date().nullable(),
  completed_at: z.iso.datetime({ offset: true }).nullable(),
  revision: z.number().int().positive(),
});
export type NextAction = z.infer<typeof nextActionSchema>;
export type NextActionFields = z.infer<typeof nextActionFieldsSchema>;
export function actionDueLabel(
  dueOn: string | null,
  completed: boolean,
  today = seoulDate(),
) {
  if (completed) return "완료";
  if (!dueOn) return "기한 없음";
  if (dueOn < today) return `기한 지남 · ${dueOn}`;
  if (dueOn === today) return "오늘까지";
  return `${dueOn}까지`;
}
