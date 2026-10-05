"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteJobPosting } from "@/app/jobs/actions";
import { Button } from "@/components/ui/button";

export function DeleteJobButton({
  jobId,
  jobTitle,
}: {
  jobId: string;
  jobTitle: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function removeJob() {
    if (
      !window.confirm(
        `“${jobTitle}” 공고를 삭제할까요? 연결된 AI 평가, 지원 이력과 제출본 기록도 함께 삭제되며 되돌릴 수 없습니다.`,
      )
    )
      return;

    setError("");
    startTransition(async () => {
      const result = await deleteJobPosting(jobId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/jobs");
    });
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="destructive"
        onClick={removeJob}
        disabled={pending}
      >
        <Trash2 aria-hidden="true" />
        {pending ? "삭제 중…" : "공고 삭제"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
