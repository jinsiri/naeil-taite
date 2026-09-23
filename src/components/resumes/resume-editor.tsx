"use client";

import { useRouter } from "next/navigation";
import { ResumeForm } from "./resume-form";
import { saveResume } from "@/app/resumes/actions";
import type { ResumeVersion } from "@/lib/resumes/schema";

export function ResumeEditor({ version }: { version?: ResumeVersion }) {
  const router = useRouter();
  return (
    <ResumeForm
      initial={
        version
          ? { title: version.title, content: version.content, changeNote: "" }
          : undefined
      }
      onSave={async (values, file) => {
        const payload = new FormData();
        Object.entries(values).forEach(([key, value]) =>
          payload.set(key, value),
        );
        payload.set("id", version?.resume_id ?? "");
        payload.set("expectedVersion", String(version?.version ?? 0));
        payload.set("approved", "true");
        if (file) {
          if (file.size > 10 * 1024 * 1024)
            return "첨부 파일은 10MB 이하로 선택해 주세요.";
          payload.set("file", file);
        }
        const result = await saveResume(payload);
        if (result.error) return result.error;
        router.push(`/resumes/${result.id}`);
        router.refresh();
      }}
    />
  );
}
