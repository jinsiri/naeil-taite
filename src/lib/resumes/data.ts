import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getIdentity } from "@/lib/supabase/server";
import { resumeSchema, versionSchema, versionSummarySchema } from "./schema";

export async function requireIdentity() {
  if (!getSupabaseConfig()) redirect("/login");
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  return identity;
}

export async function getResume(id: string, version?: number) {
  if (!z.uuid().safeParse(id).success) notFound();
  const { client, user } = await requireIdentity();
  const { data, error } = await client
    .from("resumes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("이력서를 불러오지 못했어요.");
  if (!data) notFound();
  const resume = resumeSchema.parse(data);
  const [selected, history] = await Promise.all([
    client
      .from("resume_versions")
      .select("*")
      .eq("resume_id", id)
      .eq("user_id", user.id)
      .eq("version", version ?? resume.current_version)
      .maybeSingle(),
    client
      .from("resume_versions")
      .select(
        "id,resume_id,user_id,version,title,change_note,file_id,file_name,file_size,restored_from_version,created_at,approved_at",
      )
      .eq("resume_id", id)
      .eq("user_id", user.id)
      .order("version", { ascending: false }),
  ]);
  if (selected.error || history.error)
    throw new Error("버전 기록을 불러오지 못했어요.");
  if (!selected.data) notFound();
  return {
    resume,
    version: versionSchema.parse(selected.data),
    history: z.array(versionSummarySchema).parse(history.data),
  };
}
