import { z } from "zod";

export function seoulDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export const submissionInputSchema = z
  .object({
    requestId: z.uuid(),
    applicationId: z.uuid(),
    submittedOn: z.iso
      .date()
      .refine(
        (value) => value <= seoulDate(),
        "제출일은 오늘 이후일 수 없어요.",
      ),
    kind: z.enum(["file", "text"]),
    resumeId: z.uuid().nullable(),
    resumeVersion: z.number().int().positive().nullable(),
    fileId: z.uuid().nullable(),
    note: z.string().trim().max(500),
    approved: z.literal(true),
  })
  .refine(
    (value) =>
      value.kind === "file"
        ? value.fileId !== null &&
          value.resumeId === null &&
          value.resumeVersion === null
        : value.fileId === null &&
          value.resumeId !== null &&
          value.resumeVersion !== null,
    "실제 제출한 파일 또는 이력서 본문 버전을 선택해 주세요.",
  );
export const submittedResumeSchema = z.object({
  id: z.uuid(),
  application_id: z.uuid(),
  source_kind: z.enum(["file", "text"]),
  submitted_on: z.iso.date(),
  title: z.string(),
  content: z.string().nullable(),
  file_name: z.string().nullable(),
  note: z.string(),
  approved_at: z.iso.datetime({ offset: true }),
});
export type SubmittedResume = z.infer<typeof submittedResumeSchema>;
