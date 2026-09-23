"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateNickname, readNickname } from "@/lib/auth/nickname";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
  mode: z.enum(["login", "signup"]),
});

export async function authenticate(
  input: unknown,
): Promise<{ error?: string; message?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { error: "이메일과 8자 이상의 비밀번호를 확인해 주세요." };
  const client = await createClient();
  const { email, password, mode } = parsed.data;
  if (mode === "signup") {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { nickname: generateNickname() } },
    });
    if (error)
      return {
        error:
          "가입 요청을 처리하지 못했어요. 입력 내용과 잠시 후 재시도를 확인해 주세요.",
      };
    if (!data.session)
      return {
        message:
          "인증 메일을 확인한 뒤 로그인해 주세요. 이미 가입했다면 로그인해 주세요.",
      };
  } else {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user)
      return {
        error:
          "로그인하지 못했어요. 이메일, 비밀번호, 메일 인증 여부를 확인해 주세요.",
      };
    if (!readNickname(data.user.user_metadata)) {
      const nickname = generateNickname();
      const { error: nicknameError } = await client.auth.updateUser({
        data: { ...data.user.user_metadata, nickname },
      });
      if (nicknameError)
        return {
          error:
            "로그인했지만 닉네임을 저장하지 못했어요. 한 번 더 로그인해 주세요.",
        };
    }
  }
  revalidatePath("/", "layout");
  redirect("/resumes");
}

export async function signOut() {
  const client = await createClient();
  const { error } = await client.auth.signOut();
  if (error) throw new Error("로그아웃하지 못했어요. 다시 시도해 주세요.");
  revalidatePath("/", "layout");
  redirect("/login");
}
