import Link from "next/link";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { requireIdentity } from "@/lib/resumes/data";
import { JobMigrationNotice } from "@/components/jobs/job-migration-notice";
import { reviewSnapshotSchema } from "@/lib/jobs/review-schema";

const jobSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  company: z.string(),
  deadline: z.iso.date().nullable(),
});
const groups = [
  "검토중",
  "지원준비",
  "지원완료",
  "서류통과",
  "1차면접",
  "2차면접",
  "처우협의",
  "서류탈락",
  "최종합격",
  "최종탈락",
] as const;

export default async function ApplicationsPage() {
  if (!getSupabaseConfig())
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">지원 현황</h1>
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            서비스 연결 후 공고별 지원 단계를 기록할 수 있습니다.
          </CardContent>
        </Card>
      </div>
    );
  const { client, user } = await requireIdentity();
  const { data, error } = await client
    .from("job_reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error && (error.code === "42P01" || error.code === "PGRST205"))
    return (
      <JobMigrationNotice
        migrationFile="202609280002_job_reviews.sql"
        feature="지원 현황"
      />
    );
  if (error) throw new Error("지원 이력을 불러오지 못했어요.");
  const snapshots = z.array(reviewSnapshotSchema).parse(data);
  const latestByJob = new Map<string, (typeof snapshots)[number]>();
  for (const item of snapshots)
    if (!latestByJob.has(item.job_posting_id))
      latestByJob.set(item.job_posting_id, item);
  const ids = [...latestByJob.keys()];
  const { data: jobsData, error: jobsError } = ids.length
    ? await client
        .from("job_postings")
        .select("id,title,company,deadline")
        .in("id", ids)
        .eq("user_id", user.id)
    : { data: [], error: null };
  if (jobsError) throw new Error("채용공고를 불러오지 못했어요.");
  const jobs = z.array(jobSchema).parse(jobsData);
  const byId = new Map(jobs.map((job) => [job.id, job]));
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-sm text-primary">
          저장한 평가를 바탕으로 정리해요
        </p>
        <h1 className="text-3xl font-bold tracking-tight">지원 현황</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          단계는 공고 상세 화면의 평가에서 바꿀 수 있습니다.
        </p>
      </div>
      {latestByJob.size > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">기회 우선순위</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              평가한 공고의 최신 점수와 다음 지원 단계를 함께 확인하세요.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[...latestByJob.values()]
              .sort((a, b) => b.priority_score - a.priority_score)
              .map((review) => {
                const job = byId.get(review.job_posting_id);
                if (!job) return null;
                return (
                  <Link
                    key={review.id}
                    href={`/jobs/${job.id}?resume=${review.resume_id}:${review.resume_version}#review`}
                    className="rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <Card className="h-full transition-colors hover:bg-secondary/40">
                      <CardContent className="space-y-2 p-5">
                        <p className="text-xs font-medium text-primary">
                          {review.category} · 우선순위 {review.priority_score}점
                        </p>
                        <h3 className="font-semibold">{job.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {review.pipeline_stage} · 기회{" "}
                          {review.opportunity_score}점 · 통과{" "}
                          {review.pass_estimate}%
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
          </div>
        </section>
      )}
      {groups.map((stage) => {
        const items = [...latestByJob.values()].filter(
          (review) => review.pipeline_stage === stage,
        );
        return (
          <section key={stage} className="space-y-3">
            <h2 className="text-xl font-semibold">
              {stage}{" "}
              <span className="text-sm text-muted-foreground">
                {items.length}
              </span>
            </h2>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                등록된 공고가 없습니다.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((review) => {
                  const job = byId.get(review.job_posting_id);
                  return job ? (
                    <Link
                      key={review.id}
                      href={`/jobs/${job.id}?resume=${review.resume_id}:${review.resume_version}#review`}
                    >
                      <Card className="transition-colors hover:bg-secondary/40">
                        <CardContent className="space-y-2 p-5">
                          <p className="text-xs text-primary">
                            {job.company || "회사명 미입력"} · {review.category}{" "}
                            · 우선순위 {review.priority_score}
                          </p>
                          <h3 className="font-semibold">{job.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            기회 점수 {review.opportunity_score} · 통과 가능성{" "}
                            {review.pass_estimate}%
                            {job.deadline ? ` · 마감 ${job.deadline}` : ""}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ) : null;
                })}
              </div>
            )}
          </section>
        );
      })}
      <Link href="/jobs" className={buttonVariants({ variant: "outline" })}>
        채용공고 보기
      </Link>
    </div>
  );
}
