import { z } from "zod";
import { getIdentity } from "@/lib/supabase/server";
import { RESUME_BUCKET, storagePath } from "@/lib/resumes/storage-schema";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/applications/submissions/[id]/file">,
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return new Response(null, { status: 404 });
  const identity = await getIdentity();
  if (!identity) return new Response(null, { status: 401 });
  const { data, error } = await identity.client
    .from("submitted_resumes")
    .select("file_id,file_name")
    .eq("id", id)
    .eq("user_id", identity.user.id)
    .single();
  if (error || !data?.file_id) return new Response(null, { status: 404 });
  const signed = await identity.client.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(storagePath(identity.user.id, data.file_id), 60, {
      download: data.file_name || "resume",
    });
  if (signed.error || !signed.data)
    return new Response("파일을 불러오지 못했어요.", { status: 503 });
  return new Response(null, {
    status: 303,
    headers: {
      Location: signed.data.signedUrl,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
