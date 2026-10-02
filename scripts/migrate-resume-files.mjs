// Run locally, never in the browser. Defaults to a read-only inventory.
import { createClient } from "@supabase/supabase-js";
import { copyResumeOriginal } from "./lib/copy-resume-original.mjs";
import { readFile } from "node:fs/promises";
import { attachmentPath } from "../src/lib/resumes/files.ts";
import {
  RESUME_BUCKET,
  fileContentType,
  storagePath,
  storedFileSchema,
} from "../src/lib/resumes/storage-schema.ts";

const apply = process.argv.includes("--apply");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL와 로컬 전용 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.",
  );
  process.exit(1);
}
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let offset = 0;
let verified = 0;
let missing = 0;
let failed = 0;
// Do not log file names, paths, IDs, credentials, or provider errors.
for (;;) {
  const { data, error } = await client
    .from("resume_files")
    .select("id,user_id,name,size,state")
    .eq("state", "legacy")
    .order("id")
    .range(offset, offset + 99);
  if (error) {
    console.error(
      "목록 조회 실패. 마이그레이션 적용과 연결 설정을 확인하세요.",
    );
    process.exit(1);
  }
  if (!data.length) break;
  let transitioned = 0;
  for (const row of data) {
    let local;
    try {
      const file = storedFileSchema.parse(row);
      try {
        local = await readFile(attachmentPath(file.user_id, file.id));
      } catch (error) {
        if (error.code === "ENOENT") {
          missing++;
          continue;
        }
        throw error;
      }
      if (local.length !== file.size) throw new Error("SIZE_MISMATCH");
      if (apply) {
        const path = storagePath(file.user_id, file.id);
        await copyResumeOriginal(
          client.storage.from(RESUME_BUCKET),
          path,
          local,
          fileContentType(file.name),
        );
        const update = await client
          .from("resume_files")
          .update({ state: "attached" })
          .eq("id", file.id)
          .eq("state", "legacy");
        if (update.error) throw new Error("UPDATE_FAILED");
        transitioned++;
      }
      verified++;
    } catch {
      failed++;
    }
  }
  // Successfully migrated rows leave the filtered set; failed/missing rows remain.
  offset += data.length - transitioned;
}
console.log(
  `${apply ? "이전" : "사전 확인"}: 성공 ${verified}, 로컬 원본 없음 ${missing}, 실패 ${failed}. 로컬 파일은 삭제하지 않았습니다.`,
);
if (missing || failed) process.exitCode = 1;
