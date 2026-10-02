import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  ChartNoAxesCombined,
  ClipboardCheck,
  PanelsTopLeft,
} from "lucide-react";
import { z } from "zod";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { requireIdentity } from "@/lib/resumes/data";
import { reviewSnapshotSchema } from "@/lib/jobs/review-schema";

const jobSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  company: z.string(),
  deadline: z.iso.date().nullable(),
  created_at: z.iso.datetime({ offset: true }),
});

const inPreparation = ["검토중", "지원준비"];
const inProgress = ["지원완료", "서류통과", "1차면접", "2차면접", "처우협의"];
const completed = ["서류탈락", "최종합격", "최종탈락"];

function seoulToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysUntil(date: string, today: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  return Math.round(
    (Date.UTC(year, month - 1, day) -
      Date.UTC(todayYear, todayMonth - 1, todayDay)) /
      86_400_000,
  );
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: typeof BriefcaseBusiness;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

export default async function Home() {
  if (!getSupabaseConfig())
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
        <Card>
          <CardContent className="space-y-3 py-8">
            <h2 className="text-xl font-semibold">
              서비스 연결을 기다리고 있어요
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Supabase 연결이 완료되면 저장한 공고와 지원 현황 통계를
              보여드릴게요.
            </p>
          </CardContent>
        </Card>
      </div>
    );

  const { client, user } = await requireIdentity();
  const [jobsResult, reviewsResult] = await Promise.all([
    client
      .from("job_postings")
      .select("id,title,company,deadline,created_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500),
    client
      .from("job_reviews")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (
    jobsResult.error &&
    (jobsResult.error.code === "42P01" || jobsResult.error.code === "PGRST205")
  )
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
        <Card>
          <CardContent className="space-y-3 py-8">
            <h2 className="text-xl font-semibold">
              공고 데이터를 준비하고 있어요
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Supabase에 202609280001_job_postings.sql 마이그레이션을 적용하면
              대시보드 통계를 확인할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  if (jobsResult.error)
    throw new Error("대시보드 공고 정보를 불러오지 못했어요.");

  const jobs = z.array(jobSchema).parse(jobsResult.data ?? []);
  const reviewTableReady = !reviewsResult.error;
  if (
    reviewsResult.error &&
    reviewsResult.error.code !== "42P01" &&
    reviewsResult.error.code !== "PGRST205"
  )
    throw new Error("대시보드 지원 정보를 불러오지 못했어요.");

  const snapshots = reviewTableReady
    ? z.array(reviewSnapshotSchema).parse(reviewsResult.data ?? [])
    : [];
  const latestByJob = new Map<string, (typeof snapshots)[number]>();
  for (const review of snapshots)
    if (!latestByJob.has(review.job_posting_id))
      latestByJob.set(review.job_posting_id, review);

  const jobById = new Map(jobs.map((job) => [job.id, job]));
  const latestReviews = [...latestByJob.values()].filter((review) =>
    jobById.has(review.job_posting_id),
  );
  const today = seoulToday();
  const upcoming = jobs
    .filter((job) => {
      if (!job.deadline) return false;
      const review = latestByJob.get(job.id);
      return (
        !completed.includes(review?.pipeline_stage ?? "") &&
        daysUntil(job.deadline, today) >= 0 &&
        daysUntil(job.deadline, today) <= 7
      );
    })
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));
  const prioritizedReviews = latestReviews
    .filter((review) => !completed.includes(review.pipeline_stage))
    .sort((a, b) => b.priority_score - a.priority_score);
  const priorityRankByJob = new Map<string, number>();
  let priorityRank = 0;
  prioritizedReviews.forEach((review, index) => {
    if (
      index === 0 ||
      review.priority_score !== prioritizedReviews[index - 1].priority_score
    )
      priorityRank = index + 1;
    priorityRankByJob.set(review.job_posting_id, priorityRank);
  });
  const focusJobs = upcoming.length
    ? upcoming.slice(0, 4)
    : prioritizedReviews
        .slice(0, 4)
        .map((review) => jobById.get(review.job_posting_id)!)
        .filter(Boolean);
  const avgPassEstimate = latestReviews.length
    ? Math.round(
        latestReviews.reduce((sum, review) => sum + review.pass_estimate, 0) /
          latestReviews.length,
      )
    : null;
  const activeCount = latestReviews.filter((review) =>
    inProgress.includes(review.pipeline_stage),
  ).length;
  const preparedCount = latestReviews.filter((review) =>
    inPreparation.includes(review.pipeline_stage),
  ).length;
  const completedCount = latestReviews.filter((review) =>
    completed.includes(review.pipeline_stage),
  ).length;
  const focusTitle = upcoming.length ? "마감 임박 공고" : "우선순위 공고";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="mb-3 text-sm font-medium text-primary">내 커리어 흐름</p>
        <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          저장한 공고와 지원 단계를 요약하고, 지금 확인할 기회를 모았어요.
        </p>
      </div>

      <section
        aria-label="취업 준비 요약"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="저장한 공고"
          value={jobsResult.count ?? jobs.length}
          description="마감일과 지원 기록을 관리 중인 공고"
          icon={BriefcaseBusiness}
        />
        <StatCard
          label="평가한 공고"
          value={`${latestReviews.length} / ${jobsResult.count ?? jobs.length}`}
          description="이력서와 비교해 평가 기록이 있는 공고"
          icon={ClipboardCheck}
        />
        <StatCard
          label="전형 진행 중"
          value={activeCount}
          description="지원 완료부터 처우 협의까지"
          icon={PanelsTopLeft}
        />
        <StatCard
          label="7일 내 마감"
          value={upcoming.length}
          description="오늘부터 일주일 안에 마감하는 공고"
          icon={CalendarClock}
        />
      </section>

      <div className="grid items-stretch gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>{focusTitle}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {upcoming.length
                  ? "마감이 가까운 순서로 정리했어요."
                  : "진행 중인 공고 중 우선순위가 높은 순서예요."}
              </p>
            </div>
            <Link
              href={upcoming.length ? "/jobs" : "/applications"}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              전체 보기 <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {focusJobs.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[38rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th scope="col" className="py-2 pr-4 font-medium">
                        공고
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        지원 단계
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2 text-right font-medium"
                      >
                        우선순위
                      </th>
                      <th
                        scope="col"
                        className="py-2 pl-4 text-right font-medium"
                      >
                        마감일
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {focusJobs.map((job) => {
                      const review = latestByJob.get(job.id);
                      const rank = priorityRankByJob.get(job.id);
                      const days = job.deadline
                        ? daysUntil(job.deadline, today)
                        : null;
                      return (
                        <tr key={job.id}>
                          <td className="py-3 pr-4">
                            <Link
                              href={`/jobs/${job.id}${review ? `?resume=${review.resume_id}:${review.resume_version}` : ""}`}
                              className="block rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                            >
                              <span className="block max-w-64 truncate text-sm font-medium">
                                {job.title}
                              </span>
                              <span className="mt-1 block max-w-64 truncate text-xs text-muted-foreground">
                                {job.company || "회사명 미입력"}
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {review?.pipeline_stage ?? "아직 평가 전"}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium whitespace-nowrap tabular-nums">
                            {rank !== undefined ? `${rank}위` : "평가 전"}
                          </td>
                          <td className="py-3 pl-4 text-right text-sm whitespace-nowrap tabular-nums">
                            <span className="block font-medium">
                              {days === null
                                ? "확인불가"
                                : days < 0
                                  ? "공고마감"
                                  : days === 0
                                    ? "D-day"
                                    : `D-${days}`}
                            </span>
                            {job.deadline && (
                              <time
                                dateTime={job.deadline}
                                className="mt-1 block text-xs text-muted-foreground"
                              >
                                {job.deadline}
                              </time>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  진행 중인 평가 공고끼리 비교한 순위이며, 같은 점수는 같은
                  순위로 표시합니다. 합격 확률을 뜻하지 않습니다.
                </p>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="font-medium">아직 확인할 공고가 없어요</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  공고를 저장하거나 이력서와 비교하면 우선순위와 마감일을 여기서
                  볼 수 있어요.
                </p>
                <Link
                  href="/jobs/new"
                  className={buttonVariants({
                    variant: "outline",
                    className: "mt-4 min-h-10",
                  })}
                >
                  공고 저장하기 <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>지원 흐름</CardTitle>
            <p className="text-sm text-muted-foreground">
              최신 평가 기록 기준으로 집계했어요.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "검토·준비", count: preparedCount },
              { label: "지원·전형 진행", count: activeCount },
              { label: "전형 결과", count: completedCount },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-muted-foreground">
                  {item.label}
                </span>
                <span className="font-semibold tabular-nums">
                  {item.count}건
                </span>
              </div>
            ))}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ChartNoAxesCombined aria-hidden="true" className="size-4" />
                평가한 공고의 평균 예상 통과 가능성
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {avgPassEstimate === null ? "—" : `${avgPassEstimate}%`}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {avgPassEstimate === null
                  ? "공고를 이력서와 비교하면 예상치가 쌓여요."
                  : `${latestReviews.length}개 공고의 최신 평가 평균`}
              </p>
            </div>
            {!reviewTableReady && (
              <p className="rounded-lg bg-secondary p-3 text-xs leading-5 text-muted-foreground">
                지원·평가 통계는 202609280002_job_reviews.sql 마이그레이션을
                적용하면 표시됩니다.
              </p>
            )}
            <Link
              href="/applications"
              className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              지원 현황 자세히 보기{" "}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
