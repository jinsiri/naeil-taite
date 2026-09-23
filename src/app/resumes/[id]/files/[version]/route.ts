import { z } from "zod";
import { getIdentity } from "@/lib/supabase/server";
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
      "로컬 첨부 파일을 찾을 수 없어요. 저장 서버와 백업을 확인해 주세요.",
      { status: 404 },
    );
  }
}
