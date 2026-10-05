"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PendingUploads } from "@/components/resumes/pending-uploads";
import { createClient } from "@/lib/supabase/client";
import { prepareResumeUpload } from "@/app/resumes/upload-actions";
import {
  RESUME_BUCKET,
  uploadInputSchema,
  fileContentType,
} from "@/lib/resumes/storage-schema";
import { confirmSubmission } from "@/app/applications/submission-actions";
import {
  seoulDate,
  type SubmittedResume,
} from "@/lib/applications/submission-schema";

const formSchema = z.object({
  kind: z.enum(["file", "text"]),
  versionKey: z.string(),
  submittedOn: z.iso
    .date()
    .refine((date) => date <= seoulDate(), "미래 날짜는 선택할 수 없어요."),
  note: z.string().trim().max(500),
  approved: z.boolean().refine(Boolean, "실제 제출한 자료인지 확인해 주세요."),
});
type Fields = z.infer<typeof formSchema>;
export type SubmissionVersionChoice = {
  resumeId: string;
  version: number;
  title: string;
};

export function SubmissionPanel({
  applicationId,
  versions,
  submissions,
}: {
  applicationId: string;
  versions: SubmissionVersionChoice[];
  submissions: SubmittedResume[];
}) {
  const router = useRouter();
  const [file, setFile] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const request = useRef<{ payload: string; id: string } | null>(null);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kind: "file",
      versionKey: "",
      submittedOn: seoulDate(),
      note: "",
      approved: false,
    },
  });
  const kind = useWatch({ control, name: "kind" });
  const versionKey = useWatch({ control, name: "versionKey" });
  const selected = versions.find(
    (v) => `${v.resumeId}:${v.version}` === versionKey,
  );
  const busy = uploading || isSubmitting;
  return (
    <Card id="submissions">
      <CardHeader>
        <CardTitle>실제 제출본</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          분석에 사용한 이력서와 실제 제출한 자료는 다를 수 있어요. 실제 제출한
          파일 또는 본문을 확인해 보관하세요. 확정해도 지원 단계는 자동 변경되지
          않습니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="space-y-4"
          onSubmit={(event) =>
            handleSubmit(async (values) => {
              if (values.kind === "file" && !file) {
                setMessage("실제 제출한 파일을 업로드해 주세요.");
                return;
              }
              if (values.kind === "text" && !selected) {
                setMessage("제출한 본문 버전을 선택해 주세요.");
                return;
              }
              if (
                !window.confirm(
                  "실제 제출한 자료와 제출일이 맞나요? 확정 기록은 수정되지 않으며, 정정할 때는 새 기록을 추가합니다.",
                )
              )
                return;
              const payload = {
                applicationId,
                submittedOn: values.submittedOn,
                kind: values.kind,
                resumeId: values.kind === "text" ? selected!.resumeId : null,
                resumeVersion:
                  values.kind === "text" ? selected!.version : null,
                fileId: values.kind === "file" ? file!.id : null,
                note: values.note,
                approved: true,
              };
              const serialized = JSON.stringify(payload);
              if (request.current?.payload !== serialized)
                request.current = {
                  payload: serialized,
                  id: crypto.randomUUID(),
                };
              setMessage("");
              try {
                const result = await confirmSubmission({
                  ...payload,
                  requestId: request.current.id,
                });
                if (result.error) {
                  setMessage(result.error);
                  return;
                }
                setMessage("제출본을 확정했어요.");
                reset();
                setFile(null);
                request.current = null;
                router.refresh();
              } catch {
                setMessage(
                  "완료를 확인하지 못했어요. 기록을 확인하거나 같은 내용으로 다시 시도해 주세요.",
                );
              }
            })(event)
          }
        >
          <fieldset disabled={busy} className="space-y-4">
            <label className="block space-y-2 text-sm font-medium">
              보관할 자료
              <select
                {...register("kind")}
                className="min-h-11 w-full rounded-lg border bg-background px-3"
              >
                <option value="file">실제 제출 파일</option>
                <option value="text">온라인 지원서에 제출한 이력서 본문</option>
              </select>
            </label>
            {kind === "file" ? (
              <div className="space-y-2">
                <label className="block space-y-2 text-sm font-medium">
                  파일 선택 (PDF·DOCX·TXT, 최대 10MB)
                  <Input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    key={file ? file.id : "empty"}
                    onChange={async (event) => {
                      const input = event.currentTarget;
                      const chosen = input.files?.[0];
                      if (!chosen) return;
                      if (
                        !uploadInputSchema.safeParse({
                          name: chosen.name,
                          size: chosen.size,
                        }).success
                      ) {
                        setMessage(
                          "PDF·DOCX·TXT 파일을 10MB 이하로 선택해 주세요.",
                        );
                        input.value = "";
                        return;
                      }
                      if (
                        !window.confirm(
                          "실제 제출 파일을 Supabase 비공개 저장소에 업로드할까요?",
                        )
                      ) {
                        input.value = "";
                        return;
                      }
                      setUploading(true);
                      setMessage("");
                      try {
                        const prepared = await prepareResumeUpload({
                          name: chosen.name,
                          size: chosen.size,
                        });
                        if (prepared.error || !prepared.id || !prepared.path)
                          throw new Error("업로드 준비 실패");
                        const result = await createClient()
                          .storage.from(RESUME_BUCKET)
                          .upload(prepared.path, chosen, {
                            contentType: fileContentType(chosen.name),
                            upsert: false,
                          });
                        if (result.error) throw new Error("업로드 실패");
                        setFile({ id: prepared.id, name: chosen.name });
                      } catch {
                        setMessage(
                          "업로드하지 못했어요. 파일을 다시 선택해 주세요.",
                        );
                        input.value = "";
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  {uploading
                    ? "업로드 중…"
                    : file
                      ? `확정할 파일: ${file.name}`
                      : "편집된 본문에서 파일을 자동 생성하지 않습니다. 실제 제출한 파일을 선택하세요."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block space-y-2 text-sm font-medium">
                  제출한 본문 버전
                  <select
                    {...register("versionKey")}
                    className="min-h-11 w-full rounded-lg border bg-background px-3"
                  >
                    <option value="">버전을 선택해 주세요</option>
                    {versions.map((v) => (
                      <option
                        key={`${v.resumeId}:${v.version}`}
                        value={`${v.resumeId}:${v.version}`}
                      >
                        {v.title} · v{v.version}
                      </option>
                    ))}
                  </select>
                </label>
                {selected && (
                  <Link
                    target="_blank"
                    href={`/resumes/${selected.resumeId}/versions/${selected.version}`}
                    className="text-sm text-primary underline"
                  >
                    확정할 본문 확인하기 (새 창)
                  </Link>
                )}
                <p className="text-xs text-muted-foreground">
                  선택한 버전의 본문만 보관하며, 첨부 원본은 제출 파일로
                  간주하지 않습니다.
                </p>
              </div>
            )}
            <label className="block space-y-2 text-sm font-medium">
              실제 제출일
              <Input
                type="date"
                max={seoulDate()}
                {...register("submittedOn")}
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              메모 (선택)
              <Textarea
                maxLength={500}
                {...register("note")}
                placeholder="예: 채용 사이트 제출, 이전 기록의 제출일 정정"
              />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                {...register("approved")}
                className="mt-1"
              />
              자료와 날짜를 확인했으며 실제 제출본으로 보관하는 데 동의합니다.
            </label>
            {Object.values(errors).map((error, index) => (
              <p key={index} role="alert" className="text-sm text-destructive">
                {error.message}
              </p>
            ))}
            <Button type="submit" disabled={busy}>
              {isSubmitting ? "확정 중…" : "제출본 확정하기"}
            </Button>
          </fieldset>
        </form>
        {message && (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        )}
        <PendingUploads activeId={file?.id} disabled={busy} />
        {!submissions.length && (
          <p className="text-sm text-muted-foreground">
            아직 확정한 제출본이 없어요.
          </p>
        )}
        <ol className="space-y-4">
          {submissions.map((item) => (
            <li key={item.id} className="space-y-2 rounded-lg border p-4">
              <p className="font-medium">
                {item.title} · {item.submitted_on} 제출
              </p>
              <p className="text-xs text-muted-foreground">
                {item.source_kind === "file" ? "실제 제출 파일" : "제출 본문"} ·{" "}
                {new Date(item.approved_at).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                })}{" "}
                확정
              </p>
              {item.note && (
                <p className="text-sm whitespace-pre-wrap">{item.note}</p>
              )}
              {item.source_kind === "file" ? (
                <a
                  href={`/applications/submissions/${item.id}/file`}
                  className="text-sm text-primary underline"
                >
                  {item.file_name} 다운로드
                </a>
              ) : (
                <details>
                  <summary className="cursor-pointer text-sm text-primary">
                    확정한 본문 보기
                  </summary>
                  <pre className="mt-3 max-h-96 overflow-auto font-sans text-sm whitespace-pre-wrap">
                    {item.content}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
