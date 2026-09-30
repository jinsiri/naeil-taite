"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveJobPosting } from "@/app/jobs/actions";

export function JobForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setIsSaving(true);
        const form = new FormData(event.currentTarget);
        try {
          const result = await saveJobPosting(form);
          if (result.error || !result.id) {
            setError(result.error ?? "공고를 저장하지 못했어요.");
            return;
          }
          router.push(`/jobs/${result.id}`);
          router.refresh();
        } catch {
          setError(
            "공고를 저장하지 못했어요. 입력 내용을 유지하고 있으니 다시 시도해 주세요.",
          );
        } finally {
          setIsSaving(false);
        }
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          직무명 <span className="text-muted-foreground">(필수)</span>
          <Input
            name="title"
            required
            maxLength={120}
            placeholder="예: 프론트엔드 개발자"
            className="min-h-11"
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          회사명 <span className="text-muted-foreground">(선택)</span>
          <Input
            name="company"
            maxLength={120}
            placeholder="예: 내일나이테"
            className="min-h-11"
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          공고 링크 <span className="text-muted-foreground">(선택)</span>
          <Input
            name="sourceUrl"
            type="url"
            placeholder="https://"
            maxLength={2000}
            className="min-h-11"
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          지원 마감일 <span className="text-muted-foreground">(선택)</span>
          <Input name="deadline" type="date" className="min-h-11" />
        </label>
        <label className="space-y-2 text-sm font-medium sm:col-span-2">
          근무지 주소{" "}
          <span className="text-muted-foreground">
            (대중교통 평가를 원할 때)
          </span>
          <Input
            name="workLocation"
            maxLength={160}
            placeholder="예: 서울시 강남구 테헤란로 123, 내일타워 8층"
            className="min-h-11"
          />
        </label>
      </div>
      <label
        className="block space-y-2 text-sm font-medium"
        htmlFor="job-original-text"
      >
        채용공고 원문 <span className="text-muted-foreground">(필수)</span>
        <Textarea
          id="job-original-text"
          name="originalText"
          required
          minLength={20}
          maxLength={50000}
          className="min-h-80 leading-7"
          placeholder="채용공고 내용을 복사해 붙여넣으세요. 줄바꿈과 원문을 그대로 보관합니다."
        />
      </label>
      <p className="text-xs leading-5 text-muted-foreground">
        원문은 이력서 버전과 비교할 때 기준 자료로 사용됩니다. 저장 후에도
        원문을 그대로 보관합니다.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isSaving} className="min-h-11 px-5">
        {isSaving ? "저장 중…" : "공고 저장하기"}
      </Button>
    </form>
  );
}
