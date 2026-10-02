import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RESUME_BUCKET,
  storedFileSchema,
  storagePath,
  fileContentType,
} from "./storage-schema";

export async function loadStoredResumeFile(
  client: SupabaseClient,
  ownerId: string,
  id: string,
) {
  const path = storagePath(ownerId, id);
  const { data, error } = await client
    .from("resume_files")
    .select("id,user_id,name,size,state")
    .eq("id", id)
    .eq("user_id", ownerId)
    .maybeSingle();
  if (error || !data) throw new Error("FILE_NOT_FOUND");
  const metadata = storedFileSchema.parse(data);
  if (!["pending", "attached"].includes(metadata.state))
    throw new Error("FILE_UNAVAILABLE");
  const result = await client.storage.from(RESUME_BUCKET).download(path);
  if (result.error || !result.data || result.data.size !== metadata.size)
    throw new Error("FILE_DOWNLOAD_FAILED");
  return {
    metadata,
    file: new File([result.data], metadata.name, {
      type: fileContentType(metadata.name),
    }),
  };
}
