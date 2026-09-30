import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, PanelsTopLeft } from "lucide-react";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { requireIdentity } from "@/lib/resumes/data";
import { JobMigrationNotice } from "@/components/jobs/job-migration-notice";
import { PipelineStageControl } from "@/components/jobs/pipeline-stage-control";
import { reviewSnapshotSchema } from "@/lib/jobs/review-schema";

const jobSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  company: z.string(),
  deadline: z.iso.date().nullable(),
});

const inPreparation = ["검토중", "지원준비"];
const inProgress = ["지원완료", "서류통과", "1차면접", "2차면접", "처우협의"];
const completed = ["서류탈락", "최종합격", "최종탈락"];

export default async function ApplicationsPage() {
  if (!getSupabaseConfig())
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">지원 현황</h1>
        <Card>
          <CardContent className="space-y-3 py-8">
            <h2 className="text-xl font-semibold">
              서비스 연결을 기다리고 있어요
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              연결이 완료되면 공고별 지원 단계와 평가 기록을 확인할 수 있습니다.
            </p>
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
  const reviews = [...latestByJob.values()]
    .filter((review) => byId.has(review.job_posting_id))
    .sort((a, b) => b.priority_score - a.priority_score);
  const countFor = (stages: string[]) =>
    reviews.filter((review) => stages.includes(review.pipeline_stage)).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-sm text-primary">지원 과정을 차곡차곡</p>
        <h1 className="text-3xl font-bold tracking-tight">지원 현황</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          공고별 지원 단계와 기회 우선순위를 한눈에 살펴보세요.
        </p>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 px-6 text-center">
            <PanelsTopLeft aria-hidden="true" className="size-9 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">아직 지원 기록이 없어요</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                공고 상세에서 이력서 버전을 비교하고 평가를 기록하면 여기에
                모입니다.
              </p>
            </div>
            <Link
              href="/jobs"
              className={buttonVariants({
                variant: "outline",
                className: "min-h-11 px-5",
              })}
            >
              채용공고 둘러보기 <ArrowRight aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "검토·준비", count: countFor(inPreparation) },
              { label: "지원·전형 진행", count: countFor(inProgress) },
              { label: "전형 결과", count: countFor(completed) },
            ].map((summary) => (
              <Card key={summary.label}>
                <CardContent className="flex items-center justify-between p-5">
                  <span className="text-sm text-muted-foreground">
                    {summary.label}
                  </span>
                  <span className="text-2xl font-semibold tabular-nums">
                    {summary.count}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">내 공고</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  우선순위가 높은 순서로 표시합니다.
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                총 {reviews.length}건
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reviews.map((review) => {
                const job = byId.get(review.job_posting_id);
                if (!job) return null;
                return (
                  <Card
                    key={review.id}
                    className="h-full transition-colors hover:bg-secondary/40"
                  >
                    <CardContent className="space-y-4 p-6">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-primary">
                          {job.company || "회사명 미입력"}
                        </span>
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                          {review.pipeline_stage}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold break-words">
                        <Link
                          href={`/jobs/${job.id}?resume=${review.resume_id}:${review.resume_version}#review`}
                          className="rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          {job.title}
                        </Link>
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>{review.category}</span>
                        <span>우선순위 {review.priority_score}</span>
                        <span>기회 {review.opportunity_score}점</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {job.deadline
                          ? `마감일 ${job.deadline} · `
                          : "마감일 미정 · "}
                        예상 통과 가능성 {review.pass_estimate}%
                      </p>
                      <Link
                        href={`/jobs/${job.id}?resume=${review.resume_id}:${review.resume_version}#review`}
                        className={buttonVariants({
                          variant: "outline",
                          className: "min-h-10 w-full",
                        })}
                      >
                        공고 상세 바로가기 <ArrowRight aria-hidden="true" />
                      </Link>
                      <PipelineStageControl
                        jobId={job.id}
                        resumeId={review.resume_id}
                        resumeVersion={review.resume_version}
                        currentStage={review.pipeline_stage}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </>
      )}
      {reviews.length > 0 && (
        <Link
          href="/jobs"
          className={buttonVariants({
            variant: "outline",
            className: "min-h-11",
          })}
        >
          <BriefcaseBusiness aria-hidden="true" /> 채용공고 보기
        </Link>
      )}
    </div>
  );
}
