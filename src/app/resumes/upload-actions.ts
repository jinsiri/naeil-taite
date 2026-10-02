"use server";

import { z } from "zod";
import { getIdentity } from "@/lib/supabase/server";
import {
  RESUME_BUCKET,
  safeFileName,
  storagePath,
  storedFileSchema,
  uploadInputSchema,
} from "@/lib/resumes/storage-schema";

export async function prepareResumeUpload(input: unknown) {
  const parsed = uploadInputSchema.safeParse(input);
  if (!parsed.success)
    return { error: "PDF·DOCX·TXT 파일을 10MB 이하로 선택해 주세요." };
  const identity = await getIdentity();
  if (!identity) return { error: "로그인한 뒤 다시 시도해 주세요." };
  const name = safeFileName(parsed.data.name);
  if (!uploadInputSchema.safeParse({ ...parsed.data, name }).success)
    return { error: "파일 이름을 확인해 주세요." };
  const { data, error } = await identity.client
    .from("resume_files")
    .insert({ user_id: identity.user.id, name, size: parsed.data.size })
    .select("id")
    .single();
  if (error || !data)
    return {
      error:
        "업로드를 준비하지 못했어요. Storage 마이그레이션과 연결 상태를 확인해 주세요.",
    };
  const id = z.uuid().parse(data.id);
  return { id, path: storagePath(identity.user.id, id) };
}

export async function listPendingResumeUploads() {
  const identity = await getIdentity();
  if (!identity) return { error: "로그인한 뒤 다시 시도해 주세요." };
  const { data, error } = await identity.client
    .from("resume_files")
    .select("id,user_id,name,size,state")
    .eq("user_id", identity.user.id)
    .in("state", ["pending", "discarded"])
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { error: "미저장 파일 목록을 불러오지 못했어요." };
  return { files: z.array(storedFileSchema).parse(data) };
}

export async function discardResumeUpload(input: unknown) {
  const parsed = z
    .object({ id: z.uuid(), approved: z.literal(true) })
    .safeParse(input);
  if (!parsed.success) return { error: "삭제할 파일과 동의를 확인해 주세요." };
  const identity = await getIdentity();
  if (!identity) return { error: "로그인한 뒤 다시 시도해 주세요." };
  // Locks the same row as save_resume. Once discarded it can never be attached.
  const { error } = await identity.client.rpc("discard_resume_upload", {
    p_file_id: parsed.data.id,
  });
  if (error)
    return {
      error: "이미 저장된 원본은 삭제할 수 없어요. 목록을 다시 확인해 주세요.",
    };
  const removed = await identity.client.storage
    .from(RESUME_BUCKET)
    .remove([storagePath(identity.user.id, parsed.data.id)]);
  if (removed.error)
    return {
      error: "파일 정리를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  const finished = await identity.client.rpc("finish_discard_resume_upload", {
    p_file_id: parsed.data.id,
  });
  if (finished.error)
    return { error: "정리 완료 상태를 확인하지 못했어요. 다시 시도해 주세요." };
  return { success: true };
}
