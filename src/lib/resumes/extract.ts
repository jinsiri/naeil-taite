import "server-only";

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import path from "node:path";
import { MAX_FILE_BYTES } from "./files";

const MAX_RESUME_CHARS = 100_000;
const MAX_PDF_PAGES = 50;

export class ResumeExtractionError extends Error {}

export async function extractResumeFile(file: File) {
  if (file.size < 1 || file.size > MAX_FILE_BYTES)
    throw new ResumeExtractionError("첨부 파일은 10MB 이하로 선택해 주세요.");
  const extension = path.extname(file.name).toLowerCase();
  if (![".pdf", ".docx", ".txt"].includes(extension))
    throw new ResumeExtractionError("PDF, DOCX, TXT 파일만 추출할 수 있어요.");

  const buffer = Buffer.from(await file.arrayBuffer());
  let content: string;
  if (extension === ".txt") {
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      throw new ResumeExtractionError("TXT 파일은 UTF-8 인코딩이어야 해요.");
    }
  } else if (extension === ".docx") {
    if (!buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])))
      throw new ResumeExtractionError("DOCX 파일 형식을 확인해 주세요.");
    try {
      content = (await mammoth.extractRawText({ buffer })).value;
    } catch {
      throw new ResumeExtractionError(
        "DOCX 파일을 읽지 못했어요. 파일이 손상되지 않았는지 확인해 주세요.",
      );
    }
  } else {
    if (buffer.subarray(0, 5).toString() !== "%PDF-")
      throw new ResumeExtractionError("PDF 파일 형식을 확인해 주세요.");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText({ first: MAX_PDF_PAGES + 1 });
      if (result.pages.length > MAX_PDF_PAGES)
        throw new ResumeExtractionError(
          "한 번에 최대 50페이지까지 추출할 수 있어요. 필요한 부분을 나눠서 등록해 주세요.",
        );
      content = result.text;
    } catch (error) {
      if (error instanceof ResumeExtractionError) throw error;
      const errorName = error instanceof Error ? error.name : "UnknownPDFError";
      if (errorName === "PasswordException")
        throw new ResumeExtractionError(
          "암호가 설정된 PDF는 읽을 수 없어요. 암호를 해제한 뒤 다시 올려 주세요.",
        );
      if (errorName === "InvalidPDFException")
        throw new ResumeExtractionError(
          "PDF 구조를 읽을 수 없어요. 파일을 PDF로 다시 저장한 뒤 시도해 주세요.",
        );
      throw new ResumeExtractionError(
        "PDF 텍스트를 추출하지 못했어요. 파일 형식을 확인하거나 DOCX·TXT로 저장해 올려 주세요.",
      );
    } finally {
      try {
        await parser.destroy();
      } catch {
        // Parser cleanup should not turn a successful extraction into a failure.
      }
    }
  }

  if (content.length > MAX_RESUME_CHARS)
    throw new ResumeExtractionError(
      "추출 결과가 너무 길어요. 필요한 부분으로 나눠서 등록해 주세요.",
    );
  if (!content.trim())
    throw new ResumeExtractionError(
      "파일에서 텍스트를 찾지 못했어요. 스캔 PDF나 이미지 문서는 자동 추출할 수 없으니 내용을 직접 붙여넣어 주세요.",
    );
  return content;
}
