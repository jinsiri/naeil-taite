import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireIdentity } from "@/lib/resumes/data";
import { JobMigrationNotice } from "@/components/jobs/job-migration-notice";
import { PipelineStageControl } from "@/components/jobs/pipeline-stage-control";
import { loadApplicationOverview } from "@/lib/applications/data";

export default async function ApplicationsPage() {
  const { client, user } = await requireIdentity();
  const { rows, error } = await loadApplicationOverview(client, user.id);
  if (error && ["42P01", "PGRST205"].includes(error.code))
    return (
      <JobMigrationNotice
        migrationFile="202610060001_independent_applications.sql"
        feature="지원 현황"
      />
    );
  if (error) throw new Error("지원 현황을 불러오지 못했어요.");
  const applications = rows.sort(
    (a, b) =>
      (b.latest_review?.priority_score ?? -1) -
      (a.latest_review?.priority_score ?? -1),
  );
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">지원 현황</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          AI 분석 없이도 공고별 지원 단계를 관리할 수 있어요. 평가를 다시
          실행해도 단계는 유지됩니다.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "확인 필요", stages: [null] },
          { label: "검토·준비", stages: ["검토중", "지원준비"] },
          {
            label: "지원·전형 진행",
            stages: ["지원완료", "서류통과", "1차면접", "2차면접", "처우협의"],
          },
          { label: "전형 결과", stages: ["서류탈락", "최종합격", "최종탈락"] },
        ].map((group) => (
          <Card key={group.label}>
            <CardContent className="flex justify-between p-5">
              <span>{group.label}</span>
              <strong>
                {
                  applications.filter((a) =>
                    (group.stages as (string | null)[]).includes(
                      a.pipeline_stage,
                    ),
                  ).length
                }
              </strong>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        평가 우선순위 순 · 미평가 공고 포함 · 총 {applications.length}건
      </p>
      {!applications.length && (
        <Card>
          <CardContent className="space-y-3 py-8">
            <p>
              아직 저장한 공고가 없어요. 공고를 저장하면 지원 기록이 함께
              만들어집니다.
            </p>
            <Link href="/jobs/new" className={buttonVariants()}>
              공고 저장하기
            </Link>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {applications.map((application) => (
          <Card key={application.id}>
            <CardContent className="space-y-4 p-6">
              <p className="text-sm text-muted-foreground">
                {application.company || "회사명 미입력"} ·{" "}
                {application.pipeline_stage ?? "확인 필요"}
              </p>
              <h2 className="text-lg font-semibold">
                <Link
                  href={`/jobs/${application.job_posting_id}`}
                  className="hover:underline"
                >
                  {application.title}
                </Link>
              </h2>
              <p className="text-sm text-muted-foreground">
                {application.deadline
                  ? `마감일 ${application.deadline}`
                  : "마감일 미정"}
              </p>
              <p className="text-sm">
                {application.latest_review
                  ? `${application.latest_review.category} · 우선순위 ${application.latest_review.priority_score} · 기회 ${application.latest_review.opportunity_score}점`
                  : "아직 평가 전"}
              </p>
              <PipelineStageControl
                key={application.revision}
                application={application}
              />
              <Link
                href={`/jobs/${application.job_posting_id}`}
                className="text-sm text-primary hover:underline"
              >
                공고·지원 기록 보기 →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
