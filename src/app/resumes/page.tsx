import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireIdentity } from "@/lib/resumes/data";
import { formatResumeDate, resumeSchema } from "@/lib/resumes/schema";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { signOut } from "@/app/login/actions";

export default async function ResumesPage() {
  if (!getSupabaseConfig())
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">이력서</h1>
        <Card>
          <CardContent className="space-y-4 py-8">
            <h2 className="text-xl font-semibold">
              이력서 공간을 연결하고 있어요
            </h2>
            <p className="text-muted-foreground">
              서비스 연결이 완료되면 이력서를 등록하고 버전을 보관할 수
              있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  const { client, user } = await requireIdentity();
  const { data, error } = await client
    .from("resumes")
    .select("*,resume_versions(version,title)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error("이력서 목록을 불러오지 못했어요.");
  const resumes = z
    .array(
      resumeSchema.extend({
        resume_versions: z.array(
          z.object({ version: z.number(), title: z.string() }),
        ),
      }),
    )
    .parse(data);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-3 text-sm text-primary">나의 경험, 차곡차곡</p>
          <h1 className="text-3xl font-bold">이력서</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            이력서를 수정해도 이전 버전은 그대로 보관돼요.
          </p>
        </div>
        <div className="flex gap-2">
          <form action={signOut}>
            <Button variant="ghost" className="min-h-11" type="submit">
              로그아웃
            </Button>
          </form>
          <Link
            href="/resumes/new"
            className={buttonVariants({ className: "min-h-11 px-4" })}
          >
            <Plus aria-hidden="true" />
            이력서 등록하기
          </Link>
        </div>
      </div>
      {resumes.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-80 flex-col items-center justify-center gap-4 text-center">
            <FileText aria-hidden="true" className="size-10 text-primary" />
            <h2 className="text-xl font-semibold">
              첫 번째 이력서를 등록해 보세요
            </h2>
            <p className="text-sm text-muted-foreground">
              기존 이력서를 붙여넣거나 나의 경험을 직접 정리할 수 있어요.
            </p>
            <Link
              href="/resumes/new"
              className={buttonVariants({ className: "min-h-11 px-4" })}
            >
              이력서 등록하기
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resumes.map((resume) => (
            <Link
              key={resume.id}
              href={`/resumes/${resume.id}`}
              className="rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Card className="h-full transition-colors hover:bg-secondary/40">
                <CardContent className="space-y-4 p-6">
                  <span className="text-xs font-medium text-primary">
                    v{resume.current_version} · 현재 버전
                  </span>
                  <h2 className="text-lg font-semibold break-words">
                    {resume.resume_versions.find(
                      (v) => v.version === resume.current_version,
                    )?.title ?? "이력서"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    최근 저장 {formatResumeDate(resume.updated_at)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
