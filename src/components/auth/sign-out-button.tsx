"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/login/actions";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="relative shrink-0">
      <Button
        variant="ghost"
        className="min-h-11 gap-2"
        disabled={isPending}
        onClick={() => {
          setError("");
          startTransition(async () => {
            try {
              await signOut();
            } catch (error) {
              unstable_rethrow(error);
              setError("로그아웃하지 못했어요. 다시 시도해 주세요.");
            }
          });
        }}
      >
        <LogOut className="size-4" aria-hidden="true" />
        {isPending ? "로그아웃 중…" : "로그아웃"}
      </Button>
      {error && (
        <p
          role="alert"
          className="absolute top-full right-0 z-20 w-60 rounded-lg border bg-card p-3 text-sm text-destructive shadow-sm"
        >
          {error}
        </p>
      )}
    </div>
  );
}
