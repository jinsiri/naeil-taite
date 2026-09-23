"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { restoreResume } from "@/app/resumes/actions";

export function RestoreButton({
  id,
  version,
  currentVersion,
}: {
  id: string;
  version: number;
  currentVersion: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <div>
      <Button
        variant="outline"
        className="min-h-11"
        disabled={busy}
        onClick={async () => {
          if (
            !window.confirm(
              `v${version}의 이름, 본문, 첨부 파일로 복원할까요? 현재 버전은 유지되고 새 버전으로 저장됩니다.`,
            )
          )
            return;
          setBusy(true);
          setError("");
          try {
            const result = await restoreResume({
              id,
              version,
              expectedVersion: currentVersion,
              approved: true,
            });
            if (result.error) setError(result.error);
            else {
              router.push(`/resumes/${id}`);
              router.refresh();
            }
          } catch {
            setError("복원하지 못했어요. 잠시 후 다시 시도해 주세요.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "복원 중…" : "이 버전으로 복원하기"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
