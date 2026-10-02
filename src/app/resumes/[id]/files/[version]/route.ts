import { z } from "zod";
import { getIdentity } from "@/lib/supabase/server";
import { RESUME_BUCKET, storagePath } from "@/lib/resumes/storage-schema";
import { readAttachment } from "@/lib/resumes/files";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/resumes/[id]/files/[version]">,
) {
  const { id, version } = await params;
  if (
    !z.uuid().safeParse(id).success ||
    !/^\d+$/.test(version) ||
    !Number.isSafeInteger(Number(version))
  )
    return new Response(null, { status: 404 });
  const identity = await getIdentity();
  if (!identity) return new Response(null, { status: 401 });
  const { data, error } = await identity.client
    .from("resume_versions")
    .select("file_id,file_name")
    .eq("resume_id", id)
    .eq("version", Number(version))
    .eq("user_id", identity.user.id)
    .maybeSingle();
  if (error)
    return new Response("파일 정보를 불러오지 못했어요.", { status: 503 });
  if (!data?.file_id) return new Response(null, { status: 404 });
  const { data: file, error: fileError } = await identity.client
    .from("resume_files")
    .select("state")
    .eq("id", data.file_id)
    .eq("user_id", identity.user.id)
    .maybeSingle();
  if (fileError)
    return new Response("파일 정보를 확인하지 못했어요.", { status: 503 });
  if (file?.state === "attached") {
    const signed = await identity.client.storage
      .from(RESUME_BUCKET)
      .createSignedUrl(storagePath(identity.user.id, data.file_id), 60, {
        download: data.file_name || "resume",
      });
    if (signed.error || !signed.data)
      return new Response("원본 파일을 찾을 수 없거나 연결에 실패했어요.", {
        status: 404,
      });
    return new Response(null, {
      status: 303,
      headers: {
        Location: signed.data.signedUrl,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  }
  // Transitional support for originals that have not been migrated yet.
  try {
    const bytes = await readAttachment(
      identity.user.id,
      z.uuid().parse(data.file_id),
    );
    const name = encodeURIComponent(z.string().parse(data.file_name)).replace(
      /['()*]/g,
      (char) => `%${char.charCodeAt(0).toString(16)}`,
    );
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="resume"; filename*=UTF-8''${name}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(
      "이 원본은 이전 서버에 보관되어 있어요. 관리자가 기존 파일을 Storage로 이전해야 합니다.",
      { status: 404 },
    );
  }
}
