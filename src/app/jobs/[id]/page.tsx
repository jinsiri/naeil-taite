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

  let reviewHistory: ReturnType<typeof reviewSnapshotSchema.parse>[] = [];
  if (selectedResume && selectedVersion) {
    const { data, error } = await client
      .from("job_reviews")
      .select("*")
      .eq("user_id", user.id)
      .eq("job_posting_id", job.id)
      .eq("resume_id", selectedResume.id)
      .eq("resume_version", selectedVersion)
      .order("snapshot_number", { ascending: false });
    if (error && (error.code === "42P01" || error.code === "PGRST205"))
      return (
        <JobMigrationNotice
          migrationFile="202609280002_job_reviews.sql"
          feature="평가와 지원 이력"
        />
      );
    if (error) throw new Error("평가 이력을 불러오지 못했어요.");
    reviewHistory = z.array(reviewSnapshotSchema).parse(data);
  }

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
        <p className="mb-2 text-sm font-medium text-primary">
          {job.company || "회사명 미입력"}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
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
        />
      )}
    </div>
  );
}
