"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getIdentity } from "@/lib/supabase/server";
import { resumeInputSchema, type SaveResult } from "@/lib/resumes/schema";
import { saveAttachment } from "@/lib/resumes/files";
import {
  extractResumeFile,
  ResumeExtractionError,
} from "@/lib/resumes/extract";
import { normalizePostgresText } from "@/lib/resumes/unicode";

const targetSchema = z.object({
  id: z.uuid().nullable(),
  expectedVersion: z.number().int().min(0),
  approved: z.literal(true),
});

export async function extractResumeContent(
  formData: FormData,
): Promise<{ text?: string; warning?: boolean; error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "추출할 파일을 선택해 주세요." };
  try {
    const identity = await getIdentity();
    if (!identity)
      return { error: "로그인이 만료됐어요. 로그인한 뒤 다시 시도해 주세요." };
    const normalized = normalizePostgresText(await extractResumeFile(file));
    return {
      text: normalized.text,
      warning: normalized.changed,
    };
  } catch (error) {
    if (error instanceof ResumeExtractionError) return { error: error.message };
    return {
      error:
        "파일을 읽지 못했어요. 형식과 파일 상태를 확인한 뒤 다시 시도해 주세요.",
    };
  }
}

export async function saveResume(formData: FormData): Promise<SaveResult> {
  const parsed = resumeInputSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    changeNote: formData.get("changeNote"),
  });
  const target = targetSchema.safeParse({
    id: formData.get("id") || null,
    expectedVersion: Number(formData.get("expectedVersion")),
    approved: formData.get("approved") === "true",
  });
  if (!parsed.success || !target.success)
    return { error: "입력 내용과 저장 동의를 확인해 주세요." };
  try {
    const identity = await getIdentity();
    if (!identity)
      return {
        error: "로그인이 만료됐어요. 새 탭에서 로그인한 뒤 다시 저장해 주세요.",
      };
    const { client, user } = identity;
    // Check ownership before touching disk; the RPC repeats this under a row lock.
    if (target.data.id) {
      const { data, error } = await client
        .from("resumes")
        .select("current_version")
        .eq("id", target.data.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !data)
        return { error: "이력서를 찾을 수 없거나 접근할 수 없어요." };
      if (data.current_version !== target.data.expectedVersion)
        return {
          error:
            "다른 창에서 새 버전이 저장됐어요. 입력 내용을 복사한 뒤 최신 버전을 열어 다시 수정해 주세요.",
        };
    }
    const uploaded = formData.get("file");
    let file: Awaited<ReturnType<typeof saveAttachment>> | undefined;
    if (uploaded instanceof File && uploaded.size > 0) {
      try {
        file = await saveAttachment(user.id, uploaded);
      } catch {
        return {
          error:
            "첨부 파일을 저장하지 못했어요. PDF·DOCX·TXT 형식, 10MB 이하 크기와 저장 공간을 확인해 주세요.",
        };
      }
    }
    const { data, error } = await client.rpc("save_resume", {
      p_resume_id: target.data.id,
      p_expected_version: target.data.expectedVersion,
      p_title: parsed.data.title,
      p_content: parsed.data.content,
      p_change_note: parsed.data.changeNote,
      p_file_id: file?.id ?? null,
      p_file_name: file?.name ?? null,
      p_file_size: file?.size ?? null,
    });
    // Keep a staged file on ambiguous network failure: the DB may have committed it.
    if (error) {
      if (error.code === "40001")
        return {
          error:
            "다른 창에서 새 버전이 저장됐어요. 입력 내용을 복사한 뒤 최신 버전을 열어 다시 수정해 주세요.",
        };
      if (error.code === "PGRST202" || error.code === "42883")
        return {
          error:
            "이력서 저장 기능을 찾지 못했어요. Supabase에 최신 이력서 데이터베이스 변경을 적용한 뒤 다시 시도해 주세요.",
        };
      if (error.code === "42501")
        return {
          error:
            "이력서를 저장할 권한을 확인하지 못했어요. 로그인 상태와 계정 권한을 확인한 뒤 다시 시도해 주세요.",
        };
      if (error.code === "22P05")
        return {
          error:
            "본문에 데이터베이스가 저장할 수 없는 문자가 남아 있어요. 해당 부분을 지우거나 다시 입력해 주세요.",
        };
      return {
        error: `저장 요청이 실패했어요. 오류 코드 ${error.code}를 확인해 주세요. 입력한 내용은 유지됩니다.`,
      };
    }
    const id = z.uuid().parse(data);
    revalidatePath("/resumes");
    revalidatePath(`/resumes/${id}`);
    return { id };
  } catch {
    return {
      error:
        "저장 완료를 확인하지 못했어요. 입력 내용을 유지한 채 연결 상태와 버전 기록을 확인해 주세요.",
    };
  }
}

export async function restoreResume(input: unknown): Promise<SaveResult> {
  const parsed = targetSchema
    .extend({ id: z.uuid(), version: z.number().int().positive() })
    .safeParse(input);
  if (!parsed.success)
    return { error: "복원할 버전과 승인 여부를 확인해 주세요." };
  try {
    const identity = await getIdentity();
    if (!identity) return { error: "로그인한 뒤 다시 시도해 주세요." };
    const { data, error } = await identity.client.rpc("save_resume", {
      p_resume_id: parsed.data.id,
      p_expected_version: parsed.data.expectedVersion,
      p_title: "",
      p_content: "",
      p_restore_version: parsed.data.version,
    });
    if (error)
      return {
        error:
          error.code === "40001"
            ? "새 버전이 저장됐어요. 페이지를 새로고침한 뒤 다시 시도해 주세요."
            : "복원 완료를 확인하지 못했어요. 버전 기록을 확인해 주세요.",
      };
    const id = z.uuid().parse(data);
    revalidatePath("/resumes");
    revalidatePath(`/resumes/${id}`);
    return { id };
  } catch {
    return {
      error:
        "복원 완료를 확인하지 못했어요. 연결 상태와 버전 기록을 확인해 주세요.",
    };
  }
}
