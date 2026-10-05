import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireIdentity } from "@/lib/resumes/data";
import { jobPostingSchema } from "@/lib/jobs/schema";
import { isJobPostingsTableMissing } from "@/lib/jobs/schema";
import { JobMigrationNotice } from "@/components/jobs/job-migration-notice";
import { JobReviewPanel } from "@/components/jobs/job-review-panel";
import { reviewSnapshotSchema } from "@/lib/jobs/review-schema";
import { DeleteJobButton } from "@/components/jobs/delete-job-button";
import { saveJobWorkLocation } from "@/app/jobs/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PipelineStageControl } from "@/components/jobs/pipeline-stage-control";
import { ApplicationReflectionPanel } from "@/components/jobs/application-reflection-panel";
import { applicationReflectionSchema } from "@/lib/jobs/reflection-schema";
import {
  applicationSchema,
  applicationEventSchema,
} from "@/lib/applications/schema";
import { PIPELINE_STAGES } from "@/lib/jobs/scoring";

const resumeChoicesSchema = z.array(
  z.object({
    id: z.uuid(),
    current_version: z.number().int().positive(),
    resume_versions: z.array(
      z.object({
        version: z.number().int().positive(),
        title: z.string(),
        created_at: z.iso.datetime({ offset: true }),
      }),
    ),
  }),
);

export default async function JobDetailPage({
  params,
  searchParams,
}: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const search = await searchParams;
  const { client, user } = await requireIdentity();
  const { data: jobData, error: jobError } = await client
    .from("job_postings")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (jobError && isJobPostingsTableMissing(jobError.code))
    return <JobMigrationNotice />;
  if (jobError) throw new Error("채용공고를 불러오지 못했어요.");
  if (!jobData) notFound();
  const job = jobPostingSchema.parse(jobData);
  const { data: applicationData, error: applicationError } = await client
    .from("applications")
    .select("*")
    .eq("job_posting_id", job.id)
    .eq("user_id", user.id)
    .single();
  if (applicationError && isJobPostingsTableMissing(applicationError.code))
    return (
      <JobMigrationNotice
        migrationFile="202610060001_independent_applications.sql"
        feature="독립 지원 기록"
      />
    );
  if (applicationError) throw new Error("지원 기록을 불러오지 못했어요.");
  const application = applicationSchema.parse(applicationData);
  const { data: eventData, error: eventError } = await client
    .from("application_events")
    .select("*")
    .eq("application_id", application.id)
    .eq("user_id", user.id)
    .order("revision", { ascending: false });
  if (eventError) throw new Error("지원 변경 이력을 불러오지 못했어요.");
  const events = z.array(applicationEventSchema).parse(eventData);
  const { data: scoringPreferences } = await client
    .from("scoring_preferences")
    .select("home_location,transit_consent")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: choiceData, error: choiceError } = await client
    .from("resumes")
    .select("id,current_version,resume_versions(version,title,created_at)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (choiceError) throw new Error("이력서 버전을 불러오지 못했어요.");
  const resumes = resumeChoicesSchema.parse(choiceData);
  const requestKey = typeof search.resume === "string" ? search.resume : "";
  const [requestedId, requestedVersionText] = requestKey.split(":");
  const requestedVersion = Number(requestedVersionText);
  const requestedResume = resumes.find((resume) => resume.id === requestedId);
  const requestedVersionExists = requestedResume?.resume_versions.some(
    (version) => version.version === requestedVersion,
  );
  const defaultResume = resumes[0];
  const selectedResume = requestedVersionExists
    ? requestedResume
    : defaultResume;
  const selectedVersion = requestedVersionExists
    ? requestedVersion
    : defaultResume?.current_version;

  const { data: reviewData, error: reviewError } = await client
    .from("job_reviews")
    .select("*")
    .eq("user_id", user.id)
    .eq("job_posting_id", job.id)
    .order("created_at", { ascending: false })
    .limit(500);
  if (
    reviewError &&
    (reviewError.code === "42P01" || reviewError.code === "PGRST205")
  )
    return (
      <JobMigrationNotice
        migrationFile="202609280002_job_reviews.sql"
        feature="평가와 지원 이력"
      />
    );
  if (reviewError) throw new Error("평가 이력을 불러오지 못했어요.");
  const jobReviewHistory = z.array(reviewSnapshotSchema).parse(reviewData);
  const reviewHistory = jobReviewHistory.filter(
    (review) =>
      review.resume_id === selectedResume?.id &&
      review.resume_version === selectedVersion,
  );

  const { data: reflectionData, error: reflectionError } = await client
    .from("application_reflections")
    .select("*")
    .eq("user_id", user.id)
    .eq("job_posting_id", job.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (
    reflectionError &&
    (reflectionError.code === "42P01" || reflectionError.code === "PGRST205")
  )
    return (
      <JobMigrationNotice
        migrationFile="202610010001_application_reflections.sql"
        feature="지원 단계별 회고 기록"
      />
    );
  if (reflectionError) throw new Error("지원 회고를 불러오지 못했어요.");
  const reflections = z
    .array(applicationReflectionSchema)
    .parse(reflectionData);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link
          href="/jobs"
          className={buttonVariants({
            variant: "link",
            className: "mb-2 -ml-2 px-2",
          })}
        >
          ← 채용공고
        </Link>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-sm font-medium text-primary">
              {job.company || "회사명 미입력"}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
            {job.work_location && (
              <p className="mt-2 text-sm text-muted-foreground">
                근무지 · {job.work_location}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {job.deadline && <span>마감일 {job.deadline}</span>}
              {job.source_url && (
                <a
                  href={job.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  공고 원문 링크 열기
                </a>
              )}
            </div>
            <div className="mt-5">
              <DeleteJobButton jobId={job.id} jobTitle={job.title} />
            </div>
          </div>
          <div className="w-full rounded-lg border border-primary/30 bg-primary/5 p-3 sm:w-64 sm:shrink-0">
            <PipelineStageControl
              key={application.revision}
              application={application}
              compact
            />
          </div>
        </div>
      </div>

      <ApplicationReflectionPanel
        jobId={job.id}
        currentStage={application.pipeline_stage ?? PIPELINE_STAGES[0]}
        stageChanges={events}
        reflections={reflections}
      />

      <Card>
        <CardHeader>
          <CardTitle>공고 근무지</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={saveJobWorkLocation}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input type="hidden" name="jobId" value={job.id} />
            <Input
              name="workLocation"
              maxLength={160}
              defaultValue={job.work_location}
              placeholder="예: 서울시 강남구 테헤란로"
              aria-label="공고 근무지"
            />
            <Button type="submit" variant="outline">
              근무지 저장
            </Button>
          </form>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            대중교통 예상 시간은 평가 기준에 입력한 출발 위치에서 이 근무지
            주소까지 계산합니다. 공고에 적힌 상세 주소를 입력해 주세요.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>저장한 공고 원문</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[32rem] overflow-auto font-sans text-sm leading-7 break-words whitespace-pre-wrap">
            {job.original_text}
          </pre>
        </CardContent>
      </Card>

      <section className="space-y-5" aria-labelledby="analysis-resume-heading">
        <div>
          <h2 id="analysis-resume-heading" className="text-2xl font-semibold">
            분석할 이력서 버전
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            선택한 버전과 공고를 AI가 의미와 근거를 중심으로 비교합니다.
          </p>
        </div>
        {resumes.length === 0 ? (
          <Card>
            <CardContent className="space-y-4 py-8">
              <h3 className="text-lg font-semibold">분석할 이력서가 없어요</h3>
              <p className="text-sm text-muted-foreground">
                이력서를 등록하면 공고와 AI 분석을 실행할 수 있어요.
              </p>
              <Link
                href="/resumes/new"
                className={buttonVariants({
                  variant: "outline",
                  className: "min-h-11",
                })}
              >
                이력서 등록하기
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <form method="get" className="flex flex-wrap items-end gap-3">
              <label
                className="min-w-64 flex-1 space-y-2 text-sm font-medium"
                htmlFor="resume-version"
              >
                이력서 버전
                <select
                  id="resume-version"
                  name="resume"
                  defaultValue={
                    selectedResume && selectedVersion
                      ? `${selectedResume.id}:${selectedVersion}`
                      : ""
                  }
                  className="min-h-11 w-full rounded-lg border bg-background px-3 text-sm"
                >
                  {resumes.flatMap((resume) =>
                    resume.resume_versions
                      .slice()
                      .sort((a, b) => b.version - a.version)
                      .map((version) => (
                        <option
                          key={`${resume.id}:${version.version}`}
                          value={`${resume.id}:${version.version}`}
                        >
                          {version.title} · v{version.version}
                          {version.version === resume.current_version
                            ? " (현재)"
                            : ""}
                        </option>
                      )),
                  )}
                </select>
              </label>
              <button
                type="submit"
                className={buttonVariants({
                  variant: "outline",
                  className: "min-h-11 px-4",
                })}
              >
                버전 선택
              </button>
            </form>
          </>
        )}
      </section>
      {selectedResume && selectedVersion && (
        <JobReviewPanel
          jobId={job.id}
          resumeId={selectedResume.id}
          resumeVersion={selectedVersion}
          initial={reviewHistory[0] ?? null}
          history={reviewHistory.slice(0, 20)}
          openAiConfigured={Boolean(process.env.OPENAI_API_KEY)}
          jobTextLength={job.original_text.length}
          transitReady={Boolean(
            scoringPreferences?.home_location &&
            job.work_location &&
            scoringPreferences.transit_consent &&
            process.env.KAKAO_REST_API_KEY,
          )}
          transitMissing={[
            !scoringPreferences?.home_location && "출발 위치",
            !job.work_location && "공고 근무지",
            !scoringPreferences?.transit_consent && "경로 정보 전송 동의",
            !process.env.KAKAO_REST_API_KEY && "Kakao API 키",
          ]
            .filter(Boolean)
            .join(", ")}
        />
      )}
    </div>
  );
}
