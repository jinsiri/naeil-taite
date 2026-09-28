import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireIdentity } from "@/lib/resumes/data";
import { jobPostingSchema } from "@/lib/jobs/schema";
import { extractRequirements, compareRequirement } from "@/lib/jobs/matching";
import { versionSchema } from "@/lib/resumes/schema";
import { isJobPostingsTableMissing } from "@/lib/jobs/schema";
import { JobMigrationNotice } from "@/components/jobs/job-migration-notice";

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

function statusLabel(status: "matched" | "partial" | "unknown") {
  if (status === "matched") return "문구 직접 일치";
  if (status === "partial") return "일부 단어 확인";
  return "확인 필요";
}

function statusStyle(status: "matched" | "partial" | "unknown") {
  if (status === "matched") return "bg-primary/10 text-primary";
  if (status === "partial")
    return "bg-amber-500/10 text-amber-800 dark:text-amber-300";
  return "bg-secondary text-muted-foreground";
}

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

  let selected = null;
  if (selectedResume && selectedVersion) {
    const { data, error } = await client
      .from("resume_versions")
      .select("*")
      .eq("resume_id", selectedResume.id)
      .eq("user_id", user.id)
      .eq("version", selectedVersion)
      .maybeSingle();
    if (error) throw new Error("이력서 버전을 불러오지 못했어요.");
    if (data) selected = versionSchema.parse(data);
  }

  const requirements = extractRequirements(job.original_text);
  const matches = selected
    ? requirements.map((requirement) =>
        compareRequirement(requirement, selected.content),
      )
    : [];

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

      <section id="comparison" className="scroll-mt-6 space-y-5">
        <div>
          <h2 className="text-2xl font-semibold">이력서 버전과 대조</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            원문에서 문장을 나누고 이력서에서 같은 표현을 찾습니다. 비슷한
            의미나 문맥은 판단하지 않으므로 결과를 직접 확인해 주세요.
          </p>
        </div>
        {resumes.length === 0 ? (
          <Card>
            <CardContent className="space-y-4 py-8">
              <h3 className="text-lg font-semibold">비교할 이력서가 없어요</h3>
              <p className="text-sm text-muted-foreground">
                이력서와 버전을 먼저 등록하면 공고와 대조할 수 있어요.
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
                비교할 이력서 버전
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
                이 버전과 비교하기
              </button>
            </form>
            {selected && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {selected.title} · v{selected.version} 기준
                </p>
                {matches.length === 0 ? (
                  <Card>
                    <CardContent className="py-6 text-sm text-muted-foreground">
                      공고에서 비교할 만한 문장을 찾지 못했어요. 공고 원문을
                      확인해 주세요.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {matches.map((match, index) => (
                      <Card key={`${index}-${match.requirement}`}>
                        <CardContent className="space-y-3 p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <p className="flex-1 text-sm leading-6">
                              {match.requirement}
                            </p>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle(match.status)}`}
                            >
                              {statusLabel(match.status)}
                            </span>
                          </div>
                          {match.evidence ? (
                            <blockquote className="border-l-2 border-primary/40 pl-3 text-sm leading-6 text-muted-foreground">
                              {match.evidence}
                            </blockquote>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              이력서 원문에서 같은 단어를 찾지 못했어요. 빠진
                              경력이라는 뜻은 아니며, 직접 확인해 주세요.
                            </p>
                          )}
                          {match.status === "partial" &&
                            match.matchedTerms.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                일치한 단어: {match.matchedTerms.join(", ")}
                              </p>
                            )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
