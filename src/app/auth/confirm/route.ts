import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (tokenHash && type === "email") {
    const client = await createClient();
    const { error } = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });
    if (!error) return NextResponse.redirect(new URL("/resumes", request.url));
  }
  return NextResponse.redirect(new URL("/login", request.url));
}
