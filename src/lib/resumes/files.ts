import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function attachmentPath(ownerId: string, fileId: string) {
  z.uuid().parse(ownerId);
  z.uuid().parse(fileId);
  return path.join(
    process.env.RESUME_STORAGE_DIR ||
      path.join(process.cwd(), ".data", "resumes"),
    ownerId,
    fileId,
  );
}

export async function saveAttachment(ownerId: string, file: File) {
  if (file.size < 1 || file.size > MAX_FILE_BYTES)
    throw new Error("PDF, DOCX, TXT 파일을 10MB 이하로 첨부해 주세요.");
  const extension = path.extname(file.name).toLowerCase();
  if (![".pdf", ".docx", ".txt"].includes(extension))
    throw new Error("PDF, DOCX, TXT 파일만 첨부할 수 있어요.");
  const data = Buffer.from(await file.arrayBuffer());
  if (extension === ".pdf" && data.subarray(0, 5).toString() !== "%PDF-")
    throw new Error("PDF 파일 형식을 확인해 주세요.");
  if (
    extension === ".docx" &&
    !data.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
  )
    throw new Error("DOCX 파일 형식을 확인해 주세요.");
  const id = randomUUID();
  const destination = attachmentPath(ownerId, id);
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  await writeFile(destination, data, { flag: "wx", mode: 0o600 });
  return {
    id,
    name:
      path
        .basename(file.name)
        .replace(/[\x00-\x1f\x7f]/g, "")
        .slice(0, 255) || `resume${extension}`,
    size: data.length,
  };
}

export async function readAttachment(ownerId: string, fileId: string) {
  return readFile(attachmentPath(ownerId, fileId));
}
