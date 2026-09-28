import { ResumeEditor } from "@/components/resumes/resume-editor";
import { getResume } from "@/lib/resumes/data";

export default async function EditResumePage({
  params,
}: PageProps<"/resumes/[id]/edit">) {
  const { version } = await getResume((await params).id);
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">이력서 수정하기</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          v{version.version}을 바탕으로 수정합니다. 새 파일을 고르면 내용을
          추출해 편집할 수 있고, 저장하면 새 버전으로 보관돼요.
        </p>
      </div>
      <ResumeEditor key={version.id} version={version} />
    </div>
  );
}
