import Link from "next/link";
import { BriefcaseBusiness, Plus } from "lucide-react";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { requireIdentity } from "@/lib/resumes/data";
import { isJobPostingsTableMissing, jobPostingSchema } from "@/lib/jobs/schema";
import { JobMigrationNotice } from "@/components/jobs/job-migration-notice";

export default async function JobsPage() {
  if (!getSupabaseConfig())
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">채용공고</h1>
        <Card>
          <CardContent className="space-y-3 py-8">
            <h2 className="text-xl font-semibold">
              서비스 연결을 기다리고 있어요
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Supabase 연결이 완료되면 공고를 저장하고 이력서 버전과 비교할 수
              있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );

  const { client, user } = await requireIdentity();
  const { data, error } = await client
    .from("job_postings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error && isJobPostingsTableMissing(error.code))
    return <JobMigrationNotice />;
  if (error) throw new Error("채용공고를 불러오지 못했어요.");
  const jobs = z.array(jobPostingSchema).parse(data ?? []);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-3 text-sm text-primary">기회를 모으고 비교해요</p>
          <h1 className="text-3xl font-bold tracking-tight">채용공고</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            공고 원문을 보관하고 이력서 버전별로 근거를 확인하세요.
          </p>
        </div>
        <Link
          href="/jobs/new"
          className={buttonVariants({ className: "min-h-11 px-4" })}
        >
          <Plus aria-hidden="true" /> 공고 저장하기
        </Link>
      </div>
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 px-6 text-center">
            <BriefcaseBusiness
              aria-hidden="true"
              className="size-9 text-primary"
            />
            <div>
              <h2 className="text-xl font-semibold">저장한 공고가 없어요</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                관심 있는 공고를 붙여넣어 원문을 보관해 보세요.
              </p>
            </div>
            <Link
              href="/jobs/new"
              className={buttonVariants({
                variant: "outline",
                className: "min-h-11 px-5",
              })}
            >
              첫 공고 저장하기
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Card className="h-full transition-colors hover:bg-secondary/40">
                <CardContent className="space-y-4 p-6">
                  <p className="text-xs font-medium text-primary">
                    {job.company || "회사명 미입력"}
                  </p>
                  <h2 className="text-lg font-semibold break-words">
                    {job.title}
                  </h2>
                  <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {job.original_text}
                  </p>
                  {job.deadline && (
                    <p className="text-xs text-muted-foreground">
                      마감일 {job.deadline}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
