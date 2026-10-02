"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  discardResumeUpload,
  listPendingResumeUploads,
} from "@/app/resumes/upload-actions";
import type { StoredResumeFile } from "@/lib/resumes/storage-schema";

export function PendingUploads({
  activeId,
  disabled,
}: {
  activeId?: string;
  disabled: boolean;
}) {
  const [files, setFiles] = useState<StoredResumeFile[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2 text-sm">
      <Button
        type="button"
        variant="outline"
        disabled={busy || disabled}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await listPendingResumeUploads();
            setFiles(result.files ?? []);
            setMessage(
              result.error ??
                (result.files?.length
                  ? "사용하지 않는 미저장 파일만 삭제해 주세요. 최대 100개씩 표시됩니다."
                  : "미저장 파일이 없습니다."),
            );
          } catch {
            setMessage("목록을 불러오지 못했어요. 다시 시도해 주세요.");
          } finally {
            setBusy(false);
          }
        }}
      >
        미저장 업로드 정리하기
      </Button>
      {message && <p role="status">{message}</p>}
      {files.map((file) => (
        <div key={file.id} className="flex items-center justify-between gap-3">
          <span className="break-all">
            {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
            {file.id === activeId ? " · 현재 선택한 파일" : ""}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={busy || disabled || file.id === activeId}
            onClick={async () => {
              if (
                !window.confirm(
                  "이 미저장 원본을 영구 삭제할까요? 다른 창에서 작성 중인 파일인지 확인해 주세요.",
                )
              )
                return;
              setBusy(true);
              try {
                const result = await discardResumeUpload({
                  id: file.id,
                  approved: true,
                });
                setMessage(result.error ?? "미저장 파일을 삭제했어요.");
                if (result.success)
                  setFiles((current) =>
                    current.filter((item) => item.id !== file.id),
                  );
              } catch {
                setMessage(
                  "삭제 완료를 확인하지 못했어요. 다시 시도해 주세요.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            삭제
          </Button>
        </div>
      ))}
    </div>
  );
}
