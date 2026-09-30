import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .max(2000, "공고 링크는 2,000자 이내로 입력해 주세요.")
  .refine((value) => {
    if (!value) return true;
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "http 또는 https로 시작하는 주소를 입력해 주세요.");

export const jobPostingInputSchema = z.object({
  title: z.string().trim().min(1, "직무명을 입력해 주세요.").max(120),
  company: z.string().trim().max(120),
  sourceUrl: optionalUrl,
  deadline: z.union([z.literal(""), z.iso.date()]),
  workLocation: z
    .string()
    .trim()
    .max(160, "근무지는 160자 이내로 입력해 주세요."),
  originalText: z
    .string()
    .refine(
      (value) => value.trim().length >= 20,
      "공고 원문을 20자 이상 입력해 주세요.",
    )
    .max(50000, "공고 원문은 50,000자 이내로 입력해 주세요."),
});

export const jobPostingSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  title: z.string(),
  company: z.string(),
  source_url: z.string(),
  deadline: z.iso.date().nullable(),
  work_location: z.string().default(""),
  original_text: z.string(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export type JobPostingInput = z.infer<typeof jobPostingInputSchema>;
export type JobPosting = z.infer<typeof jobPostingSchema>;

export function isJobPostingsTableMissing(code: string | undefined) {
  return code === "PGRST205" || code === "42P01";
}
