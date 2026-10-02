import { z } from "zod";

export const RESUME_BUCKET = "resume-originals";
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const uploadInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .regex(/\.(pdf|docx|txt)$/i),
  size: z.number().int().min(1).max(MAX_FILE_BYTES),
});
export const storedFileSchema = uploadInputSchema.extend({
  id: z.uuid(),
  user_id: z.uuid(),
  state: z.enum(["pending", "attached", "discarded", "deleted", "legacy"]),
});
export type StoredResumeFile = z.infer<typeof storedFileSchema>;
export function storagePath(ownerId: string, fileId: string) {
  return `${z.uuid().parse(ownerId)}/${z.uuid().parse(fileId)}`;
}
export function fileContentType(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === "txt") return "text/plain";
  throw new Error("UNSUPPORTED_FILE_TYPE");
}
export function safeFileName(name: string) {
  return (
    name
      .split(/[\\/]/)
      .pop()
      ?.replace(/[\x00-\x1f\x7f]/g, "")
      .slice(0, 255) ?? ""
  );
}
