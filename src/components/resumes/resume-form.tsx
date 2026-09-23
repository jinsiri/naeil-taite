"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { resumeInputSchema, type ResumeInput } from "@/lib/resumes/schema";

export function ResumeForm({
  initial,
  onSave,
}: {
  initial?: ResumeInput;
  onSave: (values: ResumeInput, file?: File) => Promise<string | undefined>;
}) {
  const [error, setError] = useState("");
  const [file, setFile] = useState<File>();
  const [consent, setConsent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ResumeInput>({
    resolver: zodResolver(resumeInputSchema),
    defaultValues: initial ?? { title: "", content: "", changeNote: "" },
  });

  useEffect(() => {
    if (!isDirty && !file) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, file]);

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(async (values) => {
        setError("");
        if (!consent) {
          setError("저장 안내를 확인하고 동의해 주세요.");
          return;
        }
        if (
          initial &&
          !window.confirm(
            "수정 내용을 새 버전으로 저장할까요? 기존 버전은 그대로 보관됩니다.",
          )
        )
          return;
        try {
          const failure = await onSave(values, file);
          if (failure) setError(failure);
        } catch {
          setError(
            "저장하지 못했어요. 입력한 내용을 유지하고 있으니 다시 시도해 주세요.",
          );
        }
      })}
    >
      <div className="space-y-2">
        <label htmlFor="resume-title" className="text-sm font-medium">
          이력서 이름 <span className="text-muted-foreground">(필수)</span>
        </label>
        <Input
          id="resume-title"
          className="min-h-11"
          placeholder="예: 프론트엔드 개발자 이력서"
          maxLength={100}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "title-error" : undefined}
          {...register("title")}
        />
        {errors.title && (
          <p id="title-error" className="text-sm text-destructive">
            {errors.title.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <label htmlFor="resume-content" className="text-sm font-medium">
          이력서 내용 <span className="text-muted-foreground">(필수)</span>
        </label>
        <p id="content-help" className="text-sm text-muted-foreground">
          소개, 경력, 프로젝트, 기술, 학력 등을 자유롭게 입력하거나 기존 이력서
          내용을 붙여넣으세요.
        </p>
        <Textarea
          id="resume-content"
          className="min-h-80 leading-7"
          maxLength={100000}
          aria-invalid={!!errors.content}
          aria-describedby={`content-help${errors.content ? " content-error" : ""}`}
          {...register("content")}
        />
        {errors.content && (
          <p id="content-error" className="text-sm text-destructive">
            {errors.content.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <label htmlFor="resume-note" className="text-sm font-medium">
          변경 메모 <span className="text-muted-foreground">(선택)</span>
        </label>
        <Input
          id="resume-note"
          className="min-h-11"
          placeholder="예: 최근 프로젝트 경험 추가"
          maxLength={500}
          aria-invalid={!!errors.changeNote}
          aria-describedby={errors.changeNote ? "note-error" : undefined}
          {...register("changeNote")}
        />
        {errors.changeNote && (
          <p id="note-error" className="text-sm text-destructive">
            {errors.changeNote.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <label htmlFor="resume-file" className="text-sm font-medium">
          원본 파일 첨부 (선택)
        </label>
        <input
          id="resume-file"
          type="file"
          accept=".pdf,.docx,.txt"
          className="block w-full rounded-lg border p-3 text-sm"
          aria-describedby="file-help"
          onChange={(event) => setFile(event.target.files?.[0])}
        />
        <p id="file-help" className="text-xs leading-6 text-muted-foreground">
          PDF·DOCX·TXT, 최대 10MB. 파일은 서버 로컬 디스크에 보관하며 본문을
          자동 추출하지 않습니다. 수정 시 새 파일을 선택하지 않으면 기존 첨부를
          유지합니다.
        </p>
      </div>
      <label className="flex items-start gap-3 rounded-lg border bg-secondary/40 p-4 text-sm leading-6">
        <input
          type="checkbox"
          className="mt-1 size-4 shrink-0"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        이력서 이름·본문·변경 메모·첨부 파일 정보가 Supabase에 저장되는 것에
        동의합니다. 파일 자체는 서버 로컬에 저장됩니다.
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          disabled={isSubmitting || (!!initial && !isDirty && !file)}
          className="min-h-11 px-5"
        >
          {isSubmitting
            ? "저장 중…"
            : initial
              ? "새 버전으로 저장하기"
              : "이력서 등록하기"}
        </Button>
        <p className="text-xs text-muted-foreground">
          저장한 버전은 이후에 수정해도 유지돼요.
        </p>
      </div>
    </form>
  );
}
