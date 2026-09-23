"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authenticate } from "./actions";

const schema = z.object({
  email: z.email("이메일 형식을 확인해 주세요.").max(254),
  password: z.string().min(8, "비밀번호는 8자 이상 입력해 주세요.").max(128),
});

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit((values) => {
        setMessage("");
        startTransition(async () => {
          try {
            const result = await authenticate({ ...values, mode });
            setMessage(result.error ?? result.message ?? "");
          } catch (error) {
            unstable_rethrow(error);
            setMessage("연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
          }
        });
      })}
    >
      <div className="space-y-2">
        <label htmlFor="email">이메일</label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          className="min-h-11"
          {...register("email")}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p role="alert" className="text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <label htmlFor="password">비밀번호</label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="min-h-11"
          {...register("password")}
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <p role="alert" className="text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        계속하면 이메일과 비밀번호를 인증 서비스인 Supabase에 전송합니다.
      </p>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <Button
        className="min-h-11 w-full"
        type="submit"
        disabled={isSubmitting || isPending}
      >
        {isSubmitting || isPending
          ? "처리 중…"
          : mode === "login"
            ? "로그인하기"
            : "가입하기"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="min-h-11 w-full"
        disabled={isSubmitting || isPending}
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setMessage("");
        }}
      >
        {mode === "login"
          ? "처음이신가요? 이메일로 가입하기"
          : "이미 계정이 있어요. 로그인하기"}
      </Button>
    </form>
  );
}
