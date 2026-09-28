import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { JobForm } from "@/components/jobs/job-form";
import { requireIdentity } from "@/lib/resumes/data";

export default async function NewJobPage() {
  await requireIdentity();
  return (
    <div className="mx-auto max-w-3xl space-y-8">
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
        <h1 className="text-3xl font-bold tracking-tight">채용공고 저장하기</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          공고 원문을 보관하고 내 이력서 버전과 비교해 보세요.
        </p>
      </div>
      <JobForm />
    </div>
  );
}
