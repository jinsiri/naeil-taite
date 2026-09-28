"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { resumeInputSchema, type ResumeInput } from "@/lib/resumes/schema";
import { extractResumeContent } from "@/app/resumes/actions";

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
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ResumeInput>({
    resolver: zodResolver(resumeInputSchema),
    defaultValues: initial ?? { title: "", content: "", changeNote: "" },
  });

  useEffect(() => {
    if (!isDirty && !file && !isExtracting) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, file, isExtracting]);

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
      <section className="space-y-3 rounded-xl border bg-secondary/30 p-5">
        <div>
          <h2 className="font-semibold">파일에서 이력서 내용 가져오기</h2>
          <p
            id="file-help"
            className="mt-1 text-sm leading-6 text-muted-foreground"
          >
            PDF·DOCX·TXT 파일을 올리면 내용을 추출합니다. 추출한 내용은 아래에서
            직접 수정한 뒤 저장할 수 있어요.
          </p>
        </div>
        <label
          htmlFor="resume-file"
          className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-background px-4 py-5 text-center transition-colors focus-within:border-primary hover:border-primary"
        >
          <span className="font-medium">
            {selectedFileName || "이력서 파일 선택하기"}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            PDF · DOCX · TXT, 최대 10MB
          </span>
          <input
            id="resume-file"
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            aria-describedby="file-help"
            disabled={isExtracting || isSubmitting}
            onChange={async (event) => {
              const input = event.currentTarget;
              const selected = input.files?.[0];
              if (!selected) return;
              if (
                getValues("content").trim() &&
                !window.confirm(
                  "파일에서 추출한 내용으로 현재 본문을 바꿀까요? 지금 본문은 바꾸지 않고 취소할 수 있습니다.",
                )
              ) {
                input.value = "";
                return;
              }
              setIsExtracting(true);
              setFile(undefined);
              setSelectedFileName(selected.name);
              setExtractionMessage("파일을 읽고 있어요. 잠시만 기다려 주세요.");
              setError("");
              const payload = new FormData();
              payload.set("file", selected);
              try {
                const result = await extractResumeContent(payload);
                if (result.error || result.text === undefined) {
                  setExtractionMessage("");
                  setSelectedFileName("");
                  setError(
                    result.error ?? "파일에서 텍스트를 가져오지 못했어요.",
                  );
                  input.value = "";
                  return;
                }
                const title = selected.name
                  .replace(/\.[^.]+$/, "")
                  .slice(0, 100);
                if (!getValues("title").trim())
                  setValue("title", title, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                setValue("content", result.text, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setFile(selected);
                setExtractionMessage(
                  result.warning
                    ? "일부 저장할 수 없는 숨은 문자를 바꿨어요. 아래 내용을 확인하고 수정해 주세요."
                    : "추출했어요. 아래 내용은 자유롭게 수정할 수 있습니다.",
                );
              } catch {
                setExtractionMessage("");
                setSelectedFileName("");
                setError(
                  "파일을 읽지 못했어요. 파일 형식과 연결 상태를 확인해 주세요.",
                );
                input.value = "";
              } finally {
                setIsExtracting(false);
              }
            }}
          />
        </label>
        {extractionMessage && (
          <p role="status" aria-live="polite" className="text-sm text-primary">
            {extractionMessage}
          </p>
        )}
        <p className="text-xs leading-5 text-muted-foreground">
          스캔 PDF는 글자를 추출할 수 없습니다. 선택한 파일은 저장할 때 원본으로
          함께 보관됩니다.
        </p>
      </section>
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
      <label className="flex items-start gap-3 rounded-lg border bg-secondary/40 p-4 text-sm leading-6">
        <input
          type="checkbox"
          className="mt-1 size-4 shrink-0"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        이력서 이름·본문·변경 메모·첨부 파일 정보가 Supabase에 저장되는 것에
        동의합니다. 파일 자체는 로컬(기기)에 저장됩니다.
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          disabled={
            isSubmitting || isExtracting || (!!initial && !isDirty && !file)
          }
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
