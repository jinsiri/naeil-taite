import Link from "next/link";
import { Download, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getResume } from "@/lib/resumes/data";
import { formatResumeDate } from "@/lib/resumes/schema";
import { RestoreButton } from "./restore-button";

export async function ResumeDetail({
  id,
  selectedVersion,
}: {
  id: string;
  selectedVersion?: number;
}) {
  const { resume, version, history } = await getResume(id, selectedVersion);
  const current = resume.current_version === version.version;
  return (
    <div className="space-y-7">
      <Link href="/resumes" className="text-sm text-primary hover:underline">
        ← 이력서 목록
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-sm text-primary">
            v{version.version} · {current ? "현재 버전" : "이전 버전"}
          </p>
          <h1 className="text-3xl font-bold break-words">{version.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {formatResumeDate(version.created_at)} 저장 · 직접 입력
          </p>
        </div>
        {current ? (
          <Link
            href={`/resumes/${id}/edit`}
            className={buttonVariants({ className: "min-h-11 px-4" })}
          >
            <Pencil aria-hidden="true" />
            수정하기
          </Link>
        ) : (
          <RestoreButton
            id={id}
            version={version.version}
            currentVersion={resume.current_version}
          />
        )}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Card>
          <CardContent className="space-y-6 p-6 sm:p-8">
            {version.change_note && (
              <p className="rounded-lg bg-secondary p-4 text-sm whitespace-pre-wrap">
                변경 메모: {version.change_note}
              </p>
            )}
            <h2 className="sr-only">이력서 본문</h2>
            <div className="text-sm leading-8 break-words whitespace-pre-wrap">
              {version.content}
            </div>
            {version.file_id && (
              <div className="border-t pt-5">
                <a
                  href={`/resumes/${id}/files/${version.version}`}
                  className="inline-flex min-h-11 items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Download className="size-4 shrink-0" aria-hidden="true" />
                  <span className="break-all">
                    {version.file_name} 다운로드
                  </span>
                </a>
                <p className="text-xs text-muted-foreground">
                  이 버전에 보관된 원본 파일
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <aside aria-label="버전 기록" className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 font-semibold">
            버전 기록{" "}
            <span className="text-sm text-muted-foreground">
              {history.length}
            </span>
          </h2>
          <ol className="space-y-3">
            {history.map((item) => (
              <li key={item.id}>
                <Link
                  href={
                    item.version === resume.current_version
                      ? `/resumes/${id}`
                      : `/resumes/${id}/versions/${item.version}`
                  }
                  aria-current={
                    item.version === version.version ? "page" : undefined
                  }
                  className={`block rounded-lg border p-3 text-sm hover:bg-secondary ${item.version === version.version ? "border-primary bg-secondary" : ""}`}
                >
                  <span className="font-medium">
                    v{item.version}
                    {item.version === resume.current_version ? " · 현재" : ""}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatResumeDate(item.created_at)}
                  </p>
                  {item.change_note && (
                    <p className="mt-2 line-clamp-2 break-words">
                      {item.change_note}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
