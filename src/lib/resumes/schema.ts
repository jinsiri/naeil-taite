import { z } from "zod";
import { isPostgresSafeText } from "./unicode";

export const resumeInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "이력서 이름을 입력해 주세요.")
    .max(100, "이름은 100자 이내로 입력해 주세요.")
    .refine(isPostgresSafeText, "저장할 수 없는 숨은 문자가 포함되어 있어요."),
  content: z
    .string()
    .refine((value) => value.trim().length > 0, "이력서 내용을 입력해 주세요.")
    .max(100000, "내용은 100,000자 이내로 입력해 주세요.")
    .refine(
      isPostgresSafeText,
      "저장할 수 없는 숨은 문자가 포함되어 있어요. 해당 부분을 다시 입력해 주세요.",
    ),
  changeNote: z
    .string()
    .trim()
    .max(500, "변경 메모는 500자 이내로 입력해 주세요.")
    .refine(isPostgresSafeText, "저장할 수 없는 숨은 문자가 포함되어 있어요."),
});

export type ResumeInput = z.infer<typeof resumeInputSchema>;

export function formatResumeDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export const resumeSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  current_version: z.number().int().positive(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export const versionSchema = z.object({
  id: z.uuid(),
  resume_id: z.uuid(),
  user_id: z.uuid(),
  version: z.number().int().positive(),
  title: z.string(),
  content: z.string(),
  change_note: z.string(),
  file_id: z.uuid().nullable(),
  file_name: z.string().nullable(),
  file_size: z.number().nullable(),
  restored_from_version: z.number().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  approved_at: z.iso.datetime({ offset: true }),
});
export const versionSummarySchema = versionSchema.omit({ content: true });
export type ResumeVersion = z.infer<typeof versionSchema>;
export type Resume = z.infer<typeof resumeSchema>;
export type SaveResult =
  { id: string; error?: never } | { id?: never; error: string };
