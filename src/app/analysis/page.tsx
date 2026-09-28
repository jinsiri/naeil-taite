import Link from "next/link";
import { GitCompareArrows } from "lucide-react";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { requireIdentity } from "@/lib/resumes/data";
import { isJobPostingsTableMissing } from "@/lib/jobs/schema";
import { JobMigrationNotice } from "@/components/jobs/job-migration-notice";

const jobSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  company: z.string(),
});

export default async function AnalysisPage() {
  if (!getSupabaseConfig())
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">매칭 분석</h1>
        <Card>
          <CardContent className="py-8 text-sm leading-6 text-muted-foreground">
            서비스 연결이 완료되면 이력서와 공고를 비교할 수 있습니다.
          </CardContent>
        </Card>
      </div>
    );
  const { client, user } = await requireIdentity();
  const { data, error } = await client
    .from("job_postings")
    .select("id,title,company")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error && isJobPostingsTableMissing(error.code))
    return <JobMigrationNotice />;
  if (error) throw new Error("비교할 공고를 불러오지 못했어요.");
  const jobs = z.array(jobSummarySchema).parse(data);

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-sm text-primary">
          근거를 확인하고 직접 판단해요
        </p>
        <h1 className="text-3xl font-bold tracking-tight">매칭 분석</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          저장한 공고를 열어 비교할 이력서 버전을 선택하세요.
        </p>
      </div>
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 px-6 text-center">
            <GitCompareArrows
              aria-hidden="true"
              className="size-9 text-primary"
            />
            <div>
              <h2 className="text-xl font-semibold">비교할 공고가 없어요</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                먼저 채용공고 원문을 저장해 주세요.
              </p>
            </div>
            <Link
              href="/jobs/new"
              className={buttonVariants({ className: "min-h-11 px-5" })}
            >
              채용공고 저장하기
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}#comparison`}
              className="rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Card className="h-full transition-colors hover:bg-secondary/40">
                <CardContent className="space-y-3 p-6">
                  <p className="text-xs font-medium text-primary">
                    {job.company || "회사명 미입력"}
                  </p>
                  <h2 className="text-lg font-semibold">{job.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    이력서 버전 선택하기 →
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        초기 대조는 원문에서 찾은 같은 단어를 기준으로 합니다. 의미가 비슷한
        표현까지 판단하지 않으며, 최종 검토는 사용자에게 있습니다.
      </p>
    </div>
  );
}
